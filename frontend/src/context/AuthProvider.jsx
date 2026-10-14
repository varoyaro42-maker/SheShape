import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { AuthContext } from './auth-context.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadSession = async () => {
      try {
        const response = await api.get('/auth/me', { signal: controller.signal });
        if (!controller.signal.aborted) setUser(response.data.data);
      } catch {
        if (!controller.signal.aborted) setUser(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadSession();

    return () => controller.abort();
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const data = response.data.data;
    if (!data.pendingVerification) setUser(data);
    return data;
  }, []);

  const register = useCallback(async (details) => {
    const response = await api.post('/auth/register', details);
    const data = response.data.data;
    if (!data.pendingVerification) setUser(data);
    return data;
  }, []);

  const verifyEmail = useCallback(async (code) => {
    const response = await api.post('/auth/verify-email', { code });
    setUser(response.data.data);
    return response.data.data;
  }, []);

  const resendOtp = useCallback(async () => {
    await api.post('/auth/resend-otp');
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await api.post('/auth/forgot-password', { email });
  }, []);

  const resetPassword = useCallback(async (payload) => {
    await api.post('/auth/reset-password', payload);
  }, []);

  const changePassword = useCallback(async (payload) => {
    await api.post('/auth/change-password', payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const setCurrentUser = useCallback((nextUser) => setUser(nextUser), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login,
      register,
      verifyEmail,
      resendOtp,
      forgotPassword,
      resetPassword,
      changePassword,
      logout,
      setCurrentUser,
    }),
    [
      user,
      loading,
      login,
      register,
      verifyEmail,
      resendOtp,
      forgotPassword,
      resetPassword,
      changePassword,
      logout,
      setCurrentUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
