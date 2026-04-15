import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import type { AppModuleDef } from '../../src/app/module-registry';
import {
  appModuleDefs,
  registerModules,
  resolveEnabledModuleIds,
} from '../../src/app/module-registry';
import { features } from '../../src/shared/config/env';

describe('module registry', () => {
  const defs: AppModuleDef[] = [
    {
      id: 'base',
      enabled: () => true,
      mount: (app) => app.get('/base', () => 'base'),
    },
    {
      id: 'queue',
      enabled: (flags) => flags.queue,
      mount: (app) => app.get('/queue', () => 'queue'),
    },
  ];

  it('returns enabled module ids from feature flags', () => {
    const disabledIds = resolveEnabledModuleIds(defs, {
      ...features,
      queue: false,
    });
    const enabledIds = resolveEnabledModuleIds(defs, {
      ...features,
      queue: true,
    });

    expect(disabledIds).toEqual(['base']);
    expect(enabledIds).toEqual(['base', 'queue']);
  });

  it('registers only enabled modules onto app', async () => {
    const appWithoutQueue = registerModules(new Elysia(), defs, {
      ...features,
      queue: false,
    }).app;
    const appWithQueue = registerModules(new Elysia(), defs, {
      ...features,
      queue: true,
    }).app;

    const baseResponse = await appWithoutQueue.handle(
      new Request('http://localhost/base'),
    );
    const queueDisabledResponse = await appWithoutQueue.handle(
      new Request('http://localhost/queue'),
    );
    const queueEnabledResponse = await appWithQueue.handle(
      new Request('http://localhost/queue'),
    );

    expect(baseResponse.status).toBe(200);
    expect(queueDisabledResponse.status).toBe(404);
    expect(queueEnabledResponse.status).toBe(200);
  });

  it('toggles monitor module by monitor feature flag', () => {
    const disabled = resolveEnabledModuleIds(appModuleDefs, {
      ...features,
      monitor: false,
    });
    const enabled = resolveEnabledModuleIds(appModuleDefs, {
      ...features,
      monitor: true,
    });

    expect(disabled.includes('monitor')).toBeFalse();
    expect(enabled.includes('monitor')).toBeTrue();
  });

  it('returns 404 or 200 for monitor endpoint by feature flag', async () => {
    const appWithoutMonitor = registerModules(new Elysia(), appModuleDefs, {
      ...features,
      monitor: false,
    }).app;
    const appWithMonitor = registerModules(new Elysia(), appModuleDefs, {
      ...features,
      monitor: true,
    }).app;

    const disabledResponse = await appWithoutMonitor.handle(
      new Request('http://localhost/api/monitor/features'),
    );
    const enabledResponse = await appWithMonitor.handle(
      new Request('http://localhost/api/monitor/features'),
    );

    expect(disabledResponse.status).toBe(404);
    expect(enabledResponse.status).toBe(200);
  });
});
