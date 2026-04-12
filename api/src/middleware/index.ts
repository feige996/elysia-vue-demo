import { Elysia } from 'elysia';

const publicPaths = new Set(['/api/auth/login', '/api/articles', '/health']);

export const loggerMiddleware = new Elysia({ name: 'logger-middleware' }).onRequest((ctx) => {
    const { request } = ctx;
    const timestamp = new Date().toISOString();
    console.log(`[REQUEST] ${timestamp} ${request.method} ${new URL(request.url).pathname}`);
});

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
    .derive(({ request }) => {
        const authorization = request.headers.get('authorization');
        const isAuthorized = authorization === 'Bearer demo-token';
        return {
            authUser: isAuthorized
                ? {
                      id: 1,
                      name: 'Admin',
                      role: 'admin' as const,
                  }
                : null,
        };
    })
    .onBeforeHandle(({ path, authUser, set }) => {
        if (publicPaths.has(path)) return;
        if (!authUser) {
            set.status = 401;
            return {
                code: 401,
                message: 'Unauthorized',
            };
        }
    });

export const errorMiddleware = new Elysia({ name: 'error-middleware' }).onError((ctx) => {
    const { error, set } = ctx;
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    console.error(`[ERROR] ${new Date().toISOString()} ${errorMessage}`);
    set.status = 500;
    return {
        code: 500,
        message: errorMessage,
    };
});
