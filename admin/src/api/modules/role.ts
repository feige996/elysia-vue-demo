import { apiClient } from '../request';

export type RoleRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: number;
};

export const getRolesMethod = () =>
  apiClient.authRequest<RoleRow[]>('/api/roles', {
    method: 'GET',
  });
