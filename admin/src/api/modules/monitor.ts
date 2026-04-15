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
