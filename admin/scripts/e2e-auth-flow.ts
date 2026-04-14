const baseUrl =
  (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env?.E2E_API_BASE_URL || 'http://localhost:9000';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertNonEmptyString = (
  value: string | undefined,
  message: string,
): string => {
  assert(typeof value === 'string' && value.length > 0, message);
  return value as string;
};

const requestWithToken = async (
  token: string,
  path: string,
  options?: { method?: string; body?: unknown },
) => {
  return fetch(`${baseUrl}${path}`, {
    method: options?.method || 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
};

const main = async () => {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      account: 'admin',
      password: 'admin123',
    }),
  });
  assert(loginRes.ok, `login failed with status ${loginRes.status}`);
  const loginJson = (await loginRes.json()) as {
    code: number;
    data?: { accessToken?: string };
  };
  assert(loginJson.code === 0, 'login api code is not 0');
  const token = assertNonEmptyString(
    loginJson.data?.accessToken,
    'missing access token',
  );

  const permissionRes = await fetch(`${baseUrl}/api/permissions/current`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert(
    permissionRes.ok,
    `permissions failed with status ${permissionRes.status}`,
  );
  const permissionJson = (await permissionRes.json()) as {
    code: number;
    data?: string[];
  };
  assert(permissionJson.code === 0, 'permissions api code is not 0');
  assert(
    Array.isArray(permissionJson.data) &&
      permissionJson.data.includes('system:user:view'),
    'permissions does not include system:user:view',
  );

  const menuRes = await fetch(`${baseUrl}/api/menus/tree`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert(menuRes.ok, `menus failed with status ${menuRes.status}`);
  const menuJson = (await menuRes.json()) as {
    code: number;
    data?: Array<{ children: unknown[] }>;
  };
  assert(menuJson.code === 0, 'menus api code is not 0');
  assert(Array.isArray(menuJson.data), 'menu data is not an array');

  // role write smoke
  const suffix = Date.now();
  const roleCode = `e2e_role_${suffix}`;
  const roleCreateRes = await requestWithToken(token, '/api/roles', {
    method: 'POST',
    body: {
      code: roleCode,
      name: `E2E Role ${suffix}`,
      description: 'created by e2e',
    },
  });
  assert(
    roleCreateRes.status === 201,
    `create role failed with status ${roleCreateRes.status}`,
  );
  const roleCreateJson = (await roleCreateRes.json()) as {
    code: number;
    data?: { id: number };
  };
  assert(roleCreateJson.code === 0, 'create role api code is not 0');
  const roleId = roleCreateJson.data?.id;
  assert(typeof roleId === 'number' && roleId > 0, 'invalid created role id');

  const roleUpdateRes = await requestWithToken(token, `/api/roles/${roleId}`, {
    method: 'PUT',
    body: { name: `E2E Role Updated ${suffix}` },
  });
  assert(
    roleUpdateRes.ok,
    `update role failed with status ${roleUpdateRes.status}`,
  );

  const roleDisableRes = await requestWithToken(
    token,
    `/api/roles/${roleId}/status`,
    {
      method: 'PATCH',
      body: { status: 0 },
    },
  );
  assert(
    roleDisableRes.ok,
    `disable role failed with status ${roleDisableRes.status}`,
  );

  const roleEnableRes = await requestWithToken(
    token,
    `/api/roles/${roleId}/status`,
    {
      method: 'PATCH',
      body: { status: 1 },
    },
  );
  assert(
    roleEnableRes.ok,
    `enable role failed with status ${roleEnableRes.status}`,
  );

  const permissionsRes = await requestWithToken(token, '/api/permissions');
  assert(
    permissionsRes.ok,
    `get permissions list failed with status ${permissionsRes.status}`,
  );
  const permissionsJson = (await permissionsRes.json()) as {
    code: number;
    data?: Array<{ id: number }>;
  };
  assert(permissionsJson.code === 0, 'permissions list api code is not 0');
  const assignPermissionRes = await requestWithToken(
    token,
    `/api/roles/${roleId}/permissions`,
    {
      method: 'PUT',
      body: {
        permissionIds: permissionsJson.data?.slice(0, 2).map((x) => x.id) ?? [],
      },
    },
  );
  assert(
    assignPermissionRes.ok,
    `assign role permissions failed with status ${assignPermissionRes.status}`,
  );

  const menusRes = await requestWithToken(token, '/api/menus');
  assert(menusRes.ok, `get menus list failed with status ${menusRes.status}`);
  const menusJson = (await menusRes.json()) as {
    code: number;
    data?: Array<{ id: number }>;
  };
  assert(menusJson.code === 0, 'menus list api code is not 0');
  const assignMenuRes = await requestWithToken(
    token,
    `/api/roles/${roleId}/menus`,
    {
      method: 'PUT',
      body: { menuIds: menusJson.data?.slice(0, 2).map((x) => x.id) ?? [] },
    },
  );
  assert(
    assignMenuRes.ok,
    `assign role menus failed with status ${assignMenuRes.status}`,
  );

  // user write smoke
  const userAccount = `e2e_user_${suffix}`;
  const userCreateRes = await requestWithToken(token, '/api/users', {
    method: 'POST',
    body: {
      account: userAccount,
      name: `E2E User ${suffix}`,
      role: 'editor',
    },
  });
  assert(
    userCreateRes.status === 201,
    `create user failed with status ${userCreateRes.status}`,
  );
  const userCreateJson = (await userCreateRes.json()) as {
    code: number;
    data?: { id: number };
  };
  assert(userCreateJson.code === 0, 'create user api code is not 0');
  const userId = userCreateJson.data?.id;
  assert(typeof userId === 'number' && userId > 0, 'invalid created user id');

  const userUpdateRes = await requestWithToken(token, `/api/users/${userId}`, {
    method: 'PUT',
    body: {
      name: `E2E User Updated ${suffix}`,
      role: 'admin',
    },
  });
  assert(
    userUpdateRes.ok,
    `update user failed with status ${userUpdateRes.status}`,
  );

  const batchAccountA = `e2e_batch_a_${suffix}`;
  const batchAccountB = `e2e_batch_b_${suffix}`;
  const batchCreateARes = await requestWithToken(token, '/api/users', {
    method: 'POST',
    body: { account: batchAccountA, name: 'Batch A', role: 'editor' },
  });
  const batchCreateBRes = await requestWithToken(token, '/api/users', {
    method: 'POST',
    body: { account: batchAccountB, name: 'Batch B', role: 'editor' },
  });
  assert(batchCreateARes.status === 201, 'create batch user A failed');
  assert(batchCreateBRes.status === 201, 'create batch user B failed');
  const batchAJson = (await batchCreateARes.json()) as {
    code: number;
    data?: { id: number };
  };
  const batchBJson = (await batchCreateBRes.json()) as {
    code: number;
    data?: { id: number };
  };
  const batchIds = [batchAJson.data?.id, batchBJson.data?.id].filter(
    (id): id is number => typeof id === 'number',
  );
  assert(
    batchAJson.code === 0 && batchBJson.code === 0,
    'batch create api code error',
  );
  assert(batchIds.length === 2, 'invalid batch user ids');
  const batchDeleteRes = await requestWithToken(token, '/api/users', {
    method: 'DELETE',
    body: { ids: batchIds },
  });
  assert(
    batchDeleteRes.ok,
    `batch delete users failed with status ${batchDeleteRes.status}`,
  );

  const userDeleteRes = await requestWithToken(token, `/api/users/${userId}`, {
    method: 'DELETE',
  });
  assert(
    userDeleteRes.ok,
    `delete user failed with status ${userDeleteRes.status}`,
  );

  const roleDeleteRes = await requestWithToken(token, `/api/roles/${roleId}`, {
    method: 'DELETE',
  });
  assert(
    roleDeleteRes.ok,
    `delete role failed with status ${roleDeleteRes.status}`,
  );
  console.log('Admin auth + write smoke e2e flow passed');
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Admin auth e2e flow failed: ${message}`);
  throw error;
});
