import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { openapi } from '@elysiajs/openapi';
import { articleModule } from '../modules/article';
import { fileModule } from '../modules/file';
import { checkDatabaseHealth } from '../infra/db/client';
import { env } from '../shared/config/env';
import { logService } from '../shared/logger/log.service';
import { userModule } from '../modules/user';
import { ok } from '../shared/types/http';
import { ensureRequestContext } from '../shared/types/request-context';
import {
  authMiddleware,
  errorMiddleware,
  loggerMiddleware,
  rateLimitMiddleware,
} from './middleware';
import { diPlugin } from './plugins/di';

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
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
    }),
  )
  .use(
    openapi({
      path: '/docs',
      specPath: '/openapi.json',
      documentation: {
        info: {
          title: 'Elysia Demo API',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${env.API_PORT}` }],
      },
    }),
  )
  .use(diPlugin)
  .use(rateLimitMiddleware)
  .use(loggerMiddleware)
  .use(errorMiddleware)
  .use(authMiddleware)
  .get('/', ({ request }) =>
    ok(
      ensureRequestContext(request).requestId,
      {
        name: 'Elysia Demo API',
        docs: '/docs',
        openapi: '/openapi.json',
        health: '/health',
      },
      'ok',
    ),
  )
  .get('/health', ({ request }) =>
    ok(ensureRequestContext(request).requestId, { status: 'ok' }, 'ok'),
  )
  .use(userModule)
  .use(articleModule)
  .use(fileModule);

export type AppType = typeof app;

if (import.meta.main) {
  const startServer = async () => {
    const port = env.API_PORT;
    const isProduction = env.NODE_ENV === 'production';
    try {
      await checkDatabaseHealth();
      logService.info('Database health check passed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isProduction) {
        throw error;
      }
      logService.warn('Database health check failed in non-production mode', {
        error: message,
      });
    }
    app.listen(port);
    logService.info('API server is running', {
      url: `http://localhost:${port}`,
    });
  };

  startServer().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    logService.error('Database health check failed', { error: message });
    process.exit(1);
  });
}
