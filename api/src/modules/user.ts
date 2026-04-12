import { Elysia } from 'elysia';
import { z } from 'zod';
import type { UserService } from '../services/user.service';

const loginSchema = z.object({
    account: z.string().min(1),
    password: z.string().min(6),
});

const listQuerySchema = z.object({
    keyword: z.string().optional(),
});

export const userModule = new Elysia({ prefix: '/api' })
    .post('/auth/login', (ctx) => {
        const { body, set } = ctx;
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const parsedBody = loginSchema.safeParse(body);
        if (!parsedBody.success) {
            set.status = 400;
            return {
                code: 400,
                message: parsedBody.error.issues[0]?.message ?? 'Invalid login payload',
            };
        }

        const loginResult = userService.login(parsedBody.data.account, parsedBody.data.password);
        if (!loginResult) {
            set.status = 401;
            return {
                code: 401,
                message: 'Invalid account or password',
            };
        }

        return {
            code: 0,
            message: 'Login success',
            data: loginResult,
        };
    })
    .get('/users', (ctx) => {
        const { query } = ctx;
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const parsedQuery = listQuerySchema.safeParse(query);
        const users = userService.getUsers(parsedQuery.success ? parsedQuery.data.keyword : undefined);

        return {
            code: 0,
            message: 'OK',
            data: users,
        };
    });
