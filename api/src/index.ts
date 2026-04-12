import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { di } from 'elysia-di';
import { createDatabaseAdapter } from './infra/db/database-adapter';
import { loggerMiddleware, authMiddleware, errorMiddleware } from './middleware';
import { articleModule } from './modules/article';
import { userModule } from './modules/user';
import { ArticleRepository } from './repositories/article.repository';
import { UserRepository } from './repositories/user.repository';
import { LogService } from './services/log.service';
import { UserService } from './services/user.service';
import { ok } from './shared/http';
import { ensureRequestContext } from './shared/request-context';

const logService = new LogService();
const databaseAdapter = createDatabaseAdapter();
const userRepository = new UserRepository(databaseAdapter);
const articleRepository = new ArticleRepository(databaseAdapter);
const userService = new UserService(userRepository, logService);

export const app = new Elysia()
    .use(
        cors({
            origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }),
    )
    .use(
        di({
            instances: [
                {
                    identifier: 'logService',
                    instance: logService,
                },
                {
                    identifier: 'userRepository',
                    instance: userRepository,
                },
                {
                    identifier: 'userService',
                    instance: userService,
                },
                {
                    identifier: 'articleRepository',
                    instance: articleRepository,
                },
            ],
        }),
    )
    .use(loggerMiddleware)
    .use(errorMiddleware)
    .use(authMiddleware)
    .get('/health', ({ request }) => ok(ensureRequestContext(request).requestId, { status: 'ok' }, 'ok'))
    .use(userModule)
    .use(articleModule);

export type AppType = typeof app;

if (import.meta.main) {
    app.listen(3000);
    console.log(`Database adapter is running with ${databaseAdapter.client}`);
    console.log('API server is running at http://localhost:3000');
}
