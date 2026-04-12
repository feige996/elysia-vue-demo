export const AppCode = {
  SUCCESS: 0,
  VALIDATION_ERROR: 400100,
  UNAUTHORIZED: 401000,
  INVALID_CREDENTIALS: 401001,
  INTERNAL_ERROR: 500000
} as const;

export type AppCodeValue = (typeof AppCode)[keyof typeof AppCode];

export type ApiResponse<T> = {
  code: AppCodeValue;
  message: string;
  requestId: string;
  data?: T;
};

export const ok = <T>(requestId: string, data: T, message = "OK"): ApiResponse<T> => ({
  code: AppCode.SUCCESS,
  message,
  requestId,
  data
});

export const fail = (requestId: string, code: AppCodeValue, message: string): ApiResponse<never> => ({
  code,
  message,
  requestId
});
