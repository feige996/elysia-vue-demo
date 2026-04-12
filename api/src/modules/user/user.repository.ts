import type { DatabaseAdapter } from '../../infra/db/database-adapter';
import type { UserEntity } from '../../shared/types/entities';

export class UserRepository {
    constructor(private readonly databaseAdapter: DatabaseAdapter) {}

    findAll(keyword?: string) {
        return this.databaseAdapter.findUsers(keyword);
    }

    findByAccount(account: string) {
        return this.databaseAdapter.findUserByAccount(account);
    }
}
