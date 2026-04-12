import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
    id: serial('id').primaryKey(),
    account: varchar('account', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 64 }).notNull(),
    role: varchar('role', { length: 16 }).notNull()
});

export const articlesTable = pgTable('articles', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    author: varchar('author', { length: 64 }).notNull()
});
