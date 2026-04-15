import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  ne,
  or,
} from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../../infra/db/client';
import {
  sysAuditLogsTable,
  sysConfigsTable,
  sysDeptsTable,
  sysDictItemsTable,
  sysLoginLogsTable,
  sysPermissionsTable,
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

const dictTypeSchema = t.Object({
  id: t.Number(),
  code: t.String(),
  name: t.String(),
  status: t.Number(),
  remark: t.Nullable(t.String()),
});

const dictTypeListSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(dictTypeSchema),
});

const dictItemListSuccessSchema = t.Object({
  code: t.Number(),
  message: t.String(),
  requestId: t.String(),
  data: t.Array(
    t.Intersect([
      dictItemSchema,
      t.Object({
        dictTypeId: t.Number(),
      }),
    ]),
  ),
});

const dictTypeBodySchema = t.Object({
  code: t.String({ minLength: 1, maxLength: 64 }),
  name: t.String({ minLength: 1, maxLength: 64 }),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  remark: t.Optional(t.String({ maxLength: 255 })),
});

const dictItemBodySchema = t.Object({
  dictTypeId: t.Numeric({ minimum: 1 }),
  label: t.String({ minLength: 1, maxLength: 64 }),
  value: t.String({ minLength: 1, maxLength: 64 }),
  tagType: t.Optional(t.String({ maxLength: 32 })),
  sort: t.Optional(t.Numeric({ minimum: 0, maximum: 9999 })),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  isDefault: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  remark: t.Optional(t.String({ maxLength: 255 })),
});

const toggleBodySchema = t.Object({
  status: t.Numeric({ minimum: 0, maximum: 1 }),
});

const deptSchema = t.Object({
  id: t.Number(),
  parentId: t.Number(),
  name: t.String(),
  code: t.String(),
  sort: t.Number(),
  status: t.Number(),
  leader: t.Nullable(t.String()),
  phone: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
});

const deptBodySchema = t.Object({
  parentId: t.Optional(t.Numeric({ minimum: 0 })),
  name: t.String({ minLength: 1, maxLength: 64 }),
  code: t.String({ minLength: 1, maxLength: 64 }),
  sort: t.Optional(t.Numeric({ minimum: 0, maximum: 9999 })),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  leader: t.Optional(t.String({ maxLength: 64 })),
  phone: t.Optional(t.String({ maxLength: 32 })),
  email: t.Optional(t.String({ maxLength: 128 })),
});

type DeptRow = {
  id: number;
  parentId: number;
  name: string;
  code: string;
  sort: number;
  status: number;
  leader: string | null;
  phone: string | null;
  email: string | null;
};

const buildDeptTree = (rows: DeptRow[]) => {
  const nodeMap = new Map<
    number,
    DeptRow & { children: Array<DeptRow & { children: unknown[] }> }
  >();
  const roots: Array<
    DeptRow & { children: Array<DeptRow & { children: unknown[] }> }
  > = [];

  for (const item of rows) {
    nodeMap.set(item.id, { ...item, children: [] });
  }
  for (const item of rows) {
    const current = nodeMap.get(item.id);
    if (!current) continue;
    const parent = nodeMap.get(item.parentId);
    if (!parent || item.parentId === 0) {
      roots.push(current);
      continue;
    }
    parent.children.push(current);
  }
  return roots;
};

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

const loginLogQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  account: t.Optional(t.String()),
  requestIp: t.Optional(t.String()),
  success: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
});

const apiCatalogQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  keyword: t.Optional(t.String()),
  module: t.Optional(t.String()),
  status: t.Optional(t.Numeric({ minimum: 0, maximum: 1 })),
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

const buildAuditLogFilters = (query: {
  module?: string;
  action?: string;
  operatorUserId?: number;
  operatorAccount?: string;
  success?: number;
  dateFrom?: string;
  dateTo?: string;
}) =>
  [
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
      ? ilike(sysAuditLogsTable.operatorAccount, `%${query.operatorAccount}%`)
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

const buildLoginLogFilters = (query: {
  account?: string;
  requestIp?: string;
  success?: number;
  dateFrom?: string;
  dateTo?: string;
}) =>
  [
    query.account
      ? ilike(sysLoginLogsTable.account, `%${query.account}%`)
      : undefined,
    query.requestIp
      ? ilike(sysLoginLogsTable.requestIp, `%${query.requestIp}%`)
      : undefined,
    query.success !== undefined
      ? eq(sysLoginLogsTable.success, query.success)
      : undefined,
    query.dateFrom
      ? gte(sysLoginLogsTable.createdAt, new Date(query.dateFrom))
      : undefined,
    query.dateTo
      ? lte(sysLoginLogsTable.createdAt, new Date(query.dateTo))
      : undefined,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

const toCsvCell = (value: string | number | null) => {
  const raw = value === null ? '' : String(value);
  const escaped = raw.replaceAll('"', '""');
  return `"${escaped}"`;
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
            isNull(sysDictTypesTable.deletedAt),
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
            isNull(sysDictItemsTable.deletedAt),
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
    '/dict-types',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const rows = await db
        .select({
          id: sysDictTypesTable.id,
          code: sysDictTypesTable.code,
          name: sysDictTypesTable.name,
          status: sysDictTypesTable.status,
          remark: sysDictTypesTable.remark,
        })
        .from(sysDictTypesTable)
        .where(isNull(sysDictTypesTable.deletedAt))
        .orderBy(asc(sysDictTypesTable.id));
      return ok(requestId, rows, 'OK');
    },
    {
      detail: {
        summary: '查询字典类型列表',
        description: '需要管理员权限，返回全部未删除字典类型。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    '/dict-types',
    async ({ body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const payload = body as {
        code: string;
        name: string;
        status?: number;
        remark?: string;
      };
      const code = payload.code.trim();
      const name = payload.name.trim();
      if (!code || !name) {
        set.status = 400;
        return {
          code: 400000,
          message: 'code and name are required',
          requestId,
        };
      }
      const exists = await db
        .select({ id: sysDictTypesTable.id })
        .from(sysDictTypesTable)
        .where(
          and(
            eq(sysDictTypesTable.code, code),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .limit(1);
      if (exists[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Dict type code already exists',
          requestId,
        };
      }
      const created = await db
        .insert(sysDictTypesTable)
        .values({
          code,
          name,
          status: payload.status ?? 1,
          remark: payload.remark?.trim() || null,
        })
        .returning({
          id: sysDictTypesTable.id,
          code: sysDictTypesTable.code,
          name: sysDictTypesTable.name,
          status: sysDictTypesTable.status,
          remark: sysDictTypesTable.remark,
        });
      set.status = 201;
      return ok(requestId, created[0], 'OK');
    },
    {
      detail: {
        summary: '新增字典类型',
        description: '需要管理员权限，字典编码必须唯一。',
        security: [{ bearerAuth: [] }],
      },
      body: dictTypeBodySchema,
      response: {
        201: t.Object({
          code: t.Number(),
          message: t.String(),
          requestId: t.String(),
          data: dictTypeSchema,
        }),
        400: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .put(
    '/dict-types/:id',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as {
        code: string;
        name: string;
        status?: number;
        remark?: string;
      };
      const code = payload.code.trim();
      const name = payload.name.trim();
      if (!code || !name) {
        set.status = 400;
        return {
          code: 400000,
          message: 'code and name are required',
          requestId,
        };
      }
      const duplicate = await db
        .select({ id: sysDictTypesTable.id })
        .from(sysDictTypesTable)
        .where(
          and(
            eq(sysDictTypesTable.code, code),
            ne(sysDictTypesTable.id, id),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Dict type code already exists',
          requestId,
        };
      }
      const rows = await db
        .update(sysDictTypesTable)
        .set({
          code,
          name,
          status: payload.status ?? 1,
          remark: payload.remark?.trim() || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictTypesTable.id, id),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .returning({
          id: sysDictTypesTable.id,
          code: sysDictTypesTable.code,
          name: sysDictTypesTable.name,
          status: sysDictTypesTable.status,
          remark: sysDictTypesTable.remark,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict type not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '编辑字典类型',
        description: '需要管理员权限，按 id 更新字典类型。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: dictTypeBodySchema,
      response: {
        200: t.Object({
          code: t.Number(),
          message: t.String(),
          requestId: t.String(),
          data: dictTypeSchema,
        }),
        400: apiErrorSchema,
        404: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .post(
    '/dict-types/:id/toggle',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as { status: number };
      const rows = await db
        .update(sysDictTypesTable)
        .set({
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictTypesTable.id, id),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .returning({
          id: sysDictTypesTable.id,
          code: sysDictTypesTable.code,
          name: sysDictTypesTable.name,
          status: sysDictTypesTable.status,
          remark: sysDictTypesTable.remark,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict type not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '切换字典类型状态',
        description: '需要管理员权限，status: 0 禁用, 1 启用。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: toggleBodySchema,
    },
  )
  .delete(
    '/dict-types/:id',
    async ({ params, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const itemRows = await db
        .select({ id: sysDictItemsTable.id })
        .from(sysDictItemsTable)
        .where(
          and(
            eq(sysDictItemsTable.dictTypeId, id),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .limit(1);
      if (itemRows[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Please delete dict items first',
          requestId,
        };
      }
      const rows = await db
        .update(sysDictTypesTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictTypesTable.id, id),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .returning({ id: sysDictTypesTable.id });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict type not found', requestId };
      }
      return ok(requestId, { deleted: 1 }, 'OK');
    },
    {
      detail: {
        summary: '删除字典类型',
        description: '需要管理员权限，若存在字典项则拒绝删除。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      response: {
        400: apiErrorSchema,
        404: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .get(
    '/dict-items',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const dictTypeId =
        query.dictTypeId !== undefined ? Number(query.dictTypeId) : undefined;
      const rows = await db
        .select({
          id: sysDictItemsTable.id,
          dictTypeId: sysDictItemsTable.dictTypeId,
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
            dictTypeId
              ? eq(sysDictItemsTable.dictTypeId, dictTypeId)
              : undefined,
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .orderBy(asc(sysDictItemsTable.sort), asc(sysDictItemsTable.id));
      return ok(requestId, rows, 'OK');
    },
    {
      detail: {
        summary: '查询字典项列表',
        description: '需要管理员权限，可按字典类型过滤。',
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        dictTypeId: t.Optional(t.Numeric({ minimum: 1 })),
      }),
    },
  )
  .post(
    '/dict-items',
    async ({ body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const payload = body as {
        dictTypeId: number;
        label: string;
        value: string;
        tagType?: string;
        sort?: number;
        status?: number;
        isDefault?: number;
        remark?: string;
      };
      const dictTypeId = Number(payload.dictTypeId);
      const label = payload.label.trim();
      const value = payload.value.trim();
      if (
        !Number.isInteger(dictTypeId) ||
        dictTypeId <= 0 ||
        !label ||
        !value
      ) {
        set.status = 400;
        return {
          code: 400000,
          message: 'dictTypeId, label and value are required',
          requestId,
        };
      }
      const dictTypeRows = await db
        .select({ id: sysDictTypesTable.id })
        .from(sysDictTypesTable)
        .where(
          and(
            eq(sysDictTypesTable.id, dictTypeId),
            isNull(sysDictTypesTable.deletedAt),
          ),
        )
        .limit(1);
      if (!dictTypeRows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict type not found', requestId };
      }
      const duplicate = await db
        .select({ id: sysDictItemsTable.id })
        .from(sysDictItemsTable)
        .where(
          and(
            eq(sysDictItemsTable.dictTypeId, dictTypeId),
            eq(sysDictItemsTable.value, value),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Dict item value already exists in dict type',
          requestId,
        };
      }
      const created = await db
        .insert(sysDictItemsTable)
        .values({
          dictTypeId,
          label,
          value,
          tagType: payload.tagType?.trim() || null,
          sort: payload.sort ?? 0,
          status: payload.status ?? 1,
          isDefault: payload.isDefault ?? 0,
          remark: payload.remark?.trim() || null,
        })
        .returning({
          id: sysDictItemsTable.id,
          dictTypeId: sysDictItemsTable.dictTypeId,
          label: sysDictItemsTable.label,
          value: sysDictItemsTable.value,
          tagType: sysDictItemsTable.tagType,
          sort: sysDictItemsTable.sort,
          status: sysDictItemsTable.status,
          isDefault: sysDictItemsTable.isDefault,
          remark: sysDictItemsTable.remark,
        });
      set.status = 201;
      return ok(requestId, created[0], 'OK');
    },
    {
      detail: {
        summary: '新增字典项',
        description: '需要管理员权限，value 在同字典类型下唯一。',
        security: [{ bearerAuth: [] }],
      },
      body: dictItemBodySchema,
      response: {
        400: apiErrorSchema,
        404: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .put(
    '/dict-items/:id',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as {
        dictTypeId: number;
        label: string;
        value: string;
        tagType?: string;
        sort?: number;
        status?: number;
        isDefault?: number;
        remark?: string;
      };
      const dictTypeId = Number(payload.dictTypeId);
      const label = payload.label.trim();
      const value = payload.value.trim();
      if (
        !Number.isInteger(dictTypeId) ||
        dictTypeId <= 0 ||
        !label ||
        !value
      ) {
        set.status = 400;
        return {
          code: 400000,
          message: 'dictTypeId, label and value are required',
          requestId,
        };
      }
      const duplicate = await db
        .select({ id: sysDictItemsTable.id })
        .from(sysDictItemsTable)
        .where(
          and(
            eq(sysDictItemsTable.dictTypeId, dictTypeId),
            eq(sysDictItemsTable.value, value),
            ne(sysDictItemsTable.id, id),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Dict item value already exists in dict type',
          requestId,
        };
      }
      const rows = await db
        .update(sysDictItemsTable)
        .set({
          dictTypeId,
          label,
          value,
          tagType: payload.tagType?.trim() || null,
          sort: payload.sort ?? 0,
          status: payload.status ?? 1,
          isDefault: payload.isDefault ?? 0,
          remark: payload.remark?.trim() || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictItemsTable.id, id),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .returning({
          id: sysDictItemsTable.id,
          dictTypeId: sysDictItemsTable.dictTypeId,
          label: sysDictItemsTable.label,
          value: sysDictItemsTable.value,
          tagType: sysDictItemsTable.tagType,
          sort: sysDictItemsTable.sort,
          status: sysDictItemsTable.status,
          isDefault: sysDictItemsTable.isDefault,
          remark: sysDictItemsTable.remark,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict item not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '编辑字典项',
        description: '需要管理员权限，按 id 更新字典项。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: dictItemBodySchema,
      response: {
        400: apiErrorSchema,
        404: apiErrorSchema,
        409: apiErrorSchema,
      },
    },
  )
  .post(
    '/dict-items/:id/toggle',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as { status: number };
      const rows = await db
        .update(sysDictItemsTable)
        .set({
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictItemsTable.id, id),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .returning({
          id: sysDictItemsTable.id,
          dictTypeId: sysDictItemsTable.dictTypeId,
          label: sysDictItemsTable.label,
          value: sysDictItemsTable.value,
          tagType: sysDictItemsTable.tagType,
          sort: sysDictItemsTable.sort,
          status: sysDictItemsTable.status,
          isDefault: sysDictItemsTable.isDefault,
          remark: sysDictItemsTable.remark,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict item not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '切换字典项状态',
        description: '需要管理员权限，status: 0 禁用, 1 启用。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: toggleBodySchema,
    },
  )
  .delete(
    '/dict-items/:id',
    async ({ params, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const rows = await db
        .update(sysDictItemsTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sysDictItemsTable.id, id),
            isNull(sysDictItemsTable.deletedAt),
          ),
        )
        .returning({ id: sysDictItemsTable.id });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dict item not found', requestId };
      }
      return ok(requestId, { deleted: 1 }, 'OK');
    },
    {
      detail: {
        summary: '删除字典项',
        description: '需要管理员权限，软删除字典项。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      response: {
        400: apiErrorSchema,
        404: apiErrorSchema,
      },
    },
  )
  .get(
    '/depts/tree',
    async ({ request }) => {
      const { requestId } = ensureRequestContext(request);
      const rows = await db
        .select({
          id: sysDeptsTable.id,
          parentId: sysDeptsTable.parentId,
          name: sysDeptsTable.name,
          code: sysDeptsTable.code,
          sort: sysDeptsTable.sort,
          status: sysDeptsTable.status,
          leader: sysDeptsTable.leader,
          phone: sysDeptsTable.phone,
          email: sysDeptsTable.email,
        })
        .from(sysDeptsTable)
        .where(isNull(sysDeptsTable.deletedAt))
        .orderBy(
          asc(sysDeptsTable.parentId),
          asc(sysDeptsTable.sort),
          asc(sysDeptsTable.id),
        );
      return ok(requestId, buildDeptTree(rows), 'OK');
    },
    {
      detail: {
        summary: '查询部门树',
        description: '需要管理员权限，返回部门树结构。',
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    '/depts',
    async ({ body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const payload = body as {
        parentId?: number;
        name: string;
        code: string;
        sort?: number;
        status?: number;
        leader?: string;
        phone?: string;
        email?: string;
      };
      const name = payload.name.trim();
      const code = payload.code.trim();
      if (!name || !code) {
        set.status = 400;
        return {
          code: 400000,
          message: 'name and code are required',
          requestId,
        };
      }
      const exists = await db
        .select({ id: sysDeptsTable.id })
        .from(sysDeptsTable)
        .where(
          and(eq(sysDeptsTable.code, code), isNull(sysDeptsTable.deletedAt)),
        )
        .limit(1);
      if (exists[0]) {
        set.status = 409;
        return { code: 409000, message: 'Dept code already exists', requestId };
      }
      const parentId = payload.parentId ?? 0;
      if (parentId > 0) {
        const parentRows = await db
          .select({ id: sysDeptsTable.id })
          .from(sysDeptsTable)
          .where(
            and(
              eq(sysDeptsTable.id, parentId),
              isNull(sysDeptsTable.deletedAt),
            ),
          )
          .limit(1);
        if (!parentRows[0]) {
          set.status = 404;
          return { code: 404000, message: 'Parent dept not found', requestId };
        }
      }
      const rows = await db
        .insert(sysDeptsTable)
        .values({
          parentId,
          name,
          code,
          sort: payload.sort ?? 0,
          status: payload.status ?? 1,
          leader: payload.leader?.trim() || null,
          phone: payload.phone?.trim() || null,
          email: payload.email?.trim() || null,
        })
        .returning({
          id: sysDeptsTable.id,
          parentId: sysDeptsTable.parentId,
          name: sysDeptsTable.name,
          code: sysDeptsTable.code,
          sort: sysDeptsTable.sort,
          status: sysDeptsTable.status,
          leader: sysDeptsTable.leader,
          phone: sysDeptsTable.phone,
          email: sysDeptsTable.email,
        });
      set.status = 201;
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '新增部门',
        description: '需要管理员权限，部门编码全局唯一。',
        security: [{ bearerAuth: [] }],
      },
      body: deptBodySchema,
    },
  )
  .put(
    '/depts/:id',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as {
        parentId?: number;
        name: string;
        code: string;
        sort?: number;
        status?: number;
        leader?: string;
        phone?: string;
        email?: string;
      };
      const name = payload.name.trim();
      const code = payload.code.trim();
      if (!name || !code) {
        set.status = 400;
        return {
          code: 400000,
          message: 'name and code are required',
          requestId,
        };
      }
      const duplicate = await db
        .select({ id: sysDeptsTable.id })
        .from(sysDeptsTable)
        .where(
          and(
            eq(sysDeptsTable.code, code),
            ne(sysDeptsTable.id, id),
            isNull(sysDeptsTable.deletedAt),
          ),
        )
        .limit(1);
      if (duplicate[0]) {
        set.status = 409;
        return { code: 409000, message: 'Dept code already exists', requestId };
      }
      const parentId = payload.parentId ?? 0;
      if (parentId === id) {
        set.status = 400;
        return { code: 400000, message: 'parentId cannot be self', requestId };
      }
      if (parentId > 0) {
        const parentRows = await db
          .select({ id: sysDeptsTable.id })
          .from(sysDeptsTable)
          .where(
            and(
              eq(sysDeptsTable.id, parentId),
              isNull(sysDeptsTable.deletedAt),
            ),
          )
          .limit(1);
        if (!parentRows[0]) {
          set.status = 404;
          return { code: 404000, message: 'Parent dept not found', requestId };
        }
      }
      const rows = await db
        .update(sysDeptsTable)
        .set({
          parentId,
          name,
          code,
          sort: payload.sort ?? 0,
          status: payload.status ?? 1,
          leader: payload.leader?.trim() || null,
          phone: payload.phone?.trim() || null,
          email: payload.email?.trim() || null,
          updatedAt: new Date(),
        })
        .where(and(eq(sysDeptsTable.id, id), isNull(sysDeptsTable.deletedAt)))
        .returning({
          id: sysDeptsTable.id,
          parentId: sysDeptsTable.parentId,
          name: sysDeptsTable.name,
          code: sysDeptsTable.code,
          sort: sysDeptsTable.sort,
          status: sysDeptsTable.status,
          leader: sysDeptsTable.leader,
          phone: sysDeptsTable.phone,
          email: sysDeptsTable.email,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dept not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '编辑部门',
        description: '需要管理员权限，支持更新父级、排序与负责人信息。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: deptBodySchema,
    },
  )
  .post(
    '/depts/:id/toggle',
    async ({ params, body, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const payload = body as { status: number };
      const rows = await db
        .update(sysDeptsTable)
        .set({
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(and(eq(sysDeptsTable.id, id), isNull(sysDeptsTable.deletedAt)))
        .returning({
          id: sysDeptsTable.id,
          parentId: sysDeptsTable.parentId,
          name: sysDeptsTable.name,
          code: sysDeptsTable.code,
          sort: sysDeptsTable.sort,
          status: sysDeptsTable.status,
          leader: sysDeptsTable.leader,
          phone: sysDeptsTable.phone,
          email: sysDeptsTable.email,
        });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dept not found', requestId };
      }
      return ok(requestId, rows[0], 'OK');
    },
    {
      detail: {
        summary: '切换部门状态',
        description: '需要管理员权限，status: 0 禁用, 1 启用。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
      body: toggleBodySchema,
    },
  )
  .delete(
    '/depts/:id',
    async ({ params, request, set }) => {
      const { requestId } = ensureRequestContext(request);
      const id = Number(params.id);
      if (!Number.isInteger(id) || id <= 0) {
        set.status = 400;
        return { code: 400000, message: 'invalid id', requestId };
      }
      const childRows = await db
        .select({ id: sysDeptsTable.id })
        .from(sysDeptsTable)
        .where(
          and(eq(sysDeptsTable.parentId, id), isNull(sysDeptsTable.deletedAt)),
        )
        .limit(1);
      if (childRows[0]) {
        set.status = 409;
        return {
          code: 409000,
          message: 'Please delete child departments first',
          requestId,
        };
      }
      const rows = await db
        .update(sysDeptsTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(sysDeptsTable.id, id), isNull(sysDeptsTable.deletedAt)))
        .returning({ id: sysDeptsTable.id });
      if (!rows[0]) {
        set.status = 404;
        return { code: 404000, message: 'Dept not found', requestId };
      }
      return ok(requestId, { deleted: 1 }, 'OK');
    },
    {
      detail: {
        summary: '删除部门',
        description: '需要管理员权限，存在子部门时拒绝删除。',
        security: [{ bearerAuth: [] }],
      },
      params: t.Object({ id: t.String() }),
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
    '/login-logs',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      const filters = buildLoginLogFilters(query);
      try {
        const list = await db
          .select({
            id: sysLoginLogsTable.id,
            account: sysLoginLogsTable.account,
            userId: sysLoginLogsTable.userId,
            success: sysLoginLogsTable.success,
            reason: sysLoginLogsTable.reason,
            requestIp: sysLoginLogsTable.requestIp,
            userAgent: sysLoginLogsTable.userAgent,
            createdAt: sysLoginLogsTable.createdAt,
          })
          .from(sysLoginLogsTable)
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(sysLoginLogsTable.createdAt))
          .limit(pageSize)
          .offset(offset);

        const totalRows = await db
          .select({ total: count() })
          .from(sysLoginLogsTable)
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
      } catch {
        // Keep endpoint available before login-log table migration.
        return ok(
          requestId,
          {
            list: [],
            total: 0,
            page,
            pageSize,
          },
          'OK',
        );
      }
    },
    {
      detail: {
        summary: '查询登录日志',
        description: '需要管理员权限，支持账号、IP、结果与时间范围筛选。',
        security: [{ bearerAuth: [] }],
      },
      query: loginLogQuerySchema,
    },
  )
  .get(
    '/api-catalog',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      const keyword = query.keyword?.trim();
      const moduleKeyword = query.module?.trim();

      const filters = [
        eq(sysPermissionsTable.type, 3),
        isNull(sysPermissionsTable.deletedAt),
        moduleKeyword
          ? ilike(sysPermissionsTable.module, `%${moduleKeyword}%`)
          : undefined,
        keyword
          ? or(
              ilike(sysPermissionsTable.code, `%${keyword}%`),
              ilike(sysPermissionsTable.name, `%${keyword}%`),
            )
          : undefined,
        query.status !== undefined
          ? eq(sysPermissionsTable.status, query.status)
          : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item));

      const list = await db
        .select({
          id: sysPermissionsTable.id,
          code: sysPermissionsTable.code,
          name: sysPermissionsTable.name,
          module: sysPermissionsTable.module,
          type: sysPermissionsTable.type,
          status: sysPermissionsTable.status,
          description: sysPermissionsTable.description,
        })
        .from(sysPermissionsTable)
        .where(and(...filters))
        .orderBy(asc(sysPermissionsTable.module), asc(sysPermissionsTable.code))
        .limit(pageSize)
        .offset(offset);

      const totalRows = await db
        .select({ total: count() })
        .from(sysPermissionsTable)
        .where(and(...filters));

      return ok(
        requestId,
        {
          list,
          total: Number(totalRows[0]?.total ?? 0),
          page,
          pageSize,
        },
        'OK',
      );
    },
    {
      detail: {
        summary: '查询 API 目录',
        description: '需要管理员权限，返回系统 API 权限点目录（只读）。',
        security: [{ bearerAuth: [] }],
      },
      query: apiCatalogQuerySchema,
    },
  )
  .get(
    '/audit-logs/stats',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const filters = buildAuditLogFilters(query);

      const totalRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined);
      const successFilters = [...filters, eq(sysAuditLogsTable.success, 1)];
      const successRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(and(...successFilters));
      const failedFilters = [...filters, eq(sysAuditLogsTable.success, 0)];
      const failedRows = await db
        .select({ total: count() })
        .from(sysAuditLogsTable)
        .where(and(...failedFilters));

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
            module: item.module ?? 'unknown',
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
    },
  )
  .get(
    '/audit-logs/export',
    async ({ query }) => {
      const filters = buildAuditLogFilters(query);
      const rows = await db
        .select({
          id: sysAuditLogsTable.id,
          createdAt: sysAuditLogsTable.createdAt,
          module: sysAuditLogsTable.module,
          action: sysAuditLogsTable.action,
          operatorUserId: sysAuditLogsTable.operatorUserId,
          operatorAccount: sysAuditLogsTable.operatorAccount,
          requestMethod: sysAuditLogsTable.requestMethod,
          requestPath: sysAuditLogsTable.requestPath,
          responseCode: sysAuditLogsTable.responseCode,
          success: sysAuditLogsTable.success,
          durationMs: sysAuditLogsTable.durationMs,
          resourceId: sysAuditLogsTable.resourceId,
          traceId: sysAuditLogsTable.traceId,
        })
        .from(sysAuditLogsTable)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(sysAuditLogsTable.createdAt))
        .limit(5000);

      const headers = [
        'id',
        'createdAt',
        'module',
        'action',
        'operatorUserId',
        'operatorAccount',
        'requestMethod',
        'requestPath',
        'responseCode',
        'success',
        'durationMs',
        'resourceId',
        'traceId',
      ];
      const lines = rows.map((item) =>
        [
          item.id,
          item.createdAt?.toISOString() ?? '',
          item.module,
          item.action,
          item.operatorUserId,
          item.operatorAccount,
          item.requestMethod,
          item.requestPath,
          item.responseCode,
          item.success,
          item.durationMs,
          item.resourceId,
          item.traceId,
        ]
          .map((cell) => toCsvCell(cell))
          .join(','),
      );
      const csv = [headers.join(','), ...lines].join('\n');
      const fileName = `audit-logs-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`;
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${fileName}"`,
        },
      });
    },
    {
      detail: {
        summary: '导出操作日志 CSV',
        description:
          '需要管理员权限，按当前筛选导出，最多导出最近匹配的 5000 条。',
        security: [{ bearerAuth: [] }],
      },
      query: auditLogQuerySchema,
    },
  )
  .get(
    '/audit-logs',
    async ({ query, request }) => {
      const { requestId } = ensureRequestContext(request);
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      const filters = buildAuditLogFilters(query);

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
