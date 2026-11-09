import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await apiClient.get('/auth/me');
        setUser(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      } catch (err) {
        // Interceptor handles 401
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const loginWithGoogle = async (idToken) => {
    try {
      const { data } = await apiClient.post('/auth/google', { idToken });
      const newToken = data.data.token;
      const newUser = data.data.user;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      toast.success(`Welcome back, ${newUser.name}!`);
      return newUser;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please try again.';
      toast.error(msg);
      throw err;
    }
  };

  const loginWithDemo = async () => {
    try {
      const { data } = await apiClient.post('/auth/demo');
      const newToken = data.data.token;
      const newUser = data.data.user;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      toast.success(`Welcome to demo mode, ${newUser.name}!`);
      return newUser;
    } catch (err) {
      toast.error('Demo login failed. Make sure server is running.');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const logoutAll = async () => {
    try {
      await apiClient.post('/auth/logout-all');
      logout();
      toast.success('Logged out from all active sessions');
    } catch (err) {
      logout();
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
    } catch (err) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        loginWithGoogle,
        loginWithDemo,
        logout,
        logoutAll,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
