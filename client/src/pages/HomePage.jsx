import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider.jsx';
import { getHealth } from '../services/healthService.js';

export default function HomePage() {
  const [status, setStatus] = useState(null);
  const { notifyError } = useNotification();

  useEffect(() => {
    let active = true;
    getHealth()
      .then((health) => {
        if (active) setStatus(health.status);
      })
      .catch((error) => {
        if (active) notifyError(error);
      });
    return () => {
      active = false;
    };
  }, [notifyError]);

  return (
    <section>
      <h2>Home</h2>
      <p>API status: {status ?? 'checking'}</p>
    </section>
  );
}
