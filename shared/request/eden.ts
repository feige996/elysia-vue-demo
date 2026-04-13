type EdenResult = {
  data?: unknown;
  error?: { value?: unknown };
};

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiResponse<T> = {
  code: number;
  message: string;
  requestId: string;
  data: T;
};

type EdenClientConfig = {
  apiBaseUrl: string;
  tokenKey: string;
  refreshTokenKey: string;
};

type EdenCaller = (
  requestPath: string,
  requestOptions: RequestOptions,
) => Promise<EdenResult>;

type EdenClientDeps = {
  createCaller: (origin: string) => EdenCaller;
  createRef: (value: boolean) => any;
};

export const createEdenRequestClient = (
  config: EdenClientConfig,
  deps: EdenClientDeps,
) => {
  const normalizedBaseUrl = config.apiBaseUrl.replace(/\/$/, '');
  const apiOrigin = normalizedBaseUrl.replace(/\/api\/?$/, '');
  const eden = deps.createCaller(apiOrigin);
  let refreshingPromise: Promise<string | null> | null = null;

  const requestByEden = async (
    path: string,
    options: RequestOptions,
  ): Promise<EdenResult> => {
    return eden(path, options);
  };

  const toErrorMessage = (payload: unknown) => {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }
    return 'Request failed';
  };

  const setAccessToken = (token: string) => {
    localStorage.setItem(config.tokenKey, token);
  };

  const setRefreshToken = (token: string) => {
    localStorage.setItem(config.refreshTokenKey, token);
  };

  const clearAccessToken = () => {
    localStorage.removeItem(config.tokenKey);
  };

  const clearRefreshToken = () => {
    localStorage.removeItem(config.refreshTokenKey);
  };

  const parseResponse = <T>(response: EdenResult): ApiResponse<T> => {
    if (response.error) {
      throw new Error(toErrorMessage(response.error.value));
    }
    const payload = response.data as ApiResponse<T>;
    if (payload.code !== 0) {
      throw new Error(payload.message || 'Request failed');
    }
    return payload;
  };

  const requestRefreshToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(config.refreshTokenKey);
    if (!refreshToken) return null;
    const response = await requestByEden('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    if (response.error) return null;
    const payload = response.data as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (
      payload.code !== 0 ||
      !payload.data?.accessToken ||
      !payload.data?.refreshToken
    ) {
      return null;
    }
    setAccessToken(payload.data.accessToken);
    setRefreshToken(payload.data.refreshToken);
    return payload.data.accessToken;
  };

  const ensureRefreshedToken = async () => {
    if (!refreshingPromise) {
      refreshingPromise = requestRefreshToken().finally(() => {
        refreshingPromise = null;
      });
    }
    return refreshingPromise;
  };

  const request = async <T>(path: string, options: RequestOptions) => {
    const response = await requestByEden(path, options);
    return parseResponse<T>(response);
  };

  const authRequest = async <T>(path: string, options: RequestOptions) => {
    const execute = (token: string | null) =>
      requestByEden(path, {
        ...options,
        headers: token
          ? {
              ...(options.headers ?? {}),
              Authorization: `Bearer ${token}`,
            }
          : options.headers,
      });

    let response = await execute(localStorage.getItem(config.tokenKey));
    if (response.error) {
      const refreshedToken = await ensureRefreshedToken();
      if (refreshedToken) {
        response = await execute(refreshedToken);
      }
    }

    if (response.error) {
      clearAccessToken();
      clearRefreshToken();
      throw new Error(toErrorMessage(response.error.value));
    }

    return parseResponse<T>(response);
  };

  const requestState = {
    useRequest: <TParam, TResult>(
      requestFactory: (payload: TParam) => Promise<TResult>,
      options?: { immediate?: boolean },
    ) => {
      const loading = deps.createRef(false);
      const send = async (payload?: TParam) => {
        loading.value = true;
        try {
          return await requestFactory(payload as TParam);
        } finally {
          loading.value = false;
        }
      };
      if (options?.immediate) {
        void send(undefined as TParam);
      }
      return { loading, send };
    },
  };

  return {
    request,
    authRequest,
    requestState,
    setAccessToken,
    setRefreshToken,
    clearAccessToken,
    clearRefreshToken,
  };
};
