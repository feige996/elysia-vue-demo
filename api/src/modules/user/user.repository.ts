import { and, asc, count, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import {
  sysMenusTable,
  sysPermissionsTable,
  sysRoleMenusTable,
  sysRolePermissionsTable,
  sysRolesTable,
  sysUserRolesTable,
  sysUsersTable,
} from '../../infra/db/schema';
import type {
  MenuEntity,
  MenuTreeEntity,
  UserEntity,
} from '../../shared/types/entities';

const toUserRole = (role?: string | null): UserEntity['role'] =>
  role && role.length > 0 ? role : 'editor';

type UserWithRoleRow = {
  id: number;
  account: string;
  nickname: string;
  roleCode: string | null;
};

const toUserEntity = (row: UserWithRoleRow): UserEntity => ({
  id: row.id,
  account: row.account,
  name: row.nickname,
  role: toUserRole(row.roleCode),
});

type SaveUserInput = {
  account: string;
  name: string;
  role: UserEntity['role'];
};

type UpdateUserInput = Partial<SaveUserInput>;
type SaveRoleInput = {
  code: string;
  name: string;
  description?: string | null;
  status?: number;
};

type UpdateRoleInput = Partial<Omit<SaveRoleInput, 'status'>>;

type FindUserOptions = {
  keyword?: string;
  id?: number;
  account?: string;
  onlyActive?: boolean;
};

const buildKeywordFilter = (
  keyword?: string,
  field = sysUsersTable.nickname,
) => {
  if (!keyword) return undefined;
  const text = `%${keyword}%`;
  return or(ilike(sysUsersTable.account, text), ilike(field, text));
};

export class UserRepository {
  private mergeRowsToUsers(rows: UserWithRoleRow[]) {
    const users = new Map<number, UserEntity>();
    for (const row of rows) {
      const currentRole = toUserRole(row.roleCode);
      const existing = users.get(row.id);
      if (!existing) {
        users.set(row.id, toUserEntity(row));
        continue;
      }
      if (currentRole === 'admin' && existing.role !== 'admin') {
        users.set(row.id, { ...existing, role: 'admin' });
      }
    }
    return Array.from(users.values());
  }

  private async findRows(options: FindUserOptions) {
    const filters = [
      options.id ? eq(sysUsersTable.id, options.id) : undefined,
      options.account ? eq(sysUsersTable.account, options.account) : undefined,
      buildKeywordFilter(options.keyword, sysUsersTable.nickname),
      isNull(sysUsersTable.deletedAt),
      options.onlyActive ? eq(sysUsersTable.status, 1) : undefined,
    ].filter((value): value is NonNullable<typeof value> => Boolean(value));

    const rows = await db
      .select({
        id: sysUsersTable.id,
        account: sysUsersTable.account,
        nickname: sysUsersTable.nickname,
        roleCode: sysRolesTable.code,
      })
      .from(sysUsersTable)
      .leftJoin(
        sysUserRolesTable,
        eq(sysUserRolesTable.userId, sysUsersTable.id),
      )
      .leftJoin(sysRolesTable, eq(sysRolesTable.id, sysUserRolesTable.roleId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(sysUsersTable.id));
    return rows;
  }

  async findAuthByAccount(account: string) {
    const rows = await db
      .select({
        id: sysUsersTable.id,
        account: sysUsersTable.account,
        nickname: sysUsersTable.nickname,
        roleCode: sysRolesTable.code,
        status: sysUsersTable.status,
        passwordHash: sysUsersTable.passwordHash,
      })
      .from(sysUsersTable)
      .leftJoin(
        sysUserRolesTable,
        eq(sysUserRolesTable.userId, sysUsersTable.id),
      )
      .leftJoin(sysRolesTable, eq(sysRolesTable.id, sysUserRolesTable.roleId))
      .where(
        and(
          eq(sysUsersTable.account, account),
          isNull(sysUsersTable.deletedAt),
        ),
      )
      .orderBy(asc(sysUsersTable.id))
      .limit(10);

    if (rows.length === 0) return undefined;
    const list = this.mergeRowsToUsers(
      rows.map((row) => ({
        id: row.id,
        account: row.account,
        nickname: row.nickname,
        roleCode: row.roleCode,
      })),
    );
    return {
      user: list[0],
      status: rows[0].status,
      passwordHash: rows[0].passwordHash,
    };
  }

  async findAll(keyword?: string) {
    const rows = await this.findRows({ keyword });
    return this.mergeRowsToUsers(rows);
  }

  async findRoles() {
    const rows = await db
      .select({
        id: sysRolesTable.id,
        code: sysRolesTable.code,
        name: sysRolesTable.name,
        description: sysRolesTable.description,
        status: sysRolesTable.status,
      })
      .from(sysRolesTable)
      .where(isNull(sysRolesTable.deletedAt))
      .orderBy(asc(sysRolesTable.id));
    return rows;
  }

  async findRoleById(id: number) {
    const rows = await db
      .select({
        id: sysRolesTable.id,
        code: sysRolesTable.code,
        name: sysRolesTable.name,
        description: sysRolesTable.description,
        status: sysRolesTable.status,
      })
      .from(sysRolesTable)
      .where(and(eq(sysRolesTable.id, id), isNull(sysRolesTable.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findRoleByCode(code: string) {
    const rows = await db
      .select({
        id: sysRolesTable.id,
        code: sysRolesTable.code,
        name: sysRolesTable.name,
        description: sysRolesTable.description,
        status: sysRolesTable.status,
        deletedAt: sysRolesTable.deletedAt,
      })
      .from(sysRolesTable)
      .where(eq(sysRolesTable.code, code))
      .limit(1);
    return rows[0];
  }

  async createRole(input: SaveRoleInput) {
    const rows = await db
      .insert(sysRolesTable)
      .values({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? 1,
      })
      .returning({
        id: sysRolesTable.id,
        code: sysRolesTable.code,
        name: sysRolesTable.name,
        description: sysRolesTable.description,
        status: sysRolesTable.status,
      });
    return rows[0];
  }

  async updateRole(id: number, input: UpdateRoleInput) {
    if (Object.keys(input).length === 0) {
      return this.findRoleById(id);
    }
    const rows = await db
      .update(sysRolesTable)
      .set({
        code: input.code,
        name: input.name,
        description: input.description,
      })
      .where(and(eq(sysRolesTable.id, id), isNull(sysRolesTable.deletedAt)))
      .returning({
        id: sysRolesTable.id,
      });
    if (rows.length === 0) return undefined;
    return this.findRoleById(id);
  }

  async updateRoleStatus(id: number, status: number) {
    const rows = await db
      .update(sysRolesTable)
      .set({ status })
      .where(and(eq(sysRolesTable.id, id), isNull(sysRolesTable.deletedAt)))
      .returning({ id: sysRolesTable.id });
    if (rows.length === 0) return undefined;
    return this.findRoleById(id);
  }

  async deleteRoleById(id: number) {
    const rows = await db
      .update(sysRolesTable)
      .set({
        status: 0,
        deletedAt: new Date(),
      })
      .where(and(eq(sysRolesTable.id, id), isNull(sysRolesTable.deletedAt)))
      .returning({ id: sysRolesTable.id });
    return rows.length > 0;
  }

  async countUsersByRoleId(roleId: number) {
    const rows = await db
      .select({ total: count() })
      .from(sysUserRolesTable)
      .innerJoin(sysUsersTable, eq(sysUsersTable.id, sysUserRolesTable.userId))
      .where(
        and(
          eq(sysUserRolesTable.roleId, roleId),
          isNull(sysUsersTable.deletedAt),
          eq(sysUsersTable.status, 1),
        ),
      );
    return Number(rows[0]?.total ?? 0);
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]) {
    await db.transaction(async (tx) => {
      await tx
        .delete(sysRolePermissionsTable)
        .where(eq(sysRolePermissionsTable.roleId, roleId));
      if (permissionIds.length === 0) return;
      await tx.insert(sysRolePermissionsTable).values(
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      );
    });
  }

  async replaceRoleMenus(roleId: number, menuIds: number[]) {
    await db.transaction(async (tx) => {
      await tx
        .delete(sysRoleMenusTable)
        .where(eq(sysRoleMenusTable.roleId, roleId));
      if (menuIds.length === 0) return;
      await tx.insert(sysRoleMenusTable).values(
        menuIds.map((menuId) => ({
          roleId,
          menuId,
        })),
      );
    });
  }

  async findPage(page: number, pageSize: number, keyword?: string) {
    const offset = (page - 1) * pageSize;
    const filters = [
      buildKeywordFilter(keyword),
      isNull(sysUsersTable.deletedAt),
    ].filter((value): value is NonNullable<typeof value> => Boolean(value));

    const rows = await db
      .select({
        id: sysUsersTable.id,
        account: sysUsersTable.account,
        nickname: sysUsersTable.nickname,
        roleCode: sysRolesTable.code,
      })
      .from(sysUsersTable)
      .leftJoin(
        sysUserRolesTable,
        eq(sysUserRolesTable.userId, sysUsersTable.id),
      )
      .leftJoin(sysRolesTable, eq(sysRolesTable.id, sysUserRolesTable.roleId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(sysUsersTable.id))
      .limit(pageSize)
      .offset(offset);
    const totalRows = await db
      .select({ total: count() })
      .from(sysUsersTable)
      .where(filters.length ? and(...filters) : undefined);
    return {
      list: this.mergeRowsToUsers(rows),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async findById(id: number) {
    const rows = await this.findRows({ id });
    const list = this.mergeRowsToUsers(rows);
    return list[0];
  }

  async findByAccount(account: string) {
    // Include soft-deleted records for conflict checks on unique account.
    const rows = await db
      .select({
        id: sysUsersTable.id,
        account: sysUsersTable.account,
        nickname: sysUsersTable.nickname,
        roleCode: sysRolesTable.code,
      })
      .from(sysUsersTable)
      .leftJoin(
        sysUserRolesTable,
        eq(sysUserRolesTable.userId, sysUsersTable.id),
      )
      .leftJoin(sysRolesTable, eq(sysRolesTable.id, sysUserRolesTable.roleId))
      .where(eq(sysUsersTable.account, account))
      .orderBy(asc(sysUsersTable.id))
      .limit(10);
    const list = this.mergeRowsToUsers(rows);
    return list[0];
  }

  async create(input: SaveUserInput) {
    const roleRows = await db
      .select({ id: sysRolesTable.id })
      .from(sysRolesTable)
      .where(eq(sysRolesTable.code, input.role))
      .limit(1);
    if (!roleRows[0]) {
      throw new Error(`Role ${input.role} not found`);
    }

    const created = await db.transaction(async (tx) => {
      const insertedUsers = await tx
        .insert(sysUsersTable)
        .values({
          account: input.account,
          passwordHash: `${input.account}123`,
          nickname: input.name,
          status: 1,
        })
        .returning({
          id: sysUsersTable.id,
          account: sysUsersTable.account,
          nickname: sysUsersTable.nickname,
        });

      const user = insertedUsers[0];
      await tx.insert(sysUserRolesTable).values({
        userId: user.id,
        roleId: roleRows[0].id,
      });

      return {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        roleCode: input.role,
      };
    });

    return toUserEntity(created);
  }

  async update(id: number, input: UpdateUserInput) {
    if (Object.keys(input).length === 0) {
      return this.findById(id);
    }
    await db.transaction(async (tx) => {
      if (input.account || input.name) {
        await tx
          .update(sysUsersTable)
          .set({
            account: input.account,
            nickname: input.name,
          })
          .where(
            and(eq(sysUsersTable.id, id), isNull(sysUsersTable.deletedAt)),
          );
      }

      if (input.role) {
        const roleRows = await tx
          .select({ id: sysRolesTable.id })
          .from(sysRolesTable)
          .where(eq(sysRolesTable.code, input.role))
          .limit(1);
        if (!roleRows[0]) {
          throw new Error(`Role ${input.role} not found`);
        }
        await tx
          .delete(sysUserRolesTable)
          .where(eq(sysUserRolesTable.userId, id));
        await tx.insert(sysUserRolesTable).values({
          userId: id,
          roleId: roleRows[0].id,
        });
      }
    });

    return this.findById(id);
  }

  async deleteById(id: number) {
    const rows = await db
      .update(sysUsersTable)
      .set({
        status: 0,
        deletedAt: new Date(),
      })
      .where(and(eq(sysUsersTable.id, id), isNull(sysUsersTable.deletedAt)))
      .returning({ id: sysUsersTable.id });
    return rows.length > 0;
  }

  async deleteByIds(ids: number[]) {
    if (ids.length === 0) return 0;
    const rows = await db
      .update(sysUsersTable)
      .set({
        status: 0,
        deletedAt: new Date(),
      })
      .where(
        and(inArray(sysUsersTable.id, ids), isNull(sysUsersTable.deletedAt)),
      )
      .returning({ id: sysUsersTable.id });
    return rows.length;
  }

  async findPermissionCodesByRole(role: UserEntity['role']) {
    const filters =
      role === 'admin'
        ? [
            eq(sysPermissionsTable.status, 1),
            isNull(sysPermissionsTable.deletedAt),
          ]
        : [
            eq(sysRolesTable.code, role),
            eq(sysPermissionsTable.status, 1),
            isNull(sysPermissionsTable.deletedAt),
          ];

    const rows = await db
      .select({
        code: sysPermissionsTable.code,
      })
      .from(sysPermissionsTable)
      .leftJoin(
        sysRolePermissionsTable,
        eq(sysRolePermissionsTable.permissionId, sysPermissionsTable.id),
      )
      .leftJoin(
        sysRolesTable,
        eq(sysRolesTable.id, sysRolePermissionsTable.roleId),
      )
      .where(and(...filters))
      .orderBy(asc(sysPermissionsTable.id));

    return Array.from(new Set(rows.map((row) => row.code)));
  }

  async findPermissions() {
    const rows = await db
      .select({
        id: sysPermissionsTable.id,
        code: sysPermissionsTable.code,
        name: sysPermissionsTable.name,
        module: sysPermissionsTable.module,
        status: sysPermissionsTable.status,
      })
      .from(sysPermissionsTable)
      .where(isNull(sysPermissionsTable.deletedAt))
      .orderBy(asc(sysPermissionsTable.id));
    return rows;
  }

  async findMenus() {
    const rows = await db
      .select({
        id: sysMenusTable.id,
        parentId: sysMenusTable.parentId,
        name: sysMenusTable.name,
        path: sysMenusTable.path,
        status: sysMenusTable.status,
      })
      .from(sysMenusTable)
      .where(isNull(sysMenusTable.deletedAt))
      .orderBy(
        asc(sysMenusTable.parentId),
        asc(sysMenusTable.sort),
        asc(sysMenusTable.id),
      );
    return rows;
  }

  async findMenuTreeByRole(role: UserEntity['role']) {
    const filters =
      role === 'admin'
        ? [
            eq(sysMenusTable.status, 1),
            eq(sysMenusTable.visible, 1),
            isNull(sysMenusTable.deletedAt),
          ]
        : [
            eq(sysRolesTable.code, role),
            eq(sysMenusTable.status, 1),
            eq(sysMenusTable.visible, 1),
            isNull(sysMenusTable.deletedAt),
          ];

    const rows = await db
      .select({
        id: sysMenusTable.id,
        parentId: sysMenusTable.parentId,
        name: sysMenusTable.name,
        path: sysMenusTable.path,
        routeName: sysMenusTable.routeName,
        component: sysMenusTable.component,
        icon: sysMenusTable.icon,
        type: sysMenusTable.type,
        sort: sysMenusTable.sort,
        visible: sysMenusTable.visible,
        status: sysMenusTable.status,
        permissionCode: sysMenusTable.permissionCode,
        keepAlive: sysMenusTable.keepAlive,
      })
      .from(sysMenusTable)
      .leftJoin(
        sysRoleMenusTable,
        eq(sysRoleMenusTable.menuId, sysMenusTable.id),
      )
      .leftJoin(sysRolesTable, eq(sysRolesTable.id, sysRoleMenusTable.roleId))
      .where(and(...filters))
      .orderBy(
        asc(sysMenusTable.parentId),
        asc(sysMenusTable.sort),
        asc(sysMenusTable.id),
      );

    return this.toMenuTree(rows);
  }

  private toMenuTree(rows: MenuEntity[]): MenuTreeEntity[] {
    const nodeMap = new Map<number, MenuTreeEntity>();
    for (const row of rows) {
      nodeMap.set(row.id, {
        ...row,
        children: [],
      });
    }

    const roots: MenuTreeEntity[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId === node.id) {
        roots.push(node);
        continue;
      }
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    if (roots.length === 0) {
      for (const node of nodeMap.values()) {
        roots.push(node);
      }
    }

    const sortTree = (nodes: MenuTreeEntity[], path = new Set<number>()) => {
      nodes.sort((a, b) => a.sort - b.sort || a.id - b.id);
      for (const item of nodes) {
        if (path.has(item.id)) {
          item.children = [];
          continue;
        }
        if (item.children.length > 0) {
          const nextPath = new Set(path);
          nextPath.add(item.id);
          sortTree(item.children, nextPath);
        }
      }
    };
    sortTree(roots);
    return roots;
  }
}
