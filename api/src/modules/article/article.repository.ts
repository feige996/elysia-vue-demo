import { asc, count } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import { articlesTable } from '../../infra/db/schema';

export class ArticleRepository {
    async findPage(page: number, pageSize: number) {
        const offset = (page - 1) * pageSize;
        const rows = await db
            .select({
                id: articlesTable.id,
                title: articlesTable.title,
                author: articlesTable.author,
            })
            .from(articlesTable)
            .orderBy(asc(articlesTable.id))
            .limit(pageSize)
            .offset(offset);

        const totalRows = await db.select({ total: count() }).from(articlesTable);
        return {
            list: rows,
            total: Number(totalRows[0]?.total ?? 0),
        };
    }
}
