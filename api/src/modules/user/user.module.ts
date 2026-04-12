import { Elysia } from 'elysia';
import type { UserService } from './user.service';
import { createUserController } from './user.controller';

export const userModule = new Elysia({ prefix: '/api' })
    .post('/auth/login', async (ctx) => {
        const { body, set } = ctx;
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const controller = createUserController(userService);
        const response = await controller.login(body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .get('/users', async (ctx) => {
        const { query, set } = ctx;
        const { userService } = ctx as typeof ctx & { userService: UserService };
        const controller = createUserController(userService);
        const response = await controller.list(query, ctx.request);
        set.status = response.status;
        return response.payload;
    });
