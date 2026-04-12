import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rawName = Bun.argv[2]?.trim();
if (!rawName) {
    console.error('Usage: bun run module:create <module-name>');
    process.exit(1);
}

const moduleName = rawName.toLowerCase().replace(/[^a-z0-9-]/g, '');
if (!moduleName) {
    console.error('Invalid module name');
    process.exit(1);
}

const pascalName = moduleName
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const moduleDir = join(process.cwd(), 'src', 'modules', moduleName);
if (existsSync(moduleDir)) {
    console.error(`Module already exists: ${moduleName}`);
    process.exit(1);
}

mkdirSync(join(moduleDir, 'dto'), { recursive: true });

const files: Record<string, string> = {
    'index.ts': `export { ${moduleName}Module } from './${moduleName}.module';
export { ${pascalName}Repository } from './${moduleName}.repository';
export { create${pascalName}Controller } from './${moduleName}.controller';
`,
    [`${moduleName}.repository.ts`]: `export class ${pascalName}Repository {
    async findAll() {
        return [];
    }
}
`,
    [`${moduleName}.controller.ts`]: `import type { ${pascalName}Repository } from './${moduleName}.repository';
import { ok } from '../../shared/types/http';
import { ensureRequestContext } from '../../shared/types/request-context';

export const create${pascalName}Controller = (repository: ${pascalName}Repository) => ({
    list: async (request: Request) => {
        const { requestId } = ensureRequestContext(request);
        const list = await repository.findAll();
        return {
            status: 200,
            payload: ok(requestId, list, 'OK')
        };
    }
});
`,
    [`${moduleName}.module.ts`]: `import { Elysia } from 'elysia';
import type { ${pascalName}Repository } from './${moduleName}.repository';
import { create${pascalName}Controller } from './${moduleName}.controller';

export const ${moduleName}Module = new Elysia({ prefix: '/api' }).get('/${moduleName}', async (ctx) => {
    const { set } = ctx;
    const { ${moduleName}Repository } = ctx as typeof ctx & { ${moduleName}Repository: ${pascalName}Repository };
    const controller = create${pascalName}Controller(${moduleName}Repository);
    const response = await controller.list(ctx.request);
    set.status = response.status;
    return response.payload;
});
`,
    [`dto/${moduleName}.dto.ts`]: `import { z } from 'zod';

export const ${moduleName}QuerySchema = z.object({});
`
};

for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(join(moduleDir, fileName), content, 'utf8');
}

console.log(`Module created: src/modules/${moduleName}`);
