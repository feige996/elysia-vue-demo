import { asc, eq, ilike, or } from 'drizzle-orm';
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

export class UserRepository {
    async findAll(keyword?: string) {
        if (!keyword) {
            const rows = await db
                .select({
                    id: usersTable.id,
                    account: usersTable.account,
                    name: usersTable.name,
                    role: usersTable.role,
                })
                .from(usersTable)
                .orderBy(asc(usersTable.id));
            return rows.map(toUserEntity);
        }
        const text = `%${keyword}%`;
        const rows = await db
            .select({
                id: usersTable.id,
                account: usersTable.account,
                name: usersTable.name,
                role: usersTable.role,
            })
            .from(usersTable)
            .where(or(ilike(usersTable.account, text), ilike(usersTable.name, text)))
            .orderBy(asc(usersTable.id));
        return rows.map(toUserEntity);
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
}
