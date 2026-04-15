import { articleModule } from '../modules/article';
import { fileModule } from '../modules/file';
import { monitorModule } from '../modules/monitor';
import { systemModule } from '../modules/system';
import { userModule } from '../modules/user';
import type { features } from '../shared/config/env';

export type FeatureFlags = typeof features;

export type AppModuleDef = {
  id: string;
  enabled: (flags: FeatureFlags) => boolean;
  mount: (app: any) => any;
};

export const appModuleDefs: AppModuleDef[] = [
  {
    id: 'user',
    enabled: () => true,
    mount: (app) => app.use(userModule),
  },
  {
    id: 'article',
    enabled: () => true,
    mount: (app) => app.use(articleModule),
  },
  {
    id: 'file',
    enabled: () => true,
    mount: (app) => app.use(fileModule),
  },
  {
    id: 'system',
    enabled: () => true,
    mount: (app) => app.use(systemModule),
  },
  {
    id: 'monitor',
    enabled: (flags) => flags.monitor,
    mount: (app) => app.use(monitorModule),
  },
];

export const resolveEnabledModuleIds = (
  defs: AppModuleDef[],
  flags: FeatureFlags,
) => defs.filter((item) => item.enabled(flags)).map((item) => item.id);

export const registerModules = <TApp>(
  app: TApp,
  defs: AppModuleDef[],
  flags: FeatureFlags,
) => {
  const enabledModuleIds: string[] = [];
  let currentApp: unknown = app;

  for (const moduleDef of defs) {
    if (!moduleDef.enabled(flags)) {
      continue;
    }
    currentApp = moduleDef.mount(currentApp);
    enabledModuleIds.push(moduleDef.id);
  }

  return {
    app: currentApp as TApp,
    enabledModuleIds,
  };
};
