import { apiClient } from '../request';
import type { ArticleEntity } from '../../../../api/src/shared/types/entities';

export type Article = ArticleEntity;

export type ArticlePageData = {
  list: Article[];
  total: number;
  page: number;
  pageSize: number;
};

export const getArticlesPageMethod = (params: {
  page: number;
  pageSize: number;
  keyword?: string;
}) =>
  apiClient.request<ArticlePageData>('/api/articles', {
    method: 'GET',
    query: params,
  });

export const getArticlesAllMethod = (keyword?: string) =>
  apiClient.request<Article[]>('/api/articles/all', {
    method: 'GET',
    query: keyword ? { keyword } : undefined,
  });
