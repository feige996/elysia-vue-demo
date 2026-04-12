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

let initializePromise: Promise<void> | null = null;

const bootstrap = async () => {
    const existingUsers = await db.select({ total: count() }).from(usersTable);
    if (Number(existingUsers[0]?.total ?? 0) === 0) {
        await db.insert(usersTable).values(defaultUsers).onConflictDoNothing({ target: usersTable.account });
    }

    const existingArticles = await db.select({ total: count() }).from(articlesTable);
    if (Number(existingArticles[0]?.total ?? 0) === 0) {
        await db.insert(articlesTable).values(defaultArticles);
    }
};

export const ensureDbInitialized = () => {
    if (!initializePromise) {
        initializePromise = bootstrap();
    }
    return initializePromise;
};
