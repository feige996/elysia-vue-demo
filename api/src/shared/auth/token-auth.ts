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

const resolveStaticRole = (token: string): AuthorizedRole | null => {
    if (token === env.AUTH_ADMIN_TOKEN) return 'admin';
    if (token === env.AUTH_EDITOR_TOKEN) return 'editor';
    return null;
};

export const issueAuthToken = async (role: AuthorizedRole, signJwt?: JwtSignFn) => {
    if (env.AUTH_MODE === 'jwt') {
        if (!signJwt) throw new Error('JWT signer is required when AUTH_MODE=jwt');
        const now = Math.floor(Date.now() / 1000);
        return signJwt({
            role,
            iat: now,
            exp: now + env.JWT_EXPIRES_IN_SECONDS,
        });
    }
    return role === 'admin' ? env.AUTH_ADMIN_TOKEN : env.AUTH_EDITOR_TOKEN;
};

export const getAuthorizedRole = async (authorizationHeader: string | null, verifyJwt?: JwtVerifyFn): Promise<AuthorizedRole | null> => {
    const token = extractBearerToken(authorizationHeader);
    if (!token) return null;
    if (env.AUTH_MODE === 'jwt') {
        if (!verifyJwt) return null;
        const payload = await verifyJwt(token);
        if (!payload || typeof payload !== 'object') return null;
        const role = Reflect.get(payload, 'role');
        return role === 'admin' || role === 'editor' ? role : null;
    }
    return resolveStaticRole(token);
};

export const isAuthorizedToken = async (authorizationHeader: string | null, verifyJwt?: JwtVerifyFn) =>
    (await getAuthorizedRole(authorizationHeader, verifyJwt)) !== null;
