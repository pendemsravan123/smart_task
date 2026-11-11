import { createContext, useContext, useMemo, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('restaurant-session')) || null;
    } catch {
      localStorage.removeItem('restaurant-session');
      return null;
    }
  });

  async function signIn(credentials) {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    localStorage.setItem('restaurant-session', JSON.stringify(result));
    setSession(result);
    return result;
  }

  async function register(credentials) {
    const result = await api('/auth/register', { method: 'POST', body: JSON.stringify(credentials) });
    localStorage.setItem('restaurant-session', JSON.stringify(result));
    setSession(result);
    return result;
  }

  function signOut() {
    localStorage.removeItem('restaurant-session');
    setSession(null);
  }

  const value = useMemo(() => ({
    user: session?.user || null,
    token: session?.token || null,
    signIn,
    register,
    signOut
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
