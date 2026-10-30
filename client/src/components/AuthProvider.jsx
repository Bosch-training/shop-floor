import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setUnauthorizedHandler } from '../services/apiClient.js';
import {
  getCurrentUser,
  login as loginRequest,
} from '../services/authService.js';
import { clearToken, getToken, setToken } from '../services/tokenStorage.js';

const AuthContext = createContext(null);

// The server stays the authority; this only tracks who is signed in.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    getToken() ? 'loading' : 'anonymous',
  );

  const endSession = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    if (!getToken()) return undefined;
    let active = true;
    getCurrentUser()
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (active) endSession();
      });
    return () => {
      active = false;
    };
  }, [endSession]);

  useEffect(() => {
    setUnauthorizedHandler(endSession);
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  const login = useCallback(async (userId, password) => {
    const result = await loginRequest(userId, password);
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    return result;
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout: endSession }),
    [user, status, login, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
