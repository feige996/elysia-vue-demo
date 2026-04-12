import { env } from '../config/env';

const TOKEN_PREFIX = 'Bearer ';

export type AuthorizedRole = 'admin' | 'editor';

export const getAuthorizedRole = (authorizationHeader: string | null): AuthorizedRole | null => {
    if (!authorizationHeader) return null;
    if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return null;
    const token = authorizationHeader.slice(TOKEN_PREFIX.length);
    if (token === env.AUTH_ADMIN_TOKEN) return 'admin';
    if (token === env.AUTH_EDITOR_TOKEN) return 'editor';
    return null;
};

export const isAuthorizedToken = (authorizationHeader: string | null) => getAuthorizedRole(authorizationHeader) !== null;
