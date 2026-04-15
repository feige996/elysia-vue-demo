import Redis from 'ioredis';
import { createHash, randomInt } from 'node:crypto';
import { env } from '../config/env';

type VerifyChannel = 'email' | 'sms';

type CodeRecord = {
  codeHash: string;
  expiresAt: number;
  tries: number;
  sentAt: number;
};

const redisClient =
  env.REDIS_URL && env.NODE_ENV !== 'test'
    ? new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      })
    : null;

if (redisClient) {
  redisClient.on('error', () => undefined);
}

const memoryStore = new Map<string, CodeRecord>();

const keyOf = (account: string, channel: VerifyChannel) =>
  `auth:pwd-reset:${channel}:${account}`;

const now = () => Date.now();

const hashCode = (rawCode: string) =>
  createHash('sha256').update(rawCode).digest('hex');

const getRedisClient = async () => {
  if (!redisClient) return null;
  if (redisClient.status === 'wait') {
    try {
      await redisClient.connect();
    } catch {
      return null;
    }
  }
  return redisClient.status === 'ready' ? redisClient : null;
};

const pruneMemoryExpired = () => {
  const current = now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt <= current) {
      memoryStore.delete(key);
    }
  }
};

const readRecord = async (key: string): Promise<CodeRecord | null> => {
  const redis = await getRedisClient();
  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CodeRecord;
    } catch {
      return null;
    }
  }
  pruneMemoryExpired();
  const data = memoryStore.get(key);
  if (!data) return null;
  if (data.expiresAt <= now()) {
    memoryStore.delete(key);
    return null;
  }
  return data;
};

const writeRecord = async (key: string, value: CodeRecord) => {
  const redis = await getRedisClient();
  if (redis) {
    const ttlSeconds = Math.max(Math.ceil((value.expiresAt - now()) / 1000), 1);
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return;
  }
  memoryStore.set(key, value);
};

const removeRecord = async (key: string) => {
  const redis = await getRedisClient();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryStore.delete(key);
};

export const generateVerificationCode = () =>
  randomInt(100000, 1000000).toString();

export const saveVerificationCode = async (
  account: string,
  channel: VerifyChannel,
  code: string,
) => {
  const sentAt = now();
  const expiresAt = sentAt + env.PASSWORD_RESET_CODE_TTL_SECONDS * 1000;
  await writeRecord(keyOf(account, channel), {
    codeHash: hashCode(code),
    expiresAt,
    tries: 0,
    sentAt,
  });
};

export const checkSendCooldown = async (
  account: string,
  channel: VerifyChannel,
) => {
  const record = await readRecord(keyOf(account, channel));
  if (!record) return { allowed: true as const, waitSeconds: 0 };
  const waitMs =
    record.sentAt + env.PASSWORD_RESET_SEND_COOLDOWN_SECONDS * 1000 - now();
  if (waitMs <= 0) return { allowed: true as const, waitSeconds: 0 };
  return {
    allowed: false as const,
    waitSeconds: Math.ceil(waitMs / 1000),
  };
};

export const verifyCodeAndConsume = async (
  account: string,
  channel: VerifyChannel,
  inputCode: string,
) => {
  const key = keyOf(account, channel);
  const record = await readRecord(key);
  if (!record) return { ok: false as const, reason: 'NOT_FOUND' as const };
  if (record.expiresAt <= now()) {
    await removeRecord(key);
    return { ok: false as const, reason: 'EXPIRED' as const };
  }
  if (record.tries >= env.PASSWORD_RESET_CODE_MAX_TRIES) {
    await removeRecord(key);
    return { ok: false as const, reason: 'MAX_TRIES' as const };
  }

  if (record.codeHash !== hashCode(inputCode)) {
    await writeRecord(key, { ...record, tries: record.tries + 1 });
    return { ok: false as const, reason: 'INVALID_CODE' as const };
  }

  await removeRecord(key);
  return { ok: true as const };
};
