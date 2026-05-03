import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const API = 'http://localhost:3001/api';

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(() => localStorage.getItem('coweda_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('coweda_username'));
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const persist = (tok, user) => {
    localStorage.setItem('coweda_token', tok);
    localStorage.setItem('coweda_username', user);
    setToken(tok);
    setUsername(user);
  };

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      persist(data.token, data.username);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      persist(data.token, data.username);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('coweda_token');
    localStorage.removeItem('coweda_username');
    setToken(null);
    setUsername(null);
  }, []);

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ token, username, isLoggedIn: !!token, login, register, logout, error, loading, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { API };
