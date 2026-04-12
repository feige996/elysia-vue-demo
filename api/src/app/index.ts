import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { articleModule } from '../modules/article';
import { checkDatabaseHealth } from '../infra/db/client';
import { env } from '../shared/config/env';
import { logService } from '../shared/logger/log.service';
import { userModule } from '../modules/user';
import { ok } from '../shared/types/http';
import { ensureRequestContext } from '../shared/types/request-context';
import { authMiddleware, errorMiddleware, loggerMiddleware } from './middleware';
import { diPlugin } from './plugins/di';

const errorExamples = {
    400: { code: 400100, message: 'Validation failed', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    401: { code: 401000, message: 'Unauthorized', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    403: { code: 403000, message: 'Forbidden', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    404: { code: 404000, message: 'Not found', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    409: { code: 409000, message: 'Conflict', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    500: { code: 500000, message: 'Internal Server Error', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
} as const;

const successResponse = (description: string) => ({
    description,
    content: {
        'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
    },
});

const errorResponse = (status: keyof typeof errorExamples, description: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            examples: {
                default: { value: errorExamples[status] },
            },
        },
    },
});

const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Elysia Demo API',
        version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.API_PORT}` }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: env.AUTH_MODE === 'jwt' ? 'JWT' : 'Token',
            },
        },
        schemas: {
            ApiSuccess: {
                type: 'object',
                properties: {
                    code: { type: 'number', example: 0 },
                    message: { type: 'string', example: 'OK' },
                    requestId: { type: 'string', example: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
                    data: {},
                },
                required: ['code', 'message', 'requestId'],
            },
            ApiError: {
                type: 'object',
                properties: {
                    code: { type: 'number', example: 401000 },
                    message: { type: 'string', example: 'Unauthorized' },
                    requestId: { type: 'string', example: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
                },
                required: ['code', 'message', 'requestId'],
            },
            LoginRequest: {
                type: 'object',
                properties: {
                    account: { type: 'string', example: 'admin' },
                    password: { type: 'string', example: 'admin123' },
                },
                required: ['account', 'password'],
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    account: { type: 'string', example: 'admin' },
                    name: { type: 'string', example: 'Admin' },
                    role: { type: 'string', enum: ['admin', 'editor'], example: 'admin' },
                },
                required: ['id', 'account', 'name', 'role'],
            },
            UserCreateRequest: {
                type: 'object',
                properties: {
                    account: { type: 'string', example: 'tom' },
                    name: { type: 'string', example: 'Tom' },
                    role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
                },
                required: ['account', 'name', 'role'],
            },
            UserUpdateRequest: {
                type: 'object',
                properties: {
                    account: { type: 'string', example: 'tom-updated' },
                    name: { type: 'string', example: 'Tom Updated' },
                    role: { type: 'string', enum: ['admin', 'editor'], example: 'editor' },
                },
            },
            UserPageData: {
                type: 'object',
                properties: {
                    list: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                    },
                    total: { type: 'integer', example: 3 },
                    page: { type: 'integer', example: 1 },
                    pageSize: { type: 'integer', example: 10 },
                },
                required: ['list', 'total', 'page', 'pageSize'],
            },
            Article: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    title: { type: 'string', example: 'Elysia + Bun 快速启动' },
                    author: { type: 'string', example: 'Admin' },
                },
                required: ['id', 'title', 'author'],
            },
            ArticleCreateRequest: {
                type: 'object',
                properties: {
                    title: { type: 'string', example: 'New Article' },
                    author: { type: 'string', example: 'Tom' },
                },
                required: ['title', 'author'],
            },
            ArticleUpdateRequest: {
                type: 'object',
                properties: {
                    title: { type: 'string', example: 'Updated Title' },
                    author: { type: 'string', example: 'Updated Author' },
                },
            },
            ArticlePageData: {
                type: 'object',
                properties: {
                    list: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Article' },
                    },
                    total: { type: 'integer', example: 3 },
                    page: { type: 'integer', example: 1 },
                    pageSize: { type: 'integer', example: 10 },
                },
                required: ['list', 'total', 'page', 'pageSize'],
            },
            BatchDeleteRequest: {
                type: 'object',
                properties: {
                    ids: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
                },
                required: ['ids'],
            },
        },
    },
    paths: {
        '/health': { get: { summary: 'Health check', responses: { 200: successResponse('OK') } } },
        '/api/auth/login': {
            post: {
                summary: 'Login',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
                },
                responses: {
                    200: successResponse('Login success'),
                    401: errorResponse(401, 'Invalid credentials'),
                },
            },
        },
        '/api/users': {
            get: {
                summary: 'List users (paged)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                    { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
                    { name: 'keyword', in: 'query', schema: { type: 'string' } },
                ],
                responses: { 200: successResponse('Paged user list'), 401: errorResponse(401, 'Unauthorized'), 403: errorResponse(403, 'Forbidden') },
            },
            post: {
                summary: 'Create user',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateRequest' } } },
                },
                responses: {
                    201: successResponse('Created'),
                    409: errorResponse(409, 'Conflict'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
            delete: {
                summary: 'Batch delete users',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchDeleteRequest' } } },
                },
                responses: {
                    200: successResponse('Deleted'),
                    400: errorResponse(400, 'Invalid payload'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
        '/api/users/all': {
            get: {
                summary: 'List all users',
                security: [{ bearerAuth: [] }],
                responses: { 200: successResponse('User list'), 401: errorResponse(401, 'Unauthorized'), 403: errorResponse(403, 'Forbidden') },
            },
        },
        '/api/users/{id}': {
            put: {
                summary: 'Update user by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdateRequest' } } } },
                responses: {
                    200: successResponse('Updated'),
                    404: errorResponse(404, 'Not found'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
            delete: {
                summary: 'Delete user by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: successResponse('Deleted'),
                    404: errorResponse(404, 'Not found'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
        '/api/articles': {
            get: {
                summary: 'List articles (paged)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                    { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
                    { name: 'keyword', in: 'query', schema: { type: 'string' } },
                ],
                responses: { 200: successResponse('Paged article list') },
            },
            post: {
                summary: 'Create article',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleCreateRequest' } } },
                },
                responses: { 201: successResponse('Created'), 401: errorResponse(401, 'Unauthorized'), 403: errorResponse(403, 'Forbidden') },
            },
            delete: {
                summary: 'Batch delete articles',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchDeleteRequest' } } },
                },
                responses: {
                    200: successResponse('Deleted'),
                    400: errorResponse(400, 'Invalid payload'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
        '/api/articles/all': { get: { summary: 'List all articles', responses: { 200: successResponse('Article list') } } },
        '/api/articles/{id}': {
            put: {
                summary: 'Update article by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleUpdateRequest' } } } },
                responses: {
                    200: successResponse('Updated'),
                    404: errorResponse(404, 'Not found'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
            delete: {
                summary: 'Delete article by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    200: successResponse('Deleted'),
                    404: errorResponse(404, 'Not found'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
    },
};

export const app = new Elysia()
    .use(
        cors({
            origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        }),
    )
    .use(
        jwt({
            name: 'jwt',
            secret: env.JWT_SECRET ?? env.AUTH_ADMIN_TOKEN,
        }),
    )
    .use(diPlugin)
    .use(loggerMiddleware)
    .use(errorMiddleware)
    .use(authMiddleware)
    .get('/health', ({ request }) => ok(ensureRequestContext(request).requestId, { status: 'ok' }, 'ok'))
    .get('/openapi.json', () => openApiSpec)
    .get(
        '/docs',
        () =>
            new Response(
                `<!doctype html><html><head><meta charset="utf-8"/><title>API Docs</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui'});</script></body></html>`,
                { headers: { 'content-type': 'text/html; charset=utf-8' } },
            ),
    )
    .use(userModule)
    .use(articleModule);

export type AppType = typeof app;

if (import.meta.main) {
    const startServer = async () => {
        const port = env.API_PORT;
        const isProduction = env.NODE_ENV === 'production';
        try {
            await checkDatabaseHealth();
            logService.info('Database health check passed');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isProduction) {
                throw error;
            }
            logService.warn('Database health check failed in non-production mode', { error: message });
        }
        app.listen(port);
        logService.info('API server is running', { url: `http://localhost:${port}` });
    };

    startServer().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        logService.error('Database health check failed', { error: message });
        process.exit(1);
    });
}
