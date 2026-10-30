import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setUnauthorizedHandler } from './apiClient.js';

function mockFetch(response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
  sessionStorage.clear();
});

function failureResponse(status, rule) {
  return {
    ok: false,
    status,
    json: async () => ({
      error: 'ValidationError',
      failures: [{ rule, message: 'm', fix: 'f' }],
    }),
  };
}

describe('apiClient (LLD-FR-10, T-21)', () => {
  it('returns JSON on 200', async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ status: 'ok' }) });

    await expect(request('GET', '/health')).resolves.toEqual({
      status: 'ok',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ApiError with failures on an error-contract body', async () => {
    const failures = [{ rule: 'TIME_CONFLICT', message: 'm', fix: 'f' }];
    mockFetch({
      ok: false,
      status: 409,
      json: async () => ({ error: 'ValidationError', failures }),
    });

    const error = await request('POST', '/x', {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.failures).toEqual(failures);
  });

  it('throws NETWORK_ERROR when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('down')));

    const error = await request('GET', '/health').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.failures[0].rule).toBe('NETWORK_ERROR');
  });

  it('throws NETWORK_ERROR when the body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });

    const error = await request('GET', '/health').catch((e) => e);

    expect(error.failures[0].rule).toBe('NETWORK_ERROR');
  });
});

describe('apiClient authentication (LLD-FR-19, WIPC10-AC2)', () => {
  it(
    'WIPC-10-TC-001 sends the Bearer header when a token is stored',
    async () => {
    sessionStorage.setItem('shopfloor.token', 'tok-abc');
    mockFetch({ ok: true, status: 200, json: async () => ({}) });

    await request('GET', '/auth/me');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/auth/me');
    expect(options.headers.Authorization).toBe('Bearer tok-abc');
  });

  it('WIPC-10-TC-005 omits Authorization when no token is stored', async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({}) });

    await request('GET', '/health');

    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it(
    'WIPC-10-TC-002 calls the handler on a 401 from a protected path',
    async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(failureResponse(401, 'UNAUTHENTICATED'));

    const error = await request('GET', '/work-orders').catch((e) => e);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.failures[0].rule).toBe('UNAUTHENTICATED');
  });

  it('WIPC-10-TC-006 skips the handler on a 401 from /auth/login', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    sessionStorage.setItem('shopfloor.token', 'tok-old');
    mockFetch(failureResponse(401, 'INVALID_CREDENTIALS'));

    const error = await request('POST', '/auth/login', {
      userId: 'sup01',
      password: 'wrong-password-1',
    }).catch((e) => e);

    expect(error.failures[0].rule).toBe('INVALID_CREDENTIALS');
    expect(handler).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('shopfloor.token')).toBe('tok-old');
  });

  it.each([
    ['403 FORBIDDEN', 403, 'FORBIDDEN', '/work-orders'],
    ['429 RATE_LIMITED', 429, 'RATE_LIMITED', '/auth/login'],
  ])(
    'WIPC-10-TC-007 skips the handler on %s',
    async (n, status, rule, path) => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    sessionStorage.setItem('shopfloor.token', 'tok-abc');
    mockFetch(failureResponse(status, rule));

    const error = await request('POST', path, {}).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.failures[0].rule).toBe(rule);
    expect(handler).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('shopfloor.token')).toBe('tok-abc');
  });

  it('WIPC-10-TC-008 throws ApiError on a 401 without a handler', async () => {
    mockFetch(failureResponse(401, 'UNAUTHENTICATED'));

    const error = await request('GET', '/work-orders').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.failures[0].rule).toBe('UNAUTHENTICATED');
  });

  it('WIPC-10-TC-009 keeps the token out of the URL and body', async () => {
    sessionStorage.setItem('shopfloor.token', 'tok-abc');
    mockFetch({ ok: true, status: 200, json: async () => ({}) });

    await request('POST', '/work-orders', { name: 'WO-1' });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/work-orders');
    expect(options.body).toBe(JSON.stringify({ name: 'WO-1' }));
    expect(url).not.toContain('tok-abc');
    expect(options.body).not.toContain('tok-abc');
    expect(options.headers.Authorization).toBe('Bearer tok-abc');
  });
});
