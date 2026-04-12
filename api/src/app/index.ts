import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { articleModule } from '../modules/article';
import { userModule } from '../modules/user';
import { ok } from '../shared/types/http';
import { ensureRequestContext } from '../shared/types/request-context';
import { authMiddleware, errorMiddleware, loggerMiddleware } from './middleware';
import { diPlugin, logService } from './plugins/di';

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
    .use(userModule)
    .use(articleModule);

export type AppType = typeof app;

if (import.meta.main) {
    const parsedPort = Number.parseInt(process.env.API_PORT ?? '', 10);
    const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
    app.listen(port);
    logService.info('Database is running with postgres');
    logService.info('API server is running', { url: `http://localhost:${port}` });
}
