import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import {
  isRefreshTokenRevoked,
  markRefreshTokenRevoked,
} from './refresh-token-store';

const TOKEN_PREFIX = 'Bearer ';

export type AuthorizedRole = 'admin' | 'editor';
type TokenType = 'access' | 'refresh';
type AuthorizedIdentity = {
  role: AuthorizedRole;
  userId?: number;
  account?: string;
};

type JwtSignFn = (payload: Record<string, unknown>) => Promise<string>;
type JwtVerifyFn = (token: string) => Promise<unknown>;

type TokenPayload = {
  role: AuthorizedRole;
  type: TokenType;
  jti: string;
  iat: number;
  exp: number;
  userId?: number;
  account?: string;
};

const extractBearerToken = (authorizationHeader: string | null) => {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return null;
  return authorizationHeader.slice(TOKEN_PREFIX.length);
};

const isRole = (value: unknown): value is AuthorizedRole =>
  value === 'admin' || value === 'editor';
const isTokenType = (value: unknown): value is TokenType =>
  value === 'access' || value === 'refresh';

const parseTokenPayload = (payload: unknown): TokenPayload | null => {
  if (!payload || typeof payload !== 'object') return null;
  const role = Reflect.get(payload, 'role');
  const type = Reflect.get(payload, 'type');
  const jti = Reflect.get(payload, 'jti');
  const iat = Reflect.get(payload, 'iat');
  const exp = Reflect.get(payload, 'exp');
  const userIdValue = Reflect.get(payload, 'userId');
  const accountValue = Reflect.get(payload, 'account');
  if (!isRole(role) || !isTokenType(type) || typeof jti !== 'string')
    return null;
  if (typeof iat !== 'number' || typeof exp !== 'number') return null;
  const userId =
    typeof userIdValue === 'number' && Number.isInteger(userIdValue)
      ? userIdValue
      : undefined;
  const account = typeof accountValue === 'string' ? accountValue : undefined;
  return { role, type, jti, iat, exp, userId, account };
};

const issueToken = async (
  identity: AuthorizedIdentity,
  type: TokenType,
  expiresInSeconds: number,
  signJwt: JwtSignFn,
) => {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    role: identity.role,
    userId: identity.userId,
    account: identity.account,
    type,
    jti: randomUUID(),
    iat: now,
    exp: now + expiresInSeconds,
  });
};

export const issueAccessToken = async (
  identity: AuthorizedIdentity,
  signJwt: JwtSignFn,
) => issueToken(identity, 'access', env.JWT_EXPIRES_IN_SECONDS, signJwt);

export const issueRefreshToken = async (
  identity: AuthorizedIdentity,
  signJwt: JwtSignFn,
) =>
  issueToken(identity, 'refresh', env.JWT_REFRESH_EXPIRES_IN_SECONDS, signJwt);

export const revokeRefreshToken = async (
  refreshToken: string,
  verifyJwt: JwtVerifyFn,
) => {
  const verified = await verifyJwt(refreshToken);
  const payload = parseTokenPayload(verified);
  if (!payload || payload.type !== 'refresh') return false;
  await markRefreshTokenRevoked(payload.jti, payload.exp);
  return true;
};

export const consumeRefreshToken = async (
  refreshToken: string,
  verifyJwt: JwtVerifyFn,
): Promise<AuthorizedIdentity | null> => {
  const verified = await verifyJwt(refreshToken);
  const payload = parseTokenPayload(verified);
  if (!payload || payload.type !== 'refresh') return null;
  if (await isRefreshTokenRevoked(payload.jti)) return null;
  await markRefreshTokenRevoked(payload.jti, payload.exp);
  return {
    role: payload.role,
    userId: payload.userId,
    account: payload.account,
  };
};

export const getAuthorizedRole = async (
  authorizationHeader: string | null,
  verifyJwt: JwtVerifyFn,
): Promise<AuthorizedRole | null> => {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;
  const verified = await verifyJwt(token);
  const payload = parseTokenPayload(verified);
  if (!payload || payload.type !== 'access') return null;
  return payload.role;
};

export const isAuthorizedToken = async (
  authorizationHeader: string | null,
  verifyJwt: JwtVerifyFn,
) => (await getAuthorizedRole(authorizationHeader, verifyJwt)) !== null;

export const getAuthorizedIdentity = async (
  authorizationHeader: string | null,
  verifyJwt: JwtVerifyFn,
): Promise<AuthorizedIdentity | null> => {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;
  const verified = await verifyJwt(token);
  const payload = parseTokenPayload(verified);
  if (!payload || payload.type !== 'access') return null;
  return {
    role: payload.role,
    userId: payload.userId,
    account: payload.account,
  };
};
