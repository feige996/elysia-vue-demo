type ViewLoader = () => Promise<unknown>;

const viewModules = import.meta.glob('../views/**/*.vue');

const normalizeViewKey = (modulePath: string) => {
  const match = modulePath.match(/\.\.\/views\/(.+)\.vue$/);
  return match ? match[1] : '';
};

const viewLoaderMap = new Map<string, ViewLoader>();

for (const [modulePath, loader] of Object.entries(viewModules)) {
  const viewKey = normalizeViewKey(modulePath);
  if (!viewKey) continue;
  viewLoaderMap.set(viewKey, loader as ViewLoader);
}

export const resolveViewLoaderByKey = (viewKey: string) => {
  return viewLoaderMap.get(viewKey);
};
