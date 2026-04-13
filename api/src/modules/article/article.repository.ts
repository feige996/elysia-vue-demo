import { asc, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import { articlesTable } from '../../infra/db/schema';

type SaveArticleInput = {
  title: string;
  author: string;
};

type UpdateArticleInput = Partial<SaveArticleInput>;

const buildKeywordFilter = (keyword?: string) => {
  if (!keyword) return undefined;
  const text = `%${keyword}%`;
  return or(
    ilike(articlesTable.title, text),
    ilike(articlesTable.author, text),
  );
};

export class ArticleRepository {
  async findAll(keyword?: string) {
    const rows = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        author: articlesTable.author,
      })
      .from(articlesTable)
      .where(buildKeywordFilter(keyword))
      .orderBy(asc(articlesTable.id));
    return rows;
  }

  async findPage(page: number, pageSize: number, keyword?: string) {
    const offset = (page - 1) * pageSize;
    const filter = buildKeywordFilter(keyword);
    const rows = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        author: articlesTable.author,
      })
      .from(articlesTable)
      .where(filter)
      .orderBy(asc(articlesTable.id))
      .limit(pageSize)
      .offset(offset);

    const totalRows = await db
      .select({ total: count() })
      .from(articlesTable)
      .where(filter);
    return {
      list: rows,
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async findById(id: number) {
    const rows = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        author: articlesTable.author,
      })
      .from(articlesTable)
      .where(eq(articlesTable.id, id))
      .limit(1);
    return rows[0];
  }

  async create(input: SaveArticleInput) {
    const rows = await db.insert(articlesTable).values(input).returning({
      id: articlesTable.id,
      title: articlesTable.title,
      author: articlesTable.author,
    });
    return rows[0];
  }

  async update(id: number, input: UpdateArticleInput) {
    if (Object.keys(input).length === 0) {
      return this.findById(id);
    }
    const rows = await db
      .update(articlesTable)
      .set(input)
      .where(eq(articlesTable.id, id))
      .returning({
        id: articlesTable.id,
        title: articlesTable.title,
        author: articlesTable.author,
      });
    return rows[0];
  }

  async deleteById(id: number) {
    const rows = await db
      .delete(articlesTable)
      .where(eq(articlesTable.id, id))
      .returning({ id: articlesTable.id });
    return rows.length > 0;
  }

  async deleteByIds(ids: number[]) {
    if (ids.length === 0) return 0;
    const rows = await db
      .delete(articlesTable)
      .where(inArray(articlesTable.id, ids))
      .returning({ id: articlesTable.id });
    return rows.length;
  }
}
