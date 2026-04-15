import { beforeAll, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import {
  authMiddleware,
  errorMiddleware,
  loggerMiddleware,
} from '../../src/app/middleware';
import { diPlugin } from '../../src/app/plugins/di';
import { seedDatabase } from '../../src/infra/db/client';
import { monitorModule } from '../../src/modules/monitor';
import { userModule } from '../../src/modules/user';
import { env } from '../../src/shared/config/env';

type ApiResponse<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T;
};

const integrationApp = new Elysia()
  .use(diPlugin)
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
    }),
  )
  .use(loggerMiddleware)
  .use(errorMiddleware)
  .use(authMiddleware)
  .use(userModule)
  .use(monitorModule);

const sendJson = async (
  url: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
) =>
  integrationApp.handle(
    new Request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );

const expectJson = async <T>(response: Response): Promise<T> => {
  const raw = await response.text();
  return JSON.parse(raw) as T;
};

const loginAsAdmin = async () => {
  const response = await sendJson('http://localhost/api/auth/login', 'POST', {
    account: 'admin',
    password: 'admin123',
  });
  const payload = await expectJson<
    ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>
  >(response);
  expect(response.status).toBe(200);
  return payload.data.accessToken;
};

describe('Monitor P1 integration', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('returns dashboard summary and trend', async () => {
    const token = await loginAsAdmin();
    const headers = { authorization: `Bearer ${token}` };
    const summaryResponse = await integrationApp.handle(
      new Request('http://localhost/api/monitor/dashboard/summary', {
        headers,
      }),
    );
    const summary =
      await expectJson<ApiResponse<Record<string, unknown>>>(summaryResponse);
    expect(summaryResponse.status).toBe(200);
    expect(typeof summary.data.todayLoginCount).toBe('number');
    expect(typeof summary.data.onlineUserCount).toBe('number');

    const trendResponse = await integrationApp.handle(
      new Request(
        'http://localhost/api/monitor/dashboard/operation-trend?days=7',
        {
          headers,
        },
      ),
    );
    const trend =
      await expectJson<
        ApiResponse<Array<{ date: string; success: number; failed: number }>>
      >(trendResponse);
    expect(trendResponse.status).toBe(200);
    expect(Array.isArray(trend.data)).toBeTrue();
    expect(trend.data.length).toBe(7);
  });

  it('supports storage config read update and test', async () => {
    const token = await loginAsAdmin();
    const headers = { authorization: `Bearer ${token}` };
    const configResponse = await integrationApp.handle(
      new Request('http://localhost/api/monitor/storage/config', { headers }),
    );
    const config =
      await expectJson<ApiResponse<Record<string, unknown>>>(configResponse);
    expect(configResponse.status).toBe(200);
    expect(typeof config.data.providerReady).toBe('boolean');

    const updateResponse = await sendJson(
      'http://localhost/api/monitor/storage/config',
      'PUT',
      {
        type: 'local',
        local: { baseDir: 'uploads', baseUrl: 'http://localhost:9000/uploads' },
        oss: {},
        cos: {},
      },
      headers,
    );
    expect(updateResponse.status).toBe(200);

    const testResponse = await sendJson(
      'http://localhost/api/monitor/storage/test',
      'POST',
      {
        type: 'local',
        local: { baseDir: 'uploads', baseUrl: 'http://localhost:9000/uploads' },
        oss: {},
        cos: {},
      },
      headers,
    );
    const tested =
      await expectJson<ApiResponse<{ success: boolean }>>(testResponse);
    expect(testResponse.status).toBe(200);
    expect(tested.data.success).toBeTrue();
  });
});
