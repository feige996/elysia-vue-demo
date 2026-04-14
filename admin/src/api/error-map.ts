import { ApiRequestError } from '../../../shared/request/eden';

const ERROR_MESSAGE_MAP: Record<number, string> = {
  400000: '请求参数有误，请检查后重试',
  400100: '提交数据校验失败，请检查输入项',
  401000: '登录状态已失效，请重新登录',
  401001: '账号或密码错误',
  403000: '当前账号无权限执行该操作',
  404000: '请求的资源不存在或已被删除',
  409000: '数据冲突，请刷新后重试',
  429000: '请求过于频繁，请稍后再试',
  500000: '服务暂时不可用，请稍后再试',
  503000: '服务暂不可用，请稍后再试',
};

export const getMappedErrorMessage = (
  error: unknown,
  fallbackMessage = '操作失败，请稍后重试',
) => {
  if (error instanceof ApiRequestError) {
    if (typeof error.code === 'number' && ERROR_MESSAGE_MAP[error.code]) {
      return ERROR_MESSAGE_MAP[error.code];
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
};
