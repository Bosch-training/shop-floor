import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const NotificationContext = createContext(null);

// Holds one notification; no timer, so errors stay until dismissed (FR-13).
export default function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);

  const notifySuccess = useCallback((message) => {
    setNotification({ type: 'success', message, failures: [] });
  }, []);

  const notifyError = useCallback((error) => {
    setNotification({
      type: 'error',
      message: error.message,
      failures: error.failures ?? [],
    });
  }, []);

  const dismiss = useCallback(() => setNotification(null), []);

  const value = useMemo(
    () => ({ notification, notifySuccess, notifyError, dismiss }),
    [notification, notifySuccess, notifyError, dismiss],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used inside NotificationProvider');
  }
  return context;
}
