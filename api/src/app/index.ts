import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { articleModule } from '../modules/article';
import { checkDatabaseHealth } from '../infra/db/client';
import { logService } from '../shared/logger/log.service';
import { userModule } from '../modules/user';
import { ok } from '../shared/types/http';
import { ensureRequestContext } from '../shared/types/request-context';
import { authMiddleware, errorMiddleware, loggerMiddleware } from './middleware';
import { diPlugin } from './plugins/di';

const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Elysia Demo API',
        version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${process.env.API_PORT ?? '3000'}` }],
    paths: {
        '/health': { get: { summary: 'Health check' } },
        '/api/auth/login': { post: { summary: 'Login' } },
        '/api/users': {
            get: { summary: 'List users (paged)' },
            post: { summary: 'Create user' },
            delete: { summary: 'Batch delete users' },
        },
        '/api/users/all': { get: { summary: 'List all users' } },
        '/api/users/{id}': {
            put: { summary: 'Update user by id' },
            delete: { summary: 'Delete user by id' },
        },
        '/api/articles': {
            get: { summary: 'List articles (paged)' },
            post: { summary: 'Create article' },
            delete: { summary: 'Batch delete articles' },
        },
        '/api/articles/all': { get: { summary: 'List all articles' } },
        '/api/articles/{id}': {
            put: { summary: 'Update article by id' },
            delete: { summary: 'Delete article by id' },
        },
    },
};

export const app = new Elysia()
    .use(
        cors({
            origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }),
    )
    .use(diPlugin)
    .use(loggerMiddleware)
    .use(errorMiddleware)
    .use(authMiddleware)
    .get('/health', ({ request }) => ok(ensureRequestContext(request).requestId, { status: 'ok' }, 'ok'))
    .get('/openapi.json', () => openApiSpec)
    .get('/docs', () =>
        new Response(
            `<!doctype html><html><head><meta charset="utf-8"/><title>API Docs</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui'});</script></body></html>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' } }
        )
    )
    .use(userModule)
    .use(articleModule);

export type AppType = typeof app;

if (import.meta.main) {
    const startServer = async () => {
        const parsedPort = Number.parseInt(process.env.API_PORT ?? '', 10);
        const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
        const isProduction = process.env.NODE_ENV === 'production';
        try {
            await checkDatabaseHealth();
            logService.info('Database health check passed');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isProduction) {
                throw error;
            }
            logService.warn('Database health check failed in non-production mode', { error: message });
        }
        app.listen(port);
        logService.info('API server is running', { url: `http://localhost:${port}` });
    };

    startServer().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logService.error('Database health check failed', { error: message });
        process.exit(1);
    });
}
