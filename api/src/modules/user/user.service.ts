import type { LogService } from '../../shared/logger/log.service';
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
    const authInfo = await this.userRepository.findAuthByAccount(account);
    if (!authInfo?.user) {
      this.logService.info('login_failed_user_not_found', {
        requestId,
        account,
      });
      return null;
    }
    if (authInfo.status !== 1) {
      this.logService.info('login_failed_user_disabled', {
        requestId,
        account,
      });
      return null;
    }
    if (password !== authInfo.passwordHash) {
      this.logService.info('login_failed_invalid_password', {
        requestId,
        account,
      });
      return null;
    }
    this.logService.info('login_success', { requestId, account });
    return authInfo.user;
  }
}
