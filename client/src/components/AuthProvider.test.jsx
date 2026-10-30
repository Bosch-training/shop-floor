import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { useAuth } from './AuthProvider.jsx';
import { request, setUnauthorizedHandler } from '../services/apiClient.js';
import { getCurrentUser, login } from '../services/authService.js';
import {
  TOKEN,
  TOKEN_KEY,
  apiError,
  deferred,
  loginResponse,
  renderWithAuth,
  signInAs,
  users,
} from '../test/authTestUtils.jsx';

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}));

let auth;

function Probe() {
  auth = useAuth();
  return (
    <div>
      <span data-testid='status'>{auth.status}</span>
      <span data-testid='user'>{auth.user?.userId ?? 'none'}</span>
    </div>
  );
}

const status = () => screen.getByTestId('status').textContent;
const shownUser = () => screen.getByTestId('user').textContent;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe('AuthProvider session restore (LLD-FR-17)', () => {
  it('WIPC-10-TC-014 restores the session through GET /auth/me', async () => {
    signInAs(users.supervisor);

    renderWithAuth(<Probe />);

    expect(status()).toBe('loading');
    await waitFor(() => expect(status()).toBe('authenticated'));
    expect(shownUser()).toBe('sup01');
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it(
    'WIPC-10-TC-018 clears the token when restore fails with 401',
    async () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-expired');
    getCurrentUser.mockRejectedValue(apiError(401, 'UNAUTHENTICATED'));

    renderWithAuth(<Probe />);

    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(shownUser()).toBe('none');
  });

  it('WIPC-10-TC-020 is anonymous when no token is stored', () => {
    renderWithAuth(<Probe />);

    expect(status()).toBe('anonymous');
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it(
    'WIPC-10-TC-021 reports loading while the restore is pending',
    async () => {
    const pending = deferred();
    sessionStorage.setItem(TOKEN_KEY, TOKEN);
    getCurrentUser.mockReturnValue(pending.promise);

    renderWithAuth(<Probe />);

    expect(status()).toBe('loading');
    expect(shownUser()).toBe('none');
    await act(async () => pending.resolve({ user: users.supervisor }));
    expect(status()).toBe('authenticated');
  });

  it('WIPC-10-TC-022 clears the session on a network error', async () => {
    sessionStorage.setItem(TOKEN_KEY, TOKEN);
    getCurrentUser.mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithAuth(<Probe />);

    await waitFor(() => expect(status()).toBe('anonymous'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe('AuthProvider login and logout (LLD-FR-17)', () => {
  it(
    'WIPC-10-TC-015 stores the token and sets the user on login()',
    async () => {
    login.mockResolvedValue(loginResponse());
    renderWithAuth(<Probe />);

    await act(async () => auth.login('sup01', 'Correct-Horse-42'));

    expect(login).toHaveBeenCalledWith('sup01', 'Correct-Horse-42');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
    expect(status()).toBe('authenticated');
    expect(shownUser()).toBe('sup01');
  });

  it(
    'WIPC-10-TC-016 clears the session on logout() without a call',
    async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    signInAs();
    renderWithAuth(<Probe />);
    await waitFor(() => expect(status()).toBe('authenticated'));

    act(() => auth.logout());

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(status()).toBe('anonymous');
    expect(shownUser()).toBe('none');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it(
    'WIPC-10-TC-019 propagates a login failure and stays anonymous',
    async () => {
    login.mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS'));
    renderWithAuth(<Probe />);

    let error;
    await act(async () => {
      error = await auth.login('sup01', 'wrong-password-1').catch((e) => e);
    });

    expect(error.failures[0].rule).toBe('INVALID_CREDENTIALS');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(status()).toBe('anonymous');
  });

  it(
    'WIPC-10-TC-017 ends the session on an unauthorized response',
    async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'ValidationError',
          failures: [{ rule: 'UNAUTHENTICATED', message: 'm', fix: 'f' }],
        }),
      }),
    );
    signInAs();
    renderWithAuth(<Probe />);
    await waitFor(() => expect(status()).toBe('authenticated'));

    let error;
    await act(async () => {
      error = await request('GET', '/work-orders').catch((e) => e);
    });

    expect(error.failures[0].rule).toBe('UNAUTHENTICATED');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(status()).toBe('anonymous');
  });
});

describe('AuthProvider token handling (NFR-10, LLD-FR-17)', () => {
  it('WIPC-10-TC-214 keeps the token only in sessionStorage', async () => {
    login.mockResolvedValue(loginResponse());
    renderWithAuth(<Probe />);

    await act(async () => auth.login('sup01', 'Correct-Horse-42'));

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
    expect(localStorage.length).toBe(0);
    expect(document.cookie).not.toContain(TOKEN);
    expect(window.location.href).not.toContain(TOKEN);
    expect(document.body.textContent).not.toContain(TOKEN);
  });
});
