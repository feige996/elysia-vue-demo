import { apiClient } from '../request';
import type { MenuTreeEntity } from '../../../../api/src/shared/types/entities';

export const getCurrentMenuTreeMethod = () =>
  apiClient.authRequest<MenuTreeEntity[]>('/api/menus/tree', {
    method: 'GET',
  });
