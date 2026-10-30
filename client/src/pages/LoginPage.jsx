import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider.jsx';
import { useNotification } from '../components/NotificationProvider.jsx';

export default function LoginPage() {
  const { status, login } = useAuth();
  const { notifyError, dismiss } = useNotification();
  const location = useLocation();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    dismiss();
    try {
      await login(userId, password);
    } catch (error) {
      notifyError(error);
      // Keep the user ID; clear the password after a credential failure.
      if (error.status === 401) setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h2>Sign in</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor='userId'>User ID</label>
          <input
            id='userId'
            name='userId'
            type='text'
            autoComplete='username'
            required
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor='password'>Password</label>
          <input
            id='password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button type='submit' disabled={submitting}>
          Sign in
        </button>
      </form>
    </section>
  );
}
