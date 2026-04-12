import { Elysia } from 'elysia';
import { isAuthorizedToken } from '../../shared/auth/token-auth';
import { AppCode, fail } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

const publicPaths = new Set(['/api/auth/login', '/api/articles', '/health']);

export const loggerMiddleware = new Elysia({ name: 'logger-middleware' })
    .onRequest(({ request }) => {
        const { requestId } = ensureRequestContext(request);
        const path = new URL(request.url).pathname;
        console.log(
            JSON.stringify({
                level: 'info',
                event: 'request_received',
                requestId,
                method: request.method,
                path,
                timestamp: new Date().toISOString()
            })
        );
    })
    .onAfterHandle(({ request, set }) => {
        const { requestId, requestStartedAt } = ensureRequestContext(request);
        const path = new URL(request.url).pathname;
        const status = typeof set.status === 'number' ? set.status : 200;
        const durationMs = Date.now() - requestStartedAt;
        console.log(
            JSON.stringify({
                level: 'info',
                event: 'request_completed',
                requestId,
                method: request.method,
                path,
                status,
                durationMs,
                timestamp: new Date().toISOString()
            })
        );
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
    console.error(
        JSON.stringify({
            level: 'error',
            event: 'request_failed',
            requestId,
            method: request.method,
            path,
            status: 500,
            errorCode: code,
            errorMessage,
            timestamp: new Date().toISOString()
        })
    );
    set.status = 500;
    return fail(requestId, AppCode.INTERNAL_ERROR, errorMessage);
});
