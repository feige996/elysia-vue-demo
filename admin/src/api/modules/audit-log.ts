import { apiClient } from '../request';

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

export const getAuditLogsMethod = (query: AuditLogQuery) =>
  apiClient.authRequest<AuditLogPageData>('/api/audit-logs', {
    method: 'GET',
    query,
  });
