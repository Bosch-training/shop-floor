import { beforeEach, describe, expect, it } from 'vitest';
import { clearToken, getToken, setToken } from './tokenStorage.js';

const KEY = 'shopfloor.token';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('tokenStorage (LLD-FR-17, section 10)', () => {
  it('WIPC-10-TC-256 stores and reads the token under shopfloor.token', () => {
    setToken('tok-abc');

    expect(getToken()).toBe('tok-abc');
    expect(sessionStorage.getItem(KEY)).toBe('tok-abc');
  });

  it('WIPC-10-TC-257 removes the token with clearToken', () => {
    sessionStorage.setItem(KEY, 'tok-abc');

    clearToken();

    expect(getToken()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('WIPC-10-TC-258 returns null when no token is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('WIPC-10-TC-259 overwrites a token and leaves localStorage unused', () => {
    sessionStorage.setItem(KEY, 'tok-old');

    setToken('tok-new');

    expect(getToken()).toBe('tok-new');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('WIPC-10-TC-260 does not throw when clearing an empty store', () => {
    expect(() => {
      clearToken();
      clearToken();
    }).not.toThrow();
    expect(getToken()).toBeNull();
  });
});
