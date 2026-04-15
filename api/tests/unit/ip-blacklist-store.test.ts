import { describe, expect, it } from 'bun:test';
import {
  addBlockedIp,
  isIpBlocked,
  listBlockedIps,
  removeBlockedIp,
  resetIpBlacklistForTest,
} from '../../src/shared/security/ip-blacklist-store';

describe('ip blacklist store', () => {
  it('supports add list remove flow', () => {
    resetIpBlacklistForTest();
    addBlockedIp('127.0.0.1', 'test', 10);
    expect(isIpBlocked('127.0.0.1')).toBeTrue();
    const list = listBlockedIps();
    expect(list.length).toBe(1);
    expect(list[0]?.reason).toBe('test');
    const removed = removeBlockedIp('127.0.0.1');
    expect(removed).toBeTrue();
    expect(isIpBlocked('127.0.0.1')).toBeFalse();
  });
});
