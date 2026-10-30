import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './apiClient.js';

function mockFetch(response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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
