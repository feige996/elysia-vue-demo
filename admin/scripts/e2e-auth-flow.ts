const baseUrl = process.env.E2E_API_BASE_URL || 'http://localhost:9000';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
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
  const token = loginJson.data?.accessToken;
  assert(typeof token === 'string' && token.length > 0, 'missing access token');

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
  console.log('Admin auth e2e flow passed');
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Admin auth e2e flow failed: ${message}`);
  process.exit(1);
});
