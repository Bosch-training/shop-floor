import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
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

const userIdField = () => screen.getByLabelText(/user id/i);
const passwordField = () => screen.getByLabelText(/password/i);
const submitButton = () =>
  screen.getByRole('button', { name: /sign in|log in|login|submit/i });
const location = () => screen.getByTestId('location').textContent;

function renderLogin(entries = ['/login']) {
  return renderWithAuth(
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/work-orders' element={<p>Work orders</p>} />
      <Route path='/' element={<p>Home content</p>} />
    </Routes>,
    { entries, withNotifications: true },
  );
}

async function fillAndSubmit(user, userId, password) {
  await user.type(userIdField(), userId);
  await user.type(passwordField(), password);
  await user.click(submitButton());
}

beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
});

describe('LoginPage success (LLD-FR-16, WIPC10-AC1)', () => {
  it(
    'WIPC-10-TC-117 submits, stores the token and goes to the target',
    async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(loginResponse());
    renderLogin([{ pathname: '/login', state: { from: '/work-orders' } }]);

    await fillAndSubmit(user, 'sup01', 'Correct-Horse-42');

    expect(login).toHaveBeenCalledWith('sup01', 'Correct-Horse-42');
    await waitFor(() => expect(location()).toBe('/work-orders'));
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
  });

  it(
    'WIPC-10-TC-118 goes to / when no target page was remembered',
    async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(loginResponse());
    renderLogin();

    await fillAndSubmit(user, 'sup01', 'Correct-Horse-42');

    await waitFor(() => expect(location()).toBe('/'));
  });

  it('WIPC-10-TC-119 redirects an authenticated user away', async () => {
    signInAs(users.supervisor);

    renderLogin();

    await waitFor(() => expect(location()).toBe('/'));
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalled();
  });

  it('WIPC-10-TC-120 disables submit while the request runs', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    login.mockReturnValue(pending.promise);
    renderLogin();

    await fillAndSubmit(user, 'sup01', 'Correct-Horse-42');
    expect(submitButton()).toBeDisabled();

    pending.reject(apiError(401, 'INVALID_CREDENTIALS'));
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('WIPC-10-TC-127 sends one request on a double click', async () => {
    const user = userEvent.setup();
    login.mockReturnValue(deferred().promise);
    renderLogin();
    await user.type(userIdField(), 'sup01');
    await user.type(passwordField(), 'Correct-Horse-42');

    await user.dblClick(submitButton());

    expect(login).toHaveBeenCalledTimes(1);
  });
});

describe('LoginPage failures (LLD-FR-16, FR-13, OQ-14)', () => {
  const credentialFailure = {
    status: 401,
    rule: 'INVALID_CREDENTIALS',
    message: 'The user ID or password is incorrect.',
    fix: 'Check your user ID and password and try again.',
  };

  it(
    'WIPC-10-TC-121 shows INVALID_CREDENTIALS and keeps the user ID',
    async () => {
    const user = userEvent.setup();
    const { status, rule, message, fix } = credentialFailure;
    login.mockRejectedValue(apiError(status, rule, message, fix));
    renderLogin();

    await fillAndSubmit(user, 'sup01', 'Wrong-Horse-42');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(rule);
    expect(alert).toHaveTextContent(message);
    expect(alert).toHaveTextContent(fix);
    expect(userIdField()).toHaveValue('sup01');
    expect(passwordField()).toHaveValue('');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it(
    'WIPC-10-TC-122 shows ACCOUNT_INACTIVE for a deactivated user',
    async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      apiError(
        403,
        'ACCOUNT_INACTIVE',
        'This account is deactivated.',
        'Ask an Administrator to reactivate the account.',
      ),
    );
    renderLogin();

    await fillAndSubmit(user, 'ina01', 'Correct-Horse-42');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('ACCOUNT_INACTIVE');
    expect(alert).toHaveTextContent('This account is deactivated.');
    expect(alert).toHaveTextContent(
      'Ask an Administrator to reactivate the account.',
    );
    expect(userIdField()).toHaveValue('ina01');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it.each([
    [
      'WIPC-10-TC-123 RATE_LIMITED',
      apiError(
        429,
        'RATE_LIMITED',
        'Too many failed login attempts.',
        'Wait 15 minutes before trying again.',
      ),
      'Wait 15 minutes before trying again.',
    ],
    [
      'WIPC-10-TC-124 INVALID_INPUT',
      apiError(
        400,
        'INVALID_INPUT',
        'body.userId: Too big',
        'Correct body.userId and resubmit.',
      ),
      'Correct body.userId and resubmit.',
    ],
  ])('%s keeps both fields', async (name, error, fix) => {
    const user = userEvent.setup();
    login.mockRejectedValue(error);
    renderLogin();

    await fillAndSubmit(user, 'sup01', 'Correct-Horse-42');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(error.failures[0].rule);
    expect(alert).toHaveTextContent(fix);
    expect(userIdField()).toHaveValue('sup01');
    expect(passwordField()).toHaveValue('Correct-Horse-42');
  });

  it('WIPC-10-TC-126 shows INTERNAL_ERROR and stays on /login', async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      apiError(
        500,
        'INTERNAL_ERROR',
        'The server could not complete the request.',
        'Try again. If the problem continues, contact support.',
      ),
    );
    renderLogin();

    await fillAndSubmit(user, 'sup01', 'Correct-Horse-42');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('INTERNAL_ERROR');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(location()).toBe('/login');
  });

  it.each([
    ['empty user ID', '', 'x1y2z3-Pass'],
    ['empty password', 'sup01', ''],
  ])('WIPC-10-TC-125 blocks submit with an %s', async (name, userId, pw) => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();
    if (userId) await user.type(userIdField(), userId);
    if (pw) await user.type(passwordField(), pw);

    await user.click(submitButton());

    expect(login).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(location()).toBe('/login');
    vi.unstubAllGlobals();
  });

  it(
    'WIPC-10-TC-128 masks the password and keeps it out of the DOM',
    async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS'));
    renderLogin();
    expect(passwordField()).toHaveAttribute('type', 'password');

    await fillAndSubmit(user, 'sup01', 'Wrong-Horse-42');

    await screen.findByRole('alert');
    expect(document.body).not.toHaveTextContent('Wrong-Horse-42');
  });

  it('WIPC-10-TC-129 leaves length rules to the server', async () => {
    const user = userEvent.setup();
    const longId = 'u'.repeat(70);
    login.mockRejectedValue(
      apiError(400, 'INVALID_INPUT', 'body.userId: Too big', 'f'),
    );
    renderLogin();

    await fillAndSubmit(user, longId, 'x1y2z3-Pass');

    expect(login).toHaveBeenCalledWith(longId, 'x1y2z3-Pass');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'body.userId: Too big',
    );
  });
});
