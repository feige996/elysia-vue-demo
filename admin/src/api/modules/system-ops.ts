import { apiClient } from '../request';

export type LoginLogItem = {
  id: number;
  account: string | null;
  userId: number | null;
  success: number;
  reason: string | null;
  requestIp: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type LoginLogQuery = {
  page?: number;
  pageSize?: number;
  account?: string;
  requestIp?: string;
  success?: 0 | 1;
  dateFrom?: string;
  dateTo?: string;
};

export type LoginLogPageData = {
  list: LoginLogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiCatalogItem = {
  id: number;
  code: string;
  name: string;
  module: string;
  type: number;
  status: number;
  description: string | null;
};

export type ApiCatalogQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  module?: string;
  status?: 0 | 1;
};

export type ApiCatalogPageData = {
  list: ApiCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export const getLoginLogsMethod = (query: LoginLogQuery) =>
  apiClient.authRequest<LoginLogPageData>('/api/login-logs', {
    method: 'GET',
    query,
  });

export const getApiCatalogMethod = (query: ApiCatalogQuery) =>
  apiClient.authRequest<ApiCatalogPageData>('/api/api-catalog', {
    method: 'GET',
    query,
  });
