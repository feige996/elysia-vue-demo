import { apiClient } from '../request';
import type { UserEntity } from '../../../../api/src/shared/types/entities';

export type User = UserEntity;

export type UserPageData = {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
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
