import { apiClient } from '../request';

export type OnlineSessionItem = {
  key: string;
  userId: number | null;
  account: string;
  role: string;
  ip: string;
  userAgent: string;
  requestCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export const getOnlineSessionsMethod = () =>
  apiClient.authRequest<{
    total: number;
    list: OnlineSessionItem[];
  }>('/api/monitor/online', {
    method: 'GET',
  });

export type CacheOverview = {
  enabled: boolean;
  status: string;
  totalKeys: number;
  sampledCount: number;
  sampledKeys: string[];
  namespaceStats: Array<{ namespace: string; count: number }>;
};

export const getCacheOverviewMethod = () =>
  apiClient.authRequest<CacheOverview>('/api/monitor/cache', {
    method: 'GET',
  });

export type IpBlacklistItem = {
  ip: string;
  source: 'manual' | 'auto';
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
};

export const getIpBlacklistMethod = () =>
  apiClient.authRequest<{
    enabled: boolean;
    list: IpBlacklistItem[];
  }>('/api/monitor/ip-blacklist', {
    method: 'GET',
  });

export const createIpBlacklistMethod = (payload: {
  ip: string;
  reason?: string;
  expiresInMinutes?: number;
}) =>
  apiClient.authRequest<{ success: boolean; ip: string }>(
    '/api/monitor/ip-blacklist',
    {
      method: 'POST',
      body: payload,
    },
  );

export const deleteIpBlacklistMethod = (ip: string) =>
  apiClient.authRequest<{ removed: boolean; ip: string }>(
    `/api/monitor/ip-blacklist?ip=${encodeURIComponent(ip)}`,
    {
      method: 'DELETE',
    },
  );

export type JobItem = {
  id: number;
  name: string;
  cron: string;
  status: number;
  args: string | null;
  runCount: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: number | null;
  lastRunMessage: string | null;
  remark: string | null;
  updatedAt: string | null;
};

export type JobPayload = {
  name: string;
  cron: string;
  args?: string;
  remark?: string;
  status?: number;
};

export const getJobsMethod = () =>
  apiClient.authRequest<JobItem[]>('/api/monitor/jobs', {
    method: 'GET',
  });

export const createJobMethod = (payload: JobPayload) =>
  apiClient.authRequest<JobItem>('/api/monitor/jobs', {
    method: 'POST',
    body: payload,
  });

export const updateJobMethod = (id: number, payload: JobPayload) =>
  apiClient.authRequest<JobItem>(`/api/monitor/jobs/${id}`, {
    method: 'PUT',
    body: payload,
  });

export const toggleJobMethod = (id: number, status: number) =>
  apiClient.authRequest<JobItem>(`/api/monitor/jobs/${id}/toggle`, {
    method: 'POST',
    body: { status },
  });

export const runJobMethod = (id: number) =>
  apiClient.authRequest<JobItem>(`/api/monitor/jobs/${id}/run`, {
    method: 'POST',
  });

export type DashboardSummary = {
  todayLoginCount: number;
  totalLoginCount: number;
  onlineUserCount: number;
  totalJobCount: number;
  cacheKeyCount: number;
  cacheEnabled: boolean;
};

export type OperationTrendItem = {
  date: string;
  success: number;
  failed: number;
};

export const getDashboardSummaryMethod = () =>
  apiClient.authRequest<DashboardSummary>('/api/monitor/dashboard/summary', {
    method: 'GET',
  });

export const getOperationTrendMethod = (days: number = 7) =>
  apiClient.authRequest<OperationTrendItem[]>(
    `/api/monitor/dashboard/operation-trend?days=${days}`,
    {
      method: 'GET',
    },
  );

export type StorageConfigPayload = {
  type: 'local' | 'oss' | 'cos';
  local: {
    baseDir: string;
    baseUrl: string;
  };
  oss: {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    cdnUrl: string;
  };
  cos: {
    secretId: string;
    secretKey: string;
    bucket: string;
    region: string;
    cdnUrl: string;
  };
};

export type StorageConfigView = {
  featureEnabled: boolean;
  providerReady: boolean;
  source: {
    type: 'env' | 'db';
  };
  effective: StorageConfigPayload;
  masked: StorageConfigPayload;
};

export const getStorageConfigMethod = () =>
  apiClient.authRequest<StorageConfigView>('/api/monitor/storage/config', {
    method: 'GET',
  });

export const updateStorageConfigMethod = (payload: StorageConfigPayload) =>
  apiClient.authRequest<{
    source: { type: 'env' | 'db' };
    effective: StorageConfigPayload;
    masked: StorageConfigPayload;
  }>('/api/monitor/storage/config', {
    method: 'PUT',
    body: payload,
  });

export const testStorageConfigMethod = (payload?: StorageConfigPayload) =>
  apiClient.authRequest<{ success: boolean; message: string; type: string }>(
    '/api/monitor/storage/test',
    {
      method: 'POST',
      body: payload,
    },
  );
