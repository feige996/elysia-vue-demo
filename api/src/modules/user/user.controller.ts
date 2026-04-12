import type { UserService } from './user.service';
import { AppCode, fail, ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import { listQuerySchema, loginSchema } from './dto/user.dto';

export const createUserController = (userService: UserService) => ({
    login: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = loginSchema.safeParse(body);
        if (!parsedBody.success) {
            return {
                status: 400,
                payload: fail(requestId, AppCode.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid login payload')
            };
        }

        const loginResult = await userService.login(parsedBody.data.account, parsedBody.data.password, requestId);
        if (!loginResult) {
            return {
                status: 401,
                payload: fail(requestId, AppCode.INVALID_CREDENTIALS, 'Invalid account or password')
            };
        }

        return {
            status: 200,
            payload: ok(requestId, loginResult, 'Login success')
        };
    },
    list: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = listQuerySchema.safeParse(query);
        const users = await userService.getUsers(parsedQuery.success ? parsedQuery.data.keyword : undefined, requestId);
        return {
            status: 200,
            payload: ok(requestId, users, 'OK')
        };
    }
});
