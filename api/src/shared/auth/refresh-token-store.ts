import Redis from 'ioredis';
import { env } from '../config/env';

const revokedTokenKey = (jti: string) => `auth:refresh:revoked:${jti}`;
const memoryRevokedSet = new Map<string, number>();

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

const nowInSeconds = () => Math.floor(Date.now() / 1000);

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

export const getRedisCacheOverview = async () => {
  const redis = await getRedisClient();
  if (!redis) {
    return {
      enabled: false,
      status: redisClient ? redisClient.status : 'disabled',
      totalKeys: 0,
      sampledKeys: [] as string[],
      namespaceStats: [] as Array<{ namespace: string; count: number }>,
    };
  }

  let totalKeys = 0;
  try {
    totalKeys = await redis.dbsize();
  } catch {
    totalKeys = 0;
  }

  const sampledKeys: string[] = [];
  let cursor = '0';
  const maxSampleSize = 300;
  do {
    const result = await redis.scan(cursor, 'COUNT', 100);
    cursor = result[0];
    sampledKeys.push(...result[1]);
  } while (cursor !== '0' && sampledKeys.length < maxSampleSize);

  const namespaceCounter = new Map<string, number>();
  for (const key of sampledKeys) {
    const segments = key.split(':');
    const namespace =
      segments.length >= 2 ? `${segments[0]}:${segments[1]}` : segments[0];
    namespaceCounter.set(namespace, (namespaceCounter.get(namespace) ?? 0) + 1);
  }

  const namespaceStats = [...namespaceCounter.entries()]
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 20);

  return {
    enabled: true,
    status: redis.status,
    totalKeys,
    sampledKeys: sampledKeys.slice(0, maxSampleSize),
    namespaceStats,
  };
};

export const checkRedisHealth = async () => {
  if (!redisClient) {
    return {
      enabled: false,
      ok: true,
      detail: 'Redis is not configured, health check skipped',
    };
  }
  if (redisClient.status === 'wait') {
    try {
      await redisClient.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        enabled: true,
        ok: false,
        detail: `Redis connect failed: ${message}`,
      };
    }
  }
  if (redisClient.status !== 'ready') {
    return {
      enabled: true,
      ok: false,
      detail: `Redis status is ${redisClient.status}`,
    };
  }
  try {
    const pong = await redisClient.ping();
    return {
      enabled: true,
      ok: pong === 'PONG',
      detail:
        pong === 'PONG'
          ? 'Redis ping success'
          : `Redis ping returned unexpected response: ${pong}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      enabled: true,
      ok: false,
      detail: `Redis ping failed: ${message}`,
    };
  }
};

const cleanupMemoryStore = () => {
  const now = nowInSeconds();
  for (const [jti, expiredAt] of memoryRevokedSet.entries()) {
    if (expiredAt <= now) {
      memoryRevokedSet.delete(jti);
    }
  }
};

export const markRefreshTokenRevoked = async (
  jti: string,
  expiredAt: number,
) => {
  const ttl = Math.max(expiredAt - nowInSeconds(), 1);
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(revokedTokenKey(jti), '1', 'EX', ttl);
    return;
  }
  cleanupMemoryStore();
  memoryRevokedSet.set(jti, expiredAt);
};

export const isRefreshTokenRevoked = async (jti: string) => {
  const redis = await getRedisClient();
  if (redis) {
    const exists = await redis.exists(revokedTokenKey(jti));
    return exists === 1;
  }
  cleanupMemoryStore();
  return memoryRevokedSet.has(jti);
};
