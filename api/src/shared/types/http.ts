export const AppCode = {
  SUCCESS: 0,
  BAD_REQUEST: 400000,
  VALIDATION_ERROR: 400100,
  UNAUTHORIZED: 401000,
  FORBIDDEN: 403000,
  NOT_FOUND: 404000,
  CONFLICT: 409000,
  INVALID_CREDENTIALS: 401001,
  RATE_LIMITED: 429000,
  SERVICE_UNAVAILABLE: 503000,
  INTERNAL_ERROR: 500000,
} as const;

export type AppCodeValue = (typeof AppCode)[keyof typeof AppCode];
export type ErrorCodeKey = Exclude<keyof typeof AppCode, 'SUCCESS'>;
export const ErrorKey: Record<ErrorCodeKey, ErrorCodeKey> = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export type ApiResponse<T> = {
  code: AppCodeValue;
  message: string;
  requestId: string;
  data?: T;
};

export type PaginatedData<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const ok = <T>(
  requestId: string,
  data: T,
  message = 'OK',
): ApiResponse<T> => ({
  code: AppCode.SUCCESS,
  message,
  requestId,
  data,
});

export const fail = (
  requestId: string,
  code: AppCodeValue,
  message: string,
): ApiResponse<never> => ({
  code,
  message,
  requestId,
});

export const ErrorCatalog: Record<
  ErrorCodeKey,
  { code: AppCodeValue; status: number; message: string }
> = {
  BAD_REQUEST: {
    code: AppCode.BAD_REQUEST,
    status: 400,
    message: 'Bad request',
  },
  VALIDATION_ERROR: {
    code: AppCode.VALIDATION_ERROR,
    status: 400,
    message: 'Validation failed',
  },
  UNAUTHORIZED: {
    code: AppCode.UNAUTHORIZED,
    status: 401,
    message: 'Unauthorized',
  },
  FORBIDDEN: { code: AppCode.FORBIDDEN, status: 403, message: 'Forbidden' },
  NOT_FOUND: { code: AppCode.NOT_FOUND, status: 404, message: 'Not found' },
  CONFLICT: { code: AppCode.CONFLICT, status: 409, message: 'Conflict' },
  INVALID_CREDENTIALS: {
    code: AppCode.INVALID_CREDENTIALS,
    status: 401,
    message: 'Invalid account or password',
  },
  RATE_LIMITED: {
    code: AppCode.RATE_LIMITED,
    status: 429,
    message: 'Too many requests, please try again later',
  },
  SERVICE_UNAVAILABLE: {
    code: AppCode.SERVICE_UNAVAILABLE,
    status: 503,
    message: 'Service unavailable',
  },
  INTERNAL_ERROR: {
    code: AppCode.INTERNAL_ERROR,
    status: 500,
    message: 'Internal Server Error',
  },
};

export const failByKey = (
  requestId: string,
  key: ErrorCodeKey,
  message?: string,
) => {
  const definition = ErrorCatalog[key];
  return {
    status: definition.status,
    payload: fail(requestId, definition.code, message ?? definition.message),
  };
};
