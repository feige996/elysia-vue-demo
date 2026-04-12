import { MemoryDatabaseAdapter } from './adapters/memory.adapter';
import { MysqlDatabaseAdapter } from './adapters/mysql.adapter';
import { PostgresDatabaseAdapter } from './adapters/postgres.adapter';
import type { DatabaseAdapter, DatabaseClient } from './types';

export const createDatabaseAdapter = (): DatabaseAdapter => {
    const client = (process.env.DB_CLIENT ?? 'memory').toLowerCase() as DatabaseClient;

    if (client === 'memory') {
        return new MemoryDatabaseAdapter();
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required when DB_CLIENT is postgres or mysql');
    }

    if (client === 'postgres') {
        return new PostgresDatabaseAdapter(databaseUrl);
    }

    if (client === 'mysql') {
        return new MysqlDatabaseAdapter(databaseUrl);
    }

    throw new Error(`Unsupported DB_CLIENT: ${client}`);
};
