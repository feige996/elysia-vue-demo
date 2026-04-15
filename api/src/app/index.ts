import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { openapi } from '@elysiajs/openapi';
import { checkDatabaseHealth } from '../infra/db/client';
import { checkRedisHealth } from '../shared/auth/refresh-token-store';
import { env, features } from '../shared/config/env';
import { logService } from '../shared/logger/log.service';
import { failByKey, ok } from '../shared/types/http';
import { ensureRequestContext } from '../shared/types/request-context';
import {
  authMiddleware,
  errorMiddleware,
  loggerMiddleware,
  rateLimitMiddleware,
} from './middleware';
import { appModuleDefs, registerModules } from './module-registry';
import { diPlugin } from './plugins/di';

const defaultCorsOriginRules = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

const configuredCorsOrigins = (env.CORS_ALLOW_ORIGINS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter((item) => item.length > 0);

const corsOrigins =
  configuredCorsOrigins.length > 0
    ? configuredCorsOrigins
    : defaultCorsOriginRules;

const baseApp = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
          title: 'Harbor API',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${env.API_PORT}` }],
        tags: [
          { name: 'User', description: 'User and auth APIs' },
          { name: 'Role', description: 'RBAC role APIs' },
          { name: 'Article', description: 'Article CRUD APIs' },
          { name: 'File', description: 'File management APIs' },
          { name: 'System', description: 'System dict/config/audit APIs' },
        ],
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
        name: 'Harbor API',
        docs: '/docs',
        openapi: '/openapi.json',
        health: '/health',
        ready: '/ready',
      },
      'ok',
    ),
  )
  .get('/health', ({ request }) =>
    ok(ensureRequestContext(request).requestId, { status: 'ok' }, 'ok'),
  )
  .get('/ready', async ({ request, set }) => {
    const requestId = ensureRequestContext(request).requestId;
    const checks = {
      database: {
        enabled: true,
        ok: false,
        detail: '',
      },
      redis: {
        enabled: false,
        ok: true,
        detail: '',
      },
      monitor: {
        enabled: features.monitor,
        ok: true,
        detail: '',
      },
    };
    try {
      await checkDatabaseHealth();
      checks.database.ok = true;
      checks.database.detail = 'Database health check passed';
      const redisHealth = await checkRedisHealth();
      checks.redis.enabled = redisHealth.enabled;
      checks.redis.ok = redisHealth.ok;
      checks.redis.detail = redisHealth.detail;
      checks.monitor.detail = features.monitor
        ? 'Enabled by feature flag'
        : 'Disabled by feature flag';
      const notReadyDependencies = Object.entries(checks)
        .filter(([, value]) => value.enabled && !value.ok)
        .map(([key]) => key);

      if (notReadyDependencies.length > 0) {
        const result = failByKey(
          requestId,
          'SERVICE_UNAVAILABLE',
          `Not ready: ${notReadyDependencies.join(', ')}`,
        );
        set.status = result.status;
        return {
          ...result.payload,
          data: {
            status: 'not_ready',
            checks,
            notReadyDependencies,
          },
        };
      }
      return ok(
        requestId,
        {
          status: 'ready',
          checks,
        },
        'ok',
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.database.ok = false;
      checks.database.detail = detail;
      const result = failByKey(
        requestId,
        'SERVICE_UNAVAILABLE',
        'Not ready: database',
      );
      set.status = result.status;
      return {
        ...result.payload,
        data: {
          status: 'not_ready',
          checks,
          notReadyDependencies: ['database'],
        },
      };
    }
  });

const { app, enabledModuleIds } = registerModules(
  baseApp as any,
  appModuleDefs,
  features,
) as { app: typeof baseApp; enabledModuleIds: string[] };

logService.info('API modules registered', { enabledModules: enabledModuleIds });

export { app };

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
