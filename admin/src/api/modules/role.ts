import { apiClient } from '../request';

export type RoleRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: number;
};

export type CreateRolePayload = {
  code: string;
  name: string;
  description?: string | null;
  status?: number;
};

export type UpdateRolePayload = {
  code?: string;
  name?: string;
  description?: string | null;
};

export type PermissionOption = {
  id: number;
  code: string;
  name: string;
  module: string;
  status: number;
};

export type MenuOption = {
  id: number;
  parentId: number;
  name: string;
  path: string;
  status: number;
};

export const getRolesMethod = () =>
  apiClient.authRequest<RoleRow[]>('/api/roles', {
    method: 'GET',
  });

export const createRoleMethod = (payload: CreateRolePayload) =>
  apiClient.authRequest<RoleRow>('/api/roles', {
    method: 'POST',
    body: payload,
  });

export const updateRoleMethod = (id: number, payload: UpdateRolePayload) =>
  apiClient.authRequest<RoleRow>(`/api/roles/${id}`, {
    method: 'PUT',
    body: payload,
  });

export const updateRoleStatusMethod = (id: number, status: number) =>
  apiClient.authRequest<RoleRow>(`/api/roles/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });

export const deleteRoleMethod = (id: number) =>
  apiClient.authRequest<{ deleted: number }>(`/api/roles/${id}`, {
    method: 'DELETE',
  });

export const getPermissionsMethod = () =>
  apiClient.authRequest<PermissionOption[]>('/api/permissions', {
    method: 'GET',
  });

export const getMenusMethod = () =>
  apiClient.authRequest<MenuOption[]>('/api/menus', {
    method: 'GET',
  });

export const assignRolePermissionsMethod = (
  id: number,
  permissionIds: number[],
) =>
  apiClient.authRequest<{ roleId: number }>(`/api/roles/${id}/permissions`, {
    method: 'PUT',
    body: { permissionIds },
  });

export const assignRoleMenusMethod = (id: number, menuIds: number[]) =>
  apiClient.authRequest<{ roleId: number }>(`/api/roles/${id}/menus`, {
    method: 'PUT',
    body: { menuIds },
  });
