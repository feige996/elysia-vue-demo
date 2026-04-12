import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { defaultArticles, defaultUsers } from './seed-data';
import { articlesTable, usersTable } from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
}

const sqlClient = postgres(databaseUrl, { prepare: false });
export const db = drizzle(sqlClient);

export const seedDatabase = async () => {
    const existingUsers = await db.select({ total: count() }).from(usersTable);
    if (Number(existingUsers[0]?.total ?? 0) === 0) {
        await db.insert(usersTable).values(defaultUsers).onConflictDoNothing({ target: usersTable.account });
    }

    const existingArticles = await db.select({ total: count() }).from(articlesTable);
    if (Number(existingArticles[0]?.total ?? 0) === 0) {
        await db.insert(articlesTable).values(defaultArticles);
    }
};

export const checkDatabaseHealth = async () => {
    await db.select({ total: count() }).from(usersTable);
    await db.select({ total: count() }).from(articlesTable);
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
