type OnlineSession = {
  key: string;
  userId: number | null;
  account: string;
  role: string;
  ip: string;
  userAgent: string;
  requestCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

const ONLINE_SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_SESSION_COUNT = 2000;

const onlineSessions = new Map<
  string,
  {
    userId: number | null;
    account: string;
    role: string;
    ip: string;
    userAgent: string;
    requestCount: number;
    firstSeenAt: number;
    lastSeenAt: number;
  }
>();

const resolveClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
};

const sweepExpiredSessions = (now: number) => {
  for (const [key, session] of onlineSessions.entries()) {
    if (now - session.lastSeenAt > ONLINE_SESSION_TTL_MS) {
      onlineSessions.delete(key);
    }
  }
};

const ensureCapacity = () => {
  if (onlineSessions.size <= MAX_SESSION_COUNT) {
    return;
  }
  const oldest = [...onlineSessions.entries()].sort(
    (left, right) => left[1].lastSeenAt - right[1].lastSeenAt,
  );
  const removableCount = onlineSessions.size - MAX_SESSION_COUNT;
  for (let index = 0; index < removableCount; index += 1) {
    const key = oldest[index]?.[0];
    if (key) {
      onlineSessions.delete(key);
    }
  }
};

export const touchOnlineSession = (
  request: Request,
  identity: {
    role: string;
    userId?: number;
    account?: string;
  },
) => {
  const now = Date.now();
  sweepExpiredSessions(now);

  const userId = identity.userId ?? null;
  const account = identity.account ?? `role:${identity.role}`;
  const ip = resolveClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const key = `${account}#${ip}`;
  const current = onlineSessions.get(key);

  if (!current) {
    onlineSessions.set(key, {
      userId,
      account,
      role: identity.role,
      ip,
      userAgent,
      requestCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    });
    ensureCapacity();
    return;
  }

  current.userId = userId;
  current.account = account;
  current.role = identity.role;
  current.ip = ip;
  current.userAgent = userAgent;
  current.requestCount += 1;
  current.lastSeenAt = now;
};

export const getOnlineSessions = () => {
  const now = Date.now();
  sweepExpiredSessions(now);
  return [...onlineSessions.entries()]
    .map(
      ([key, session]): OnlineSession => ({
        key,
        userId: session.userId,
        account: session.account,
        role: session.role,
        ip: session.ip,
        userAgent: session.userAgent,
        requestCount: session.requestCount,
        firstSeenAt: new Date(session.firstSeenAt).toISOString(),
        lastSeenAt: new Date(session.lastSeenAt).toISOString(),
      }),
    )
    .sort((left, right) =>
      left.lastSeenAt < right.lastSeenAt
        ? 1
        : left.lastSeenAt > right.lastSeenAt
          ? -1
          : 0,
    );
};

export const resetOnlineSessionsForTest = () => {
  onlineSessions.clear();
};
