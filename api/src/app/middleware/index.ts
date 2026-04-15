import { Elysia } from 'elysia';
import { getAuthorizedIdentity } from '../../shared/auth/token-auth';
import { env, features } from '../../shared/config/env';
import { logService } from '../../shared/logger/log.service';
import {
  isIpBlocked,
  markBlockedIpHit,
} from '../../shared/security/ip-blacklist-store';
import { ErrorKey, failByKey } from '../../shared/types/http';
import {
  ensureRequestContext,
  setAuthorizedRoleInContext,
  setAuthorizedUserInContext,
} from '../../shared/types/request-context';
import { db } from '../../infra/db/client';
import { sysAuditLogsTable } from '../../infra/db/schema';
import { touchOnlineSession } from '../../shared/monitor/online-session-store';

const isPublicRoute = (method: string, path: string) => {
  if (path === '/') return true;
  if (
    path === '/health' ||
    path === '/ready' ||
    path === '/openapi.json' ||
    path === '/docs'
  )
    return true;
  if (
    method === 'POST' &&
    (path === '/api/auth/login' ||
      path === '/api/auth/refresh' ||
      path === '/api/auth/logout')
  )
    return true;
  if (
    method === 'GET' &&
    (path === '/api/articles' || path === '/api/articles/all')
  )
    return true;
  return false;
};

const requireAdminRoute = (method: string, path: string) => {
  if (path.startsWith('/api/dict')) return true;
  if (path.startsWith('/api/depts')) return true;
  if (path.startsWith('/api/configs')) return true;
  if (path.startsWith('/api/audit-logs')) return true;
  if (path.startsWith('/api/monitor')) return true;
  if (path.startsWith('/api/roles')) return false;
  if (path.startsWith('/api/users')) {
    if (
      method === 'GET' &&
      (path === '/api/users' || path === '/api/users/all')
    ) {
      return false;
    }
    return true;
  }
  return (
    path.startsWith('/api/articles') &&
    path !== '/api/articles' &&
    path !== '/api/articles/all'
  );
};

const resolveClientIpForBlacklist = (request: Request) => {
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

const isLoginRequestBlockedByIp = async (
  request: Request,
  method: string,
  path: string,
) => {
  if (!features.ipBlacklist) return false;
  if (!(method === 'POST' && path === '/api/auth/login')) return false;
  const ip = resolveClientIpForBlacklist(request);
  if (!ip || ip === 'unknown') return false;
  return await isIpBlocked(ip);
};

const resolveAuditModule = (path: string) => {
  const normalized = path.replace(/^\/api\//, '');
  const [first] = normalized.split('/');
  return first || 'app';
};

export const loggerMiddleware = new Elysia({ name: 'logger-middleware' })
  .onRequest(({ request }) => {
    const { requestId } = ensureRequestContext(request);
    const path = new URL(request.url).pathname;
    logService.info('request_received', {
      event: 'request_received',
      requestId,
      method: request.method,
      path,
    });
  })
  .onAfterHandle(async ({ request, set }) => {
    const { requestId, requestStartedAt } = ensureRequestContext(request);
    const path = new URL(request.url).pathname;
    const status = typeof set.status === 'number' ? set.status : 200;
    const durationMs = Date.now() - requestStartedAt;
    const { authorizedRole, authorizedUserId, authorizedAccount } =
      ensureRequestContext(request);
    logService.info('request_completed', {
      event: 'request_completed',
      requestId,
      method: request.method,
      path,
      status,
      durationMs,
      role: authorizedRole,
    });

    if (path.startsWith('/api/') && path !== '/api/audit-logs') {
      try {
        await db.insert(sysAuditLogsTable).values({
          traceId: requestId,
          action: request.method.toUpperCase(),
          module: resolveAuditModule(path),
          resource: path,
          requestMethod: request.method.toUpperCase(),
          requestPath: path,
          responseCode: status,
          success: status < 400 ? 1 : 0,
          durationMs,
          operatorUserId: authorizedUserId ?? null,
          operatorAccount: authorizedAccount ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logService.warn('audit_log_write_failed', {
          requestId,
          path,
          error: message,
        });
      }
    }
  });

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).onRequest(
  async (ctx) => {
    const { request, set, jwt } = ctx as typeof ctx & {
      jwt: { verify: (token: string) => Promise<unknown> };
    };
    const path = new URL(request.url).pathname;
    const method = request.method.toUpperCase();
    if (await isLoginRequestBlockedByIp(request, method, path)) {
      const ip = resolveClientIpForBlacklist(request);
      if (ip && ip !== 'unknown') {
        await markBlockedIpHit(ip);
      }
      const { requestId } = ensureRequestContext(request);
      const forbidden = failByKey(
        requestId,
        ErrorKey.FORBIDDEN,
        'IP is blocked',
      );
      set.status = forbidden.status;
      return forbidden.payload;
    }
    if (isPublicRoute(method, path)) return;
    const identity = await getAuthorizedIdentity(
      request.headers.get('authorization'),
      async (token) => jwt.verify(token),
    );
    if (!identity) {
      const { requestId } = ensureRequestContext(request);
      const unauthorized = failByKey(requestId, ErrorKey.UNAUTHORIZED);
      set.status = unauthorized.status;
      return unauthorized.payload;
    }
    setAuthorizedRoleInContext(request, identity.role);
    setAuthorizedUserInContext(request, identity.userId, identity.account);
    touchOnlineSession(request, identity);
    if (requireAdminRoute(method, path) && identity.role !== 'admin') {
      const { requestId } = ensureRequestContext(request);
      const forbidden = failByKey(requestId, ErrorKey.FORBIDDEN);
      set.status = forbidden.status;
      return forbidden.payload;
    }

    return;
  },
);

export const errorMiddleware = new Elysia({ name: 'error-middleware' }).onError(
  (ctx) => {
    const { error, set, request, code } = ctx;
    const { requestId } = ensureRequestContext(request);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    const path = new URL(request.url).pathname;
    logService.error('request_failed', {
      event: 'request_failed',
      requestId,
      method: request.method,
      path,
      status: 500,
      errorCode: code,
      errorMessage,
    });
    const internalError = failByKey(
      requestId,
      ErrorKey.INTERNAL_ERROR,
      errorMessage,
    );
    set.status = internalError.status;
    return internalError.payload;
  },
);

type RateLimitProfile = {
  key: 'auth' | 'write' | 'read' | 'default';
  max: number;
  durationMs: number;
};

const rateLimitBuckets = new Map<
  string,
  { count: number; expiresAt: number }
>();

const resolveRateLimitProfile = (
  method: string,
  path: string,
): RateLimitProfile => {
  if (
    method === 'POST' &&
    (path === '/api/auth/login' ||
      path === '/api/auth/refresh' ||
      path === '/api/auth/logout')
  ) {
    return {
      key: 'auth',
      max: env.RATE_LIMIT_MAX_AUTH,
      durationMs: env.RATE_LIMIT_DURATION,
    };
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return {
      key: 'write',
      max: env.RATE_LIMIT_MAX_WRITE,
      durationMs: env.RATE_LIMIT_DURATION,
    };
  }
  if (method === 'GET') {
    return {
      key: 'read',
      max: env.RATE_LIMIT_MAX_READ,
      durationMs: env.RATE_LIMIT_DURATION,
    };
  }
  return {
    key: 'default',
    max: env.RATE_LIMIT_MAX,
    durationMs: env.RATE_LIMIT_DURATION,
  };
};

const resolveClientId = (request: Request) => {
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

export const rateLimitMiddleware = new Elysia({
  name: 'rate-limit-middleware',
}).onRequest(({ request, set }) => {
  const method = request.method.toUpperCase();
  const path = new URL(request.url).pathname;
  const profile = resolveRateLimitProfile(method, path);
  const requestId = ensureRequestContext(request).requestId;
  const now = Date.now();
  const clientId = resolveClientId(request);
  const bucketKey = `${clientId}:${profile.key}`;
  const existing = rateLimitBuckets.get(bucketKey);
  if (!existing || existing.expiresAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      expiresAt: now + profile.durationMs,
    });
    return;
  }
  if (existing.count >= profile.max) {
    const response = failByKey(requestId, ErrorKey.RATE_LIMITED);
    set.status = response.status;
    return response.payload;
  }
  existing.count += 1;
});
