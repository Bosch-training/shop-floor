import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, login } from './authService.js';

const sup01 = {
  userId: 'sup01',
  name: 'Asha Rao',
  role: 'supervisor',
  status: 'active',
};

function mockFetch(body) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authService (LLD-FR-16, section 10)', () => {
  it(
    'WIPC-10-TC-003 calls POST /auth/login with userId and password',
    async () => {
    const body = {
      token: 'tok-abc',
      tokenType: 'Bearer',
      expiresAt: '2026-10-30T11:15:30.000Z',
      user: sup01,
    };
    const fetchMock = mockFetch(body);

    const result = await login('sup01', 'Correct-Horse-42');

    expect(result).toEqual(body);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      userId: 'sup01',
      password: 'Correct-Horse-42',
    });
  });

  it('WIPC-10-TC-004 calls GET /auth/me with the Bearer header', async () => {
    sessionStorage.setItem('shopfloor.token', 'tok-abc');
    const fetchMock = mockFetch({ user: sup01 });

    const result = await getCurrentUser();

    expect(result).toEqual({ user: sup01 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/me');
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer tok-abc');
  });
});
