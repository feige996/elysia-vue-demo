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
