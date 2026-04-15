import { Elysia, t } from 'elysia';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import { sysJobsTable } from '../../infra/db/schema';
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

const jobBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 64 }),
  cron: t.String({ minLength: 1, maxLength: 64 }),
  args: t.Optional(t.String()),
  remark: t.Optional(t.String({ maxLength: 255 })),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
});

const jobToggleBodySchema = t.Object({
  status: t.Numeric({ minimum: 0, maximum: 1 }),
});

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
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      return ok(
        requestId,
        {
          enabled: features.ipBlacklist,
          list: await listBlockedIps(),
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
      await addBlockedIp(ip, payload.reason, payload.expiresInMinutes);
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
    async ({ request, query, set }) => {
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
      const removed = await removeBlockedIp(ip);
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
  )
  .get(
    '/monitor/jobs',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const rows = await db
        .select({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        })
        .from(sysJobsTable)
        .where(isNull(sysJobsTable.deletedAt))
        .orderBy(asc(sysJobsTable.id));
      return ok(
        requestId,
        rows.map((item) => ({
          ...item,
          lastRunAt: item.lastRunAt?.toISOString() ?? null,
          updatedAt: item.updatedAt?.toISOString() ?? null,
        })),
        'OK',
      );
    },
    {
      detail: {
        summary: '查询任务中心列表',
        description: '需要管理员权限，返回任务配置与最近执行状态。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    '/monitor/jobs',
    async ({ request, body, set }) => {
      const { requestId } = ensureRequestContext(request);
      const payload = body as {
        name: string;
        cron: string;
        args?: string;
        remark?: string;
        status?: number;
      };
      const name = payload.name.trim();
      const cron = payload.cron.trim();
      if (!name || !cron) {
        set.status = 400;
        return {
          code: 400000,
          message: 'name and cron are required',
          requestId,
        };
      }
      const exists = await db
        .select({ id: sysJobsTable.id })
        .from(sysJobsTable)
        .where(and(eq(sysJobsTable.name, name), isNull(sysJobsTable.deletedAt)))
        .limit(1);
      if (exists[0]) {
        set.status = 409;
        return { code: 409000, message: 'job name already exists', requestId };
      }
      const rows = await db
        .insert(sysJobsTable)
        .values({
          name,
          cron,
          args: payload.args?.trim() || null,
          remark: payload.remark?.trim() || null,
          status: payload.status ?? 1,
        })
        .returning({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        });
      set.status = 201;
      return ok(
        requestId,
        {
          ...rows[0],
          lastRunAt: rows[0].lastRunAt?.toISOString() ?? null,
          updatedAt: rows[0].updatedAt?.toISOString() ?? null,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '新增任务配置',
        description: '需要管理员权限，name 唯一。',
        security: [{ bearerAuth: [] }],
      },
      body: jobBodySchema,
    },
  )
  .put(
    '/monitor/jobs/:id',
    async ({ request, params, body, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as {
        name: string;
        cron: string;
        args?: string;
        remark?: string;
        status?: number;
      };
      const name = payload.name.trim();
      const cron = payload.cron.trim();
      if (!name || !cron) {
        set.status = 400;
        return {
          code: 400000,
          message: 'name and cron are required',
          requestId,
        };
      }
      const duplicate = await db
        .select({ id: sysJobsTable.id })
        .from(sysJobsTable)
        .where(
          and(
            eq(sysJobsTable.name, name),
            ne(sysJobsTable.id, id),
            isNull(sysJobsTable.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        set.status = 409;
        return { code: 409000, message: 'job name already exists', requestId };
      }
      const rows = await db
        .update(sysJobsTable)
        .set({
          name,
          cron,
          status: payload.status ?? 1,
          args: payload.args?.trim() || null,
          remark: payload.remark?.trim() || null,
          updatedAt: new Date(),
        })
        .where(and(eq(sysJobsTable.id, id), isNull(sysJobsTable.deletedAt)))
        .returning({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'job not found', requestId };
      }
      return ok(
        requestId,
        {
          ...rows[0],
          lastRunAt: rows[0].lastRunAt?.toISOString() ?? null,
          updatedAt: rows[0].updatedAt?.toISOString() ?? null,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '编辑任务配置',
        description: '需要管理员权限，支持更新 cron/status。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: jobBodySchema,
    },
  )
  .post(
    '/monitor/jobs/:id/toggle',
    async ({ request, params, body, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as { status: number };
      const rows = await db
        .update(sysJobsTable)
        .set({
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(and(eq(sysJobsTable.id, id), isNull(sysJobsTable.deletedAt)))
        .returning({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'job not found', requestId };
      }
      return ok(
        requestId,
        {
          ...rows[0],
          lastRunAt: rows[0].lastRunAt?.toISOString() ?? null,
          updatedAt: rows[0].updatedAt?.toISOString() ?? null,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '启停任务',
        description: '需要管理员权限，status: 0 禁用, 1 启用。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: jobToggleBodySchema,
    },
  )
  .post(
    '/monitor/jobs/:id/run',
    async ({ request, params, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const rows = await db
        .update(sysJobsTable)
        .set({
          runCount: sql`${sysJobsTable.runCount} + 1`,
          lastRunAt: new Date(),
          lastRunStatus: 1,
          lastRunMessage: 'manual trigger success',
          updatedAt: new Date(),
        })
        .where(and(eq(sysJobsTable.id, id), isNull(sysJobsTable.deletedAt)))
        .returning({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'job not found', requestId };
      }
      return ok(
        requestId,
        {
          ...rows[0],
          lastRunAt: rows[0].lastRunAt?.toISOString() ?? null,
          updatedAt: rows[0].updatedAt?.toISOString() ?? null,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '手动触发任务执行',
        description: '需要管理员权限，最小版仅记录执行结果。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
    },
  );
