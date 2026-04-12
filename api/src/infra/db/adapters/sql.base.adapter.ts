import { SQL } from 'bun';
import type { ArticleEntity, UserEntity } from '../../../shared/types/entities';
import type { DatabaseAdapter, DatabaseClient } from '../types';
import { toTotal } from '../utils';

export abstract class SqlBaseDatabaseAdapter implements DatabaseAdapter {
    abstract readonly client: Exclude<DatabaseClient, 'memory'>;
    protected readonly sql: SQL;
    protected readonly initializePromise: Promise<void>;

    constructor(databaseUrl: string) {
        this.sql = new SQL(databaseUrl);
        this.initializePromise = this.initialize();
    }

    protected abstract initialize(): Promise<void>;

    async findUsers(keyword?: string) {
        await this.initializePromise;
        if (!keyword) {
            return this.sql<UserEntity[]>`SELECT id, account, name, role FROM users ORDER BY id`;
        }
        return this.sql<UserEntity[]>`
      SELECT id, account, name, role
      FROM users
      WHERE LOWER(account) LIKE LOWER(${`%${keyword}%`})
         OR LOWER(name) LIKE LOWER(${`%${keyword}%`})
      ORDER BY id
    `;
    }

    async findUserByAccount(account: string) {
        await this.initializePromise;
        const rows = await this.sql<UserEntity[]>`
      SELECT id, account, name, role
      FROM users
      WHERE account = ${account}
      LIMIT 1
    `;
        return rows[0];
    }

    async findArticles(page: number, pageSize: number) {
        await this.initializePromise;
        const offset = (page - 1) * pageSize;
        const rows = await this.sql<ArticleEntity[]>`
      SELECT id, title, author
      FROM articles
      ORDER BY id
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;
        const totalRows = await this.sql<{ total: unknown }[]>`SELECT COUNT(*) as total FROM articles`;
        return {
            list: rows,
            total: toTotal(totalRows[0]?.total)
        };
    }
}
