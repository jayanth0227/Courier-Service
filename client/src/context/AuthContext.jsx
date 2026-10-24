import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('courier_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('courier_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Check if session was launched via Super Admin impersonation
  const [isImpersonating, setIsImpersonating] = useState(() => {
    return !!localStorage.getItem('courier_super_backup_token');
  });

  const logout = useCallback(() => {
    localStorage.removeItem('courier_token');
    localStorage.removeItem('courier_user');
    localStorage.removeItem('courier_super_backup_token');
    localStorage.removeItem('courier_super_backup_user');
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
  }, []);

  // Validate session against server on startup and refresh
  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      const storedToken = localStorage.getItem('courier_token');
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await api.auth.getMe();
        if (isMounted) {
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('courier_user', JSON.stringify(res.user));
          } else {
            logout();
          }
        }
      } catch (error) {
        console.warn('Session verification notice:', error.message);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (credentials) => {
    const res = await api.auth.login(credentials);
    if (res.success && res.token) {
      localStorage.setItem('courier_token', res.token);
      localStorage.setItem('courier_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Authentication failed');
  };

  // 1-Click Super Admin Impersonation
  const impersonateTenant = async (tenantId) => {
    // Backup current superadmin session
    if (user?.role === 'superadmin' && token) {
      localStorage.setItem('courier_super_backup_token', token);
      localStorage.setItem('courier_super_backup_user', JSON.stringify(user));
    }

    const res = await api.superadmin.impersonate(tenantId);
    if (res.success && res.token) {
      localStorage.setItem('courier_token', res.token);
      localStorage.setItem('courier_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      setIsImpersonating(true);
      return res;
    }
    throw new Error(res.message || 'Impersonation failed');
  };

  // Exit Impersonation and return to Super Admin
  const exitImpersonation = () => {
    const backupToken = localStorage.getItem('courier_super_backup_token');
    const backupUser = localStorage.getItem('courier_super_backup_user');

    if (backupToken && backupUser) {
      localStorage.setItem('courier_token', backupToken);
      localStorage.setItem('courier_user', backupUser);
      localStorage.removeItem('courier_super_backup_token');
      localStorage.removeItem('courier_super_backup_user');

      setToken(backupToken);
      setUser(JSON.parse(backupUser));
      setIsImpersonating(false);
      window.location.hash = '#superadmin';
      return true;
    } else {
      logout();
      window.location.hash = '#login';
      return false;
    }
  };

  const hasRole = (role) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.role === 'admin' && role !== 'superadmin') return true;
    return user.role === role;
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const tenant = user?.tenant || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isStaff,
        tenant,
        isImpersonating,
        hasRole,
        login,
        logout,
        impersonateTenant,
        exitImpersonation,
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
