import { Elysia } from 'elysia';
import { issueAuthToken } from '../../shared/auth/token-auth';
import type { UserService } from './user.service';
import { createUserController } from './user.controller';
import type { UserRepository } from './user.repository';

export const userModule = new Elysia({ prefix: '/api' })
    .post('/auth/login', async (ctx) => {
        const { body, set } = ctx;
        const { userService, userRepository, jwt } = ctx as typeof ctx & {
            userService: UserService;
            userRepository: UserRepository;
            jwt: { sign: (payload: Record<string, unknown>) => Promise<string> };
        };
        const controller = createUserController(userService, userRepository, async (role) => issueAuthToken(role, async (payload) => jwt.sign(payload)));
        const response = await controller.login(body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .get('/users', async (ctx) => {
        const { query, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.list(query, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .get('/users/all', async (ctx) => {
        const { query, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.listAll(query, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .post('/users', async (ctx) => {
        const { body, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.create(body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .put('/users/:id', async (ctx) => {
        const { body, params, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.update(params, body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .delete('/users/:id', async (ctx) => {
        const { params, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.removeOne(params, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .delete('/users', async (ctx) => {
        const { body, set } = ctx;
        const { userService, userRepository } = ctx as typeof ctx & { userService: UserService; userRepository: UserRepository };
        const controller = createUserController(userService, userRepository);
        const response = await controller.removeBatch(body, ctx.request);
        set.status = response.status;
        return response.payload;
    });
