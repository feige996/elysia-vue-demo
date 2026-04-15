import { Elysia } from 'elysia';
import { getRedisCacheOverview } from '../../shared/auth/refresh-token-store';
import { features } from '../../shared/config/env';
import { getOnlineSessions } from '../../shared/monitor/online-session-store';
import {
  addBlockedIp,
  listBlockedIps,
  removeBlockedIp,
} from '../../shared/security/ip-blacklist-store';
import { ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

export const monitorModule = new Elysia({
  prefix: '/api',
  detail: {
    tags: ['Monitor'],
  },
})
  .get(
    '/monitor/features',
    ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      return ok(
        requestId,
        {
          enabled: true,
          features,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询当前功能开关状态',
        description: '需要管理员权限，返回后端 feature flags 的当前启用状态。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    '/monitor/online',
    ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const sessions = getOnlineSessions();
      return ok(
        requestId,
        {
          total: sessions.length,
          list: sessions,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询在线会话列表',
        description:
          '需要管理员权限，返回最近活跃会话（内存态，默认 15 分钟无访问自动过期）。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    '/monitor/cache',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const cache = await getRedisCacheOverview();
      return ok(
        requestId,
        {
          ...cache,
          sampledCount: cache.sampledKeys.length,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询缓存总览',
        description:
          '需要管理员权限，返回 Redis 缓存总览与命名空间统计（只读）。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    '/monitor/ip-blacklist',
    ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      return ok(
        requestId,
        {
          enabled: features.ipBlacklist,
          list: listBlockedIps(),
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询 IP 黑名单',
        description: '需要管理员权限，返回当前黑名单规则（内存态）。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    '/monitor/ip-blacklist',
    async ({ request, body, set }) => {
      const { requestId } = ensureRequestContext(request);
      if (!features.ipBlacklist) {
        set.status = 400;
        return {
          code: 400000,
          message: 'IP blacklist feature is disabled',
          requestId,
        };
      }
      const payload = body as {
        ip?: string;
        reason?: string;
        expiresInMinutes?: number;
      };
      const ip = payload.ip?.trim();
      if (!ip) {
        set.status = 400;
        return {
          code: 400000,
          message: 'ip is required',
          requestId,
        };
      }
      addBlockedIp(ip, payload.reason, payload.expiresInMinutes);
      return ok(
        requestId,
        {
          success: true,
          ip,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '新增 IP 黑名单规则',
        description: '需要管理员权限，支持设置过期分钟数。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    '/monitor/ip-blacklist',
    ({ request, query, set }) => {
      const { requestId } = ensureRequestContext(request);
      const ip = String((query as Record<string, unknown>).ip ?? '').trim();
      if (!ip) {
        set.status = 400;
        return {
          code: 400000,
          message: 'ip is required',
          requestId,
        };
      }
      const removed = removeBlockedIp(ip);
      return ok(
        requestId,
        {
          removed,
          ip,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '删除 IP 黑名单规则',
        description: '需要管理员权限，按 ip 删除。',
        security: [{ bearerAuth: [] }],
      },
    },
  );
