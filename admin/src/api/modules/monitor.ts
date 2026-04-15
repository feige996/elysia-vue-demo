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
