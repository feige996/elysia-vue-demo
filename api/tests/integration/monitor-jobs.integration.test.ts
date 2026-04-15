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

describe('Monitor job center integration', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('returns jobs list with scheduling fields', async () => {
    const token = await loginAsAdmin();
    const response = await integrationApp.handle(
      new Request('http://localhost/api/monitor/jobs', {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    const payload =
      await expectJson<ApiResponse<Array<Record<string, unknown>>>>(response);
    expect(response.status).toBe(200);
    expect(payload.code).toBe(0);
    expect(Array.isArray(payload.data)).toBeTrue();
    if (payload.data.length > 0) {
      expect(Object.hasOwn(payload.data[0], 'nextRunAt')).toBeTrue();
      expect(Object.hasOwn(payload.data[0], 'runCount')).toBeTrue();
    }
  });

  it('supports create -> toggle -> run chain', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const name = `it_job_${uniq}`;

    const createResponse = await sendJson(
      'http://localhost/api/monitor/jobs',
      'POST',
      {
        name,
        cron: '*/5 * * * *',
        status: 1,
        args: '{"source":"integration"}',
      },
      authHeaders,
    );
    expect(createResponse.status).toBe(201);
    const createdPayload =
      await expectJson<
        ApiResponse<{ id: number; status: number; runCount: number }>
      >(createResponse);
    const jobId = createdPayload.data.id;
    expect(createdPayload.data.status).toBe(1);

    const disableResponse = await sendJson(
      `http://localhost/api/monitor/jobs/${jobId}/toggle`,
      'POST',
      { status: 0 },
      authHeaders,
    );
    expect(disableResponse.status).toBe(200);
    const disablePayload =
      await expectJson<ApiResponse<{ status: number }>>(disableResponse);
    expect(disablePayload.data.status).toBe(0);

    const runResponse = await sendJson(
      `http://localhost/api/monitor/jobs/${jobId}/run`,
      'POST',
      undefined,
      authHeaders,
    );
    expect(runResponse.status).toBe(200);
    const runPayload =
      await expectJson<
        ApiResponse<{ runCount: number; lastRunMessage: string | null }>
      >(runResponse);
    expect(runPayload.data.runCount).toBe(createdPayload.data.runCount + 1);
    expect(runPayload.data.lastRunMessage).toContain('manual trigger success');
  });

  it('rejects duplicate job name', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const name = `it_job_unique_${uniq}`;

    const firstCreate = await sendJson(
      'http://localhost/api/monitor/jobs',
      'POST',
      { name, cron: '0 * * * *' },
      authHeaders,
    );
    expect(firstCreate.status).toBe(201);

    const duplicateCreate = await sendJson(
      'http://localhost/api/monitor/jobs',
      'POST',
      { name, cron: '*/10 * * * *' },
      authHeaders,
    );
    const duplicatePayload = await expectJson<{ message: string }>(
      duplicateCreate,
    );
    expect(duplicateCreate.status).toBe(409);
    expect(duplicatePayload.message).toContain('already exists');
  });
});
