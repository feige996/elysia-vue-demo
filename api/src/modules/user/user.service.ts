import type { LogService } from '../../shared/logger/log.service';
import { issueAuthToken } from '../../shared/auth/token-auth';
import type { UserRepository } from './user.repository';

export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly logService: LogService,
    ) {}

    async getUsers(keyword?: string, requestId?: string) {
        this.logService.info('query_users', {
            requestId,
            keyword: keyword ?? 'all',
        });
        return this.userRepository.findAll(keyword);
    }

    async login(account: string, password: string, requestId?: string) {
        const user = await this.userRepository.findByAccount(account);
        if (!user) {
            this.logService.info('login_failed_user_not_found', { requestId, account });
            return null;
        }
        const expectedPassword = `${account}123`;
        if (password !== expectedPassword) {
            this.logService.info('login_failed_invalid_password', { requestId, account });
            return null;
        }
        this.logService.info('login_success', { requestId, account });
        const token = await issueAuthToken(user.role);
        return {
            token,
            user,
        };
    }
}
