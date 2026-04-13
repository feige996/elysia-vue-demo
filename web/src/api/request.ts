import type { AppType } from '../../../api/src';
import { edenFetch } from '@elysiajs/eden';
import { ref } from 'vue';
import { createEdenRequestClient } from '../../../shared/request/eden';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:6000/api';
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const edenClient = createEdenRequestClient<AppType>(
  {
    apiBaseUrl: API_BASE_URL,
    tokenKey: TOKEN_KEY,
    refreshTokenKey: REFRESH_TOKEN_KEY,
  },
  {
    edenFetch: (origin) => edenFetch<AppType>(origin),
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

export const requestState = edenClient.requestState;

export const loginMethod = async (payload: LoginPayload) => {
  return edenClient.request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
};

export const getUsersMethod = (keyword?: string) =>
  edenClient.authRequest<User[]>('/api/users/all', {
    method: 'GET',
    query: keyword ? { keyword } : undefined,
  });

export const setAccessToken = edenClient.setAccessToken;
export const setRefreshToken = edenClient.setRefreshToken;
export const clearAccessToken = edenClient.clearAccessToken;
export const clearRefreshToken = edenClient.clearRefreshToken;
