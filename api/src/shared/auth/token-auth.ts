const TOKEN_PREFIX = 'Bearer ';
const DEMO_TOKEN = 'demo-token';

export const isAuthorizedToken = (authorizationHeader: string | null) => {
    if (!authorizationHeader) return false;
    if (!authorizationHeader.startsWith(TOKEN_PREFIX)) return false;
    return authorizationHeader.slice(TOKEN_PREFIX.length) === DEMO_TOKEN;
};
