import type { UserService } from './user.service';
import { ErrorKey, failByKey, ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import { batchDeleteSchema, createUserSchema, idParamSchema, listQuerySchema, loginSchema, pageQuerySchema, updateUserSchema } from './dto/user.dto';
import type { UserRepository } from './user.repository';
import type { UserEntity } from '../../shared/types/entities';
import type { PaginatedData } from '../../shared/types/http';

export const createUserController = (userService: UserService, userRepository: UserRepository) => ({
    login: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = loginSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid login payload');
        }

        const loginResult = await userService.login(parsedBody.data.account, parsedBody.data.password, requestId);
        if (!loginResult) {
            return failByKey(requestId, ErrorKey.INVALID_CREDENTIALS);
        }

        return {
            status: 200,
            payload: ok(requestId, loginResult, 'Login success'),
        };
    },
    list: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = listQuerySchema.safeParse(query);
        const users = await userService.getUsers(parsedQuery.success ? parsedQuery.data.keyword : undefined, requestId);
        return {
            status: 200,
            payload: ok(requestId, users, 'OK'),
        };
    },
    listPage: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = pageQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedQuery.error.issues[0]?.message ?? 'Invalid query');
        }
        const { page, pageSize, keyword } = parsedQuery.data;
        const result = await userRepository.findPage(page, pageSize, keyword);
        return {
            status: 200,
            payload: ok(
                requestId,
                {
                    list: result.list,
                    total: result.total,
                    page,
                    pageSize,
                } satisfies PaginatedData<UserEntity>,
                'OK',
            ),
        };
    },
    create: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = createUserSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid user payload');
        }
        const created = await userRepository.create(parsedBody.data);
        return {
            status: 201,
            payload: ok(requestId, created, 'Created'),
        };
    },
    update: async (idParam: unknown, body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedId = idParamSchema.safeParse(idParam);
        if (!parsedId.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedId.error.issues[0]?.message ?? 'Invalid id');
        }
        const parsedBody = updateUserSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid user payload');
        }
        const updated = await userRepository.update(parsedId.data.id, parsedBody.data);
        if (!updated) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, 'User not found');
        }
        return {
            status: 200,
            payload: ok(requestId, updated, 'Updated'),
        };
    },
    removeOne: async (idParam: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedId = idParamSchema.safeParse(idParam);
        if (!parsedId.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedId.error.issues[0]?.message ?? 'Invalid id');
        }
        const removed = await userRepository.deleteById(parsedId.data.id);
        if (!removed) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, 'User not found');
        }
        return {
            status: 200,
            payload: ok(requestId, { deleted: 1 }, 'Deleted'),
        };
    },
    removeBatch: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = batchDeleteSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid ids payload');
        }
        const deletedCount = await userRepository.deleteByIds(parsedBody.data.ids);
        return {
            status: 200,
            payload: ok(requestId, { deleted: deletedCount }, 'Deleted'),
        };
    },
});
