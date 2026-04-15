import { z } from 'zod';

const parseDurationSeconds = (value?: string) => {
  if (!value) return undefined;
  const text = value.trim().toLowerCase();
  const matched = text.match(/^(\d+)([smhd])$/);
  if (!matched) return undefined;
  const amount = Number.parseInt(matched[1], 10);
  const unit = matched[2];
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  if (unit === 'd') return amount * 86400;
  return undefined;
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(9000),
  DATABASE_URL: z.string().min(1).optional(),
  PG_HOST: z.string().optional(),
  PG_PORT: z.coerce.number().int().positive().optional(),
  PG_USER: z.string().optional(),
  PG_PASSWORD: z.string().optional(),
  PG_DATABASE: z.string().optional(),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  LOG_FILE_PATH: z.string().optional(),
  LOG_FILE_DIR: z.string().default('logs'),
  LOG_FILE_PREFIX: z.string().default('app'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().optional(),
  JWT_REFRESH_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(604800),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  CORS_ALLOW_ORIGINS: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_MAX_WRITE: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_READ: z.coerce.number().int().positive().default(180),
  STORAGE_TYPE: z.enum(['local', 'oss', 'cos']).default('local'),
  LOCAL_BASE_DIR: z.string().default('uploads'),
  LOCAL_BASE_URL: z.string().default('http://localhost:9000/uploads'),
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
  FEATURE_QUEUE_ENABLED: z.enum(['true', 'false']).default('false'),
  FEATURE_CRON_ENABLED: z.enum(['true', 'false']).default('false'),
  FEATURE_MAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  FEATURE_STORAGE_EXTENDED: z.enum(['true', 'false']).default('false'),
  FEATURE_MONITOR_ENABLED: z.enum(['true', 'false']).default('false'),
  FEATURE_IP_BLACKLIST_ENABLED: z.enum(['true', 'false']).default('false'),
  IP_WHITELIST: z.string().optional(),
  LOGIN_FAIL_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_FAIL_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  LOGIN_FAIL_BLOCK_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_CODE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(600),
  PASSWORD_RESET_CODE_MAX_TRIES: z.coerce.number().int().positive().default(5),
  PASSWORD_RESET_SEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
  NOTIFY_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  NOTIFY_EMAIL_WEBHOOK_URL: z.string().optional(),
  NOTIFY_EMAIL_WEBHOOK_TOKEN: z.string().optional(),
  NOTIFY_SMS_WEBHOOK_URL: z.string().optional(),
  NOTIFY_SMS_WEBHOOK_TOKEN: z.string().optional(),
});

const rawEnv = envSchema.parse(process.env);

const databaseUrlFromPgConfig =
  rawEnv.PG_HOST &&
  rawEnv.PG_PORT &&
  rawEnv.PG_USER &&
  rawEnv.PG_PASSWORD !== undefined &&
  rawEnv.PG_DATABASE
    ? `postgres://${encodeURIComponent(rawEnv.PG_USER)}:${encodeURIComponent(rawEnv.PG_PASSWORD)}@${rawEnv.PG_HOST}:${rawEnv.PG_PORT}/${rawEnv.PG_DATABASE}`
    : undefined;

const databaseUrl = databaseUrlFromPgConfig ?? rawEnv.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE are required (or set DATABASE_URL for compatibility)',
  );
}

const redisUrl =
  rawEnv.REDIS_URL ??
  (rawEnv.REDIS_HOST && rawEnv.REDIS_PORT
    ? `redis://${rawEnv.REDIS_HOST}:${rawEnv.REDIS_PORT}`
    : undefined);

const jwtExpiresInSeconds =
  rawEnv.JWT_EXPIRES_IN_SECONDS ??
  parseDurationSeconds(rawEnv.JWT_EXPIRES_IN) ??
  3600;

export const env = {
  ...rawEnv,
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  JWT_EXPIRES_IN_SECONDS: jwtExpiresInSeconds,
};

export const features = {
  queue: env.FEATURE_QUEUE_ENABLED === 'true',
  cron: env.FEATURE_CRON_ENABLED === 'true',
  mail: env.FEATURE_MAIL_ENABLED === 'true',
  storageExtended: env.FEATURE_STORAGE_EXTENDED === 'true',
  monitor: env.FEATURE_MONITOR_ENABLED === 'true',
  ipBlacklist: env.FEATURE_IP_BLACKLIST_ENABLED === 'true',
} as const;

export type StorageType = 'local' | 'oss' | 'cos';
export const storageType = env.STORAGE_TYPE as StorageType;
