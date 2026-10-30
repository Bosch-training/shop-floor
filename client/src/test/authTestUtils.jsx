import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AuthProvider from '../components/AuthProvider.jsx';
import Notification from '../components/Notification.jsx';
import NotificationProvider, {
  useNotification,
} from '../components/NotificationProvider.jsx';
import { ApiError } from '../services/apiClient.js';
import { getCurrentUser } from '../services/authService.js';

export const TOKEN = 'tok-abc';
export const TOKEN_KEY = 'shopfloor.token';

export const users = {
  supervisor: {
    userId: 'sup01',
    name: 'Asha Rao',
    role: 'supervisor',
    status: 'active',
  },
  operator: {
    userId: 'op01',
    name: 'Ravi Kumar',
    role: 'operator',
    status: 'active',
  },
  administrator: {
    userId: 'adm01',
    name: 'Meera Nair',
    role: 'administrator',
    status: 'active',
  },
};

// Requires the test file to vi.mock('../services/authService.js').
export function signInAs(user = users.supervisor) {
  sessionStorage.setItem(TOKEN_KEY, TOKEN);
  getCurrentUser.mockResolvedValue({ user });
}

export function loginResponse(user = users.supervisor) {
  return {
    token: TOKEN,
    tokenType: 'Bearer',
    expiresAt: '2026-10-30T11:15:30.000Z',
    user,
  };
}

export function apiError(status, rule, message = 'm', fix = 'f') {
  return new ApiError({
    status,
    error: 'ValidationError',
    failures: [{ rule, message, fix }],
  });
}

export function deferred() {
  const handlers = {};
  const promise = new Promise((resolve, reject) => {
    handlers.resolve = resolve;
    handlers.reject = reject;
  });
  return { promise, ...handlers };
}

export function LocationProbe() {
  const { pathname, state } = useLocation();
  const from = state?.from;
  return (
    <div>
      <span data-testid='location'>{pathname}</span>
      <span data-testid='from'>
        {typeof from === 'string' ? from : (from?.pathname ?? '')}
      </span>
    </div>
  );
}

function NotificationOutlet() {
  const { notification, dismiss } = useNotification();
  return <Notification notification={notification} onDismiss={dismiss} />;
}

export function renderWithAuth(
  ui,
  { entries = ['/'], index, withNotifications = false } = {},
) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <NotificationProvider>
        <AuthProvider>
          {ui}
          {withNotifications && <NotificationOutlet />}
          <LocationProbe />
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>,
  );
}
