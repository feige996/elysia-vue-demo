import type { DatabaseAdapter } from '../infra/db/database-adapter';

export type UserEntity = {
    id: number;
    account: string;
    name: string;
    role: 'admin' | 'editor';
};

export class UserRepository {
    constructor(private readonly databaseAdapter: DatabaseAdapter) {}

    findAll(keyword?: string) {
        return this.databaseAdapter.findUsers(keyword);
    }

    findByAccount(account: string) {
        return this.databaseAdapter.findUserByAccount(account);
    }
}
