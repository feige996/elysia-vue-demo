import { and, asc, count, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../../infra/db/client';
import {
  sysAuditLogsTable,
  sysConfigsTable,
  sysDictItemsTable,
  sysDictTypesTable,
} from '../../infra/db/schema';
import { ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

const apiErrorSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
});

const dictItemSchema = t.Object({
  id: t.Number(),
  label: t.String(),
  value: t.String(),
  tagType: t.Nullable(t.String()),
  sort: t.Number(),
  status: t.Number(),
  isDefault: t.Number(),
  remark: t.Nullable(t.String()),
});

const dictItemsSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(dictItemSchema),
});

const configValueSchema = t.Union([
  t.String(),
  t.Number(),
  t.Boolean(),
  t.Object({}),
  t.Null(),
]);

const configSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    key: t.String(),
    value: configValueSchema,
    valueType: t.Number(),
    groupName: t.Nullable(t.String()),
    isPublic: t.Number(),
    remark: t.Nullable(t.String()),
  }),
});

const auditLogSchema = t.Object({
  id: t.Number(),
  traceId: t.Nullable(t.String()),
  operatorUserId: t.Nullable(t.Number()),
  operatorAccount: t.Nullable(t.String()),
  action: t.String(),
  module: t.String(),
  resource: t.String(),
  resourceId: t.Nullable(t.String()),
  requestMethod: t.String(),
  requestPath: t.String(),
  responseCode: t.Number(),
  success: t.Number(),
  durationMs: t.Number(),
  createdAt: t.String(),
});

const auditLogsSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    list: t.Array(auditLogSchema),
    total: t.Number(),
    page: t.Number(),
    pageSize: t.Number(),
  }),
});

const auditLogStatsSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Object({
    total: t.Number(),
    successTotal: t.Number(),
    failedTotal: t.Number(),
    topModules: t.Array(
      t.Object({
        module: t.String(),
        count: t.Number(),
      }),
    ),
  }),
});

const auditLogQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  module: t.Optional(t.String()),
  action: t.Optional(t.String()),
  operatorUserId: t.Optional(t.Numeric({ minimum: 1 })),
  operatorAccount: t.Optional(t.String()),
  success: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

const parseConfigValue = (value: string, valueType: number) => {
  if (valueType === 2) {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  if (valueType === 3) {
    return value === 'true' || value === '1';
  }
  if (valueType === 4) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export const systemModule = new Elysia({
  prefix: '/api',
  detail: {
    tags: ['System'],
  },
})
  .get(
    '/dicts/:code/items',
    async ({ params, set, request }) => {
      const { requestId } = ensureRequestContext(request);
      const code = params.code;
      const dictType = await db
        .select({ id: sysDictTypesTable.id })
        .from(sysDictTypesTable)
        .where(
          and(
            eq(sysDictTypesTable.code, code),
            eq(sysDictTypesTable.status, 1),
          ),
        )
        .limit(1);
      if (!dictType[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict type not found', requestId };
      }

      const items = await db
        .select({
          id: sysDictItemsTable.id,
          label: sysDictItemsTable.label,
          value: sysDictItemsTable.value,
          tagType: sysDictItemsTable.tagType,
          sort: sysDictItemsTable.sort,
          status: sysDictItemsTable.status,
          isDefault: sysDictItemsTable.isDefault,
          remark: sysDictItemsTable.remark,
        })
        .from(sysDictItemsTable)
        .where(
          and(
            eq(sysDictItemsTable.dictTypeId, dictType[0].id),
            eq(sysDictItemsTable.status, 1),
          ),
        )
        .orderBy(asc(sysDictItemsTable.sort), asc(sysDictItemsTable.id));

      return ok(requestId, items, 'OK');
    },
    {
      detail: {
        summary: '按字典编码获取字典项',
        description: '需要管理员权限，返回启用状态字典项列表。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ code: t.String() }),
      response: {
        200: dictItemsSuccessSchema,
        404: apiErrorSchema,
      },
    },
  )
  .get(
    '/configs/:key',
    async ({ params, set, request }) => {
      const { requestId } = ensureRequestContext(request);
      const key = params.key;
      const rows = await db
        .select({
          key: sysConfigsTable.key,
          value: sysConfigsTable.value,
          valueType: sysConfigsTable.valueType,
          groupName: sysConfigsTable.groupName,
          isPublic: sysConfigsTable.isPublic,
          remark: sysConfigsTable.remark,
        })
        .from(sysConfigsTable)
        .where(eq(sysConfigsTable.key, key))
        .limit(1);
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Config not found', requestId };
      }
      const row = rows[0];
      return ok(
        requestId,
        {
          ...row,
          value: parseConfigValue(row.value, row.valueType),
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '按配置键获取系统配置',
        description: '需要管理员权限，返回配置键值与配置元数据。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ key: t.String() }),
      response: {
        200: configSuccessSchema,
        404: apiErrorSchema,
      },
    },
  )
  .get(
    '/audit-logs/stats',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const filters = [
        query.module
          ? ilike(sysAuditLogsTable.module, `%${query.module}%`)
          : undefined,
        query.action
          ? ilike(sysAuditLogsTable.action, `%${query.action}%`)
          : undefined,
        query.operatorUserId !== undefined
          ? eq(sysAuditLogsTable.operatorUserId, query.operatorUserId)
          : undefined,
        query.operatorAccount
          ? ilike(
              sysAuditLogsTable.operatorAccount,
              `%${query.operatorAccount}%`,
            )
          : undefined,
        query.success !== undefined
          ? eq(sysAuditLogsTable.success, query.success)
          : undefined,
        query.dateFrom
          ? gte(sysAuditLogsTable.createdAt, new Date(query.dateFrom))
          : undefined,
        query.dateTo
          ? lte(sysAuditLogsTable.createdAt, new Date(query.dateTo))
          : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item));

      const totalRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined);
      const successRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(
          and(
            filters.length ? and(...filters) : undefined,
            eq(sysAuditLogsTable.success, 1),
          ),
        );
      const failedRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(
          and(
            filters.length ? and(...filters) : undefined,
            eq(sysAuditLogsTable.success, 0),
          ),
        );

      const moduleRows = await db
        .select({
          module: sysAuditLogsTable.module,
          total: count(),
        })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined)
        .groupBy(sysAuditLogsTable.module)
        .orderBy(desc(count()))
        .limit(5);

      return ok(
        requestId,
        {
          total: Number(totalRows[0]?.total ?? 0),
          successTotal: Number(successRows[0]?.total ?? 0),
          failedTotal: Number(failedRows[0]?.total ?? 0),
          topModules: moduleRows.map((item) => ({
            module: item.module,
            count: Number(item.total ?? 0),
          })),
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询操作日志聚合统计',
        description: '需要管理员权限，返回总量、成功失败和 Top 模块。',
        security: [{ bearerAuth: [] }],
      },
      query: auditLogQuerySchema,
      response: {
        200: auditLogStatsSuccessSchema,
      },
    },
  )
  .get(
    '/audit-logs',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      const filters = [
        query.module
          ? ilike(sysAuditLogsTable.module, `%${query.module}%`)
          : undefined,
        query.action
          ? ilike(sysAuditLogsTable.action, `%${query.action}%`)
          : undefined,
        query.operatorUserId !== undefined
          ? eq(sysAuditLogsTable.operatorUserId, query.operatorUserId)
          : undefined,
        query.operatorAccount
          ? ilike(
              sysAuditLogsTable.operatorAccount,
              `%${query.operatorAccount}%`,
            )
          : undefined,
        query.success !== undefined
          ? eq(sysAuditLogsTable.success, query.success)
          : undefined,
        query.dateFrom
          ? gte(sysAuditLogsTable.createdAt, new Date(query.dateFrom))
          : undefined,
        query.dateTo
          ? lte(sysAuditLogsTable.createdAt, new Date(query.dateTo))
          : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item));

      const list = await db
        .select({
          id: sysAuditLogsTable.id,
          traceId: sysAuditLogsTable.traceId,
          operatorUserId: sysAuditLogsTable.operatorUserId,
          operatorAccount: sysAuditLogsTable.operatorAccount,
          action: sysAuditLogsTable.action,
          module: sysAuditLogsTable.module,
          resource: sysAuditLogsTable.resource,
          resourceId: sysAuditLogsTable.resourceId,
          requestMethod: sysAuditLogsTable.requestMethod,
          requestPath: sysAuditLogsTable.requestPath,
          responseCode: sysAuditLogsTable.responseCode,
          success: sysAuditLogsTable.success,
          durationMs: sysAuditLogsTable.durationMs,
          createdAt: sysAuditLogsTable.createdAt,
        })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(sysAuditLogsTable.createdAt))
        .limit(pageSize)
        .offset(offset);

      const totalRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined);

      return ok(
        requestId,
        {
          list: list.map((item) => ({
            ...item,
            createdAt: item.createdAt?.toISOString() ?? '',
          })),
          total: Number(totalRows[0]?.total ?? 0),
          page,
          pageSize,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询操作日志',
        description:
          '需要管理员权限，支持模块、动作、账号、成功状态与时间范围筛选。',
        security: [{ bearerAuth: [] }],
      },
      query: auditLogQuerySchema,
    },
  );
