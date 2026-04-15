import { apiClient } from '../request';
import type { UserEntity } from '../../../../api/src/shared/types/entities';

export type LoginPayload = {
  account: string;
  password: string;
};

export type RegisterPayload = {
  account: string;
  password: string;
  name: string;
};

export type ForgotPasswordPayload = {
  account: string;
  channel: 'email' | 'sms';
};

export type ResetPasswordPayload = {
  account: string;
  channel: 'email' | 'sms';
  verifyCode: string;
  newPassword: string;
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

export const registerMethod = async (payload: RegisterPayload) => {
  return apiClient.request<LoginUser>('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
};

export const forgotPasswordMethod = async (payload: ForgotPasswordPayload) => {
  return apiClient.request<{
    sent: boolean;
    channel: 'email' | 'sms';
    maskedTarget: string;
  }>('/api/auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
};

export const resetPasswordMethod = async (payload: ResetPasswordPayload) => {
  return apiClient.request<{ updated: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: payload,
  });
};

export type UserProfile = {
  id: number;
  account: string;
  name: string;
  role: string | null;
  email: string | null;
  mobile: string | null;
  avatarUrl: string | null;
};

export const getProfileMethod = async () => {
  return apiClient.request<UserProfile>('/api/auth/profile', {
    method: 'GET',
  });
};

export const updateProfileMethod = async (payload: Partial<UserProfile>) => {
  return apiClient.request<UserProfile>('/api/auth/profile', {
    method: 'PUT',
    body: payload,
  });
};

export const updateCurrentPasswordMethod = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  return apiClient.request<{ updated: boolean }>('/api/auth/password', {
    method: 'PUT',
    body: payload,
  });
};
