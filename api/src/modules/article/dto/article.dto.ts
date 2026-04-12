import { z } from 'zod';

export const articleQuerySchema = z.object({
    keyword: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(10),
});

export const articleListQuerySchema = z.object({
    keyword: z.string().optional(),
});

export const createArticleSchema = z.object({
    title: z.string().min(1).max(255),
    author: z.string().min(1).max(64),
});

export const updateArticleSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    author: z.string().min(1).max(64).optional(),
});

export const articleIdParamSchema = z.object({
    id: z.coerce.number().int().min(1),
});

export const articleBatchDeleteSchema = z.object({
    ids: z.array(z.coerce.number().int().min(1)).min(1),
});
