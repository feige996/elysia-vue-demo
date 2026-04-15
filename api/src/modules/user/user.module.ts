import { Elysia, t } from 'elysia';
import {
  consumeRefreshToken,
  getAuthorizedRole,
  issueAccessToken,
  issueRefreshToken,
  revokeRefreshToken,
} from '../../shared/auth/token-auth';
import type { UserService } from './user.service';
import { createUserController } from './user.controller';
import type { UserRepository } from './user.repository';

const roleSchema = t.String({ minLength: 1, maxLength: 64 });

const apiErrorSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
});

const userSchema = t.Object({
  id: t.Number(),
  account: t.String(),
  name: t.String(),
  role: roleSchema,
});

const menuSchema = t.Object({
  id: t.Number(),
  parentId: t.Number(),
  name: t.String(),
  path: t.String(),
  routeName: t.String(),
  component: t.Nullable(t.String()),
  icon: t.Nullable(t.String()),
  type: t.Number(),
  sort: t.Number(),
  visible: t.Number(),
  status: t.Number(),
  permissionCode: t.Nullable(t.String()),
  keepAlive: t.Number(),
  children: t.Array(t.Any()),
});

const loginBodySchema = t.Object({
  account: t.String({ minLength: 1 }),
  password: t.String({ minLength: 6 }),
});

const refreshTokenBodySchema = t.Object({
  refreshToken: t.String({ minLength: 1 }),
});

const registerBodySchema = t.Object({
  account: t.String({ minLength: 3, maxLength: 64 }),
  password: t.String({ minLength: 6, maxLength: 64 }),
  name: t.String({ minLength: 1, maxLength: 64 }),
});

const forgotPasswordBodySchema = t.Object({
  account: t.String({ minLength: 1, maxLength: 64 }),
  channel: t.Union([t.Literal('email'), t.Literal('sms')]),
});

const resetPasswordBodySchema = t.Object({
  account: t.String({ minLength: 1, maxLength: 64 }),
  channel: t.Union([t.Literal('email'), t.Literal('sms')]),
  verifyCode: t.String({ minLength: 6, maxLength: 6 }),
  newPassword: t.String({ minLength: 6, maxLength: 64 }),
});

const updateCurrentPasswordBodySchema = t.Object({
  currentPassword: t.String({ minLength: 6, maxLength: 64 }),
  newPassword: t.String({ minLength: 6, maxLength: 64 }),
});

const updateProfileBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  email: t.Optional(
    t.Union([t.String({ format: 'email', maxLength: 128 }), t.Null()]),
  ),
  mobile: t.Optional(t.Union([t.String({ maxLength: 32 }), t.Null()])),
  avatarUrl: t.Optional(
    t.Union([t.String({ format: 'uri', maxLength: 512 }), t.Null()]),
  ),
});

const listQuerySchema = t.Object({
  keyword: t.Optional(t.String()),
});

const pageQuerySchema = t.Object({
  keyword: t.Optional(t.String()),
  page: t.Numeric({ minimum: 1, default: 1 }),
  pageSize: t.Numeric({ minimum: 1, maximum: 50, default: 10 }),
});

const createUserBodySchema = t.Object({
  account: t.String({ minLength: 1, maxLength: 64 }),
  name: t.String({ minLength: 1, maxLength: 64 }),
  role: roleSchema,
});

const updateUserBodySchema = t.Object({
  account: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  role: t.Optional(roleSchema),
});

const idParamSchema = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

const batchDeleteBodySchema = t.Object({
  ids: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1 }),
});

const loginSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
    user: userSchema,
  }),
});

const refreshSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
  }),
});

const logoutSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    revoked: t.Boolean(),
  }),
});

const usersPageSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    list: t.Array(userSchema),
    total: t.Number(),
    page: t.Number(),
    pageSize: t.Number(),
  }),
});

const usersAllSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(userSchema),
});

const permissionCodesSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(t.String()),
});

const permissionItemSchema = t.Object({
  id: t.Number(),
  code: t.String(),
  name: t.String(),
  module: t.String(),
  status: t.Number(),
});

const permissionsListSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(permissionItemSchema),
});

const menuListItemSchema = t.Object({
  id: t.Number(),
  parentId: t.Number(),
  name: t.String(),
  path: t.String(),
  status: t.Number(),
});

const menusListSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(menuListItemSchema),
});

const menuTreeSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(menuSchema),
});

const roleListItemSchema = t.Object({
  id: t.Number(),
  code: t.String(),
  name: t.String(),
  description: t.Union([t.String(), t.Null()]),
  status: t.Number(),
});

const rolesListSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(roleListItemSchema),
});

const roleBodySchema = t.Object({
  code: t.String({ minLength: 1, maxLength: 64 }),
  name: t.String({ minLength: 1, maxLength: 64 }),
  description: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
});

const roleUpdateBodySchema = t.Object({
  code: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  description: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
});

const roleStatusBodySchema = t.Object({
  status: t.Numeric({ minimum: 0, maximum: 1 }),
});

const roleAssignPermissionsBodySchema = t.Object({
  permissionIds: t.Array(t.Numeric({ minimum: 1 })),
});

const roleAssignMenusBodySchema = t.Object({
  menuIds: t.Array(t.Numeric({ minimum: 1 })),
});

const userSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: userSchema,
});

const deletedSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    deleted: t.Number(),
  }),
});

const profileSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    id: t.Number(),
    account: t.String(),
    name: t.String(),
    role: t.Nullable(t.String()),
    email: t.Nullable(t.String()),
    mobile: t.Nullable(t.String()),
    avatarUrl: t.Nullable(t.String()),
  }),
});

const resetTokenSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    sent: t.Boolean(),
    channel: t.Union([t.Literal('email'), t.Literal('sms')]),
    maskedTarget: t.String(),
  }),
});

const simpleUpdatedSuccessSchema = t.Object({
  code: t.Literal(0),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    updated: t.Boolean(),
  }),
});

export const userModule = new Elysia({
  prefix: '/api',
  detail: {
    tags: ['User'],
  },
})
  .post(
    '/auth/register',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.register(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '用户注册' },
      body: registerBodySchema,
      response: {
        201: userSuccessSchema,
        400: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .post(
    '/auth/forgot-password',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.forgotPassword(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '忘记密码（生成重置令牌）' },
      body: forgotPasswordBodySchema,
      response: {
        200: resetTokenSuccessSchema,
        400: apiErrorSchema,
      },
    },
  )
  .post(
    '/auth/reset-password',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.resetPassword(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '重置密码' },
      body: resetPasswordBodySchema,
      response: {
        200: simpleUpdatedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
      },
    },
  )
  .post(
    '/auth/login',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository, jwt } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
        jwt: {
          sign: (payload: Record<string, unknown>) => Promise<string>;
          verify: (token: string) => Promise<unknown>;
        };
      };
      const controller = createUserController(
        userService,
        userRepository,
        async (role) => ({
          accessToken: await issueAccessToken(role, async (payload) =>
            jwt.sign(payload),
          ),
          refreshToken: await issueRefreshToken(role, async (payload) =>
            jwt.sign(payload),
          ),
        }),
        async (refreshToken) =>
          consumeRefreshToken(refreshToken, async (token) => jwt.verify(token)),
        async (refreshToken) =>
          revokeRefreshToken(refreshToken, async (token) => jwt.verify(token)),
      );
      const response = await controller.login(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '用户登录' },
      body: loginBodySchema,
      response: {
        200: loginSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
  )
  .post(
    '/auth/refresh',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository, jwt } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
        jwt: {
          sign: (payload: Record<string, unknown>) => Promise<string>;
          verify: (token: string) => Promise<unknown>;
        };
      };
      const controller = createUserController(
        userService,
        userRepository,
        async (role) => ({
          accessToken: await issueAccessToken(role, async (payload) =>
            jwt.sign(payload),
          ),
          refreshToken: await issueRefreshToken(role, async (payload) =>
            jwt.sign(payload),
          ),
        }),
        async (refreshToken) =>
          consumeRefreshToken(refreshToken, async (token) => jwt.verify(token)),
      );
      const response = await controller.refresh(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '刷新访问令牌' },
      body: refreshTokenBodySchema,
      response: {
        200: refreshSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
  )
  .post(
    '/auth/logout',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository, jwt } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
        jwt: { verify: (token: string) => Promise<unknown> };
      };
      const controller = createUserController(
        userService,
        userRepository,
        undefined,
        undefined,
        async (refreshToken) =>
          revokeRefreshToken(refreshToken, async (token) => jwt.verify(token)),
      );
      const response = await controller.logout(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: { summary: '用户登出并撤销刷新令牌' },
      body: refreshTokenBodySchema,
      response: {
        200: logoutSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        500: apiErrorSchema,
      },
    },
  )
  .get(
    '/auth/profile',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.getProfile(ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '获取当前用户信息',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: profileSuccessSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .put(
    '/auth/profile',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.updateProfile(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '更新当前用户信息',
        security: [{ bearerAuth: [] }],
      },
      body: updateProfileBodySchema,
      response: {
        200: profileSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
      },
    },
  )
  .put(
    '/auth/password',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.updateCurrentPassword(
        body,
        ctx.request,
      );
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '修改当前用户密码',
        security: [{ bearerAuth: [] }],
      },
      body: updateCurrentPasswordBodySchema,
      response: {
        200: simpleUpdatedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
      },
    },
  )
  .get(
    '/users',
    async (ctx) => {
      const { query, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.list(query, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '分页查询用户列表',
        description: '需要管理员权限，支持关键字搜索与分页。',
        security: [{ bearerAuth: [] }],
      },
      query: pageQuerySchema,
      response: {
        200: usersPageSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
      },
    },
  )
  .get(
    '/permissions/current',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository, jwt } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
        jwt: { verify: (token: string) => Promise<unknown> };
      };
      const role = await getAuthorizedRole(
        ctx.request.headers.get('authorization'),
        async (token) => jwt.verify(token),
      );
      if (!role) {
        set.status = 401;
        return {
          code: 401000,
          message: 'Unauthorized',
          requestId: crypto.randomUUID(),
        };
      }
      const controller = createUserController(userService, userRepository);
      const response = await controller.listCurrentPermissions(
        role,
        ctx.request,
      );
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '获取当前用户权限码列表',
        description: '返回当前登录用户可访问的权限编码列表。',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: permissionCodesSuccessSchema,
        401: apiErrorSchema,
      },
    },
  )
  .get(
    '/permissions',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.listPermissions(ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '系统权限列表',
        description: '返回系统权限列表（需登录）。',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: permissionsListSuccessSchema,
        401: apiErrorSchema,
      },
    },
  )
  .get(
    '/menus/tree',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository, jwt } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
        jwt: { verify: (token: string) => Promise<unknown> };
      };
      const role = await getAuthorizedRole(
        ctx.request.headers.get('authorization'),
        async (token) => jwt.verify(token),
      );
      if (!role) {
        set.status = 401;
        return {
          code: 401000,
          message: 'Unauthorized',
          requestId: crypto.randomUUID(),
        };
      }
      const controller = createUserController(userService, userRepository);
      const response = await controller.getCurrentMenuTree(role, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '获取当前用户菜单树',
        description: '返回当前登录用户可见菜单树结构。',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: menuTreeSuccessSchema,
        401: apiErrorSchema,
      },
    },
  )
  .get(
    '/menus',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.listMenus(ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '系统菜单列表',
        description: '返回系统菜单列表（需登录）。',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: menusListSuccessSchema,
        401: apiErrorSchema,
      },
    },
  )
  .get(
    '/roles',
    async (ctx) => {
      const { set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.listRoles(ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '系统角色列表',
        description: '返回未删除的系统角色（需登录）。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: rolesListSuccessSchema,
        401: apiErrorSchema,
      },
    },
  )
  .post(
    '/roles',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.createRole(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '创建角色',
        description: '创建系统角色。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      body: roleBodySchema,
      response: {
        201: t.Object({
          code: t.Literal(0),
          message: t.String(),
          requestId: t.String(),
          data: roleListItemSchema,
        }),
        400: apiErrorSchema,
        401: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .put(
    '/roles/:id',
    async (ctx) => {
      const { body, params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.updateRole(params, body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '更新角色',
        description: '按角色 ID 更新角色信息。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      body: roleUpdateBodySchema,
      response: {
        200: t.Object({
          code: t.Literal(0),
          message: t.String(),
          requestId: t.String(),
          data: roleListItemSchema,
        }),
        400: apiErrorSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .patch(
    '/roles/:id/status',
    async (ctx) => {
      const { body, params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.updateRoleStatus(
        params,
        body,
        ctx.request,
      );
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '更新角色状态',
        description: '启用或禁用角色。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      body: roleStatusBodySchema,
      response: {
        200: t.Object({
          code: t.Literal(0),
          message: t.String(),
          requestId: t.String(),
          data: roleListItemSchema,
        }),
        400: apiErrorSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .delete(
    '/roles/:id',
    async (ctx) => {
      const { params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.removeRoleOne(params, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '删除角色',
        description: '按角色 ID 软删除角色。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      response: {
        200: deletedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .put(
    '/roles/:id/permissions',
    async (ctx) => {
      const { body, params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.assignRolePermissions(
        params,
        body,
        ctx.request,
      );
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '分配角色权限',
        description: '覆盖写入角色权限关系。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      body: roleAssignPermissionsBodySchema,
      response: {
        200: t.Object({
          code: t.Literal(0),
          message: t.String(),
          requestId: t.String(),
          data: t.Object({
            roleId: t.Number(),
          }),
        }),
        400: apiErrorSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .put(
    '/roles/:id/menus',
    async (ctx) => {
      const { body, params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.assignRoleMenus(
        params,
        body,
        ctx.request,
      );
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '分配角色菜单',
        description: '覆盖写入角色菜单关系。',
        tags: ['Role'],
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      body: roleAssignMenusBodySchema,
      response: {
        200: t.Object({
          code: t.Literal(0),
          message: t.String(),
          requestId: t.String(),
          data: t.Object({
            roleId: t.Number(),
          }),
        }),
        400: apiErrorSchema,
        401: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .get(
    '/users/all',
    async (ctx) => {
      const { query, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.listAll(query, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '查询全部用户列表',
        description: '需要管理员权限，返回完整用户列表。',
        security: [{ bearerAuth: [] }],
      },
      query: listQuerySchema,
      response: {
        200: usersAllSuccessSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
      },
    },
  )
  .post(
    '/users',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.create(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '创建用户',
        description: '需要管理员权限，创建新的后台用户。',
        security: [{ bearerAuth: [] }],
      },
      body: createUserBodySchema,
      response: {
        201: userSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .put(
    '/users/:id',
    async (ctx) => {
      const { body, params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.update(params, body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '更新指定用户',
        description: '需要管理员权限，按用户 ID 更新字段。',
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      body: updateUserBodySchema,
      response: {
        200: userSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .delete(
    '/users/:id',
    async (ctx) => {
      const { params, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.removeOne(params, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '删除指定用户',
        description: '需要管理员权限，按用户 ID 软删除用户。',
        security: [{ bearerAuth: [] }],
      },
      params: idParamSchema,
      response: {
        200: deletedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .delete(
    '/users',
    async (ctx) => {
      const { body, set } = ctx;
      const { userService, userRepository } = ctx as typeof ctx & {
        userService: UserService;
        userRepository: UserRepository;
      };
      const controller = createUserController(userService, userRepository);
      const response = await controller.removeBatch(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      detail: {
        summary: '批量删除用户',
        description: '需要管理员权限，按 ID 列表批量删除用户。',
        security: [{ bearerAuth: [] }],
      },
      body: batchDeleteBodySchema,
      response: {
        200: deletedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
      },
    },
  );
