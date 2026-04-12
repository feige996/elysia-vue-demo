import { describe, expect, it } from 'bun:test';
import { createDatabaseAdapter } from '../../src/infra/db/database-adapter';
import { UserRepository } from '../../src/repositories/user.repository';
import { LogService } from '../../src/services/log.service';
import { UserService } from '../../src/services/user.service';

class TestLogService extends LogService {
    public readonly logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];

    override info(message: string, meta?: Record<string, unknown>) {
        this.logs.push({ message, meta });
    }
}

describe('UserService', () => {
    it('returns login result when account and password are valid', async () => {
        const userRepository = new UserRepository(createDatabaseAdapter());
        const logService = new TestLogService();

        const userService = new UserService(userRepository, logService);
        const result = await userService.login('admin', 'admin123', 'req-1');

        expect(result).not.toBeNull();
        expect(result?.token).toBe('demo-token');
        expect(logService.logs.some((log) => log.message === 'login_success')).toBeTrue();
    });

    it('returns null when password is invalid', async () => {
        const userRepository = new UserRepository(createDatabaseAdapter());
        const logService = new TestLogService();

        const userService = new UserService(userRepository, logService);
        const result = await userService.login('admin', 'wrong-password', 'req-2');

        expect(result).toBeNull();
    });
});
