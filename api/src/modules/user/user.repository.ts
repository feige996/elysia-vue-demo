import { asc, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { db } from '../../infra/db/client';
import { usersTable } from '../../infra/db/schema';
import type { UserEntity } from '../../shared/types/entities';

const toUserRole = (role: string): UserEntity['role'] => (role === 'admin' ? 'admin' : 'editor');

const toUserEntity = (row: { id: number; account: string; name: string; role: string }): UserEntity => ({
    id: row.id,
    account: row.account,
    name: row.name,
    role: toUserRole(row.role),
});

type SaveUserInput = {
    account: string;
    name: string;
    role: UserEntity['role'];
};

type UpdateUserInput = Partial<SaveUserInput>;

const buildKeywordFilter = (keyword?: string) => {
    if (!keyword) return undefined;
    const text = `%${keyword}%`;
    return or(ilike(usersTable.account, text), ilike(usersTable.name, text));
};

export class UserRepository {
    async findAll(keyword?: string) {
        const rows = await db
            .select({
                id: usersTable.id,
                account: usersTable.account,
                name: usersTable.name,
                role: usersTable.role,
            })
            .from(usersTable)
            .where(buildKeywordFilter(keyword))
            .orderBy(asc(usersTable.id));
        return rows.map(toUserEntity);
    }

    async findPage(page: number, pageSize: number, keyword?: string) {
        const offset = (page - 1) * pageSize;
        const filter = buildKeywordFilter(keyword);
        const rows = await db
            .select({
                id: usersTable.id,
                account: usersTable.account,
                name: usersTable.name,
                role: usersTable.role,
            })
            .from(usersTable)
            .where(filter)
            .orderBy(asc(usersTable.id))
            .limit(pageSize)
            .offset(offset);
        const totalRows = await db.select({ total: count() }).from(usersTable).where(filter);
        return {
            list: rows.map(toUserEntity),
            total: Number(totalRows[0]?.total ?? 0),
        };
    }

    async findById(id: number) {
        const rows = await db
            .select({
                id: usersTable.id,
                account: usersTable.account,
                name: usersTable.name,
                role: usersTable.role,
            })
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .limit(1);
        if (!rows[0]) return undefined;
        return toUserEntity(rows[0]);
    }

    async findByAccount(account: string) {
        const rows = await db
            .select({
                id: usersTable.id,
                account: usersTable.account,
                name: usersTable.name,
                role: usersTable.role,
            })
            .from(usersTable)
            .where(eq(usersTable.account, account))
            .limit(1);
        if (!rows[0]) return undefined;
        return toUserEntity(rows[0]);
    }

    async create(input: SaveUserInput) {
        const rows = await db.insert(usersTable).values(input).returning({
            id: usersTable.id,
            account: usersTable.account,
            name: usersTable.name,
            role: usersTable.role,
        });
        return toUserEntity(rows[0]);
    }

    async update(id: number, input: UpdateUserInput) {
        if (Object.keys(input).length === 0) {
            return this.findById(id);
        }
        const rows = await db.update(usersTable).set(input).where(eq(usersTable.id, id)).returning({
            id: usersTable.id,
            account: usersTable.account,
            name: usersTable.name,
            role: usersTable.role,
        });
        if (!rows[0]) return undefined;
        return toUserEntity(rows[0]);
    }

    async deleteById(id: number) {
        const rows = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
        return rows.length > 0;
    }

    async deleteByIds(ids: number[]) {
        if (ids.length === 0) return 0;
        const rows = await db.delete(usersTable).where(inArray(usersTable.id, ids)).returning({ id: usersTable.id });
        return rows.length;
    }
}
