import { randomUUID } from 'node:crypto';
import { env } from '../config/env';

const TOKEN_PREFIX = 'Bearer ';

export type AuthorizedRole = 'admin' | 'editor';
type TokenType = 'access' | 'refresh';

type JwtSignFn = (payload: Record<string, unknown>) => Promise<string>;
type JwtVerifyFn = (token: string) => Promise<unknown>;

type TokenPayload = {
    role: AuthorizedRole;
    type: TokenType;
    jti: string;
    iat: number;
    exp: number;
};

const revokedRefreshTokenIds = new Set<string>();

const extractBearerToken = (authorizationHeader: string | null) => {
    if (!authorizationHeader) return null;
    if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return null;
    return authorizationHeader.slice(TOKEN_PREFIX.length);
};

const isRole = (value: unknown): value is AuthorizedRole => value === 'admin' || value === 'editor';
const isTokenType = (value: unknown): value is TokenType => value === 'access' || value === 'refresh';

const parseTokenPayload = (payload: unknown): TokenPayload | null => {
    if (!payload || typeof payload !== 'object') return null;
    const role = Reflect.get(payload, 'role');
    const type = Reflect.get(payload, 'type');
    const jti = Reflect.get(payload, 'jti');
    const iat = Reflect.get(payload, 'iat');
    const exp = Reflect.get(payload, 'exp');
    if (!isRole(role) || !isTokenType(type) || typeof jti !== 'string') return null;
    if (typeof iat !== 'number' || typeof exp !== 'number') return null;
    return { role, type, jti, iat, exp };
};

const issueToken = async (role: AuthorizedRole, type: TokenType, expiresInSeconds: number, signJwt: JwtSignFn) => {
    const now = Math.floor(Date.now() / 1000);
    return signJwt({
        role,
        type,
        jti: randomUUID(),
        iat: now,
        exp: now + expiresInSeconds
    });
};

export const issueAccessToken = async (role: AuthorizedRole, signJwt: JwtSignFn) => issueToken(role, 'access', env.JWT_EXPIRES_IN_SECONDS, signJwt);

export const issueRefreshToken = async (role: AuthorizedRole, signJwt: JwtSignFn) =>
    issueToken(role, 'refresh', env.JWT_REFRESH_EXPIRES_IN_SECONDS, signJwt);

export const revokeRefreshToken = async (refreshToken: string, verifyJwt: JwtVerifyFn) => {
    const verified = await verifyJwt(refreshToken);
    const payload = parseTokenPayload(verified);
    if (!payload || payload.type !== 'refresh') return false;
    revokedRefreshTokenIds.add(payload.jti);
    return true;
};

export const consumeRefreshToken = async (refreshToken: string, verifyJwt: JwtVerifyFn): Promise<AuthorizedRole | null> => {
    const verified = await verifyJwt(refreshToken);
    const payload = parseTokenPayload(verified);
    if (!payload || payload.type !== 'refresh') return null;
    if (revokedRefreshTokenIds.has(payload.jti)) return null;
    revokedRefreshTokenIds.add(payload.jti);
    return payload.role;
};

export const getAuthorizedRole = async (authorizationHeader: string | null, verifyJwt: JwtVerifyFn): Promise<AuthorizedRole | null> => {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;
    const verified = await verifyJwt(token);
    const payload = parseTokenPayload(verified);
    if (!payload || payload.type !== 'access') return null;
    return payload.role;
};

export const isAuthorizedToken = async (authorizationHeader: string | null, verifyJwt: JwtVerifyFn) =>
    (await getAuthorizedRole(authorizationHeader, verifyJwt)) !== null;
