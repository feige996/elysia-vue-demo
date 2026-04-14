import { apiClient } from '../request';
import type { UserEntity } from '../../../../api/src/shared/types/entities';

export type User = UserEntity;

export type UserPageData = {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
};

export type SaveUserPayload = {
  account: string;
  name: string;
  role: string;
};

export const getUsersPageMethod = (params: {
  page: number;
  pageSize: number;
  keyword?: string;
}) =>
  apiClient.authRequest<UserPageData>('/api/users', {
    method: 'GET',
    query: params,
  });

export const createUserMethod = (payload: SaveUserPayload) =>
  apiClient.authRequest<User>('/api/users', {
    method: 'POST',
    body: payload,
  });

export const updateUserMethod = (
  id: number,
  payload: Partial<SaveUserPayload>,
) =>
  apiClient.authRequest<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: payload,
  });

export const deleteUserMethod = (id: number) =>
  apiClient.authRequest<{ deleted: number }>(`/api/users/${id}`, {
    method: 'DELETE',
  });

export const batchDeleteUsersMethod = (ids: number[]) =>
  apiClient.authRequest<{ deleted: number }>('/api/users', {
    method: 'DELETE',
    body: { ids },
  });
