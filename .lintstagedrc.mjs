const OPENAPI_GENERATED_FILE = 'api/openapi.generated.json';

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,mts,cts,tsx,js,mjs,cjs}': ['oxfmt --write', 'oxlint'],
  '*.{json,jsonc}': (files) => {
    const targets = files.filter(
      (file) =>
        file !== OPENAPI_GENERATED_FILE &&
        !file.endsWith(`/${OPENAPI_GENERATED_FILE}`),
    );
    return targets.length > 0 ? [`oxfmt --write ${targets.join(' ')}`] : [];
  },
  '*.vue': ['prettier --write', 'oxlint'],
  '*.md': 'prettier --write',
};
