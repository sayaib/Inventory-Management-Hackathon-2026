import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(() => localStorage.getItem('token') || sessionStorage.getItem('token'), []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    const res = await api.get('/auth/me');
    setUser(res.data);
    return res.data;
  }, [getToken]);

  useEffect(() => {
    const fetchUser = async () => {
      const token = getToken();
      if (token) {
        try {
          await refreshUser();
        } catch (err) {
          console.error('Failed to fetch user', err);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [getToken, refreshUser]);

  const login = async (email, password, options = {}) => {
    const { persist = true } = options;
    const res = await api.post('/auth/login', { email, password });
    if (persist) {
      localStorage.setItem('token', res.data.token);
      sessionStorage.removeItem('token');
    } else {
      sessionStorage.setItem('token', res.data.token);
      localStorage.removeItem('token');
    }
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (userData) => {
    await api.post('/auth/register', userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
