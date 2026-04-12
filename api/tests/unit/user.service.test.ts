import { describe, expect, it } from 'bun:test';
import type { UserRepository } from '../../src/modules/user/user.repository';
import { UserService } from '../../src/modules/user/user.service';
import { LogService } from '../../src/shared/logger/log.service';
import type { UserEntity } from '../../src/shared/types/entities';

class TestLogService extends LogService {
    public readonly logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];

    override info(message: string, meta?: Record<string, unknown>) {
        this.logs.push({ message, meta });
    }
}

describe('UserService', () => {
    const createTestUserRepository = () => {
        const users: UserEntity[] = [{ id: 1, account: 'admin', name: 'Admin', role: 'admin' }];
        return {
            async findByAccount(account: string) {
                return users.find((user) => user.account === account);
            },
            async findAll(keyword?: string) {
                if (!keyword) return users;
                const normalizedKeyword = keyword.toLowerCase();
                return users.filter((user) => user.account.toLowerCase().includes(normalizedKeyword) || user.name.toLowerCase().includes(normalizedKeyword));
            },
        };
    };

    it('returns login result when account and password are valid', async () => {
        const userRepository = createTestUserRepository();
        const logService = new TestLogService();

        const userService = new UserService(userRepository as UserRepository, logService);
        const result = await userService.login('admin', 'admin123', 'req-1');

        expect(result).not.toBeNull();
        expect(result?.token).toBe('demo-token');
        expect(logService.logs.some((log) => log.message === 'login_success')).toBeTrue();
    });

    it('returns null when password is invalid', async () => {
        const userRepository = createTestUserRepository();
        const logService = new TestLogService();

        const userService = new UserService(userRepository as UserRepository, logService);
        const result = await userService.login('admin', 'wrong-password', 'req-2');

        expect(result).toBeNull();
    });
});
