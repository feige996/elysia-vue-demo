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
