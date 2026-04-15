import { Elysia, t } from 'elysia';
import { mkdir, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { and, asc, count, eq, gte, isNull, ne } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import {
  sysAuditLogsTable,
  sysConfigsTable,
  sysJobsTable,
  sysLoginLogsTable,
} from '../../infra/db/schema';
import { createStorage } from '../../infra/storage';
import { getRedisCacheOverview } from '../../shared/auth/refresh-token-store';
import { env, features } from '../../shared/config/env';
import { getOnlineSessions } from '../../shared/monitor/online-session-store';
import {
  addBlockedIp,
  listBlockedIps,
  removeBlockedIp,
} from '../../shared/security/ip-blacklist-store';
import {
  startJobScheduler,
  syncJobScheduleById,
  triggerJobRun,
} from '../../shared/monitor/job-scheduler';
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

const storageTypeSchema = t.Union([
  t.Literal('local'),
  t.Literal('oss'),
  t.Literal('cos'),
]);

const storageConfigBodySchema = t.Object({
  type: storageTypeSchema,
  local: t.Optional(
    t.Object({
      baseDir: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      baseUrl: t.Optional(t.String({ minLength: 1, maxLength: 512 })),
    }),
  ),
  oss: t.Optional(
    t.Object({
      region: t.Optional(t.String({ maxLength: 64 })),
      accessKeyId: t.Optional(t.String({ maxLength: 128 })),
      accessKeySecret: t.Optional(t.String({ maxLength: 128 })),
      bucket: t.Optional(t.String({ maxLength: 128 })),
      cdnUrl: t.Optional(t.String({ maxLength: 512 })),
    }),
  ),
  cos: t.Optional(
    t.Object({
      secretId: t.Optional(t.String({ maxLength: 128 })),
      secretKey: t.Optional(t.String({ maxLength: 128 })),
      bucket: t.Optional(t.String({ maxLength: 128 })),
      region: t.Optional(t.String({ maxLength: 64 })),
      cdnUrl: t.Optional(t.String({ maxLength: 512 })),
    }),
  ),
});

const storageTestBodySchema = t.Optional(storageConfigBodySchema);

const maskSecret = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw) return '';
  if (raw.length <= 4) return '****';
  return `${raw.slice(0, 2)}****${raw.slice(-2)}`;
};

const buildStorageConfigFromEnv = () => ({
  type: env.STORAGE_TYPE as 'local' | 'oss' | 'cos',
  local: {
    baseDir: env.LOCAL_BASE_DIR,
    baseUrl: env.LOCAL_BASE_URL,
  },
  oss: {
    region: env.OSS_REGION ?? '',
    accessKeyId: env.OSS_ACCESS_KEY_ID ?? '',
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET ?? '',
    bucket: env.OSS_BUCKET ?? '',
    cdnUrl: env.OSS_CDN_URL ?? '',
  },
  cos: {
    secretId: env.COS_SECRET_ID ?? '',
    secretKey: env.COS_SECRET_KEY ?? '',
    bucket: env.COS_BUCKET ?? '',
    region: env.COS_REGION ?? '',
    cdnUrl: env.COS_CDN_URL ?? '',
  },
});

const normalizeStorageConfigPatch = (payload: {
  type: 'local' | 'oss' | 'cos';
  local?: { baseDir?: string; baseUrl?: string };
  oss?: {
    region?: string;
    accessKeyId?: string;
    accessKeySecret?: string;
    bucket?: string;
    cdnUrl?: string;
  };
  cos?: {
    secretId?: string;
    secretKey?: string;
    bucket?: string;
    region?: string;
    cdnUrl?: string;
  };
}) => ({
  type: payload.type,
  local: {
    baseDir: payload.local?.baseDir?.trim() ?? '',
    baseUrl: payload.local?.baseUrl?.trim() ?? '',
  },
  oss: {
    region: payload.oss?.region?.trim() ?? '',
    accessKeyId: payload.oss?.accessKeyId?.trim() ?? '',
    accessKeySecret: payload.oss?.accessKeySecret?.trim() ?? '',
    bucket: payload.oss?.bucket?.trim() ?? '',
    cdnUrl: payload.oss?.cdnUrl?.trim() ?? '',
  },
  cos: {
    secretId: payload.cos?.secretId?.trim() ?? '',
    secretKey: payload.cos?.secretKey?.trim() ?? '',
    bucket: payload.cos?.bucket?.trim() ?? '',
    region: payload.cos?.region?.trim() ?? '',
    cdnUrl: payload.cos?.cdnUrl?.trim() ?? '',
  },
});

const storageConfigKeys = {
  type: 'system.storage.type',
  localBaseDir: 'system.storage.local.baseDir',
  localBaseUrl: 'system.storage.local.baseUrl',
  ossRegion: 'system.storage.oss.region',
  ossAccessKeyId: 'system.storage.oss.accessKeyId',
  ossAccessKeySecret: 'system.storage.oss.accessKeySecret',
  ossBucket: 'system.storage.oss.bucket',
  ossCdnUrl: 'system.storage.oss.cdnUrl',
  cosSecretId: 'system.storage.cos.secretId',
  cosSecretKey: 'system.storage.cos.secretKey',
  cosBucket: 'system.storage.cos.bucket',
  cosRegion: 'system.storage.cos.region',
  cosCdnUrl: 'system.storage.cos.cdnUrl',
} as const;

const loadStorageOverrides = async () => {
  const rows = await db
    .select({
      key: sysConfigsTable.key,
      value: sysConfigsTable.value,
    })
    .from(sysConfigsTable)
    .where(
      and(
        eq(sysConfigsTable.groupName, 'storage'),
        isNull(sysConfigsTable.deletedAt),
      ),
    );
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }
  return map;
};

const buildStorageConfigView = async () => {
  const base = buildStorageConfigFromEnv();
  const overrides = await loadStorageOverrides();
  const effective = {
    type: (overrides.get(storageConfigKeys.type) ?? base.type) as
      | 'local'
      | 'oss'
      | 'cos',
    local: {
      baseDir:
        overrides.get(storageConfigKeys.localBaseDir) ?? base.local.baseDir,
      baseUrl:
        overrides.get(storageConfigKeys.localBaseUrl) ?? base.local.baseUrl,
    },
    oss: {
      region: overrides.get(storageConfigKeys.ossRegion) ?? base.oss.region,
      accessKeyId:
        overrides.get(storageConfigKeys.ossAccessKeyId) ?? base.oss.accessKeyId,
      accessKeySecret:
        overrides.get(storageConfigKeys.ossAccessKeySecret) ??
        base.oss.accessKeySecret,
      bucket: overrides.get(storageConfigKeys.ossBucket) ?? base.oss.bucket,
      cdnUrl: overrides.get(storageConfigKeys.ossCdnUrl) ?? base.oss.cdnUrl,
    },
    cos: {
      secretId:
        overrides.get(storageConfigKeys.cosSecretId) ?? base.cos.secretId,
      secretKey:
        overrides.get(storageConfigKeys.cosSecretKey) ?? base.cos.secretKey,
      bucket: overrides.get(storageConfigKeys.cosBucket) ?? base.cos.bucket,
      region: overrides.get(storageConfigKeys.cosRegion) ?? base.cos.region,
      cdnUrl: overrides.get(storageConfigKeys.cosCdnUrl) ?? base.cos.cdnUrl,
    },
  };
  return {
    source: {
      type: overrides.has(storageConfigKeys.type) ? 'db' : 'env',
    },
    effective,
    masked: {
      ...effective,
      oss: {
        ...effective.oss,
        accessKeySecret: maskSecret(effective.oss.accessKeySecret),
      },
      cos: {
        ...effective.cos,
        secretKey: maskSecret(effective.cos.secretKey),
      },
    },
  };
};

const upsertStorageConfig = async (
  key: string,
  value: string,
  remark: string,
) => {
  const existed = await db
    .select({ id: sysConfigsTable.id })
    .from(sysConfigsTable)
    .where(eq(sysConfigsTable.key, key))
    .limit(1);
  if (existed[0]) {
    await db
      .update(sysConfigsTable)
      .set({
        value,
        valueType: 1,
        groupName: 'storage',
        isPublic: 0,
        remark,
        updatedAt: new Date(),
        deletedAt: null,
      })
      .where(eq(sysConfigsTable.id, existed[0].id));
    return;
  }
  await db.insert(sysConfigsTable).values({
    key,
    value,
    valueType: 1,
    groupName: 'storage',
    isPublic: 0,
    remark,
  });
};

const assertStorageConfigHealth = async (
  config: ReturnType<typeof normalizeStorageConfigPatch>,
) => {
  if (config.type === 'local') {
    if (!config.local.baseDir || !config.local.baseUrl) {
      throw new Error('local storage requires baseDir and baseUrl');
    }
    await mkdir(config.local.baseDir, { recursive: true });
    await access(config.local.baseDir, fsConstants.W_OK);
    return { message: 'local storage directory is writable' };
  }
  if (config.type === 'oss') {
    if (
      !config.oss.region ||
      !config.oss.accessKeyId ||
      !config.oss.accessKeySecret ||
      !config.oss.bucket
    ) {
      throw new Error(
        'oss storage requires region/accessKeyId/accessKeySecret/bucket',
      );
    }
    return { message: 'oss config validation passed' };
  }
  if (
    !config.cos.secretId ||
    !config.cos.secretKey ||
    !config.cos.bucket ||
    !config.cos.region
  ) {
    throw new Error('cos storage requires secretId/secretKey/bucket/region');
  }
  return { message: 'cos config validation passed' };
};

const isMissingTableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('no such table')
  );
};

export const monitorModule = new Elysia({
  prefix: '/api',
  detail: {
    tags: ['Monitor'],
  },
})
  .get(
    '/monitor/dashboard/summary',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const now = new Date();
      const startOfToday = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      let todayLoginCount = 0;
      let totalLoginCount = 0;
      try {
        const [todayLoginRows, totalLoginRows] = await Promise.all([
          db
            .select({ total: count() })
            .from(sysLoginLogsTable)
            .where(
              and(
                eq(sysLoginLogsTable.success, 1),
                gte(sysLoginLogsTable.createdAt, startOfToday),
              ),
            ),
          db.select({ total: count() }).from(sysLoginLogsTable),
        ]);
        todayLoginCount = Number(todayLoginRows[0]?.total ?? 0);
        totalLoginCount = Number(totalLoginRows[0]?.total ?? 0);
      } catch (error) {
        if (!isMissingTableError(error)) {
          throw error;
        }
      }
      const jobsRows = await db
        .select({
          total: count(),
        })
        .from(sysJobsTable)
        .where(isNull(sysJobsTable.deletedAt));
      const onlineCount = getOnlineSessions().length;
      const cache = await getRedisCacheOverview();
      return ok(
        requestId,
        {
          todayLoginCount,
          totalLoginCount,
          onlineUserCount: onlineCount,
          totalJobCount: Number(jobsRows[0]?.total ?? 0),
          cacheKeyCount: cache.totalKeys,
          cacheEnabled: cache.enabled,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询控制台摘要',
        description: '需要管理员权限，返回登录、在线、任务和缓存统计。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    '/monitor/dashboard/operation-trend',
    async ({ request, query }) => {
      const { requestId } = ensureRequestContext(request);
      const days = Math.max(1, Math.min(30, Number(query.days ?? 7)));
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      start.setUTCDate(start.getUTCDate() - (days - 1));
      const rows = await db
        .select({
          success: sysAuditLogsTable.success,
          createdAt: sysAuditLogsTable.createdAt,
        })
        .from(sysAuditLogsTable)
        .where(gte(sysAuditLogsTable.createdAt, start));
      const map = new Map<
        string,
        { date: string; success: number; failed: number }
      >();
      for (let i = 0; i < days; i += 1) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        map.set(key, { date: key, success: 0, failed: 0 });
      }
      for (const row of rows) {
        const key = row.createdAt?.toISOString().slice(0, 10);
        if (!key || !map.has(key)) continue;
        if (row.success === 1) map.get(key)!.success += 1;
        else map.get(key)!.failed += 1;
      }
      return ok(requestId, [...map.values()], 'OK');
    },
    {
      detail: {
        summary: '查询操作趋势',
        description: '需要管理员权限，返回近 N 天操作日志成功/失败聚合。',
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        days: t.Optional(t.Numeric({ minimum: 1, maximum: 30, default: 7 })),
      }),
    },
  )
  .get(
    '/monitor/storage/config',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const config = await buildStorageConfigView();
      const providerReady =
        createStorage() !== null ||
        config.effective.type !== (env.STORAGE_TYPE as string);
      return ok(
        requestId,
        {
          featureEnabled: features.storageExtended,
          providerReady,
          ...config,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询存储中心配置',
        description: '需要管理员权限，返回当前存储配置（敏感字段脱敏）。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    '/monitor/storage/config',
    async ({ request, body }) => {
      const { requestId } = ensureRequestContext(request);
      const payload = normalizeStorageConfigPatch(
        body as {
          type: 'local' | 'oss' | 'cos';
          local?: { baseDir?: string; baseUrl?: string };
          oss?: {
            region?: string;
            accessKeyId?: string;
            accessKeySecret?: string;
            bucket?: string;
            cdnUrl?: string;
          };
          cos?: {
            secretId?: string;
            secretKey?: string;
            bucket?: string;
            region?: string;
            cdnUrl?: string;
          };
        },
      );
      await upsertStorageConfig(
        storageConfigKeys.type,
        payload.type,
        '存储类型',
      );
      await upsertStorageConfig(
        storageConfigKeys.localBaseDir,
        payload.local.baseDir,
        'Local 存储目录',
      );
      await upsertStorageConfig(
        storageConfigKeys.localBaseUrl,
        payload.local.baseUrl,
        'Local 访问地址',
      );
      await upsertStorageConfig(
        storageConfigKeys.ossRegion,
        payload.oss.region,
        'OSS 区域',
      );
      await upsertStorageConfig(
        storageConfigKeys.ossAccessKeyId,
        payload.oss.accessKeyId,
        'OSS AccessKeyId',
      );
      await upsertStorageConfig(
        storageConfigKeys.ossAccessKeySecret,
        payload.oss.accessKeySecret,
        'OSS AccessKeySecret',
      );
      await upsertStorageConfig(
        storageConfigKeys.ossBucket,
        payload.oss.bucket,
        'OSS Bucket',
      );
      await upsertStorageConfig(
        storageConfigKeys.ossCdnUrl,
        payload.oss.cdnUrl,
        'OSS CDN',
      );
      await upsertStorageConfig(
        storageConfigKeys.cosSecretId,
        payload.cos.secretId,
        'COS SecretId',
      );
      await upsertStorageConfig(
        storageConfigKeys.cosSecretKey,
        payload.cos.secretKey,
        'COS SecretKey',
      );
      await upsertStorageConfig(
        storageConfigKeys.cosBucket,
        payload.cos.bucket,
        'COS Bucket',
      );
      await upsertStorageConfig(
        storageConfigKeys.cosRegion,
        payload.cos.region,
        'COS Region',
      );
      await upsertStorageConfig(
        storageConfigKeys.cosCdnUrl,
        payload.cos.cdnUrl,
        'COS CDN',
      );
      const view = await buildStorageConfigView();
      return ok(requestId, view, 'OK');
    },
    {
      detail: {
        summary: '更新存储中心配置',
        description:
          '需要管理员权限，最小版仅保存配置到系统配置中心，运行时生效以重启后读取为准。',
        security: [{ bearerAuth: [] }],
      },
      body: storageConfigBodySchema,
    },
  )
  .post(
    '/monitor/storage/test',
    async ({ request, body, set }) => {
      const { requestId } = ensureRequestContext(request);
      try {
        const rawBody = body as
          | {
              type: 'local' | 'oss' | 'cos';
              local?: { baseDir?: string; baseUrl?: string };
              oss?: {
                region?: string;
                accessKeyId?: string;
                accessKeySecret?: string;
                bucket?: string;
                cdnUrl?: string;
              };
              cos?: {
                secretId?: string;
                secretKey?: string;
                bucket?: string;
                region?: string;
                cdnUrl?: string;
              };
            }
          | undefined;
        const sourceConfig =
          rawBody ?? (await buildStorageConfigView()).effective;
        const normalized = normalizeStorageConfigPatch(sourceConfig);
        const result = await assertStorageConfigHealth(normalized);
        return ok(
          requestId,
          {
            success: true,
            message: result.message,
            type: normalized.type,
          },
          'OK',
        );
      } catch (error) {
        set.status = 400;
        return {
          code: 400000,
          message: error instanceof Error ? error.message : String(error),
          requestId,
        };
      }
    },
    {
      detail: {
        summary: '测试存储配置联通性',
        description:
          '需要管理员权限，local 检查目录可写；oss/cos 检查配置字段完整性。',
        security: [{ bearerAuth: [] }],
      },
      body: storageTestBodySchema,
    },
  )
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
          nextRunAt: sysJobsTable.nextRunAt,
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
          nextRunAt: item.nextRunAt?.toISOString() ?? null,
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
          nextRunAt: sysJobsTable.nextRunAt,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        });
      await syncJobScheduleById(rows[0].id);
      const synced = await db
        .select({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          nextRunAt: sysJobsTable.nextRunAt,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        })
        .from(sysJobsTable)
        .where(eq(sysJobsTable.id, rows[0].id))
        .limit(1);
      set.status = 201;
      return ok(
        requestId,
        {
          ...synced[0],
          nextRunAt: synced[0].nextRunAt?.toISOString() ?? null,
          lastRunAt: synced[0].lastRunAt?.toISOString() ?? null,
          updatedAt: synced[0].updatedAt?.toISOString() ?? null,
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
          nextRunAt: sysJobsTable.nextRunAt,
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
      await syncJobScheduleById(id);
      const synced = await db
        .select({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          nextRunAt: sysJobsTable.nextRunAt,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        })
        .from(sysJobsTable)
        .where(eq(sysJobsTable.id, id))
        .limit(1);
      return ok(
        requestId,
        {
          ...synced[0],
          nextRunAt: synced[0].nextRunAt?.toISOString() ?? null,
          lastRunAt: synced[0].lastRunAt?.toISOString() ?? null,
          updatedAt: synced[0].updatedAt?.toISOString() ?? null,
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
          nextRunAt: sysJobsTable.nextRunAt,
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
      await syncJobScheduleById(id);
      const synced = await db
        .select({
          id: sysJobsTable.id,
          name: sysJobsTable.name,
          cron: sysJobsTable.cron,
          status: sysJobsTable.status,
          args: sysJobsTable.args,
          runCount: sysJobsTable.runCount,
          nextRunAt: sysJobsTable.nextRunAt,
          lastRunAt: sysJobsTable.lastRunAt,
          lastRunStatus: sysJobsTable.lastRunStatus,
          lastRunMessage: sysJobsTable.lastRunMessage,
          remark: sysJobsTable.remark,
          updatedAt: sysJobsTable.updatedAt,
        })
        .from(sysJobsTable)
        .where(eq(sysJobsTable.id, id))
        .limit(1);
      return ok(
        requestId,
        {
          ...synced[0],
          nextRunAt: synced[0].nextRunAt?.toISOString() ?? null,
          lastRunAt: synced[0].lastRunAt?.toISOString() ?? null,
          updatedAt: synced[0].updatedAt?.toISOString() ?? null,
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
      if (features.cron) {
        await startJobScheduler();
      }
      const row = await triggerJobRun(id, 'manual');
      if (!row) {
        set.status = 404;
        return { code: 404000, message: 'job not found', requestId };
      }
      return ok(
        requestId,
        {
          ...row,
          nextRunAt: row.nextRunAt?.toISOString() ?? null,
          lastRunAt: row.lastRunAt?.toISOString() ?? null,
          updatedAt: row.updatedAt?.toISOString() ?? null,
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
