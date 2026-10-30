import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useNavigate } from 'react-router-dom';
import RequireAuth from './RequireAuth.jsx';
import { useAuth } from './AuthProvider.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import { request, setUnauthorizedHandler } from '../services/apiClient.js';
import { getCurrentUser, login } from '../services/authService.js';
import {
  TOKEN_KEY,
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

const location = () => screen.getByTestId('location').textContent;
const notPermitted = () => screen.queryByText(/not permitted/i);

function Pages({ roles }) {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route element={<RequireAuth roles={roles} />}>
        <Route index element={<p>Home content</p>} />
        <Route path='/work-orders' element={<p>Work orders</p>} />
      </Route>
    </Routes>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe('RequireAuth role handling (LLD-FR-18, WIPC10-AC3)', () => {
  it('WIPC-10-TC-201 renders the page for an allowed role', async () => {
    signInAs(users.supervisor);

    renderWithAuth(<Pages roles={['supervisor']} />, {
      entries: ['/work-orders'],
    });

    expect(await screen.findByText('Work orders')).toBeInTheDocument();
    expect(notPermitted()).not.toBeInTheDocument();
  });

  it(
    'WIPC-10-TC-202 renders for any user when no roles prop is set',
    async () => {
    signInAs(users.operator);

    renderWithAuth(<Pages />, { entries: ['/'] });

    expect(await screen.findByText('Home content')).toBeInTheDocument();
  });

  it('WIPC-10-TC-205 shows ForbiddenView for a disallowed role', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    signInAs(users.operator);

    renderWithAuth(<Pages roles={['supervisor']} />, {
      entries: ['/work-orders'],
    });

    expect(await screen.findByText(/not permitted/i)).toBeInTheDocument();
    expect(screen.queryByText('Work orders')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('RequireAuth anonymous and loading (LLD-FR-18, WIPC10-AC2)', () => {
  it(
    'WIPC-10-TC-204 redirects an anonymous user and remembers the target',
    () => {
    renderWithAuth(<Pages roles={['supervisor']} />, {
      entries: ['/work-orders'],
    });

    expect(location()).toBe('/login');
    expect(screen.getByTestId('from').textContent).toBe('/work-orders');
    expect(screen.queryByText('Work orders')).not.toBeInTheDocument();
  });

  it('WIPC-10-TC-207 shows loading without redirecting', () => {
    sessionStorage.setItem(TOKEN_KEY, 'tok-abc');
    getCurrentUser.mockReturnValue(deferred().promise);

    renderWithAuth(<Pages roles={['supervisor']} />, {
      entries: ['/work-orders'],
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(location()).toBe('/work-orders');
    expect(screen.queryByText('Work orders')).not.toBeInTheDocument();
  });

  it('WIPC-10-TC-203 returns to the remembered page after login', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(loginResponse(users.supervisor));
    renderWithAuth(<Pages roles={['supervisor']} />, {
      entries: ['/work-orders'],
    });

    await user.type(screen.getByLabelText(/user id/i), 'sup01');
    await user.type(screen.getByLabelText(/password/i), 'Correct-Horse-42');
    await user.click(
      screen.getByRole('button', { name: /sign in|log in|login|submit/i }),
    );

    expect(await screen.findByText('Work orders')).toBeInTheDocument();
    expect(location()).toBe('/work-orders');
  });

  it(
    'WIPC-10-TC-208 redirects to /login when a 401 arrives mid-session',
    async () => {
    const user = userEvent.setup();
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
    signInAs(users.supervisor);
    renderWithAuth(
      <>
        <button onClick={() => request('GET', '/work-orders').catch(() => {})}>
          Call API
        </button>
        <Pages roles={['supervisor']} />
      </>,
      { entries: ['/'] },
    );
    await screen.findByText('Home content');

    await user.click(screen.getByRole('button', { name: 'Call API' }));

    await waitFor(() => expect(location()).toBe('/login'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it(
    'WIPC-10-TC-211 blocks protected content after logout and back',
    async () => {
    const user = userEvent.setup();
    function Controls() {
      const { logout } = useAuth();
      const navigate = useNavigate();
      return (
        <>
          <button onClick={logout}>Log out</button>
          <button onClick={() => navigate(-1)}>Back</button>
        </>
      );
    }
    signInAs(users.supervisor);
    renderWithAuth(
      <>
        <Controls />
        <Pages roles={['supervisor']} />
      </>,
      { entries: ['/', '/work-orders'], index: 1 },
    );
    await screen.findByText('Work orders');

    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(location()).toBe('/login'));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => expect(location()).toBe('/login'));
    expect(screen.queryByText('Work orders')).not.toBeInTheDocument();
  });
});
