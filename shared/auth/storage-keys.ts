// Browser localStorage keys for web app token persistence.
export const WEB_TOKEN_KEY = 'access_token';
export const WEB_REFRESH_TOKEN_KEY = 'refresh_token';

// Browser localStorage keys for admin app token persistence.
// Keep them separate from web keys to avoid login state collisions.
export const ADMIN_TOKEN_KEY = 'admin_access_token';
export const ADMIN_REFRESH_TOKEN_KEY = 'admin_refresh_token';
