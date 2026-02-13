import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { request } from 'umi';
import { LoginService } from '../services/LoginService';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const data = await request('/session');
        if (mounted && data?.sessionId) {
          setSession({
            username: data.username || 'user',
            sessionId: data.sessionId,
            role: data.role || 'USER',
            loginAt: new Date().toISOString(),
          });
        }
    
      } catch (error) {
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setSessionChecked(true);
        }
      }
    };
    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async ({ username, password }) => {
    setLoading(true);
    try {
      const data = await LoginService({ username, password });
      if (!data?.sessionId) {
        throw new Error('Login failed.');
      }
      const nextSession = {
        username,
        sessionId: data.sessionId,
        role: data.role || 'USER',
        loginAt: new Date().toISOString(),
      };
      setSession(nextSession);
      setSessionChecked(true);
      return nextSession;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await request('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.sessionId ? { 'X-Session-Id': session.sessionId } : {}),
        },
        data: session?.sessionId ? { sessionId: session.sessionId } : undefined,
      });
    } catch (error) {
    }
    setSession(null);
    setSessionChecked(true);
  };

  const value = useMemo(
    () => ({
      session,
      loading,
      sessionChecked,
      setGlobalLoading: setLoading,
      login,
      logout,
    }),
    [session, loading, sessionChecked],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};