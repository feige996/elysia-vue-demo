import type { AppType } from '../../../api/src';
import { edenFetch } from '@elysiajs/eden';
import { ref } from 'vue';
import {
  WEB_REFRESH_TOKEN_KEY,
  WEB_TOKEN_KEY,
} from '../../../shared/auth/storage-keys';
import { createEdenRequestClient } from '../../../shared/request/eden';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:6000';
const edenClient = createEdenRequestClient(
  {
    apiBaseUrl: API_BASE_URL,
    tokenKey: WEB_TOKEN_KEY, // access_token
    refreshTokenKey: WEB_REFRESH_TOKEN_KEY, // refresh_token
  },
  {
    createCaller: (origin) =>
      edenFetch<AppType>(origin) as unknown as (
        requestPath: string,
        requestOptions: {
          method: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
