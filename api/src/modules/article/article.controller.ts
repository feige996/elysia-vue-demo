import type { ArticleRepository } from './article.repository';
import { ErrorKey, failByKey, ok, type PaginatedData } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import {
    articleBatchDeleteSchema,
    articleIdParamSchema,
    articleListQuerySchema,
    articleQuerySchema,
    createArticleSchema,
    updateArticleSchema,
} from './dto/article.dto';
import type { ArticleEntity } from '../../shared/types/entities';

export const createArticleController = (articleRepository: ArticleRepository) => ({
    listAll: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = articleListQuerySchema.safeParse(query);
        const list = await articleRepository.findAll(parsedQuery.success ? parsedQuery.data.keyword : undefined);
        return {
            status: 200,
            payload: ok(requestId, list, 'OK'),
        };
    },
    list: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = articleQuerySchema.safeParse(query);
        if (!parsedQuery.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedQuery.error.issues[0]?.message ?? 'Invalid query');
        }
        const page = parsedQuery.success ? parsedQuery.data.page : 1;
        const pageSize = parsedQuery.success ? parsedQuery.data.pageSize : 10;
        const result = await articleRepository.findPage(page, pageSize, parsedQuery.data.keyword);

        return {
            status: 200,
            payload: ok(
                requestId,
                {
                    list: result.list,
                    total: result.total,
                    page,
                    pageSize,
                } satisfies PaginatedData<ArticleEntity>,
                'OK',
            ),
        };
    },
    create: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = createArticleSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid article payload');
        }
        const created = await articleRepository.create(parsedBody.data);
        return {
            status: 201,
            payload: ok(requestId, created, 'Created'),
        };
    },
    update: async (idParam: unknown, body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedId = articleIdParamSchema.safeParse(idParam);
        if (!parsedId.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedId.error.issues[0]?.message ?? 'Invalid id');
        }
        const parsedBody = updateArticleSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid article payload');
        }
        const updated = await articleRepository.update(parsedId.data.id, parsedBody.data);
        if (!updated) {
            return failByKey(requestId, ErrorKey.NOT_FOUND, 'Article not found');
        }
        return {
            status: 200,
            payload: ok(requestId, updated, 'Updated'),
        };
    },
    removeOne: async (idParam: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedId = articleIdParamSchema.safeParse(idParam);
        if (!parsedId.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedId.error.issues[0]?.message ?? 'Invalid id');
        }
        const removed = await articleRepository.deleteById(parsedId.data.id);
        if (!removed) {
            return failByKey(requestId, ErrorKey.NOT_FOUND, 'Article not found');
        }
        return {
            status: 200,
            payload: ok(requestId, { deleted: 1 }, 'Deleted'),
        };
    },
    removeBatch: async (body: unknown, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedBody = articleBatchDeleteSchema.safeParse(body);
        if (!parsedBody.success) {
            return failByKey(requestId, ErrorKey.VALIDATION_ERROR, parsedBody.error.issues[0]?.message ?? 'Invalid ids payload');
        }
        const deletedCount = await articleRepository.deleteByIds(parsedBody.data.ids);
        return {
            status: 200,
            payload: ok(requestId, { deleted: deletedCount }, 'Deleted'),
        };
    },
});
