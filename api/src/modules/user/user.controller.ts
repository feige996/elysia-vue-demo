import type { UserService } from './user.service';
import { ErrorKey, failByKey, ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import { listQuerySchema, loginSchema } from './dto/user.dto';

export const createUserController = (userService: UserService) => ({
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
});
