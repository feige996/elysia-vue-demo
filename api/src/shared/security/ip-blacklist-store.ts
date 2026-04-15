import Redis from 'ioredis';
import { env, features } from '../config/env';
import { db } from '../../infra/db/client';
import { sysAuditLogsTable } from '../../infra/db/schema';
import { logService } from '../logger/log.service';

type IpBlacklistItem = {
  ip: string;
  source: 'manual' | 'auto';
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  hitCount: number;
  lastHitAt: string | null;
};

const MAX_IP_RULES = 2000;
const defaultReason = 'Manual blocked';
const redisRuleKey = (ip: string) => `security:ip-blacklist:rule:${ip}`;
const loginFailCounterKey = (ip: string) => `security:login-fail:counter:${ip}`;

const ipRules = new Map<
  string,
  {
    source: 'manual' | 'auto';
    reason: string;
    createdAt: number;
    expiresAt: number | null;
    hitCount: number;
    lastHitAt: number | null;
  }
>();
const loginFailCounters = new Map<
  string,
  { count: number; expiresAt: number }
>();

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

const trim = (value: string) => value.trim();

const normalizeIp = (ip: string) => trim(ip);

const now = () => Date.now();
const whitelistedIps = new Set(
  (env.IP_WHITELIST ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

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

const purgeExpiredRules = () => {
  const timestamp = now();
  for (const [ip, rule] of ipRules.entries()) {
    if (rule.expiresAt !== null && rule.expiresAt <= timestamp) {
      ipRules.delete(ip);
    }
  }
};

const purgeExpiredLoginFailCounters = () => {
  const timestamp = now();
  for (const [ip, counter] of loginFailCounters.entries()) {
    if (counter.expiresAt <= timestamp) {
      loginFailCounters.delete(ip);
    }
  }
};

const writeAutoBlockAuditLog = async (params: {
  ip: string;
  requestId?: string;
  account?: string;
  attempts: number;
}) => {
  try {
    await db.insert(sysAuditLogsTable).values({
      traceId: params.requestId ?? null,
      action: 'AUTO_BLOCK',
      module: 'security-ip-blacklist',
      resource: '/api/auth/login',
      resourceId: params.ip,
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      responseCode: 403,
      success: 1,
      durationMs: 0,
      operatorUserId: null,
      operatorAccount: params.account ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logService.warn('auto_block_audit_write_failed', {
      ip: params.ip,
      requestId: params.requestId,
      error: message,
    });
  }
};

const ensureCapacity = () => {
  if (ipRules.size <= MAX_IP_RULES) return;
  const rules = [...ipRules.entries()].sort(
    (left, right) => left[1].createdAt - right[1].createdAt,
  );
  const removeCount = ipRules.size - MAX_IP_RULES;
  for (let index = 0; index < removeCount; index += 1) {
    const ip = rules[index]?.[0];
    if (ip) ipRules.delete(ip);
  }
};

const listBlockedIpsFromMemory = (): IpBlacklistItem[] => {
  purgeExpiredRules();
  return [...ipRules.entries()]
    .map(([ip, rule]) => ({
      ip,
      source: rule.source,
      reason: rule.reason,
      createdAt: new Date(rule.createdAt).toISOString(),
      expiresAt: rule.expiresAt ? new Date(rule.expiresAt).toISOString() : null,
      hitCount: rule.hitCount,
      lastHitAt: rule.lastHitAt ? new Date(rule.lastHitAt).toISOString() : null,
    }))
    .sort((left, right) =>
      left.createdAt < right.createdAt
        ? 1
        : left.createdAt > right.createdAt
          ? -1
          : 0,
    );
};

const addBlockedIpToMemory = (
  ip: string,
  reason?: string,
  expiresInMinutes?: number,
  source: 'manual' | 'auto' = 'manual',
) => {
  purgeExpiredRules();
  const normalizedIp = normalizeIp(ip);
  const createdAt = now();
  const expiresAt =
    typeof expiresInMinutes === 'number' && expiresInMinutes > 0
      ? createdAt + expiresInMinutes * 60 * 1000
      : null;
  ipRules.set(normalizedIp, {
    source,
    reason: trim(reason || '') || defaultReason,
    createdAt,
    expiresAt,
    hitCount: 0,
    lastHitAt: null,
  });
  ensureCapacity();
};

const removeBlockedIpFromMemory = (ip: string) => {
  purgeExpiredRules();
  return ipRules.delete(normalizeIp(ip));
};

const isIpBlockedInMemory = (ip: string) => {
  purgeExpiredRules();
  return ipRules.has(normalizeIp(ip));
};

export const listBlockedIps = async (): Promise<IpBlacklistItem[]> => {
  const redis = await getRedisClient();
  if (!redis) {
    return listBlockedIpsFromMemory();
  }

  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await redis.scan(
      cursor,
      'MATCH',
      'security:ip-blacklist:rule:*',
      'COUNT',
      200,
    );
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');

  if (keys.length === 0) {
    return [];
  }

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.hgetall(key);
  }
  const results = await pipeline.exec();
  const list: IpBlacklistItem[] = [];
  for (let index = 0; index < keys.length; index += 1) {
    const value = results?.[index]?.[1] as
      | Record<string, string | undefined>
      | undefined;
    if (!value) continue;
    const ip =
      value.ip ?? keys[index].replace('security:ip-blacklist:rule:', '');
    const source = value.source === 'auto' ? 'auto' : 'manual';
    const reason = value.reason ?? defaultReason;
    const createdAt = value.createdAt ?? new Date().toISOString();
    const expiresAtRaw = value.expiresAt;
    const expiresAt =
      expiresAtRaw && expiresAtRaw.length > 0 ? expiresAtRaw : null;
    const hitCount = Number.parseInt(value.hitCount ?? '0', 10);
    const lastHitAtRaw = value.lastHitAt;
    const lastHitAt =
      lastHitAtRaw && lastHitAtRaw.length > 0 ? lastHitAtRaw : null;
    list.push({
      ip,
      source,
      reason,
      createdAt,
      expiresAt,
      hitCount: Number.isNaN(hitCount) ? 0 : hitCount,
      lastHitAt,
    });
  }
  return list.sort((left, right) =>
    left.createdAt < right.createdAt
      ? 1
      : left.createdAt > right.createdAt
        ? -1
        : 0,
  );
};

export const addBlockedIp = async (
  ip: string,
  reason?: string,
  expiresInMinutes?: number,
  source: 'manual' | 'auto' = 'manual',
) => {
  const redis = await getRedisClient();
  if (!redis) {
    addBlockedIpToMemory(ip, reason, expiresInMinutes, source);
    return;
  }

  const normalizedIp = normalizeIp(ip);
  const createdAt = new Date().toISOString();
  const expiresAt =
    typeof expiresInMinutes === 'number' && expiresInMinutes > 0
      ? new Date(now() + expiresInMinutes * 60 * 1000).toISOString()
      : '';

  const key = redisRuleKey(normalizedIp);
  const payload = {
    ip: normalizedIp,
    source,
    reason: trim(reason || '') || defaultReason,
    createdAt,
    expiresAt,
    hitCount: '0',
    lastHitAt: '',
  };
  await redis.hset(key, payload);
  if (expiresAt) {
    await redis.expire(
      key,
      Math.max(Math.floor((new Date(expiresAt).getTime() - now()) / 1000), 1),
    );
  } else {
    await redis.persist(key);
  }
};

export const removeBlockedIp = async (ip: string) => {
  const redis = await getRedisClient();
  if (!redis) {
    return removeBlockedIpFromMemory(ip);
  }
  const deleted = await redis.del(redisRuleKey(normalizeIp(ip)));
  return deleted > 0;
};

export const isIpBlocked = async (ip: string) => {
  const redis = await getRedisClient();
  if (!redis) {
    return isIpBlockedInMemory(ip);
  }
  const exists = await redis.exists(redisRuleKey(normalizeIp(ip)));
  return exists === 1;
};

export const markBlockedIpHit = async (ip: string) => {
  const normalizedIp = normalizeIp(ip);
  const redis = await getRedisClient();
  const hitAtIso = new Date().toISOString();
  if (!redis) {
    purgeExpiredRules();
    const current = ipRules.get(normalizedIp);
    if (!current) return;
    current.hitCount += 1;
    current.lastHitAt = now();
    return;
  }

  const key = redisRuleKey(normalizedIp);
  const exists = await redis.exists(key);
  if (exists !== 1) return;
  await redis.hincrby(key, 'hitCount', 1);
  await redis.hset(key, 'lastHitAt', hitAtIso);
};

export const recordFailedLoginAttempt = async (
  ip: string,
  options?: { requestId?: string; account?: string },
) => {
  const normalizedIp = normalizeIp(ip);
  if (!features.ipBlacklist) {
    return { blocked: false, attempts: 0 };
  }
  if (!normalizedIp || normalizedIp === 'unknown') {
    return { blocked: false, attempts: 0 };
  }
  if (whitelistedIps.has(normalizedIp)) {
    return { blocked: false, attempts: 0 };
  }
  if (await isIpBlocked(normalizedIp)) {
    return { blocked: true, attempts: 0 };
  }
  const redis = await getRedisClient();
  if (!redis) {
    purgeExpiredLoginFailCounters();
    const expiresAt = now() + env.LOGIN_FAIL_WINDOW_MINUTES * 60 * 1000;
    const current = loginFailCounters.get(normalizedIp);
    const attempts = (current?.count ?? 0) + 1;
    loginFailCounters.set(normalizedIp, { count: attempts, expiresAt });
    if (attempts >= env.LOGIN_FAIL_THRESHOLD) {
      await addBlockedIp(
        normalizedIp,
        `Auto blocked: login failures >= ${env.LOGIN_FAIL_THRESHOLD} in ${env.LOGIN_FAIL_WINDOW_MINUTES}m`,
        env.LOGIN_FAIL_BLOCK_MINUTES,
        'auto',
      );
      await writeAutoBlockAuditLog({
        ip: normalizedIp,
        requestId: options?.requestId,
        account: options?.account,
        attempts,
      });
      logService.warn('ip_auto_blocked', {
        event: 'ip_auto_blocked',
        ip: normalizedIp,
        attempts,
        threshold: env.LOGIN_FAIL_THRESHOLD,
        windowMinutes: env.LOGIN_FAIL_WINDOW_MINUTES,
        blockMinutes: env.LOGIN_FAIL_BLOCK_MINUTES,
      });
      loginFailCounters.delete(normalizedIp);
      return { blocked: true, attempts };
    }
    return { blocked: false, attempts };
  }
  const counterKey = loginFailCounterKey(normalizedIp);
  const attempts = await redis.incr(counterKey);
  if (attempts === 1) {
    await redis.expire(counterKey, env.LOGIN_FAIL_WINDOW_MINUTES * 60);
  }
  if (attempts >= env.LOGIN_FAIL_THRESHOLD) {
    await addBlockedIp(
      normalizedIp,
      `Auto blocked: login failures >= ${env.LOGIN_FAIL_THRESHOLD} in ${env.LOGIN_FAIL_WINDOW_MINUTES}m`,
      env.LOGIN_FAIL_BLOCK_MINUTES,
      'auto',
    );
    await writeAutoBlockAuditLog({
      ip: normalizedIp,
      requestId: options?.requestId,
      account: options?.account,
      attempts,
    });
    logService.warn('ip_auto_blocked', {
      event: 'ip_auto_blocked',
      ip: normalizedIp,
      attempts,
      threshold: env.LOGIN_FAIL_THRESHOLD,
      windowMinutes: env.LOGIN_FAIL_WINDOW_MINUTES,
      blockMinutes: env.LOGIN_FAIL_BLOCK_MINUTES,
    });
    await redis.del(counterKey);
    return { blocked: true, attempts };
  }
  return { blocked: false, attempts };
};

export const resetIpBlacklistForTest = () => {
  ipRules.clear();
  loginFailCounters.clear();
};
