import { Elysia } from "elysia";
import { z } from "zod";

const articleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10)
});

const articles = [
  { id: 1, title: "Elysia + Bun 快速启动", author: "Admin" },
  { id: 2, title: "Vue3 + Alova 请求实践", author: "Editor" },
  { id: 3, title: "前后端类型共享方案", author: "Admin" }
];

export const articleModule = new Elysia({ prefix: "/api" }).get(
  "/articles",
  ({ query }) => {
    const parsedQuery = articleQuerySchema.safeParse(query);
    const page = parsedQuery.success ? parsedQuery.data.page : 1;
    const pageSize = parsedQuery.success ? parsedQuery.data.pageSize : 10;
    const startIndex = (page - 1) * pageSize;
    const result = articles.slice(startIndex, startIndex + pageSize);

    return {
      code: 0,
      message: "OK",
      data: {
        list: result,
        total: articles.length,
        page,
        pageSize
      }
    };
  }
);
