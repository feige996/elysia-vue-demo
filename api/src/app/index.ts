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
import { authMiddleware, errorMiddleware, loggerMiddleware, rateLimitMiddleware } from './middleware';
import { diPlugin } from './plugins/di';

const errorExamples = {
    400: { code: 400100, message: 'Validation failed', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    401: { code: 401000, message: 'Unauthorized', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    403: { code: 403000, message: 'Forbidden', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    404: { code: 404000, message: 'Not found', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    409: { code: 409000, message: 'Conflict', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
    500: { code: 500000, message: 'Internal Server Error', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719' },
} as const;

const errorExampleRef = {
    400: '#/components/examples/ValidationErrorExample',
    401: '#/components/examples/UnauthorizedErrorExample',
    403: '#/components/examples/ForbiddenErrorExample',
    404: '#/components/examples/NotFoundErrorExample',
    409: '#/components/examples/ConflictErrorExample',
    500: '#/components/examples/InternalErrorExample',
} as const;

const successExampleRef = {
    HealthSuccessExample: '#/components/examples/HealthSuccessExample',
    LoginSuccessExample: '#/components/examples/LoginSuccessExample',
    UsersPageSuccessExample: '#/components/examples/UsersPageSuccessExample',
    UsersAllSuccessExample: '#/components/examples/UsersAllSuccessExample',
    UserCreatedSuccessExample: '#/components/examples/UserCreatedSuccessExample',
    UserUpdatedSuccessExample: '#/components/examples/UserUpdatedSuccessExample',
    DeletedSuccessExample: '#/components/examples/DeletedSuccessExample',
    ArticlesPageSuccessExample: '#/components/examples/ArticlesPageSuccessExample',
    ArticlesAllSuccessExample: '#/components/examples/ArticlesAllSuccessExample',
    ArticleCreatedSuccessExample: '#/components/examples/ArticleCreatedSuccessExample',
    ArticleUpdatedSuccessExample: '#/components/examples/ArticleUpdatedSuccessExample',
} as const;

const successResponse = (description: string, exampleKey: keyof typeof successExampleRef) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ApiSuccess' },
            examples: {
                default: { $ref: successExampleRef[exampleKey] },
            },
        },
    },
});

const errorResponse = (status: keyof typeof errorExamples, description: string) => ({
    description,
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
            examples: {
                default: { $ref: errorExampleRef[status] },
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
                bearerFormat: 'JWT',
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
            RefreshTokenRequest: {
                type: 'object',
                properties: {
                    refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature' }
                },
                required: ['refreshToken']
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
        examples: {
            HealthSuccessExample: { value: { code: 0, message: 'ok', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719', data: { status: 'ok' } } },
            LoginSuccessExample: {
                value: {
                    code: 0,
                    message: 'Login success',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: {
                        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.signature',
                        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature',
                        user: { id: 1, account: 'admin', name: 'Admin', role: 'admin' },
                    },
                },
            },
            UsersPageSuccessExample: {
                value: {
                    code: 0,
                    message: 'OK',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: {
                        list: [{ id: 1, account: 'admin', name: 'Admin', role: 'admin' }],
                        total: 3,
                        page: 1,
                        pageSize: 10,
                    },
                },
            },
            UsersAllSuccessExample: {
                value: {
                    code: 0,
                    message: 'OK',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: [{ id: 1, account: 'admin', name: 'Admin', role: 'admin' }],
                },
            },
            UserCreatedSuccessExample: {
                value: {
                    code: 0,
                    message: 'Created',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: { id: 4, account: 'tom', name: 'Tom', role: 'editor' },
                },
            },
            UserUpdatedSuccessExample: {
                value: {
                    code: 0,
                    message: 'Updated',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: { id: 4, account: 'tom', name: 'Tom Updated', role: 'editor' },
                },
            },
            DeletedSuccessExample: { value: { code: 0, message: 'Deleted', requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719', data: { deleted: 1 } } },
            ArticlesPageSuccessExample: {
                value: {
                    code: 0,
                    message: 'OK',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: {
                        list: [{ id: 1, title: 'Elysia + Bun 快速启动', author: 'Admin' }],
                        total: 3,
                        page: 1,
                        pageSize: 10,
                    },
                },
            },
            ArticlesAllSuccessExample: {
                value: {
                    code: 0,
                    message: 'OK',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: [{ id: 1, title: 'Elysia + Bun 快速启动', author: 'Admin' }],
                },
            },
            ArticleCreatedSuccessExample: {
                value: {
                    code: 0,
                    message: 'Created',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: { id: 4, title: 'New Article', author: 'Tom' },
                },
            },
            ArticleUpdatedSuccessExample: {
                value: {
                    code: 0,
                    message: 'Updated',
                    requestId: '4f47e2c6-137f-45dd-a9f9-e4f61c9ab719',
                    data: { id: 4, title: 'Updated Title', author: 'Tom' },
                },
            },
            ValidationErrorExample: { value: errorExamples[400] },
            UnauthorizedErrorExample: { value: errorExamples[401] },
            ForbiddenErrorExample: { value: errorExamples[403] },
            NotFoundErrorExample: { value: errorExamples[404] },
            ConflictErrorExample: { value: errorExamples[409] },
            InternalErrorExample: { value: errorExamples[500] },
        },
    },
    paths: {
        '/health': { get: { summary: 'Health check', responses: { 200: successResponse('OK', 'HealthSuccessExample') } } },
        '/api/auth/login': {
            post: {
                summary: 'Login',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
                },
                responses: {
                    200: successResponse('Login success', 'LoginSuccessExample'),
                    401: errorResponse(401, 'Invalid credentials'),
                },
            },
        },
        '/api/auth/refresh': {
            post: {
                summary: 'Refresh access token',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } }
                },
                responses: {
                    200: successResponse('Token refreshed', 'LoginSuccessExample'),
                    401: errorResponse(401, 'Invalid refresh token')
                }
            }
        },
        '/api/auth/logout': {
            post: {
                summary: 'Revoke refresh token',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' } } }
                },
                responses: {
                    200: successResponse('Logout success', 'DeletedSuccessExample'),
                    401: errorResponse(401, 'Invalid refresh token')
                }
            }
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
                responses: {
                    200: successResponse('Paged user list', 'UsersPageSuccessExample'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
            post: {
                summary: 'Create user',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/UserCreateRequest' } } },
                },
                responses: {
                    201: successResponse('Created', 'UserCreatedSuccessExample'),
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
                    200: successResponse('Deleted', 'DeletedSuccessExample'),
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
                responses: {
                    200: successResponse('User list', 'UsersAllSuccessExample'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
        '/api/users/{id}': {
            put: {
                summary: 'Update user by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdateRequest' } } } },
                responses: {
                    200: successResponse('Updated', 'UserUpdatedSuccessExample'),
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
                    200: successResponse('Deleted', 'DeletedSuccessExample'),
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
                responses: { 200: successResponse('Paged article list', 'ArticlesPageSuccessExample') },
            },
            post: {
                summary: 'Create article',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleCreateRequest' } } },
                },
                responses: {
                    201: successResponse('Created', 'ArticleCreatedSuccessExample'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
            delete: {
                summary: 'Batch delete articles',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/BatchDeleteRequest' } } },
                },
                responses: {
                    200: successResponse('Deleted', 'DeletedSuccessExample'),
                    400: errorResponse(400, 'Invalid payload'),
                    401: errorResponse(401, 'Unauthorized'),
                    403: errorResponse(403, 'Forbidden'),
                },
            },
        },
        '/api/articles/all': { get: { summary: 'List all articles', responses: { 200: successResponse('Article list', 'ArticlesAllSuccessExample') } } },
        '/api/articles/{id}': {
            put: {
                summary: 'Update article by id',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleUpdateRequest' } } } },
                responses: {
                    200: successResponse('Updated', 'ArticleUpdatedSuccessExample'),
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
                    200: successResponse('Deleted', 'DeletedSuccessExample'),
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
            secret: env.JWT_SECRET,
        }),
    )
    .use(diPlugin)
    .use(rateLimitMiddleware)
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
