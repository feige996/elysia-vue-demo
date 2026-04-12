import type { DatabaseAdapter } from "../infra/db/database-adapter";

export class ArticleRepository {
  constructor(private readonly databaseAdapter: DatabaseAdapter) {}

  findPage(page: number, pageSize: number) {
    return this.databaseAdapter.findArticles(page, pageSize);
  }
}
