import { defineConfig } from 'drizzle-kit';

const databaseUrlFromPgConfig =
  process.env.PG_HOST &&
  process.env.PG_PORT &&
  process.env.PG_USER &&
  process.env.PG_PASSWORD !== undefined &&
  process.env.PG_DATABASE
    ? `postgres://${encodeURIComponent(process.env.PG_USER)}:${encodeURIComponent(process.env.PG_PASSWORD)}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`
    : undefined;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrlFromPgConfig ?? process.env.DATABASE_URL ?? '',
  },
});
