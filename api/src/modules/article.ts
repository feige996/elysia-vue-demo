import { Elysia } from "elysia";
import { z } from "zod";
import type { ArticleRepository } from "../repositories/article.repository";
import { ok } from "../shared/http";
import { ensureRequestContext } from "../shared/request-context";

const articleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10)
});

export const articleModule = new Elysia({ prefix: "/api" }).get(
  "/articles",
  async ctx => {
    const { query, request } = ctx;
    const { requestId } = ensureRequestContext(request);
    const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
    const parsedQuery = articleQuerySchema.safeParse(query);
    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const pageSize = parsedQuery.success ? parsedQuery.data.pageSize : 10;
    const result = await articleRepository.findPage(page, pageSize);

    return ok(
      requestId,
      {
        list: result.list,
        total: result.total,
        page,
        pageSize
      },
      "OK"
    );
  }
);
