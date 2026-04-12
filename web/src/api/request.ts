import { createAlova } from 'alova';
import { useRequest } from 'alova/client';
import adapterFetch from 'alova/fetch';
import VueHook from 'alova/vue';
import type { AppType } from '../../../api/src';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export type BackendAppType = AppType;

export type ApiResponse<T> = {
    code: number;
    message: string;
    requestId: string;
    data: T;
};

export type User = {
    id: number;
    account: string;
    name: string;
    role: 'admin' | 'editor';
};

export type LoginPayload = {
    account: string;
    password: string;
};

export type LoginResult = {
    accessToken: string;
    refreshToken: string;
    user: User;
};

type RefreshResult = {
    accessToken: string;
    refreshToken: string;
};

let refreshingPromise: Promise<string | null> | null = null;

const isAuthPath = (path: string) => path.includes('/auth/login') || path.includes('/auth/refresh') || path.includes('/auth/logout');

const requestRefreshToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const json = (await response.json()) as ApiResponse<RefreshResult>;
        if (json.code !== 0 || !json.data?.accessToken || !json.data?.refreshToken) return null;
        setAccessToken(json.data.accessToken);
        setRefreshToken(json.data.refreshToken);
        return json.data.accessToken;
    } catch {
        return null;
    }
};

const ensureRefreshedToken = async () => {
    if (!refreshingPromise) {
        refreshingPromise = requestRefreshToken().finally(() => {
            refreshingPromise = null;
        });
    }
    return refreshingPromise;
};

export const alovaInstance = createAlova({
    baseURL: API_BASE_URL,
    statesHook: VueHook,
    requestAdapter: adapterFetch(),
    timeout: 10_000,
    beforeRequest(method) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        method.config.headers = {
            ...method.config.headers,
            Authorization: `Bearer ${token}`,
        };
    },
    responded: {
        async onSuccess(response, method) {
            const currentUrl = String((method as { url?: string })?.url ?? '');
            const isRetried = String((method as { config?: { headers?: Record<string, string> } })?.config?.headers?.['x-auth-retried'] ?? '') === '1';
            if (response.status === 401 && !isAuthPath(currentUrl) && !isRetried) {
                const refreshedToken = await ensureRefreshedToken();
                if (refreshedToken) {
                    const retryMethod = method as {
                        config?: { headers?: Record<string, string> };
                        send: () => Promise<ApiResponse<unknown>>;
                    };
                    retryMethod.config = {
                        ...retryMethod.config,
                        headers: {
                            ...(retryMethod.config?.headers ?? {}),
                            Authorization: `Bearer ${refreshedToken}`,
                            'x-auth-retried': '1',
                        },
                    };
                    return retryMethod.send();
                }
                clearAccessToken();
                clearRefreshToken();
                throw new Error('Unauthorized');
            }
            const json = (await response.json()) as ApiResponse<unknown>;
            if (json.code !== 0) {
                throw new Error(json.message || 'Request failed');
            }
            return json;
        },
    },
});

export const requestState = {
    useRequest,
};

export const loginMethod = (payload: LoginPayload) => alovaInstance.Post<ApiResponse<LoginResult>>('/auth/login', payload);

export const getUsersMethod = (keyword?: string) =>
    alovaInstance.Get<ApiResponse<User[]>>('/users/all', {
        params: keyword ? { keyword } : undefined,
    });

export const setAccessToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const setRefreshToken = (token: string) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearAccessToken = () => {
    localStorage.removeItem(TOKEN_KEY);
};

export const clearRefreshToken = () => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};
