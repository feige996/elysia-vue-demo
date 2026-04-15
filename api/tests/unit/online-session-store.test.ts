import { describe, expect, it } from 'bun:test';
import {
  getOnlineSessions,
  resetOnlineSessionsForTest,
  touchOnlineSession,
} from '../../src/shared/monitor/online-session-store';

describe('online session store', () => {
  it('merges repeated requests from same account and ip', () => {
    resetOnlineSessionsForTest();
    const request = new Request('http://localhost/api/users', {
      headers: {
        'user-agent': 'unit-test',
        'x-forwarded-for': '127.0.0.1',
      },
    });

    touchOnlineSession(request, { role: 'admin', userId: 1, account: 'admin' });
    touchOnlineSession(request, { role: 'admin', userId: 1, account: 'admin' });

    const sessions = getOnlineSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.requestCount).toBe(2);
    expect(sessions[0]?.account).toBe('admin');
    expect(sessions[0]?.ip).toBe('127.0.0.1');
  });
});
