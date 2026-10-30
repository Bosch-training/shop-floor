import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import Notification from './Notification.jsx';
import { useNotification } from './NotificationProvider.jsx';

const ROLE_LABELS = {
  supervisor: 'Manufacturing Supervisor',
  operator: 'Shop-Floor Operator',
  administrator: 'Administrator',
};

export default function AppShell() {
  const { notification, dismiss } = useNotification();
  const { user, status, logout } = useAuth();
  const signedIn = status === 'authenticated';

  return (
    <div>
      <header>
        <h1>Shop-Floor Resource Allocation</h1>
        {signedIn && (
          <>
            <nav aria-label='Main'>
              <Link to='/'>Home</Link>
            </nav>
            <div>
              <span>{user.name}</span>{' '}
              <span>{ROLE_LABELS[user.role] ?? user.role}</span>{' '}
              <button type='button' onClick={logout}>
                Logout
              </button>
            </div>
          </>
        )}
      </header>
      <Notification notification={notification} onDismiss={dismiss} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
