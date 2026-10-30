import { Link, Outlet } from 'react-router-dom';
import Notification from './Notification.jsx';
import { useNotification } from './NotificationProvider.jsx';

export default function AppShell() {
  const { notification, dismiss } = useNotification();

  return (
    <div>
      <header>
        <h1>Shop-Floor Resource Allocation</h1>
        <nav aria-label='Main'>
          <Link to='/'>Home</Link>
        </nav>
      </header>
      <Notification notification={notification} onDismiss={dismiss} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
