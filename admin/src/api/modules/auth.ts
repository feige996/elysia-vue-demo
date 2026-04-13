import { apiClient } from '../request';
import type { UserEntity } from '../../../../api/src/shared/types/entities';

export type LoginPayload = {
  account: string;
  password: string;
};

export type LoginUser = UserEntity;

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
};

export const loginMethod = async (payload: LoginPayload) => {
  return apiClient.request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
};
