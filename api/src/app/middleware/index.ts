import { Elysia } from 'elysia';
import { isAuthorizedToken } from '../../shared/auth/token-auth';
import { logService } from '../../shared/logger/log.service';
import { AppCode, fail } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

const publicPaths = new Set(['/api/auth/login', '/api/articles', '/health']);

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
            durationMs
        });
    });

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).onRequest(({ request, set }) => {
    const path = new URL(request.url).pathname;
    if (publicPaths.has(path)) return;

    if (isAuthorizedToken(request.headers.get('authorization'))) return;

    set.status = 401;
    const { requestId } = ensureRequestContext(request);
    return fail(requestId, AppCode.UNAUTHORIZED, 'Unauthorized');
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
        errorMessage
    });
    set.status = 500;
    return fail(requestId, AppCode.INTERNAL_ERROR, errorMessage);
});
