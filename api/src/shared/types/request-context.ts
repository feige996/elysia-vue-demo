type RequestContext = {
  requestId: string;
  requestStartedAt: number;
  authorizedRole?: string;
  authorizedUserId?: number;
  authorizedAccount?: string;
};

const requestContextMap = new WeakMap<Request, RequestContext>();

export const ensureRequestContext = (request: Request): RequestContext => {
  const existingContext = requestContextMap.get(request);
  if (existingContext) return existingContext;

  const createdContext: RequestContext = {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    requestStartedAt: Date.now(),
  };
  requestContextMap.set(request, createdContext);
  return createdContext;
};

export const setAuthorizedRoleInContext = (request: Request, role: string) => {
  const context = ensureRequestContext(request);
  context.authorizedRole = role;
};

export const setAuthorizedUserInContext = (
  request: Request,
  userId: number | undefined,
  account: string | undefined,
) => {
  const context = ensureRequestContext(request);
  context.authorizedUserId = userId;
  context.authorizedAccount = account;
};
