type IpBlacklistItem = {
  ip: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
};

const MAX_IP_RULES = 2000;
const defaultReason = 'Manual blocked';

const ipRules = new Map<
  string,
  {
    reason: string;
    createdAt: number;
    expiresAt: number | null;
  }
>();

const trim = (value: string) => value.trim();

const normalizeIp = (ip: string) => trim(ip);

const now = () => Date.now();

const purgeExpiredRules = () => {
  const timestamp = now();
  for (const [ip, rule] of ipRules.entries()) {
    if (rule.expiresAt !== null && rule.expiresAt <= timestamp) {
      ipRules.delete(ip);
    }
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

export const listBlockedIps = (): IpBlacklistItem[] => {
  purgeExpiredRules();
  return [...ipRules.entries()]
    .map(([ip, rule]) => ({
      ip,
      reason: rule.reason,
      createdAt: new Date(rule.createdAt).toISOString(),
      expiresAt: rule.expiresAt ? new Date(rule.expiresAt).toISOString() : null,
    }))
    .sort((left, right) =>
      left.createdAt < right.createdAt
        ? 1
        : left.createdAt > right.createdAt
          ? -1
          : 0,
    );
};

export const addBlockedIp = (
  ip: string,
  reason?: string,
  expiresInMinutes?: number,
) => {
  purgeExpiredRules();
  const normalizedIp = normalizeIp(ip);
  const createdAt = now();
  const expiresAt =
    typeof expiresInMinutes === 'number' && expiresInMinutes > 0
      ? createdAt + expiresInMinutes * 60 * 1000
      : null;
  ipRules.set(normalizedIp, {
    reason: trim(reason || '') || defaultReason,
    createdAt,
    expiresAt,
  });
  ensureCapacity();
};

export const removeBlockedIp = (ip: string) => {
  purgeExpiredRules();
  return ipRules.delete(normalizeIp(ip));
};

export const isIpBlocked = (ip: string) => {
  purgeExpiredRules();
  return ipRules.has(normalizeIp(ip));
};

export const resetIpBlacklistForTest = () => {
  ipRules.clear();
};
