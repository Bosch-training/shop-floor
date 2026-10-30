import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import NotificationProvider from './components/NotificationProvider.jsx';
import { ApiError } from './services/apiClient.js';
import { getHealth } from './services/healthService.js';

vi.mock('./services/healthService.js', () => ({ getHealth: vi.fn() }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getHealth.mockReset();
});

describe('client shell (WIPC9-AC1, LLD-FR-02)', () => {
  it('renders navigation and the routed home page (T-19, T-20)', async () => {
    getHealth.mockResolvedValue({ status: 'ok' });

    renderAt('/');

    expect(screen.getByRole('navigation')).toBeInTheDocument();
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

  it('renders the not-found page for an unknown route (T-25)', () => {
    renderAt('/does-not-exist');

    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});
