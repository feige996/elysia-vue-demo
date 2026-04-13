import { apiClient } from '../request';
import type { ArticleEntity } from '../../../../api/src/shared/types/entities';

export type Article = ArticleEntity;

export type ArticlePageData = {
  list: Article[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateArticleInput = {
  title: string;
  author: string;
};

export type UpdateArticleInput = Partial<CreateArticleInput>;

export const getArticlesMethod = (keyword?: string) =>
  apiClient.request<Article[]>('/api/articles/all', {
    method: 'GET',
    query: keyword ? { keyword } : undefined,
  });

export const getArticlesPageMethod = (params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}) =>
  apiClient.request<ArticlePageData>('/api/articles', {
    method: 'GET',
    query: params,
  });

export const getArticleByIdMethod = (id: number) =>
  apiClient.request<Article>(`/api/articles/${id}`, {
    method: 'GET',
  });

export const createArticleMethod = (data: CreateArticleInput) =>
  apiClient.request<Article>('/api/articles', {
    method: 'POST',
    body: data,
  });

export const updateArticleMethod = (id: number, data: UpdateArticleInput) =>
  apiClient.request<Article>(`/api/articles/${id}`, {
    method: 'PUT',
    body: data,
  });

export const deleteArticleMethod = (id: number) =>
  apiClient.request<{ deleted: number }>(`/api/articles/${id}`, {
    method: 'DELETE',
  });

export const deleteArticlesMethod = (ids: number[]) =>
  apiClient.request<{ deleted: number }>('/api/articles', {
    method: 'DELETE',
    body: { ids },
  });
