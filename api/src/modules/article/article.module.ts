import { Elysia } from 'elysia';
import type { ArticleRepository } from './article.repository';
import { createArticleController } from './article.controller';

export const articleModule = new Elysia({ prefix: '/api' })
    .get('/articles', async (ctx) => {
        const { query, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.list(query, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .get('/articles/all', async (ctx) => {
        const { query, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.listAll(query, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .post('/articles', async (ctx) => {
        const { body, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.create(body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .put('/articles/:id', async (ctx) => {
        const { params, body, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.update(params, body, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .delete('/articles/:id', async (ctx) => {
        const { params, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.removeOne(params, ctx.request);
        set.status = response.status;
        return response.payload;
    })
    .delete('/articles', async (ctx) => {
        const { body, set } = ctx;
        const { articleRepository } = ctx as typeof ctx & { articleRepository: ArticleRepository };
        const controller = createArticleController(articleRepository);
        const response = await controller.removeBatch(body, ctx.request);
        set.status = response.status;
        return response.payload;
    });
