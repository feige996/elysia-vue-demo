import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { di } from 'elysia-di';
import { authMiddleware, errorMiddleware, loggerMiddleware } from '../../src/app/middleware';
import { articleModule } from '../../src/modules/article';
import { userModule } from '../../src/modules/user';
import { ok, AppCode } from '../../src/shared/types/http';
import { ensureRequestContext } from '../../src/shared/types/request-context';

const users = [
    { id: 1, account: 'admin', name: 'Admin', role: 'admin' as const },
    { id: 2, account: 'editor', name: 'Editor', role: 'editor' as const },
    { id: 3, account: 'alice', name: 'Alice', role: 'editor' as const },
];

const articles = [
    { id: 1, title: 'Elysia + Bun 快速启动', author: 'Admin' },
    { id: 2, title: 'Vue3 + Alova 请求实践', author: 'Editor' },
    { id: 3, title: '前后端类型共享方案', author: 'Admin' },
];

const userService = {
    async login(account: string, password: string) {
        const user = users.find((item) => item.account === account);
        if (!user) return null;
        if (password !== `${account}123`) return null;
        return {
            token: 'demo-token',
            user,
        };
    },
    async getUsers(keyword?: string) {
        if (!keyword) return users;
        const normalizedKeyword = keyword.toLowerCase();
        return users.filter((user) => user.account.toLowerCase().includes(normalizedKeyword) || user.name.toLowerCase().includes(normalizedKeyword));
    },
};

const articleRepository = {
    async findPage(page: number, pageSize: number) {
        const offset = (page - 1) * pageSize;
        return {
            list: articles.slice(offset, offset + pageSize),
            total: articles.length,
        };
    },
};

const app = new Elysia()
    .use(
        di({
            instances: [
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

const sendJson = async (url: string, method: string, body?: unknown, headers?: Record<string, string>) =>
    app.handle(
        new Request(url, {
            method,
            headers: {
                'content-type': 'application/json',
                ...(headers ?? {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        }),
    );

describe('HTTP integration', () => {
    it('returns requestId in health response', async () => {
        const response = await app.handle(new Request('http://localhost/health'));
        const payload = (await response.json()) as { code: number; requestId?: string };

        expect(response.status).toBe(200);
        expect(payload.code).toBe(0);
        expect(typeof payload.requestId).toBe('string');
    });

    it('allows login and protected users endpoint', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'admin',
            password: 'admin123',
        });
        const loginPayload = (await loginResponse.json()) as {
            code: number;
            data?: { token: string };
            requestId?: string;
        };

        expect(loginResponse.status).toBe(200);
        expect(loginPayload.code).toBe(0);
        expect(loginPayload.data?.token).toBe('demo-token');
        expect(typeof loginPayload.requestId).toBe('string');

        const usersResponse = await app.handle(
            new Request('http://localhost/api/users', {
                headers: {
                    authorization: `Bearer ${loginPayload.data?.token ?? ''}`,
                },
            }),
        );
        const usersPayload = (await usersResponse.json()) as { code: number; data?: unknown[] };

        expect(usersResponse.status).toBe(200);
        expect(usersPayload.code).toBe(0);
        expect(Array.isArray(usersPayload.data)).toBeTrue();
    });

    it('returns standardized unauthorized response', async () => {
        const response = await app.handle(new Request('http://localhost/api/users'));
        const payload = (await response.json()) as { code: number; requestId?: string };

        expect(response.status).toBe(401);
        expect(payload.code).toBe(AppCode.UNAUTHORIZED);
        expect(typeof payload.requestId).toBe('string');
    });
});
