import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { di } from 'elysia-di';
import { jwt } from '@elysiajs/jwt';
import { authMiddleware, errorMiddleware, loggerMiddleware } from '../../src/app/middleware';
import { articleModule } from '../../src/modules/article';
import { userModule } from '../../src/modules/user';
import { env } from '../../src/shared/config/env';
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
        return user;
    },
    async getUsers(keyword?: string) {
        if (!keyword) return users;
        const normalizedKeyword = keyword.toLowerCase();
        return users.filter((user) => user.account.toLowerCase().includes(normalizedKeyword) || user.name.toLowerCase().includes(normalizedKeyword));
    },
};

const userRepository = {
    async findByAccount(account: string) {
        return users.find((user) => user.account === account);
    },
    async findPage(page: number, pageSize: number, keyword?: string) {
        const source = !keyword ? users : users.filter((user) => user.account.includes(keyword) || user.name.includes(keyword));
        const offset = (page - 1) * pageSize;
        return {
            list: source.slice(offset, offset + pageSize),
            total: source.length,
        };
    },
    async create(input: { account: string; name: string; role: 'admin' | 'editor' }) {
        const id = Math.max(...users.map((item) => item.id)) + 1;
        const created = { id, ...input };
        users.push(created);
        return created;
    },
    async update(id: number, input: Partial<{ account: string; name: string; role: 'admin' | 'editor' }>) {
        const target = users.find((item) => item.id === id);
        if (!target) return undefined;
        if (input.account !== undefined) target.account = input.account;
        if (input.name !== undefined) target.name = input.name;
        if (input.role !== undefined) target.role = input.role;
        return target;
    },
    async deleteById(id: number) {
        const index = users.findIndex((item) => item.id === id);
        if (index < 0) return false;
        users.splice(index, 1);
        return true;
    },
    async deleteByIds(ids: number[]) {
        let deleted = 0;
        for (const id of ids) {
            const index = users.findIndex((item) => item.id === id);
            if (index >= 0) {
                users.splice(index, 1);
                deleted += 1;
            }
        }
        return deleted;
    },
    async findPermissionCodesByRole(role: 'admin' | 'editor') {
        if (role === 'admin') {
            return ['system:user:view', 'system:role:view', 'system:menu:view'];
        }
        return ['system:user:view'];
    },
    async findMenuTreeByRole(role: 'admin' | 'editor') {
        const baseTree = [
            {
                id: 1,
                parentId: 0,
                name: '系统管理',
                path: '/system',
                routeName: 'System',
                component: 'layout/router-view',
                icon: 'settings-outline',
                type: 1,
                sort: 10,
                visible: 1,
                status: 1,
                permissionCode: null,
                keepAlive: 0,
                children: [
                    {
                        id: 2,
                        parentId: 1,
                        name: '用户管理',
                        path: '/system/user',
                        routeName: 'SystemUser',
                        component: 'system/user/index',
                        icon: 'people-outline',
                        type: 2,
                        sort: 10,
                        visible: 1,
                        status: 1,
                        permissionCode: 'system:user:view',
                        keepAlive: 1,
                        children: [],
                    },
                ],
            },
        ];
        if (role === 'admin') {
            return baseTree;
        }
        return [
            {
                ...baseTree[0],
                children: [baseTree[0].children[0]],
            },
        ];
    },
};

const articleRepository = {
    async findAll(keyword?: string) {
        if (!keyword) return articles;
        return articles.filter((item) => item.title.includes(keyword) || item.author.includes(keyword));
    },
    async findPage(page: number, pageSize: number, keyword?: string) {
        const source = !keyword ? articles : articles.filter((item) => item.title.includes(keyword) || item.author.includes(keyword));
        const offset = (page - 1) * pageSize;
        return {
            list: source.slice(offset, offset + pageSize),
            total: source.length,
        };
    },
    async create(input: { title: string; author: string }) {
        const id = Math.max(...articles.map((item) => item.id)) + 1;
        const created = { id, ...input };
        articles.push(created);
        return created;
    },
    async update(id: number, input: Partial<{ title: string; author: string }>) {
        const target = articles.find((item) => item.id === id);
        if (!target) return undefined;
        if (input.title !== undefined) target.title = input.title;
        if (input.author !== undefined) target.author = input.author;
        return target;
    },
    async deleteById(id: number) {
        const index = articles.findIndex((item) => item.id === id);
        if (index < 0) return false;
        articles.splice(index, 1);
        return true;
    },
    async deleteByIds(ids: number[]) {
        let deleted = 0;
        for (const id of ids) {
            const index = articles.findIndex((item) => item.id === id);
            if (index >= 0) {
                articles.splice(index, 1);
                deleted += 1;
            }
        }
        return deleted;
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
                {
                    identifier: 'userRepository',
                    instance: userRepository,
                },
            ],
        }),
    )
    .use(
        jwt({
            name: 'jwt',
            secret: env.JWT_SECRET,
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
            data?: { accessToken: string; refreshToken: string };
            requestId?: string;
        };

        expect(loginResponse.status).toBe(200);
        expect(loginPayload.code).toBe(0);
        expect(typeof loginPayload.data?.accessToken).toBe('string');
        expect(typeof loginPayload.data?.refreshToken).toBe('string');
        expect((loginPayload.data?.accessToken ?? '').split('.').length).toBe(3);
        expect(typeof loginPayload.requestId).toBe('string');

        const usersResponse = await app.handle(
            new Request('http://localhost/api/users', {
                headers: {
                    authorization: `Bearer ${loginPayload.data?.accessToken ?? ''}`,
                },
            }),
        );
        const usersPayload = (await usersResponse.json()) as {
            code: number;
            data?: { list: unknown[]; total: number; page: number; pageSize: number };
        };

        expect(usersResponse.status).toBe(200);
        expect(usersPayload.code).toBe(0);
        expect(Array.isArray(usersPayload.data?.list)).toBeTrue();
    });

    it('returns standardized unauthorized response', async () => {
        const response = await app.handle(new Request('http://localhost/api/users'));
        const payload = (await response.json()) as { code: number; requestId?: string };

        expect(response.status).toBe(401);
        expect(payload.code).toBe(AppCode.UNAUTHORIZED);
        expect(typeof payload.requestId).toBe('string');
    });

    it('returns forbidden when editor accesses admin routes', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'editor',
            password: 'editor123',
        });
        const loginPayload = (await loginResponse.json()) as { data?: { accessToken: string; refreshToken: string } };
        const response = await sendJson(
            'http://localhost/api/users',
            'POST',
            { account: 'tom', name: 'Tom', role: 'editor' },
            { authorization: `Bearer ${loginPayload.data?.accessToken ?? ''}` },
        );
        const payload = (await response.json()) as { code: number };
        expect(response.status).toBe(403);
        expect(payload.code).toBe(AppCode.FORBIDDEN);
    });

    it('supports refresh token rotation and logout', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'admin',
            password: 'admin123'
        });
        const loginPayload = (await loginResponse.json()) as { data?: { accessToken: string; refreshToken: string } };
        const refreshResponse = await sendJson('http://localhost/api/auth/refresh', 'POST', {
            refreshToken: loginPayload.data?.refreshToken ?? ''
        });
        const refreshPayload = (await refreshResponse.json()) as { data?: { accessToken: string; refreshToken: string } };
        expect(refreshResponse.status).toBe(200);
        expect(typeof refreshPayload.data?.accessToken).toBe('string');

        const oldRefreshReuseResponse = await sendJson('http://localhost/api/auth/refresh', 'POST', {
            refreshToken: loginPayload.data?.refreshToken ?? ''
        });
        expect(oldRefreshReuseResponse.status).toBe(401);

        const logoutResponse = await sendJson('http://localhost/api/auth/logout', 'POST', {
            refreshToken: refreshPayload.data?.refreshToken ?? ''
        });
        expect(logoutResponse.status).toBe(200);
    });

    it('returns permission codes and menu tree for current user', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'admin',
            password: 'admin123',
        });
        const loginPayload = (await loginResponse.json()) as { data?: { accessToken: string } };
        const authHeaders = { authorization: `Bearer ${loginPayload.data?.accessToken ?? ''}` };

        const permissionResponse = await app.handle(
            new Request('http://localhost/api/permissions/current', { headers: authHeaders }),
        );
        const permissionPayload = (await permissionResponse.json()) as { code: number; data?: string[] };
        expect(permissionResponse.status).toBe(200);
        expect(permissionPayload.code).toBe(0);
        expect(permissionPayload.data?.includes('system:user:view')).toBeTrue();

        const menuResponse = await app.handle(
            new Request('http://localhost/api/menus/tree', { headers: authHeaders }),
        );
        const menuPayload = (await menuResponse.json()) as { code: number; data?: Array<{ children: unknown[] }> };
        expect(menuResponse.status).toBe(200);
        expect(menuPayload.code).toBe(0);
        expect(Array.isArray(menuPayload.data)).toBeTrue();
        expect(Array.isArray(menuPayload.data?.[0]?.children)).toBeTrue();
    });

    it('supports user and article CRUD endpoints', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'admin',
            password: 'admin123',
        });
        const loginPayload = (await loginResponse.json()) as { data?: { accessToken: string; refreshToken: string } };
        const token = loginPayload.data?.accessToken ?? '';
        const authHeaders = { authorization: `Bearer ${token}` };

        const createUserResponse = await sendJson('http://localhost/api/users', 'POST', { account: 'bob', name: 'Bob', role: 'editor' }, authHeaders);
        expect(createUserResponse.status).toBe(201);

        const usersPageResponse = await app.handle(new Request('http://localhost/api/users?page=1&pageSize=20', { headers: authHeaders }));
        const usersPagePayload = (await usersPageResponse.json()) as { data?: { list: Array<{ id: number; account: string }> } };
        const createdUser = usersPagePayload.data?.list.find((item) => item.account === 'bob');
        expect(createdUser?.account).toBe('bob');

        const updateUserResponse = await sendJson(`http://localhost/api/users/${createdUser?.id ?? 0}`, 'PUT', { name: 'Bobby' }, authHeaders);
        expect(updateUserResponse.status).toBe(200);

        const deleteUserResponse = await sendJson(`http://localhost/api/users/${createdUser?.id ?? 0}`, 'DELETE', undefined, authHeaders);
        expect(deleteUserResponse.status).toBe(200);

        const createArticleResponse = await sendJson('http://localhost/api/articles', 'POST', { title: 'New Article', author: 'Bob' }, authHeaders);
        expect(createArticleResponse.status).toBe(201);

        const allArticlesResponse = await app.handle(new Request('http://localhost/api/articles/all'));
        const allArticlesPayload = (await allArticlesResponse.json()) as { data?: Array<{ id: number; title: string }> };
        const createdArticle = allArticlesPayload.data?.find((item) => item.title === 'New Article');
        expect(createdArticle?.title).toBe('New Article');

        const batchDeleteResponse = await sendJson('http://localhost/api/articles', 'DELETE', { ids: [createdArticle?.id ?? 0] }, authHeaders);
        const batchDeletePayload = (await batchDeleteResponse.json()) as { data?: { deleted: number } };
        expect(batchDeleteResponse.status).toBe(200);
        expect(batchDeletePayload.data?.deleted).toBe(1);
    });
});
