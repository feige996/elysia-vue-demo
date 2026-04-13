import { apiClient } from '../request';

export const getCurrentPermissionCodesMethod = () =>
  apiClient.authRequest<string[]>('/api/permissions/current', {
    method: 'GET',
  });
