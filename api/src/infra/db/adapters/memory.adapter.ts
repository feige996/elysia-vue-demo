import type { DatabaseAdapter, DatabaseClient } from '../types';
import { defaultArticles, defaultUsers } from '../seed-data';

export class MemoryDatabaseAdapter implements DatabaseAdapter {
    readonly client: DatabaseClient = 'memory';
    private readonly users = defaultUsers;
    private readonly articles = defaultArticles;

    async findUsers(keyword?: string) {
        if (!keyword) return this.users;
        const normalizedKeyword = keyword.toLowerCase();
        return this.users.filter((user) => user.account.toLowerCase().includes(normalizedKeyword) || user.name.toLowerCase().includes(normalizedKeyword));
    }

    async findUserByAccount(account: string) {
        return this.users.find((user) => user.account === account);
    }

    async findArticles(page: number, pageSize: number) {
        const startIndex = (page - 1) * pageSize;
        return {
            list: this.articles.slice(startIndex, startIndex + pageSize),
            total: this.articles.length
        };
    }
}
