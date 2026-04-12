import { env } from '../config/env';

const TOKEN_PREFIX = 'Bearer ';

export type AuthorizedRole = 'admin' | 'editor';

type JwtSignFn = (payload: Record<string, unknown>) => Promise<string>;
type JwtVerifyFn = (token: string) => Promise<unknown>;

const extractBearerToken = (authorizationHeader: string | null) => {
    if (!authorizationHeader) return null;
    if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return null;
    return authorizationHeader.slice(TOKEN_PREFIX.length);
};

export const issueAuthToken = async (role: AuthorizedRole, signJwt: JwtSignFn) => {
    const now = Math.floor(Date.now() / 1000);
    return signJwt({
        role,
        iat: now,
        exp: now + env.JWT_EXPIRES_IN_SECONDS,
    });
};

export const getAuthorizedRole = async (authorizationHeader: string | null, verifyJwt: JwtVerifyFn): Promise<AuthorizedRole | null> => {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;
    const payload = await verifyJwt(token);
    if (!payload || typeof payload !== 'object') return null;
    const role = Reflect.get(payload, 'role');
    return role === 'admin' || role === 'editor' ? role : null;
};

export const isAuthorizedToken = async (authorizationHeader: string | null, verifyJwt: JwtVerifyFn) =>
    (await getAuthorizedRole(authorizationHeader, verifyJwt)) !== null;
