import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../shared/config/env';
import {
  defaultArticles,
  defaultSysConfigs,
  defaultSysDepts,
  defaultSysDictItems,
  defaultSysDictTypes,
  defaultSysJobs,
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
  sysDeptsTable,
  sysDictItemsTable,
  sysDictTypesTable,
  sysJobsTable,
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
  await checkDatabaseHealth();

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

  await db
    .insert(sysRolesTable)
    .values(defaultSysRoles)
    .onConflictDoNothing({ target: sysRolesTable.code });

  await db
    .insert(sysPermissionsTable)
    .values(defaultSysPermissions)
    .onConflictDoNothing({ target: sysPermissionsTable.code });

  await db
    .insert(sysMenusTable)
    .values(defaultSysMenus)
    .onConflictDoNothing({ target: sysMenusTable.routeName });

  const existingSysUsers = await db
    .select({ total: count() })
    .from(sysUsersTable);
  if (Number(existingSysUsers[0]?.total ?? 0) === 0) {
    await db
      .insert(sysUsersTable)
      .values(defaultSysUsers)
      .onConflictDoNothing({ target: sysUsersTable.account });
  }

  await db
    .insert(sysUserRolesTable)
    .values(defaultSysUserRoles)
    .onConflictDoNothing({
      target: [sysUserRolesTable.userId, sysUserRolesTable.roleId],
    });

  await db
    .insert(sysRolePermissionsTable)
    .values(defaultSysRolePermissions)
    .onConflictDoNothing({
      target: [
        sysRolePermissionsTable.roleId,
        sysRolePermissionsTable.permissionId,
      ],
    });

  await db
    .insert(sysRoleMenusTable)
    .values(defaultSysRoleMenus)
    .onConflictDoNothing({
      target: [sysRoleMenusTable.roleId, sysRoleMenusTable.menuId],
    });

  await db
    .insert(sysDictTypesTable)
    .values(defaultSysDictTypes)
    .onConflictDoNothing({ target: sysDictTypesTable.code });

  await db
    .insert(sysDictItemsTable)
    .values(defaultSysDictItems)
    .onConflictDoNothing({
      target: [sysDictItemsTable.dictTypeId, sysDictItemsTable.value],
    });

  await db
    .insert(sysConfigsTable)
    .values(defaultSysConfigs)
    .onConflictDoNothing({ target: sysConfigsTable.key });

  await db
    .insert(sysJobsTable)
    .values(defaultSysJobs)
    .onConflictDoNothing({ target: sysJobsTable.name });

  await db
    .insert(sysDeptsTable)
    .values(defaultSysDepts)
    .onConflictDoNothing({ target: sysDeptsTable.code });
};

export const checkDatabaseHealth = async () => {
  await db.select({ total: count() }).from(usersTable);
  await db.select({ total: count() }).from(articlesTable);
  await db.select({ total: count() }).from(sysUsersTable);
  await db.select({ total: count() }).from(sysRolesTable);
  await db.select({ total: count() }).from(sysDeptsTable);
  await db.select({ total: count() }).from(sysJobsTable);
};

if (import.meta.main) {
  const action = Bun.argv[2];
  if (action === 'seed') {
    try {
      await seedDatabase();
      console.log('Database seed completed');
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Database seed failed: ${message}`);
      process.exit(1);
    }
  }
  if (action === 'check') {
    await checkDatabaseHealth();
    console.log('Database health check passed');
    process.exit(0);
  }
  console.error('Unknown action, use: seed | check');
  process.exit(1);
}
