import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { getHealth } from '../services/healthService.js';
import { getCurrentUser } from '../services/authService.js';
import {
  TOKEN_KEY,
  renderWithAuth,
  signInAs,
  users,
} from '../test/authTestUtils.jsx';

vi.mock('../services/authService.js', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock('../services/healthService.js', () => ({ getHealth: vi.fn() }));

const location = () => screen.getByTestId('location').textContent;

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  getHealth.mockResolvedValue({ status: 'ok' });
});

describe('AppShell header (LLD-FR-20, LLD-FR-17)', () => {
  it(
    'WIPC-10-TC-010 shows name, role label and Logout for a supervisor',
    async () => {
    signInAs(users.supervisor);

    renderWithAuth(<App />);

    expect(await screen.findByText(/Asha Rao/)).toBeInTheDocument();
    expect(screen.getByText(/Manufacturing Supervisor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log ?out/i })).toBeVisible();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it.each([
    ['WIPC-10-TC-011', users.operator, 'Shop-Floor Operator'],
    ['WIPC-10-TC-011', users.administrator, 'Administrator'],
  ])('%s maps the role label for %s', async (id, user, label) => {
    signInAs(user);

    renderWithAuth(<App />);

    expect(await screen.findByText(new RegExp(user.name))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });

  it(
    'WIPC-10-TC-012 clears the token and returns to /login on Logout',
    async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    signInAs(users.supervisor);
    renderWithAuth(<App />);
    await screen.findByText(/Asha Rao/);

    await user.click(screen.getByRole('button', { name: /log ?out/i }));

    await waitFor(() => expect(location()).toBe('/login'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('WIPC-10-TC-013 hides navigation, name and Logout when anonymous', () => {
    renderWithAuth(<App />, { entries: ['/login'] });

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText(/Asha Rao/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /log ?out/i }),
    ).not.toBeInTheDocument();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it(
    'WIPC-10-TC-220 renders a user name containing markup as text',
    async () => {
    const markup = '<img src=x onerror=alert(1)>';
    signInAs({ ...users.supervisor, name: markup });

    const { container } = renderWithAuth(<App />);

    await waitFor(() => expect(document.body.textContent).toContain(markup));
    expect(container.querySelector('img')).toBeNull();
  });
});
