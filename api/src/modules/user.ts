import { Elysia } from 'elysia';
import { z } from 'zod';
import type { UserService } from '../services/user.service';
import { AppCode, fail, ok } from '../shared/http';
import { ensureRequestContext } from '../shared/request-context';

const loginSchema = z.object({
    account: z.string().min(1),
    password: z.string().min(6),
});

const listQuerySchema = z.object({
    keyword: z.string().optional(),
});

export const userModule = new Elysia({ prefix: '/api' })
    .post('/auth/login', (ctx) => {
        const { body, set, request } = ctx;
        const { requestId } = ensureRequestContext(request);
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const parsedBody = loginSchema.safeParse(body);
        if (!parsedBody.success) {
            set.status = 400;
            return fail(requestId, AppCode.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid login payload');
        }

        const loginResult = userService.login(parsedBody.data.account, parsedBody.data.password, requestId);
        if (!loginResult) {
            set.status = 401;
            return fail(requestId, AppCode.INVALID_CREDENTIALS, 'Invalid account or password');
        }

        return ok(requestId, loginResult, 'Login success');
    })
    .get('/users', (ctx) => {
        const { query, request } = ctx;
        const { requestId } = ensureRequestContext(request);
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const parsedQuery = listQuerySchema.safeParse(query);
        const users = userService.getUsers(parsedQuery.success ? parsedQuery.data.keyword : undefined, requestId);
        return ok(requestId, users, 'OK');
    });
