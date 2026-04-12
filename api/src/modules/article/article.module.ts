import { Elysia } from 'elysia';
import type { ArticleRepository } from './article.repository';
import { createArticleController } from './article.controller';

export const articleModule = new Elysia({ prefix: '/api' }).get('/articles', async (ctx) => {
    const { query, set } = ctx;
    const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
    const controller = createArticleController(articleRepository);
    const response = await controller.list(query, ctx.request);
    set.status = response.status;
    return response.payload;
});
