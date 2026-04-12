import type { ArticleEntity, UserEntity } from '../../shared/types/entities';

export type DatabaseClient = 'memory' | 'postgres' | 'mysql';

export type ArticleListResult = {
    list: ArticleEntity[];
    total: number;
};

export interface DatabaseAdapter {
    readonly client: DatabaseClient;
    findUsers(keyword?: string): Promise<UserEntity[]>;
    findUserByAccount(account: string): Promise<UserEntity | undefined>;
    findArticles(page: number, pageSize: number): Promise<ArticleListResult>;
}
