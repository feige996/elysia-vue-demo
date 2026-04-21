import type { AppType } from '../../../api/src';
import { edenFetch } from '@elysiajs/eden';
import { ref } from 'vue';
import {
  ADMIN_REFRESH_TOKEN_KEY,
  ADMIN_TOKEN_KEY,
} from '../../../shared/auth/storage-keys';
import { createEdenRequestClient } from '../../../shared/request/eden';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const edenClient = createEdenRequestClient(
  {
    apiBaseUrl: API_BASE_URL,
    tokenKey: ADMIN_TOKEN_KEY, // admin_access_token
    refreshTokenKey: ADMIN_REFRESH_TOKEN_KEY, // admin_refresh_token
  },
  {
    createCaller: (origin) =>
      edenFetch<AppType>(origin) as unknown as (
        requestPath: string,
        requestOptions: {
          method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
          query?: Record<string, unknown>;
          body?: unknown;
          headers?: Record<string, string>;
        },
      ) => Promise<{ data?: unknown; error?: { value?: unknown } }>,
    createRef: ref,
  },
);

export type BackendAppType = AppType;

export type ApiResponse<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T;
};

export const apiClient = edenClient;

export const requestState = edenClient.requestState;

export const setAccessToken = edenClient.setAccessToken;
export const setRefreshToken = edenClient.setRefreshToken;
export const clearAccessToken = edenClient.clearAccessToken;
export const clearRefreshToken = edenClient.clearRefreshToken;
