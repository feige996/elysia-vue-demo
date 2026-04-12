import { env } from '../config/env';

const TOKEN_PREFIX = 'Bearer ';

export type AuthorizedRole = 'admin' | 'editor';

const base64UrlEncode = (text: string) => Buffer.from(text).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const base64UrlDecode = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
};

const sign = async (content: string) => {
    const secret = env.JWT_SECRET ?? '';
    const key = await crypto.subtle.importKey('raw', Buffer.from(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, Buffer.from(content));
    return Buffer.from(signatureBuffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const verify = async (content: string, signature: string) => {
    const expectedSignature = await sign(content);
    return expectedSignature === signature;
};

const issueJwtToken = async (role: AuthorizedRole) => {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = base64UrlEncode(
        JSON.stringify({
            role,
            iat: now,
            exp: now + env.JWT_EXPIRES_IN_SECONDS,
        }),
    );
    const unsigned = `${header}.${payload}`;
    const signature = await sign(unsigned);
    return `${unsigned}.${signature}`;
};

const verifyJwtRole = async (token: string): Promise<AuthorizedRole | null> => {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const valid = await verify(`${header}.${payload}`, signature);
    if (!valid) return null;
    try {
        const body = JSON.parse(base64UrlDecode(payload)) as { role?: string; exp?: number };
        if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) return null;
        if (body.role === 'admin' || body.role === 'editor') return body.role;
    } catch {
        return null;
    }
    return null;
};

export const issueAuthToken = async (role: AuthorizedRole) => {
    if (env.AUTH_MODE === 'jwt') return issueJwtToken(role);
    return role === 'admin' ? env.AUTH_ADMIN_TOKEN : env.AUTH_EDITOR_TOKEN;
};

export const getAuthorizedRole = async (authorizationHeader: string | null): Promise<AuthorizedRole | null> => {
    if (!authorizationHeader) return null;
    if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return null;
    const token = authorizationHeader.slice(TOKEN_PREFIX.length);
    if (env.AUTH_MODE === 'jwt') return verifyJwtRole(token);
    if (token === env.AUTH_ADMIN_TOKEN) return 'admin';
    if (token === env.AUTH_EDITOR_TOKEN) return 'editor';
    return null;
};

export const isAuthorizedToken = async (authorizationHeader: string | null) => (await getAuthorizedRole(authorizationHeader)) !== null;
