import { SQL } from "bun";
import type { UserEntity } from "../../repositories/user.repository";

export type ArticleEntity = {
  id: number;
  title: string;
  author: string;
};

export type DatabaseClient = "memory" | "postgres" | "mysql";

type ArticleListResult = {
  list: ArticleEntity[];
  total: number;
};

export interface DatabaseAdapter {
  readonly client: DatabaseClient;
  findUsers(keyword?: string): Promise<UserEntity[]>;
  findUserByAccount(account: string): Promise<UserEntity | undefined>;
  findArticles(page: number, pageSize: number): Promise<ArticleListResult>;
}

const defaultUsers: UserEntity[] = [
  { id: 1, account: "admin", name: "Admin", role: "admin" },
  { id: 2, account: "editor", name: "Editor", role: "editor" },
  { id: 3, account: "alice", name: "Alice", role: "editor" }
];

const defaultArticles: ArticleEntity[] = [
  { id: 1, title: "Elysia + Bun 快速启动", author: "Admin" },
  { id: 2, title: "Vue3 + Alova 请求实践", author: "Editor" },
  { id: 3, title: "前后端类型共享方案", author: "Admin" }
];

const toTotal = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
};

class MemoryDatabaseAdapter implements DatabaseAdapter {
  readonly client: DatabaseClient = "memory";
  private readonly users = defaultUsers;
  private readonly articles = defaultArticles;

  async findUsers(keyword?: string) {
    if (!keyword) return this.users;
    const normalizedKeyword = keyword.toLowerCase();
    return this.users.filter(
      user =>
        user.account.toLowerCase().includes(normalizedKeyword) ||
        user.name.toLowerCase().includes(normalizedKeyword)
    );
  }

  async findUserByAccount(account: string) {
    return this.users.find(user => user.account === account);
  }

  async findArticles(page: number, pageSize: number) {
    const startIndex = (page - 1) * pageSize;
    return {
      list: this.articles.slice(startIndex, startIndex + pageSize),
      total: this.articles.length
    };
  }
}

class SqlDatabaseAdapter implements DatabaseAdapter {
  readonly client: DatabaseClient;
  private readonly sql: SQL;
  private readonly initializePromise: Promise<void>;

  constructor(client: Exclude<DatabaseClient, "memory">, databaseUrl: string) {
    this.client = client;
    this.sql = new SQL(databaseUrl);
    this.initializePromise = this.initialize();
  }

  private async initialize() {
    if (this.client === "postgres") {
      await this.sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          account VARCHAR(64) UNIQUE NOT NULL,
          name VARCHAR(64) NOT NULL,
          role VARCHAR(16) NOT NULL
        )
      `;
      await this.sql`
        CREATE TABLE IF NOT EXISTS articles (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(64) NOT NULL
        )
      `;
    } else {
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
    }

    const userCountRows = await this.sql<{ total: unknown }[]>`SELECT COUNT(*) as total FROM users`;
    const articleCountRows = await this.sql<{ total: unknown }[]>`SELECT COUNT(*) as total FROM articles`;
    const userTotal = toTotal(userCountRows[0]?.total);
    const articleTotal = toTotal(articleCountRows[0]?.total);

    if (userTotal === 0) {
      if (this.client === "postgres") {
        await this.sql`
          INSERT INTO users (account, name, role)
          VALUES ('admin', 'Admin', 'admin'), ('editor', 'Editor', 'editor'), ('alice', 'Alice', 'editor')
          ON CONFLICT (account) DO NOTHING
        `;
      } else {
        await this.sql`
          INSERT IGNORE INTO users (account, name, role)
          VALUES ('admin', 'Admin', 'admin'), ('editor', 'Editor', 'editor'), ('alice', 'Alice', 'editor')
        `;
      }
    }

    if (articleTotal === 0) {
      await this.sql`
        INSERT INTO articles (title, author)
        VALUES
          ('Elysia + Bun 快速启动', 'Admin'),
          ('Vue3 + Alova 请求实践', 'Editor'),
          ('前后端类型共享方案', 'Admin')
      `;
    }
  }

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

export const createDatabaseAdapter = (): DatabaseAdapter => {
  const client = (process.env.DB_CLIENT ?? "memory").toLowerCase() as DatabaseClient;
  if (client === "memory") return new MemoryDatabaseAdapter();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when DB_CLIENT is postgres or mysql");
  }

  if (client !== "postgres" && client !== "mysql") {
    throw new Error(`Unsupported DB_CLIENT: ${client}`);
  }

  return new SqlDatabaseAdapter(client, databaseUrl);
};
