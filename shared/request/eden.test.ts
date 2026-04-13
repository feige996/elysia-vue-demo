import { describe, expect, it } from 'bun:test';
import { createEdenRequestClient } from './eden';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const installLocalStorage = () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  return storage;
};

describe('createEdenRequestClient', () => {
  it('retries auth request after refresh token rotation', async () => {
    const calls: Array<{ path: string; auth?: string }> = [];
    const storage = installLocalStorage();
    storage.setItem('access_token', 'expired-token');
    storage.setItem('refresh_token', 'refresh-old');

    const client = createEdenRequestClient(
      {
        apiBaseUrl: 'http://localhost:6000',
        tokenKey: 'access_token',
        refreshTokenKey: 'refresh_token',
      },
      {
        createRef: (value) => ({ value }),
        createCaller: () => async (path, options) => {
          calls.push({ path, auth: options.headers?.Authorization });
          if (path === '/api/users/all' && options.headers?.Authorization === 'Bearer expired-token') {
            return { error: { value: { message: 'Unauthorized' } } };
          }
          if (path === '/api/auth/refresh') {
            expect(options.body).toEqual({ refreshToken: 'refresh-old' });
            return {
              data: {
                code: 0,
                message: 'OK',
                requestId: 'r1',
                data: {
                  accessToken: 'access-new',
                  refreshToken: 'refresh-new',
                },
              },
            };
          }
          if (path === '/api/users/all' && options.headers?.Authorization === 'Bearer access-new') {
            return {
              data: {
                code: 0,
                message: 'OK',
                requestId: 'r2',
                data: [{ id: 1 }],
              },
            };
          }
          return { error: { value: { message: 'unexpected path' } } };
        },
      },
    );

    const result = await client.authRequest<Array<{ id: number }>>('/api/users/all', {
      method: 'GET',
    });

    expect(result.data).toEqual([{ id: 1 }]);
    expect(storage.getItem('access_token')).toBe('access-new');
    expect(storage.getItem('refresh_token')).toBe('refresh-new');
    expect(calls.map((item) => item.path)).toEqual([
      '/api/users/all',
      '/api/auth/refresh',
      '/api/users/all',
    ]);
  });

  it('normalizes error message from eden error payload', async () => {
    installLocalStorage();
    const client = createEdenRequestClient(
      {
        apiBaseUrl: 'http://localhost:6000',
        tokenKey: 'access_token',
        refreshTokenKey: 'refresh_token',
      },
      {
        createRef: (value) => ({ value }),
        createCaller: () => async () => ({ error: { value: { message: 'Network down' } } }),
      },
    );

    await expect(client.request('/api/articles/all', { method: 'GET' })).rejects.toThrow('Network down');
  });
});
