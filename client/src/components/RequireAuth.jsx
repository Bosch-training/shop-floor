import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import ForbiddenView from './ForbiddenView.jsx';

// Hides screens only; the server enforces roles (NFR-04).
export default function RequireAuth({ roles }) {
  const { user, status } = useAuth();
  const { pathname, search, hash } = useLocation();

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'anonymous') {
    return (
      <Navigate
        to='/login'
        replace
        state={{ from: `${pathname}${search}${hash}` }}
      />
    );
  }
  if (roles && !roles.includes(user.role)) return <ForbiddenView />;
  return <Outlet />;
}
