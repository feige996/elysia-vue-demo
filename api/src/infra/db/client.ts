import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../shared/config/env';
import {
  defaultArticles,
  defaultSysConfigs,
  defaultSysDictItems,
  defaultSysDictTypes,
  defaultSysMenus,
  defaultSysPermissions,
  defaultSysRoleMenus,
  defaultSysRolePermissions,
  defaultSysRoles,
  defaultSysUserRoles,
  defaultSysUsers,
  defaultUsers,
} from './seed-data';
import {
  articlesTable,
  sysConfigsTable,
  sysDictItemsTable,
  sysDictTypesTable,
  sysMenusTable,
  sysPermissionsTable,
  sysRoleMenusTable,
  sysRolePermissionsTable,
  sysRolesTable,
  sysUserRolesTable,
  sysUsersTable,
  usersTable,
} from './schema';

const sqlClient = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(sqlClient);

export const seedDatabase = async () => {
  const existingUsers = await db.select({ total: count() }).from(usersTable);
  if (Number(existingUsers[0]?.total ?? 0) === 0) {
    await db
      .insert(usersTable)
      .values(defaultUsers)
      .onConflictDoNothing({ target: usersTable.account });
  }

  const existingArticles = await db
    .select({ total: count() })
    .from(articlesTable);
  if (Number(existingArticles[0]?.total ?? 0) === 0) {
    await db.insert(articlesTable).values(defaultArticles);
  }

  const existingSysRoles = await db
    .select({ total: count() })
    .from(sysRolesTable);
  if (Number(existingSysRoles[0]?.total ?? 0) === 0) {
    await db
      .insert(sysRolesTable)
      .values(defaultSysRoles)
      .onConflictDoNothing({ target: sysRolesTable.code });
  }

  const existingSysPermissions = await db
    .select({ total: count() })
    .from(sysPermissionsTable);
  if (Number(existingSysPermissions[0]?.total ?? 0) === 0) {
    await db
      .insert(sysPermissionsTable)
      .values(defaultSysPermissions)
      .onConflictDoNothing({ target: sysPermissionsTable.code });
  }

  const existingSysMenus = await db
    .select({ total: count() })
    .from(sysMenusTable);
  if (Number(existingSysMenus[0]?.total ?? 0) === 0) {
    await db
      .insert(sysMenusTable)
      .values(defaultSysMenus)
      .onConflictDoNothing({ target: sysMenusTable.routeName });
  }

  const existingSysUsers = await db
    .select({ total: count() })
    .from(sysUsersTable);
  if (Number(existingSysUsers[0]?.total ?? 0) === 0) {
    await db
      .insert(sysUsersTable)
      .values(defaultSysUsers)
      .onConflictDoNothing({ target: sysUsersTable.account });
  }

  const existingSysUserRoles = await db
    .select({ total: count() })
    .from(sysUserRolesTable);
  if (Number(existingSysUserRoles[0]?.total ?? 0) === 0) {
    await db
      .insert(sysUserRolesTable)
      .values(defaultSysUserRoles)
      .onConflictDoNothing({
        target: [sysUserRolesTable.userId, sysUserRolesTable.roleId],
      });
  }

  const existingSysRolePermissions = await db
    .select({ total: count() })
    .from(sysRolePermissionsTable);
  if (Number(existingSysRolePermissions[0]?.total ?? 0) === 0) {
    await db
      .insert(sysRolePermissionsTable)
      .values(defaultSysRolePermissions)
      .onConflictDoNothing({
        target: [
          sysRolePermissionsTable.roleId,
          sysRolePermissionsTable.permissionId,
        ],
      });
  }

  const existingSysRoleMenus = await db
    .select({ total: count() })
    .from(sysRoleMenusTable);
  if (Number(existingSysRoleMenus[0]?.total ?? 0) === 0) {
    await db
      .insert(sysRoleMenusTable)
      .values(defaultSysRoleMenus)
      .onConflictDoNothing({
        target: [sysRoleMenusTable.roleId, sysRoleMenusTable.menuId],
      });
  }

  const existingSysDictTypes = await db
    .select({ total: count() })
    .from(sysDictTypesTable);
  if (Number(existingSysDictTypes[0]?.total ?? 0) === 0) {
    await db
      .insert(sysDictTypesTable)
      .values(defaultSysDictTypes)
      .onConflictDoNothing({ target: sysDictTypesTable.code });
  }

  const existingSysDictItems = await db
    .select({ total: count() })
    .from(sysDictItemsTable);
  if (Number(existingSysDictItems[0]?.total ?? 0) === 0) {
    await db
      .insert(sysDictItemsTable)
      .values(defaultSysDictItems)
      .onConflictDoNothing({
        target: [sysDictItemsTable.dictTypeId, sysDictItemsTable.value],
      });
  }

  const existingSysConfigs = await db
    .select({ total: count() })
    .from(sysConfigsTable);
  if (Number(existingSysConfigs[0]?.total ?? 0) === 0) {
    await db
      .insert(sysConfigsTable)
      .values(defaultSysConfigs)
      .onConflictDoNothing({ target: sysConfigsTable.key });
  }
};

export const checkDatabaseHealth = async () => {
  await db.select({ total: count() }).from(usersTable);
  await db.select({ total: count() }).from(articlesTable);
  await db.select({ total: count() }).from(sysUsersTable);
  await db.select({ total: count() }).from(sysRolesTable);
};

if (import.meta.main) {
  const action = Bun.argv[2];
  if (action === 'seed') {
    await seedDatabase();
    console.log('Database seed completed');
    process.exit(0);
  }
  if (action === 'check') {
    await checkDatabaseHealth();
    console.log('Database health check passed');
    process.exit(0);
  }
  console.error('Unknown action, use: seed | check');
  process.exit(1);
}
