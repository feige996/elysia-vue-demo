import { describe, expect, it } from 'bun:test';
import {
  addBlockedIp,
  isIpBlocked,
  listBlockedIps,
  markBlockedIpHit,
  recordFailedLoginAttempt,
  removeBlockedIp,
  resetIpBlacklistForTest,
} from '../../src/shared/security/ip-blacklist-store';

describe('ip blacklist store', () => {
  it('supports add list remove flow', async () => {
    resetIpBlacklistForTest();
    await addBlockedIp('127.0.0.1', 'test', 10);
    expect(await isIpBlocked('127.0.0.1')).toBeTrue();
    const list = await listBlockedIps();
    expect(list.length).toBe(1);
    expect(list[0]?.reason).toBe('test');
    await markBlockedIpHit('127.0.0.1');
    const listAfterHit = await listBlockedIps();
    expect(listAfterHit[0]?.hitCount).toBe(1);
    expect(typeof listAfterHit[0]?.lastHitAt).toBe('string');
    const removed = await removeBlockedIp('127.0.0.1');
    expect(removed).toBeTrue();
    expect(await isIpBlocked('127.0.0.1')).toBeFalse();
  });

  it('marks source as auto when threshold is reached', async () => {
    resetIpBlacklistForTest();
    for (let index = 0; index < 5; index += 1) {
      await recordFailedLoginAttempt('10.0.0.9');
    }
    const list = await listBlockedIps();
    expect(list[0]?.ip).toBe('10.0.0.9');
    expect(list[0]?.source).toBe('auto');
    expect(await isIpBlocked('10.0.0.9')).toBeTrue();
  });
});
