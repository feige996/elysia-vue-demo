import type { ArticleRepository } from './article.repository';
import { ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';
import { articleQuerySchema } from './dto/article.dto';

export const createArticleController = (articleRepository: ArticleRepository) => ({
    list: async (query: Record<string, string | undefined>, request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const parsedQuery = articleQuerySchema.safeParse(query);
        const page = parsedQuery.success ? parsedQuery.data.page : 1;
        const pageSize = parsedQuery.success ? parsedQuery.data.pageSize : 10;
        const result = await articleRepository.findPage(page, pageSize);

        return {
            status: 200,
            payload: ok(
                requestId,
                {
                    list: result.list,
                    total: result.total,
                    page,
                    pageSize
                },
                'OK'
            )
        };
    }
});
