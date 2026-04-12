import { defaultArticles, defaultUsers } from '../seed-data';
import { toTotal } from '../utils';
import { SqlBaseDatabaseAdapter } from './sql.base.adapter';

export class MysqlDatabaseAdapter extends SqlBaseDatabaseAdapter {
    readonly client = 'mysql' as const;

    protected async initialize() {
        await this.sql`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(64) NOT NULL,
        role VARCHAR(16) NOT NULL
      )
    `;
        await this.sql`
      CREATE TABLE IF NOT EXISTS articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(64) NOT NULL
      )
    `;

        const userCountRows = await this.sql<{ total: unknown }[]>`SELECT COUNT(*) as total FROM users`;
        const articleCountRows = await this.sql<{ total: unknown }[]>`SELECT COUNT(*) as total FROM articles`;
        const userTotal = toTotal(userCountRows[0]?.total);
        const articleTotal = toTotal(articleCountRows[0]?.total);

        if (userTotal === 0) {
            await this.sql`
        INSERT IGNORE INTO users (account, name, role)
        VALUES (${defaultUsers[0].account}, ${defaultUsers[0].name}, ${defaultUsers[0].role}),
               (${defaultUsers[1].account}, ${defaultUsers[1].name}, ${defaultUsers[1].role}),
               (${defaultUsers[2].account}, ${defaultUsers[2].name}, ${defaultUsers[2].role})
      `;
        }

        if (articleTotal === 0) {
            await this.sql`
        INSERT INTO articles (title, author)
        VALUES (${defaultArticles[0].title}, ${defaultArticles[0].author}),
               (${defaultArticles[1].title}, ${defaultArticles[1].author}),
               (${defaultArticles[2].title}, ${defaultArticles[2].author})
      `;
        }
    }
}
