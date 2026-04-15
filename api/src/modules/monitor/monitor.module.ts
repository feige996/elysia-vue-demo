import { Elysia } from 'elysia';
import { features } from '../../shared/config/env';
import { ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

export const monitorModule = new Elysia({
  prefix: '/api',
  detail: {
    tags: ['Monitor'],
  },
}).get(
  '/monitor/features',
  ({ request }) => {
    const { requestId } = ensureRequestContext(request);
    return ok(
      requestId,
      {
        enabled: true,
        features,
      },
      'OK',
    );
  },
  {
    detail: {
      summary: '查询当前功能开关状态',
      description: '需要登录，返回后端 feature flags 的当前启用状态。',
      security: [{ bearerAuth: [] }],
    },
  },
);
