export const AppCode = {
    SUCCESS: 0,
    VALIDATION_ERROR: 400100,
    UNAUTHORIZED: 401000,
    INVALID_CREDENTIALS: 401001,
    INTERNAL_ERROR: 500000,
} as const;

export type AppCodeValue = (typeof AppCode)[keyof typeof AppCode];
export type ErrorCodeKey = Exclude<keyof typeof AppCode, 'SUCCESS'>;
export const ErrorKey: Record<ErrorCodeKey, ErrorCodeKey> = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
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

export const ok = <T>(requestId: string, data: T, message = 'OK'): ApiResponse<T> => ({
    code: AppCode.SUCCESS,
    message,
    requestId,
    data,
});

export const fail = (requestId: string, code: AppCodeValue, message: string): ApiResponse<never> => ({
    code,
    message,
    requestId,
});

export const ErrorCatalog: Record<ErrorCodeKey, { code: AppCodeValue; status: number; message: string }> = {
    VALIDATION_ERROR: { code: AppCode.VALIDATION_ERROR, status: 400, message: 'Validation failed' },
    UNAUTHORIZED: { code: AppCode.UNAUTHORIZED, status: 401, message: 'Unauthorized' },
    INVALID_CREDENTIALS: { code: AppCode.INVALID_CREDENTIALS, status: 401, message: 'Invalid account or password' },
    INTERNAL_ERROR: { code: AppCode.INTERNAL_ERROR, status: 500, message: 'Internal Server Error' },
};

export const failByKey = (requestId: string, key: ErrorCodeKey, message?: string) => {
    const definition = ErrorCatalog[key];
    return {
        status: definition.status,
        payload: fail(requestId, definition.code, message ?? definition.message),
    };
};
