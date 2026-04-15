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
import { systemModule } from '../../src/modules/system';
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
  .use(systemModule);

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
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Expected JSON but got status=${response.status}, body=${raw.slice(0, 300)}`,
    );
  }
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
  expect(payload.code).toBe(0);
  return payload.data.accessToken;
};

describe('System ops API integration', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('supports querying login logs', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };

    const response = await integrationApp.handle(
      new Request('http://localhost/api/login-logs?page=1&pageSize=20', {
        headers: authHeaders,
      }),
    );
    const payload = await expectJson<
      ApiResponse<{
        list: Array<{ id: number; account: string | null; success: number }>;
        total: number;
        page: number;
        pageSize: number;
      }>
    >(response);
    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(Array.isArray(payload.data.list)).toBeTrue();
  });

  it('supports querying api catalog', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };

    const response = await integrationApp.handle(
      new Request(
        'http://localhost/api/api-catalog?page=1&pageSize=20&module=system',
        {
          headers: authHeaders,
        },
      ),
    );
    const payload = await expectJson<
      ApiResponse<{
        list: Array<{ id: number; code: string; module: string }>;
        total: number;
        page: number;
        pageSize: number;
      }>
    >(response);
    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(Array.isArray(payload.data.list)).toBeTrue();
  });
});
