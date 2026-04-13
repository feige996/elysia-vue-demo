import { apiClient } from '../request';
import type { UserEntity } from '../../../../api/src/shared/types/entities';

export type User = UserEntity;

export const getUsersMethod = (keyword?: string) =>
  apiClient.authRequest<User[]>('/api/users/all', {
    method: 'GET',
    query: keyword ? { keyword } : undefined,
  });
