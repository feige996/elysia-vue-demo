import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { getAuthorizedRole } from '../../shared/auth/token-auth';
import { env } from '../../shared/config/env';
import { logService } from '../../shared/logger/log.service';
import { ErrorKey, failByKey } from '../../shared/types/http';
import {
  ensureRequestContext,
  setAuthorizedRoleInContext,
} from '../../shared/types/request-context';
import { db } from '../../infra/db/client';
import { sysAuditLogsTable } from '../../infra/db/schema';

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

const requireAdminRoute = (path: string) =>
  path.startsWith('/api/users') ||
  path.startsWith('/api/dicts') ||
  path.startsWith('/api/configs') ||
  path.startsWith('/api/audit-logs') ||
  (path.startsWith('/api/articles') &&
    path !== '/api/articles' &&
    path !== '/api/articles/all');

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
    const { authorizedRole } = ensureRequestContext(request);
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
          operatorAccount: authorizedRole ?? null,
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
    if (isPublicRoute(method, path)) return;
    const role = await getAuthorizedRole(
      request.headers.get('authorization'),
      async (token) => jwt.verify(token),
    );
    if (!role) {
      const { requestId } = ensureRequestContext(request);
      const unauthorized = failByKey(requestId, ErrorKey.UNAUTHORIZED);
      set.status = unauthorized.status;
      return unauthorized.payload;
    }
    setAuthorizedRoleInContext(request, role);
    if (requireAdminRoute(path) && role !== 'admin') {
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

export const rateLimitMiddleware = rateLimit({
  max: env.RATE_LIMIT_MAX,
  duration: env.RATE_LIMIT_DURATION,
  errorResponse: (() => {
    const requestId = crypto.randomUUID();
    const response = failByKey(requestId, ErrorKey.RATE_LIMITED);
    return new Response(JSON.stringify(response.payload), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  })(),
});
