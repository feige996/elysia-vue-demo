import { Elysia } from 'elysia';
import { getAuthorizedRole } from '../../shared/auth/token-auth';
import { logService } from '../../shared/logger/log.service';
import { ErrorKey, failByKey } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

const isPublicRoute = (method: string, path: string) => {
    if (path === '/health' || path === '/openapi.json' || path === '/docs') return true;
    if (method === 'POST' && path === '/api/auth/login') return true;
    if (method === 'GET' && (path === '/api/articles' || path === '/api/articles/all')) return true;
    return false;
};

const requireAdminRoute = (path: string) =>
    path.startsWith('/api/users') || (path.startsWith('/api/articles') && path !== '/api/articles' && path !== '/api/articles/all');

export const loggerMiddleware = new Elysia({ name: 'logger-middleware' })
    .onRequest(({ request }) => {
        const { requestId } = ensureRequestContext(request);
        const path = new URL(request.url).pathname;
        logService.info('request_received', { event: 'request_received', requestId, method: request.method, path });
    })
    .onAfterHandle(({ request, set }) => {
        const { requestId, requestStartedAt } = ensureRequestContext(request);
        const path = new URL(request.url).pathname;
        const status = typeof set.status === 'number' ? set.status : 200;
        const durationMs = Date.now() - requestStartedAt;
        logService.info('request_completed', {
            event: 'request_completed',
            requestId,
            method: request.method,
            path,
            status,
            durationMs,
        });
    });

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).onRequest(({ request, set }) => {
    const path = new URL(request.url).pathname;
    const method = request.method.toUpperCase();
    if (isPublicRoute(method, path)) return;
    const role = getAuthorizedRole(request.headers.get('authorization'));
    if (!role) {
        const { requestId } = ensureRequestContext(request);
        const unauthorized = failByKey(requestId, ErrorKey.UNAUTHORIZED);
        set.status = unauthorized.status;
        return unauthorized.payload;
    }
    if (requireAdminRoute(path) && role !== 'admin') {
        const { requestId } = ensureRequestContext(request);
        const forbidden = failByKey(requestId, ErrorKey.FORBIDDEN);
        set.status = forbidden.status;
        return forbidden.payload;
    }

    return;
});

export const errorMiddleware = new Elysia({ name: 'error-middleware' }).onError((ctx) => {
    const { error, set, request, code } = ctx;
    const { requestId } = ensureRequestContext(request);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
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
    const internalError = failByKey(requestId, ErrorKey.INTERNAL_ERROR, errorMessage);
    set.status = internalError.status;
    return internalError.payload;
});
