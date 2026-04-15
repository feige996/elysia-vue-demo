import { apiClient } from '../request';
import { ADMIN_TOKEN_KEY } from '../../../../shared/auth/storage-keys';

export type AuditLogItem = {
  id: number;
  traceId: string | null;
  operatorUserId: number | null;
  operatorAccount: string | null;
  action: string;
  module: string;
  resource: string;
  resourceId: string | null;
  requestMethod: string;
  requestPath: string;
  responseCode: number;
  success: number;
  durationMs: number;
  createdAt: string;
};

export type AuditLogQuery = {
  page?: number;
  pageSize?: number;
  module?: string;
  action?: string;
  operatorUserId?: number;
  operatorAccount?: string;
  success?: 0 | 1;
  dateFrom?: string;
  dateTo?: string;
};

export type AuditLogPageData = {
  list: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AuditLogStatsData = {
  total: number;
  successTotal: number;
  failedTotal: number;
  topModules: Array<{
    module: string;
    count: number;
  }>;
};

export const getAuditLogsMethod = (query: AuditLogQuery) =>
  apiClient.authRequest<AuditLogPageData>('/api/audit-logs', {
    method: 'GET',
    query,
  });

export const getAuditLogStatsMethod = (query: AuditLogQuery) =>
  apiClient.authRequest<AuditLogStatsData>('/api/audit-logs/stats', {
    method: 'GET',
    query,
  });

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

const buildQueryString = (query: AuditLogQuery) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
};

export const exportAuditLogsCsvMethod = async (query: AuditLogQuery) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const response = await fetch(
    `${API_BASE_URL}/api/audit-logs/export${buildQueryString(query)}`,
    {
      method: 'GET',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`导出失败: ${response.status}`);
  }
  return await response.blob();
};
