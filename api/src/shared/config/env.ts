import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_FILE_PATH: z.string().optional(),
    LOG_FILE_DIR: z.string().default('logs'),
    LOG_FILE_PREFIX: z.string().default('app'),
    AUTH_ADMIN_TOKEN: z.string().default('admin-token'),
    AUTH_EDITOR_TOKEN: z.string().default('editor-token')
});

export const env = envSchema.parse(process.env);
