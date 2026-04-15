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

describe('Dict API integration', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('supports create type -> create item -> query items chain', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const dictCode = `it_chain_${uniq}`;

    const createTypeResponse = await sendJson(
      'http://localhost/api/dict-types',
      'POST',
      {
        code: dictCode,
        name: `集成链路字典-${uniq}`,
        status: 1,
      },
      authHeaders,
    );
    expect(createTypeResponse.status).toBe(201);
    const createTypePayload = await expectJson<
      ApiResponse<{
        id: number;
        code: string;
        name: string;
        status: number;
        remark: string | null;
      }>
    >(createTypeResponse);
    expect(createTypePayload.code).toBe(0);

    const dictTypeId = createTypePayload.data.id;

    const createItemResponse = await sendJson(
      'http://localhost/api/dict-items',
      'POST',
      {
        dictTypeId,
        label: '链路测试项',
        value: `chain_${uniq}`,
        sort: 10,
      },
      authHeaders,
    );
    expect(createItemResponse.status).toBe(201);
    const createItemPayload = await expectJson<
      ApiResponse<{
        id: number;
        dictTypeId: number;
        label: string;
        value: string;
      }>
    >(createItemResponse);
    expect(createItemPayload.code).toBe(0);

    const listItemsResponse = await integrationApp.handle(
      new Request(`http://localhost/api/dict-items?dictTypeId=${dictTypeId}`, {
        headers: authHeaders,
      }),
    );
    const listItemsPayload =
      await expectJson<
        ApiResponse<Array<{ id: number; dictTypeId: number; value: string }>>
      >(listItemsResponse);
    expect(listItemsResponse.status).toBe(200);
    expect(listItemsPayload.code).toBe(0);
    expect(
      listItemsPayload.data.some(
        (item) =>
          item.id === createItemPayload.data.id &&
          item.value === `chain_${uniq}`,
      ),
    ).toBeTrue();
  });

  it('enforces unique dict type code', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const dictCode = `it_unique_${uniq}`;

    const firstCreateResponse = await sendJson(
      'http://localhost/api/dict-types',
      'POST',
      {
        code: dictCode,
        name: `唯一校验字典-${uniq}`,
      },
      authHeaders,
    );
    expect(firstCreateResponse.status).toBe(201);

    const duplicateResponse = await sendJson(
      'http://localhost/api/dict-types',
      'POST',
      {
        code: dictCode,
        name: `唯一校验字典-重复-${uniq}`,
      },
      authHeaders,
    );
    const duplicatePayload = await expectJson<{
      code: number;
      message: string;
      requestId: string;
    }>(duplicateResponse);
    expect(duplicateResponse.status).toBe(409);
    expect(duplicatePayload.message).toContain('already exists');
  });

  it('blocks deleting dict type when items still exist', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const dictCode = `it_delete_guard_${uniq}`;

    const createTypeResponse = await sendJson(
      'http://localhost/api/dict-types',
      'POST',
      {
        code: dictCode,
        name: `删除保护字典-${uniq}`,
      },
      authHeaders,
    );
    expect(createTypeResponse.status).toBe(201);
    const createTypePayload = await expectJson<
      ApiResponse<{
        id: number;
      }>
    >(createTypeResponse);
    const dictTypeId = createTypePayload.data.id;

    const createItemResponse = await sendJson(
      'http://localhost/api/dict-items',
      'POST',
      {
        dictTypeId,
        label: '删除保护项',
        value: 'guard',
        sort: 1,
      },
      authHeaders,
    );
    expect(createItemResponse.status).toBe(201);
    const createItemPayload = await expectJson<
      ApiResponse<{
        id: number;
      }>
    >(createItemResponse);

    const deleteTypeBlockedResponse = await sendJson(
      `http://localhost/api/dict-types/${dictTypeId}`,
      'DELETE',
      undefined,
      authHeaders,
    );
    const deleteTypeBlockedPayload = await expectJson<{
      code: number;
      message: string;
    }>(deleteTypeBlockedResponse);
    expect(deleteTypeBlockedResponse.status).toBe(409);
    expect(deleteTypeBlockedPayload.message).toContain(
      'delete dict items first',
    );

    const deleteItemResponse = await sendJson(
      `http://localhost/api/dict-items/${createItemPayload.data.id}`,
      'DELETE',
      undefined,
      authHeaders,
    );
    expect(deleteItemResponse.status).toBe(200);

    const deleteTypeResponse = await sendJson(
      `http://localhost/api/dict-types/${dictTypeId}`,
      'DELETE',
      undefined,
      authHeaders,
    );
    expect(deleteTypeResponse.status).toBe(200);
  });

  it('validates dict item sort range', async () => {
    const token = await loginAsAdmin();
    const authHeaders = { authorization: `Bearer ${token}` };
    const uniq = Date.now();
    const dictCode = `it_sort_${uniq}`;

    const createTypeResponse = await sendJson(
      'http://localhost/api/dict-types',
      'POST',
      {
        code: dictCode,
        name: `排序校验字典-${uniq}`,
      },
      authHeaders,
    );
    expect(createTypeResponse.status).toBe(201);
    const createTypePayload = await expectJson<
      ApiResponse<{
        id: number;
      }>
    >(createTypeResponse);

    const createItemResponse = await sendJson(
      'http://localhost/api/dict-items',
      'POST',
      {
        dictTypeId: createTypePayload.data.id,
        label: '非法排序项',
        value: 'invalid-sort',
        sort: 10000,
      },
      authHeaders,
    );
    expect(createItemResponse.status).toBe(422);
  });
});
