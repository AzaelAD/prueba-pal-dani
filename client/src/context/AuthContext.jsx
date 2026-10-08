import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('curamed_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('curamed_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('curamed:unauthorized', handleUnauthorized);

    if (token) {
      api.get('/auth/profile')
        .then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('curamed_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          // Token expirado o inválido
          localStorage.removeItem('curamed_token');
          localStorage.removeItem('curamed_user');
          setUser(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('curamed:unauthorized', handleUnauthorized);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('curamed_token', res.token);
      localStorage.setItem('curamed_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Error al iniciar sesión');
  };

  const logout = () => {
    localStorage.removeItem('curamed_token');
    localStorage.removeItem('curamed_user');
    setUser(null);
    setToken(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
