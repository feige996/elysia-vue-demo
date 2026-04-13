import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import {
  batchDeleteSchema,
  createUserSchema,
  listQuerySchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema,
} from '../src/modules/user/dto/user.dto';
import {
  articleBatchDeleteSchema,
  articleListQuerySchema,
  createArticleSchema,
  updateArticleSchema,
} from '../src/modules/article/dto/article.dto';

const toSchema = <T extends z.ZodTypeAny>(schema: T) => z.toJSONSchema(schema);

const userSchema = z.object({
  id: z.number().int(),
  account: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'editor']),
});

const articleSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  author: z.string(),
});

const idParamDocSchema = z.object({ id: z.number().int().min(1) });
const pageQueryDocSchema = z.object({
  keyword: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

const document = {
  openapi: '3.0.3',
  info: { title: 'Elysia Demo API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:6000' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: toSchema(userSchema),
      Article: toSchema(articleSchema),
      LoginRequest: toSchema(loginSchema),
      RefreshTokenRequest: toSchema(refreshTokenSchema),
      UserListQuery: toSchema(listQuerySchema),
      UserPageQuery: toSchema(pageQueryDocSchema),
      UserCreateRequest: toSchema(createUserSchema),
      UserUpdateRequest: toSchema(updateUserSchema),
      IdParam: toSchema(idParamDocSchema),
      BatchDeleteRequest: toSchema(batchDeleteSchema),
      ArticleListQuery: toSchema(articleListQuerySchema),
      ArticlePageQuery: toSchema(pageQueryDocSchema),
      ArticleCreateRequest: toSchema(createArticleSchema),
      ArticleUpdateRequest: toSchema(updateArticleSchema),
      ArticleBatchDeleteRequest: toSchema(articleBatchDeleteSchema),
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};

writeFileSync(
  resolve(process.cwd(), 'openapi.generated.json'),
  JSON.stringify(document, null, 2),
  'utf8'
);
console.log('Generated: api/openapi.generated.json');
