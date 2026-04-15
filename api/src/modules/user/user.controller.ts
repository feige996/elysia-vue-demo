import type { UserService } from './user.service';
import type { AuthorizedRole } from '../../shared/auth/token-auth';
import { ErrorKey, failByKey, ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import { recordFailedLoginAttempt } from '../../shared/security/ip-blacklist-store';
import { db } from '../../infra/db/client';
import { sysLoginLogsTable } from '../../infra/db/schema';
import {
  checkSendCooldown,
  generateVerificationCode,
  saveVerificationCode,
  verifyCodeAndConsume,
} from '../../shared/notification/verification-code-store';
import { sendVerificationCode } from '../../shared/notification/notify.service';
import {
  assignRoleMenusSchema,
  assignRolePermissionsSchema,
  batchDeleteSchema,
  createRoleSchema,
  createUserSchema,
  currentPasswordSchema,
  forgotPasswordSchema,
  idParamSchema,
  listQuerySchema,
  loginSchema,
  logoutSchema,
  pageQuerySchema,
  registerSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  updateRoleSchema,
  updateRoleStatusSchema,
  updateProfileSchema,
  updateUserSchema,
} from './dto/user.dto';
import type { UserRepository } from './user.repository';
import type { UserEntity } from '../../shared/types/entities';
import type { PaginatedData } from '../../shared/types/http';

type TokenIdentity = {
  role: AuthorizedRole;
  userId?: number;
  account?: string;
};

const PROTECTED_ROLE_CODES = new Set<string>(['admin', 'editor']);
const resolveClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
};

const resolveUserAgent = (request: Request) =>
  request.headers.get('user-agent') ?? '';

const tryWriteLoginLog = async (payload: {
  account: string | null;
  userId: number | null;
  success: number;
  reason: string | null;
  requestIp: string;
  userAgent: string;
}) => {
  try {
    await db.insert(sysLoginLogsTable).values(payload);
  } catch {
    // Keep login flow available when login-log table is not migrated yet.
  }
};

export const createUserController = (
  userService: UserService,
  userRepository: UserRepository,
  issueTokens?: (identity: TokenIdentity) => Promise<{
    accessToken: string;
    refreshToken: string;
  }>,
  consumeRefreshToken?: (refreshToken: string) => Promise<TokenIdentity | null>,
  revokeRefreshToken?: (refreshToken: string) => Promise<boolean>,
) => ({
  register: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = registerSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid register payload',
      );
    }
    const existing = await userRepository.findByAccount(
      parsedBody.data.account,
    );
    if (existing) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        'User account already exists',
      );
    }
    const created = await userRepository.create({
      account: parsedBody.data.account,
      password: parsedBody.data.password,
      name: parsedBody.data.name,
      role: 'editor',
    });
    return {
      status: 201,
      payload: ok(requestId, created, 'Register success'),
    };
  },
  forgotPassword: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = forgotPasswordSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ??
          'Invalid forgot password payload',
      );
    }
    const authInfo = await userRepository.findAuthByAccount(
      parsedBody.data.account,
    );
    const cooldown = await checkSendCooldown(
      parsedBody.data.account,
      parsedBody.data.channel,
    );
    if (!cooldown.allowed) {
      return failByKey(
        requestId,
        ErrorKey.RATE_LIMITED,
        `请在 ${cooldown.waitSeconds}s 后重试`,
      );
    }

    if (!authInfo?.user) {
      // Keep response semantics stable to avoid user enumeration.
      return {
        status: 200,
        payload: ok(
          requestId,
          { sent: true, maskedTarget: '', channel: parsedBody.data.channel },
          'If account exists, code is sent',
        ),
      };
    }

    const profile = await userRepository.findProfileById(authInfo.user.id);
    if (!profile) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'User not found');
    }

    const target =
      parsedBody.data.channel === 'email' ? profile.email : profile.mobile;
    if (!target) {
      return failByKey(
        requestId,
        ErrorKey.BAD_REQUEST,
        parsedBody.data.channel === 'email'
          ? '该账号未绑定邮箱'
          : '该账号未绑定手机号',
      );
    }

    const verifyCode = generateVerificationCode();
    await saveVerificationCode(
      parsedBody.data.account,
      parsedBody.data.channel,
      verifyCode,
    );
    const notifyResult = await sendVerificationCode(
      parsedBody.data.channel,
      target,
      verifyCode,
      parsedBody.data.account,
    );

    return {
      status: 200,
      payload: ok(
        requestId,
        {
          sent: true,
          channel: parsedBody.data.channel,
          maskedTarget: notifyResult.maskedTarget,
        },
        'Verification code sent',
      ),
    };
  },
  resetPassword: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = resetPasswordSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid reset password payload',
      );
    }
    const verifyResult = await verifyCodeAndConsume(
      parsedBody.data.account,
      parsedBody.data.channel,
      parsedBody.data.verifyCode,
    );
    if (!verifyResult.ok) {
      return failByKey(
        requestId,
        ErrorKey.UNAUTHORIZED,
        verifyResult.reason === 'EXPIRED'
          ? '验证码已过期'
          : verifyResult.reason === 'MAX_TRIES'
            ? '验证码尝试次数过多'
            : '验证码错误',
      );
    }
    await userRepository.updatePasswordByAccount(
      parsedBody.data.account,
      parsedBody.data.newPassword,
    );
    return {
      status: 200,
      payload: ok(requestId, { updated: true }, 'Password reset success'),
    };
  },
  login: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = loginSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid login payload',
      );
    }

    const user = await userService.login(
      parsedBody.data.account,
      parsedBody.data.password,
      requestId,
    );
    if (!user) {
      const clientIp = resolveClientIp(request);
      const userAgent = resolveUserAgent(request);
      if (clientIp !== 'unknown') {
        await recordFailedLoginAttempt(clientIp, {
          requestId,
          account: parsedBody.data.account,
        });
      }
      await tryWriteLoginLog({
        account: parsedBody.data.account,
        userId: null,
        success: 0,
        reason: 'INVALID_CREDENTIALS',
        requestIp: clientIp,
        userAgent,
      });
      return failByKey(requestId, ErrorKey.INVALID_CREDENTIALS);
    }
    if (!issueTokens) {
      return failByKey(
        requestId,
        ErrorKey.INTERNAL_ERROR,
        'Auth token issuer is not configured',
      );
    }
    const tokens = await issueTokens({
      role: user.role,
      userId: user.id,
      account: user.account,
    });
    await tryWriteLoginLog({
      account: user.account,
      userId: user.id,
      success: 1,
      reason: null,
      requestIp: resolveClientIp(request),
      userAgent: resolveUserAgent(request),
    });

    return {
      status: 200,
      payload: ok(
        requestId,
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
        },
        'Login success',
      ),
    };
  },
  listAll: async (query: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedQuery = listQuerySchema.safeParse(query);
    const users = await userService.getUsers(
      parsedQuery.success ? parsedQuery.data.keyword : undefined,
      requestId,
    );
    return {
      status: 200,
      payload: ok(requestId, users, 'OK'),
    };
  },
  listRoles: async (request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const roles = await userRepository.findRoles();
    return {
      status: 200,
      payload: ok(requestId, roles, 'OK'),
    };
  },
  createRole: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = createRoleSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid role payload',
      );
    }
    const existing = await userRepository.findRoleByCode(parsedBody.data.code);
    if (existing) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        'Role code already exists',
      );
    }
    const created = await userRepository.createRole(parsedBody.data);
    return {
      status: 201,
      payload: ok(requestId, created, 'Created'),
    };
  },
  updateRole: async (idParam: unknown, body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const parsedBody = updateRoleSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid role payload',
      );
    }
    if (parsedBody.data.code) {
      const roleWithCode = await userRepository.findRoleByCode(
        parsedBody.data.code,
      );
      if (roleWithCode && roleWithCode.id !== parsedId.data.id) {
        return failByKey(
          requestId,
          ErrorKey.CONFLICT,
          'Role code already exists',
        );
      }
    }
    const updated = await userRepository.updateRole(
      parsedId.data.id,
      parsedBody.data,
    );
    if (!updated) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    return {
      status: 200,
      payload: ok(requestId, updated, 'Updated'),
    };
  },
  updateRoleStatus: async (
    idParam: unknown,
    body: unknown,
    request: Request,
  ) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const parsedBody = updateRoleStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid role status payload',
      );
    }
    const currentRole = await userRepository.findRoleById(parsedId.data.id);
    if (!currentRole) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    if (
      parsedBody.data.status === 0 &&
      PROTECTED_ROLE_CODES.has(currentRole.code)
    ) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        `系统保留角色「${currentRole.code}」不可禁用`,
      );
    }
    if (parsedBody.data.status === 0) {
      const activeUsersCount = await userRepository.countUsersByRoleId(
        parsedId.data.id,
      );
      if (activeUsersCount > 0) {
        return failByKey(
          requestId,
          ErrorKey.CONFLICT,
          `当前角色仍绑定 ${activeUsersCount} 个启用用户，请先调整用户角色`,
        );
      }
    }

    const updated = await userRepository.updateRoleStatus(
      parsedId.data.id,
      parsedBody.data.status,
    );
    if (!updated) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    return {
      status: 200,
      payload: ok(requestId, updated, 'Updated'),
    };
  },
  removeRoleOne: async (idParam: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const role = await userRepository.findRoleById(parsedId.data.id);
    if (!role) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    if (PROTECTED_ROLE_CODES.has(role.code)) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        `系统保留角色「${role.code}」不可删除`,
      );
    }
    const activeUsersCount = await userRepository.countUsersByRoleId(
      parsedId.data.id,
    );
    if (activeUsersCount > 0) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        `当前角色仍绑定 ${activeUsersCount} 个启用用户，请先调整用户角色`,
      );
    }
    const removed = await userRepository.deleteRoleById(parsedId.data.id);
    if (!removed) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    return {
      status: 200,
      payload: ok(requestId, { deleted: 1 }, 'Deleted'),
    };
  },
  assignRolePermissions: async (
    idParam: unknown,
    body: unknown,
    request: Request,
  ) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const parsedBody = assignRolePermissionsSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ??
          'Invalid role permissions payload',
      );
    }
    const role = await userRepository.findRoleById(parsedId.data.id);
    if (!role) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    await userRepository.replaceRolePermissions(
      parsedId.data.id,
      parsedBody.data.permissionIds,
    );
    return {
      status: 200,
      payload: ok(requestId, { roleId: parsedId.data.id }, 'Updated'),
    };
  },
  assignRoleMenus: async (
    idParam: unknown,
    body: unknown,
    request: Request,
  ) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const parsedBody = assignRoleMenusSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid role menus payload',
      );
    }
    const role = await userRepository.findRoleById(parsedId.data.id);
    if (!role) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'Role not found');
    }
    await userRepository.replaceRoleMenus(
      parsedId.data.id,
      parsedBody.data.menuIds,
    );
    return {
      status: 200,
      payload: ok(requestId, { roleId: parsedId.data.id }, 'Updated'),
    };
  },
  list: async (query: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedQuery = pageQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedQuery.error.issues[0]?.message ?? 'Invalid query',
      );
    }
    const { page, pageSize, keyword, deptId } = parsedQuery.data;
    const result = await userRepository.findPage(
      page,
      pageSize,
      keyword,
      deptId,
    );
    return {
      status: 200,
      payload: ok(
        requestId,
        {
          list: result.list,
          total: result.total,
          page,
          pageSize,
        } satisfies PaginatedData<UserEntity>,
        'OK',
      ),
    };
  },
  listPermissions: async (request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const permissions = await userRepository.findPermissions();
    return {
      status: 200,
      payload: ok(requestId, permissions, 'OK'),
    };
  },
  listMenus: async (request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const menus = await userRepository.findMenus();
    return {
      status: 200,
      payload: ok(requestId, menus, 'OK'),
    };
  },
  create: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = createUserSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid user payload',
      );
    }
    const existing = await userRepository.findByAccount(
      parsedBody.data.account,
    );
    if (existing) {
      return failByKey(
        requestId,
        ErrorKey.CONFLICT,
        'User account already exists',
      );
    }
    const created = await userRepository.create(parsedBody.data);
    return {
      status: 201,
      payload: ok(requestId, created, 'Created'),
    };
  },
  update: async (idParam: unknown, body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const parsedBody = updateUserSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid user payload',
      );
    }
    const updated = await userRepository.update(
      parsedId.data.id,
      parsedBody.data,
    );
    if (!updated) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'User not found');
    }
    return {
      status: 200,
      payload: ok(requestId, updated, 'Updated'),
    };
  },
  removeOne: async (idParam: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedId = idParamSchema.safeParse(idParam);
    if (!parsedId.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedId.error.issues[0]?.message ?? 'Invalid id',
      );
    }
    const removed = await userRepository.deleteById(parsedId.data.id);
    if (!removed) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'User not found');
    }
    return {
      status: 200,
      payload: ok(requestId, { deleted: 1 }, 'Deleted'),
    };
  },
  removeBatch: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = batchDeleteSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid ids payload',
      );
    }
    const deletedCount = await userRepository.deleteByIds(parsedBody.data.ids);
    return {
      status: 200,
      payload: ok(requestId, { deleted: deletedCount }, 'Deleted'),
    };
  },
  listCurrentPermissions: async (role: AuthorizedRole, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const permissions = await userRepository.findPermissionCodesByRole(role);
    return {
      status: 200,
      payload: ok(requestId, permissions, 'OK'),
    };
  },
  getCurrentMenuTree: async (role: AuthorizedRole, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const menus = await userRepository.findMenuTreeByRole(role);
    return {
      status: 200,
      payload: ok(requestId, menus, 'OK'),
    };
  },
  refresh: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = refreshTokenSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid refresh token payload',
      );
    }
    if (!consumeRefreshToken || !issueTokens) {
      return failByKey(
        requestId,
        ErrorKey.INTERNAL_ERROR,
        'Refresh token handler is not configured',
      );
    }
    const identity = await consumeRefreshToken(parsedBody.data.refreshToken);
    if (!identity) {
      return failByKey(
        requestId,
        ErrorKey.UNAUTHORIZED,
        'Invalid refresh token',
      );
    }
    const tokens = await issueTokens(identity);
    return {
      status: 200,
      payload: ok(
        requestId,
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        'Token refreshed',
      ),
    };
  },
  logout: async (body: unknown, request: Request) => {
    const { requestId } = ensureRequestContext(request);
    const parsedBody = logoutSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid refresh token payload',
      );
    }
    if (!revokeRefreshToken) {
      return failByKey(
        requestId,
        ErrorKey.INTERNAL_ERROR,
        'Refresh token handler is not configured',
      );
    }
    const revoked = await revokeRefreshToken(parsedBody.data.refreshToken);
    if (!revoked) {
      return failByKey(
        requestId,
        ErrorKey.UNAUTHORIZED,
        'Invalid refresh token',
      );
    }
    return {
      status: 200,
      payload: ok(requestId, { revoked: true }, 'Logout success'),
    };
  },
  getProfile: async (request: Request) => {
    const { requestId, authorizedUserId } = ensureRequestContext(request);
    if (!authorizedUserId) {
      return failByKey(requestId, ErrorKey.UNAUTHORIZED);
    }
    const profile = await userRepository.findProfileById(authorizedUserId);
    if (!profile) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'User not found');
    }
    return {
      status: 200,
      payload: ok(requestId, profile, 'OK'),
    };
  },
  updateProfile: async (body: unknown, request: Request) => {
    const { requestId, authorizedUserId } = ensureRequestContext(request);
    if (!authorizedUserId) {
      return failByKey(requestId, ErrorKey.UNAUTHORIZED);
    }
    const parsedBody = updateProfileSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid profile payload',
      );
    }
    const updated = await userRepository.updateProfileById(
      authorizedUserId,
      parsedBody.data,
    );
    if (!updated) {
      return failByKey(requestId, ErrorKey.NOT_FOUND, 'User not found');
    }
    return {
      status: 200,
      payload: ok(requestId, updated, 'Updated'),
    };
  },
  updateCurrentPassword: async (body: unknown, request: Request) => {
    const { requestId, authorizedUserId, authorizedAccount } =
      ensureRequestContext(request);
    if (!authorizedUserId || !authorizedAccount) {
      return failByKey(requestId, ErrorKey.UNAUTHORIZED);
    }
    const parsedBody = currentPasswordSchema.safeParse(body);
    if (!parsedBody.success) {
      return failByKey(
        requestId,
        ErrorKey.VALIDATION_ERROR,
        parsedBody.error.issues[0]?.message ?? 'Invalid password payload',
      );
    }
    const authInfo = await userRepository.findAuthByAccount(authorizedAccount);
    if (
      !authInfo ||
      authInfo.passwordHash !== parsedBody.data.currentPassword
    ) {
      return failByKey(
        requestId,
        ErrorKey.INVALID_CREDENTIALS,
        'Current password is incorrect',
      );
    }
    await userRepository.updatePasswordById(
      authorizedUserId,
      parsedBody.data.newPassword,
    );
    return {
      status: 200,
      payload: ok(requestId, { updated: true }, 'Password updated'),
    };
  },
});
