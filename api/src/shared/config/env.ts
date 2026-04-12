import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    LOG_FILE_PATH: z.string().optional(),
    LOG_FILE_DIR: z.string().default('logs'),
    LOG_FILE_PREFIX: z.string().default('app'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
    JWT_REFRESH_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(604800),
    REDIS_URL: z.string().optional(),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60000),
    STORAGE_TYPE: z.enum(['local', 'oss', 'cos']).default('local'),
    LOCAL_BASE_DIR: z.string().default('uploads'),
    LOCAL_BASE_URL: z.string().default('http://localhost:3000/uploads'),
    OSS_REGION: z.string().optional(),
    OSS_ACCESS_KEY_ID: z.string().optional(),
    OSS_ACCESS_KEY_SECRET: z.string().optional(),
    OSS_BUCKET: z.string().optional(),
    OSS_CDN_URL: z.string().optional(),
    COS_SECRET_ID: z.string().optional(),
    COS_SECRET_KEY: z.string().optional(),
    COS_BUCKET: z.string().optional(),
    COS_REGION: z.string().optional(),
    COS_CDN_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export type StorageType = 'local' | 'oss' | 'cos';
export const storageType = env.STORAGE_TYPE as StorageType;
