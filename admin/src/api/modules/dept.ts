import { apiClient } from '../request';

export type DeptNode = {
  id: number;
  parentId: number;
  name: string;
  code: string;
  sort: number;
  status: number;
  leader: string | null;
  phone: string | null;
  email: string | null;
  children: DeptNode[];
};

export type DeptPayload = {
  parentId?: number;
  name: string;
  code: string;
  sort?: number;
  status?: number;
  leader?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const getDeptTreeMethod = () =>
  apiClient.authRequest<DeptNode[]>('/api/depts/tree', {
    method: 'GET',
  });

export const createDeptMethod = (payload: DeptPayload) =>
  apiClient.authRequest<Omit<DeptNode, 'children'>>('/api/depts', {
    method: 'POST',
    body: payload,
  });

export const updateDeptMethod = (id: number, payload: DeptPayload) =>
  apiClient.authRequest<Omit<DeptNode, 'children'>>(`/api/depts/${id}`, {
    method: 'PUT',
    body: payload,
  });

export const toggleDeptMethod = (id: number, status: number) =>
  apiClient.authRequest<Omit<DeptNode, 'children'>>(`/api/depts/${id}/toggle`, {
    method: 'POST',
    body: { status },
  });

export const deleteDeptMethod = (id: number) =>
  apiClient.authRequest<{ deleted: number }>(`/api/depts/${id}`, {
    method: 'DELETE',
  });
