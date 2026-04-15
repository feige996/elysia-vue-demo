import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Legacy demo tables used by current example modules.
 * Keep these tables for backward compatibility.
 */
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  account: varchar('account', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 64 }).notNull(),
  role: varchar('role', { length: 16 }).notNull(),
});

export const articlesTable = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  author: varchar('author', { length: 64 }).notNull(),
});

const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
};

// P0/P1: RBAC - users
export const sysUsersTable = pgTable(
  'sys_users',
  {
    id: serial('id').primaryKey(),
    account: varchar('account', { length: 64 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 64 }).notNull(),
    email: varchar('email', { length: 128 }),
    mobile: varchar('mobile', { length: 32 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    deptId: integer('dept_id'),
    status: smallint('status').notNull().default(1), // 1: enabled, 0: disabled
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    accountUk: uniqueIndex('uk_sys_users_account').on(table.account),
    statusIdx: index('idx_sys_users_status').on(table.status),
    deletedAtIdx: index('idx_sys_users_deleted_at').on(table.deletedAt),
  }),
);

// P0/P1: RBAC - roles
export const sysRolesTable = pgTable(
  'sys_roles',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    description: varchar('description', { length: 255 }),
    status: smallint('status').notNull().default(1),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    codeUk: uniqueIndex('uk_sys_roles_code').on(table.code),
    statusIdx: index('idx_sys_roles_status').on(table.status),
  }),
);

// P0/P1: RBAC - permissions
export const sysPermissionsTable = pgTable(
  'sys_permissions',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 128 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    type: smallint('type').notNull(), // 1: menu, 2: button, 3: api
    module: varchar('module', { length: 64 }).notNull(),
    description: varchar('description', { length: 255 }),
    status: smallint('status').notNull().default(1),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    codeUk: uniqueIndex('uk_sys_permissions_code').on(table.code),
    moduleIdx: index('idx_sys_permissions_module').on(table.module),
  }),
);

export const sysUserRolesTable = pgTable(
  'sys_user_roles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => sysUsersTable.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
      .notNull()
      .references(() => sysRolesTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: integer('created_by'),
  },
  (table) => ({
    userRoleUk: uniqueIndex('uk_sys_user_roles_user_role').on(
      table.userId,
      table.roleId,
    ),
    userIdx: index('idx_sys_user_roles_user_id').on(table.userId),
    roleIdx: index('idx_sys_user_roles_role_id').on(table.roleId),
  }),
);

export const sysRolePermissionsTable = pgTable(
  'sys_role_permissions',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
      .notNull()
      .references(() => sysRolesTable.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => sysPermissionsTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: integer('created_by'),
  },
  (table) => ({
    rolePermissionUk: uniqueIndex('uk_sys_role_permissions').on(
      table.roleId,
      table.permissionId,
    ),
  }),
);

// P0/P1: menu and route
export const sysMenusTable = pgTable(
  'sys_menus',
  {
    id: serial('id').primaryKey(),
    parentId: integer('parent_id').notNull().default(0),
    name: varchar('name', { length: 64 }).notNull(),
    routeName: varchar('route_name', { length: 128 }).notNull(),
    path: varchar('path', { length: 255 }).notNull(),
    component: varchar('component', { length: 255 }),
    icon: varchar('icon', { length: 64 }),
    type: smallint('type').notNull(), // 1: dir, 2: menu, 3: button
    sort: integer('sort').notNull().default(0),
    visible: smallint('visible').notNull().default(1),
    status: smallint('status').notNull().default(1),
    permissionCode: varchar('permission_code', { length: 128 }),
    keepAlive: smallint('keep_alive').notNull().default(0),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    routeNameUk: uniqueIndex('uk_sys_menus_route_name').on(table.routeName),
    parentSortIdx: index('idx_sys_menus_parent_sort').on(
      table.parentId,
      table.sort,
    ),
    statusVisibleIdx: index('idx_sys_menus_status_visible').on(
      table.status,
      table.visible,
    ),
  }),
);

export const sysRoleMenusTable = pgTable(
  'sys_role_menus',
  {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
      .notNull()
      .references(() => sysRolesTable.id, { onDelete: 'cascade' }),
    menuId: integer('menu_id')
      .notNull()
      .references(() => sysMenusTable.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: integer('created_by'),
  },
  (table) => ({
    roleMenuUk: uniqueIndex('uk_sys_role_menus').on(table.roleId, table.menuId),
  }),
);

// P0: department management
export const sysDeptsTable = pgTable(
  'sys_depts',
  {
    id: serial('id').primaryKey(),
    parentId: integer('parent_id').notNull().default(0),
    name: varchar('name', { length: 64 }).notNull(),
    code: varchar('code', { length: 64 }).notNull(),
    sort: integer('sort').notNull().default(0),
    status: smallint('status').notNull().default(1),
    leader: varchar('leader', { length: 64 }),
    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 128 }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    codeUk: uniqueIndex('uk_sys_depts_code').on(table.code),
    parentSortIdx: index('idx_sys_depts_parent_sort').on(
      table.parentId,
      table.sort,
    ),
    statusIdx: index('idx_sys_depts_status').on(table.status),
  }),
);

// P1: dictionary and config
export const sysDictTypesTable = pgTable(
  'sys_dict_types',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 64 }).notNull(),
    status: smallint('status').notNull().default(1),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    codeUk: uniqueIndex('uk_sys_dict_types_code').on(table.code),
  }),
);

export const sysDictItemsTable = pgTable(
  'sys_dict_items',
  {
    id: serial('id').primaryKey(),
    dictTypeId: integer('dict_type_id')
      .notNull()
      .references(() => sysDictTypesTable.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 64 }).notNull(),
    value: varchar('value', { length: 64 }).notNull(),
    tagType: varchar('tag_type', { length: 32 }),
    sort: integer('sort').notNull().default(0),
    status: smallint('status').notNull().default(1),
    isDefault: smallint('is_default').notNull().default(0),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    typeValueUk: uniqueIndex('uk_sys_dict_items_type_value').on(
      table.dictTypeId,
      table.value,
    ),
    typeSortIdx: index('idx_sys_dict_items_type_sort').on(
      table.dictTypeId,
      table.sort,
    ),
  }),
);

export const sysConfigsTable = pgTable(
  'sys_configs',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 128 }).notNull(),
    value: text('value').notNull(),
    valueType: smallint('value_type').notNull().default(1), // 1:string 2:number 3:boolean 4:json
    groupName: varchar('group_name', { length: 64 }),
    isPublic: smallint('is_public').notNull().default(0),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    keyUk: uniqueIndex('uk_sys_configs_key').on(table.key),
    groupIdx: index('idx_sys_configs_group_name').on(table.groupName),
  }),
);

// P0/P1: upload and audit
export const sysFilesTable = pgTable(
  'sys_files',
  {
    id: serial('id').primaryKey(),
    storage: varchar('storage', { length: 32 }).notNull(),
    bucket: varchar('bucket', { length: 128 }),
    objectKey: varchar('object_key', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    size: integer('size').notNull(),
    url: varchar('url', { length: 512 }).notNull(),
    sha256: varchar('sha256', { length: 64 }),
    bizType: varchar('biz_type', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: integer('created_by'),
  },
  (table) => ({
    bizTypeIdx: index('idx_sys_files_biz_type').on(table.bizType),
    createdAtIdx: index('idx_sys_files_created_at').on(table.createdAt),
  }),
);

export const sysAuditLogsTable = pgTable(
  'sys_audit_logs',
  {
    id: serial('id').primaryKey(),
    traceId: varchar('trace_id', { length: 64 }),
    operatorUserId: integer('operator_user_id'),
    operatorAccount: varchar('operator_account', { length: 64 }),
    action: varchar('action', { length: 64 }).notNull(),
    module: varchar('module', { length: 64 }).notNull(),
    resource: varchar('resource', { length: 128 }).notNull(),
    resourceId: varchar('resource_id', { length: 64 }),
    requestMethod: varchar('request_method', { length: 16 }).notNull(),
    requestPath: varchar('request_path', { length: 255 }).notNull(),
    requestIp: varchar('request_ip', { length: 64 }),
    requestUserAgent: varchar('request_user_agent', { length: 512 }),
    requestPayload: jsonb('request_payload'),
    responseCode: integer('response_code').notNull(),
    responseMessage: varchar('response_message', { length: 255 }),
    success: smallint('success').notNull(), // 1: success, 0: failed
    durationMs: integer('duration_ms').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    operatorTimeIdx: index('idx_sys_audit_logs_operator_time').on(
      table.operatorUserId,
      table.createdAt,
    ),
    moduleTimeIdx: index('idx_sys_audit_logs_module_time').on(
      table.module,
      table.createdAt,
    ),
    successTimeIdx: index('idx_sys_audit_logs_success_time').on(
      table.success,
      table.createdAt,
    ),
  }),
);

// P0: login log
export const sysLoginLogsTable = pgTable(
  'sys_login_logs',
  {
    id: serial('id').primaryKey(),
    account: varchar('account', { length: 64 }),
    userId: integer('user_id'),
    success: smallint('success').notNull(), // 1: success, 0: failed
    reason: varchar('reason', { length: 255 }),
    requestIp: varchar('request_ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    accountTimeIdx: index('idx_sys_login_logs_account_time').on(
      table.account,
      table.createdAt,
    ),
    userTimeIdx: index('idx_sys_login_logs_user_time').on(
      table.userId,
      table.createdAt,
    ),
    successTimeIdx: index('idx_sys_login_logs_success_time').on(
      table.success,
      table.createdAt,
    ),
  }),
);

// P0: monitor job center
export const sysJobsTable = pgTable(
  'sys_jobs',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    cron: varchar('cron', { length: 64 }).notNull(),
    status: smallint('status').notNull().default(1), // 1: enabled, 0: disabled
    args: text('args'),
    runCount: integer('run_count').notNull().default(0),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    lastRunStatus: smallint('last_run_status'),
    lastRunMessage: varchar('last_run_message', { length: 255 }),
    remark: varchar('remark', { length: 255 }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    nameUk: uniqueIndex('uk_sys_jobs_name').on(table.name),
    statusIdx: index('idx_sys_jobs_status').on(table.status),
    deletedAtIdx: index('idx_sys_jobs_deleted_at').on(table.deletedAt),
  }),
);
