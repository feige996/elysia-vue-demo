import { apiClient } from '../request';

export type DictItem = {
  id: number;
  label: string;
  value: string;
  tagType: string | null;
  sort: number;
  status: number;
  isDefault: number;
  remark: string | null;
};

export type SystemConfig = {
  key: string;
  value: string | number | boolean | Record<string, unknown> | null;
  valueType: number;
  groupName: string | null;
  isPublic: number;
  remark: string | null;
};

export type DictType = {
  id: number;
  code: string;
  name: string;
  status: number;
  remark: string | null;
};

export type DictItemManagePayload = {
  dictTypeId: number;
  label: string;
  value: string;
  tagType?: string | null;
  sort?: number;
  status?: number;
  isDefault?: number;
  remark?: string | null;
};

export type DictTypePayload = {
  code: string;
  name: string;
  status?: number;
  remark?: string | null;
};

export const getDictItemsByCodeMethod = (code: string) =>
  apiClient.authRequest<DictItem[]>(
    `/api/dicts/${encodeURIComponent(code)}/items`,
    {
      method: 'GET',
    },
  );

export const getSystemConfigByKeyMethod = (key: string) =>
  apiClient.authRequest<SystemConfig>(
    `/api/configs/${encodeURIComponent(key)}`,
    {
      method: 'GET',
    },
  );

export const getDictTypesMethod = () =>
  apiClient.authRequest<DictType[]>('/api/dict-types', {
    method: 'GET',
  });

export const createDictTypeMethod = (payload: DictTypePayload) =>
  apiClient.authRequest<DictType>('/api/dict-types', {
    method: 'POST',
    body: payload,
  });

export const updateDictTypeMethod = (id: number, payload: DictTypePayload) =>
  apiClient.authRequest<DictType>(`/api/dict-types/${id}`, {
    method: 'PUT',
    body: payload,
  });

export const toggleDictTypeMethod = (id: number, status: number) =>
  apiClient.authRequest<DictType>(`/api/dict-types/${id}/toggle`, {
    method: 'POST',
    body: { status },
  });

export const deleteDictTypeMethod = (id: number) =>
  apiClient.authRequest<{ deleted: number }>(`/api/dict-types/${id}`, {
    method: 'DELETE',
  });

export const getDictItemsMethod = (dictTypeId?: number) =>
  apiClient.authRequest<Array<DictItem & { dictTypeId: number }>>(
    `/api/dict-items${dictTypeId ? `?dictTypeId=${dictTypeId}` : ''}`,
    {
      method: 'GET',
    },
  );

export const createDictItemMethod = (payload: DictItemManagePayload) =>
  apiClient.authRequest<DictItem & { dictTypeId: number }>('/api/dict-items', {
    method: 'POST',
    body: payload,
  });

export const updateDictItemMethod = (
  id: number,
  payload: DictItemManagePayload,
) =>
  apiClient.authRequest<DictItem & { dictTypeId: number }>(
    `/api/dict-items/${id}`,
    {
      method: 'PUT',
      body: payload,
    },
  );

export const toggleDictItemMethod = (id: number, status: number) =>
  apiClient.authRequest<DictItem & { dictTypeId: number }>(
    `/api/dict-items/${id}/toggle`,
    {
      method: 'POST',
      body: { status },
    },
  );

export const deleteDictItemMethod = (id: number) =>
  apiClient.authRequest<{ deleted: number }>(`/api/dict-items/${id}`, {
    method: 'DELETE',
  });
