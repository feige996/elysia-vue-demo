import { describe, expect, it } from 'bun:test';
import { app } from '../../src/app/index';
import { AppCode } from '../../src/shared/types/http';

const sendJson = async (url: string, method: string, body?: unknown, headers?: Record<string, string>) =>
    app.handle(
        new Request(url, {
            method,
            headers: {
                'content-type': 'application/json',
                ...(headers ?? {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        }),
    );

describe('HTTP integration', () => {
    it('returns requestId in health response', async () => {
        const response = await app.handle(new Request('http://localhost/health'));
        const payload = (await response.json()) as { code: number; requestId?: string };

        expect(response.status).toBe(200);
        expect(payload.code).toBe(0);
        expect(typeof payload.requestId).toBe('string');
    });

    it('allows login and protected users endpoint', async () => {
        const loginResponse = await sendJson('http://localhost/api/auth/login', 'POST', {
            account: 'admin',
            password: 'admin123',
        });
        const loginPayload = (await loginResponse.json()) as {
            code: number;
            data?: { token: string };
            requestId?: string;
        };

        expect(loginResponse.status).toBe(200);
        expect(loginPayload.code).toBe(0);
        expect(loginPayload.data?.token).toBe('demo-token');
        expect(typeof loginPayload.requestId).toBe('string');

        const usersResponse = await app.handle(
            new Request('http://localhost/api/users', {
                headers: {
                    authorization: `Bearer ${loginPayload.data?.token ?? ''}`,
                },
            }),
        );
        const usersPayload = (await usersResponse.json()) as { code: number; data?: unknown[] };

        expect(usersResponse.status).toBe(200);
        expect(usersPayload.code).toBe(0);
        expect(Array.isArray(usersPayload.data)).toBeTrue();
    });

    it('returns standardized unauthorized response', async () => {
        const response = await app.handle(new Request('http://localhost/api/users'));
        const payload = (await response.json()) as { code: number; requestId?: string };

        expect(response.status).toBe(401);
        expect(payload.code).toBe(AppCode.UNAUTHORIZED);
        expect(typeof payload.requestId).toBe('string');
    });
});
