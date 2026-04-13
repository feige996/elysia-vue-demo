type RequestContext = {
  requestId: string;
  requestStartedAt: number;
  authorizedRole?: 'admin' | 'editor';
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

export const setAuthorizedRoleInContext = (
  request: Request,
  role: 'admin' | 'editor',
) => {
  const context = ensureRequestContext(request);
  context.authorizedRole = role;
};
