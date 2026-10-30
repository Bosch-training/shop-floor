import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import App from './App.jsx';
import { ApiError } from './services/apiClient.js';
import { getHealth } from './services/healthService.js';
import { getCurrentUser } from './services/authService.js';
import { renderWithAuth, signInAs, users } from './test/authTestUtils.jsx';

vi.mock('./services/healthService.js', () => ({ getHealth: vi.fn() }));
vi.mock('./services/authService.js', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const location = () => screen.getByTestId('location').textContent;
const renderAt = (path) => renderWithAuth(<App />, { entries: [path] });

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
});

describe('client shell (WIPC9-AC1, LLD-FR-02, WIPC-10-TC-197)', () => {
  beforeEach(() => {
    signInAs(users.supervisor);
  });

  it('renders navigation and the routed home page (T-19, T-20)', async () => {
    getHealth.mockResolvedValue({ status: 'ok' });

    renderAt('/');

    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(await screen.findByText('API status: ok')).toBeInTheDocument();
  });

  it('shows an error notification when the API fails (T-20)', async () => {
    getHealth.mockRejectedValue(
      new ApiError({
        status: 0,
        error: 'NetworkError',
        failures: [
          {
            rule: 'NETWORK_ERROR',
            message: 'Could not reach the server.',
            fix: 'Check your connection and try again.',
          },
        ],
      }),
    );

    renderAt('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('NETWORK_ERROR');
  });

  it('renders the not-found page for an unknown route (T-25)', async () => {
    renderAt('/does-not-exist');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('client route guard (LLD-FR-18, WIPC10-AC2)', () => {
  it('WIPC-10-TC-206 redirects an anonymous visit to /login', () => {
    renderAt('/');

    expect(location()).toBe('/login');
    expect(screen.queryByText(/API status/)).not.toBeInTheDocument();
    expect(getHealth).not.toHaveBeenCalled();
  });

  it('WIPC-10-TC-209 guards unknown paths (anonymous)', () => {
    renderAt('/nope');

    expect(location()).toBe('/login');
  });

  it('WIPC-10-TC-209 shows NotFoundPage when signed in', async () => {
    signInAs(users.supervisor);

    renderAt('/nope');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(location()).toBe('/nope');
  });

  it('WIPC-10-TC-210 keeps /login reachable, no redirect loop', async () => {
    renderAt('/login');

    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    await waitFor(() => expect(location()).toBe('/login'));
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});
