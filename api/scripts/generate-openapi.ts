import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ensureEnv = () => {
  process.env.NODE_ENV ??= 'development';
  process.env.API_PORT ??= '6000';
  process.env.JWT_SECRET ??= 'openapi-generate-only-secret';
  process.env.DATABASE_URL ??=
    'postgres://postgres:postgres@localhost:5432/elysia_demo';
};

const generate = async () => {
  ensureEnv();

  const { app } = await import('../src/app/index');
  const response = await app.handle(
    new Request(`http://localhost:${process.env.API_PORT}/openapi.json`),
  );

  if (!response.ok) {
    throw new Error(`Failed to generate OpenAPI: HTTP ${response.status}`);
  }

  const spec = await response.json();
  writeFileSync(
    resolve(process.cwd(), 'openapi.generated.json'),
    JSON.stringify(spec, null, 2),
    'utf8',
  );
  console.log('Generated: api/openapi.generated.json');
};

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
