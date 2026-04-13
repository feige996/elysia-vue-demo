import { Elysia, t } from 'elysia';
import type { ArticleRepository } from './article.repository';
import { createArticleController } from './article.controller';

const apiErrorSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
});

const articleSchema = t.Object({
  id: t.Number(),
  title: t.String(),
  author: t.String(),
});

const listQuerySchema = t.Object({
  keyword: t.Optional(t.String()),
});

const pageQuerySchema = t.Object({
  keyword: t.Optional(t.String()),
  page: t.Numeric({ minimum: 1, default: 1 }),
  pageSize: t.Numeric({ minimum: 1, maximum: 50, default: 10 }),
});

const createArticleBodySchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  author: t.String({ minLength: 1, maxLength: 64 }),
});

const updateArticleBodySchema = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  author: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
});

const idParamSchema = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

const batchDeleteBodySchema = t.Object({
  ids: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1 }),
});

const articlePageSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    list: t.Array(articleSchema),
    total: t.Number(),
    page: t.Number(),
    pageSize: t.Number(),
  }),
});

const articleListSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(articleSchema),
});

const articleSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: articleSchema,
});

const deletedSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    deleted: t.Number(),
  }),
});

export const articleModule = new Elysia({ prefix: '/api' })
  .get(
    '/articles',
    async (ctx) => {
      const { query, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.list(query, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      query: pageQuerySchema,
      response: {
        200: articlePageSuccessSchema,
        400: apiErrorSchema,
      },
    },
  )
  .get(
    '/articles/all',
    async (ctx) => {
      const { query, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.listAll(query, ctx.request);
      set.status = response.status;
      return response.payload as never;
    },
    {
      query: listQuerySchema,
      response: {
        200: articleListSuccessSchema,
      },
    },
  )
  .post(
    '/articles',
    async (ctx) => {
      const { body, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.create(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      body: createArticleBodySchema,
      response: {
        201: articleSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
      },
    },
  )
  .put(
    '/articles/:id',
    async (ctx) => {
      const { params, body, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.update(params, body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      params: idParamSchema,
      body: updateArticleBodySchema,
      response: {
        200: articleSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .delete(
    '/articles/:id',
    async (ctx) => {
      const { params, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.removeOne(params, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      params: idParamSchema,
      response: {
        200: deletedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .delete(
    '/articles',
    async (ctx) => {
      const { body, set } = ctx;
      const { articleRepository } = ctx as typeof ctx & {
        articleRepository: ArticleRepository;
      };
      const controller = createArticleController(articleRepository);
      const response = await controller.removeBatch(body, ctx.request);
      set.status = response.status;
      return response.payload;
    },
    {
      body: batchDeleteBodySchema,
      response: {
        200: deletedSuccessSchema,
        400: apiErrorSchema,
        401: apiErrorSchema,
        403: apiErrorSchema,
      },
    },
  );
