import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
const AUTH_SYNC_CHANNEL = 'courier_auth_sync_channel';

/**
 * Broadcast non-sensitive authentication signals across browser tabs.
 * NEVER broadcast passwords, JWTs, tokens, or credentials over BroadcastChannel.
 */
const broadcastAuthEvent = (event) => {
  const payload = {
    type: event.type, // 'AUTH_LOGIN', 'AUTH_LOGOUT', 'SESSION_REVOKED'
    userId: event.userId || null,
    role: event.role || null,
    timestamp: Date.now(),
  };

  try {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {}

  // Fallback for environments lacking BroadcastChannel
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('courier_auth_sync_event', JSON.stringify(payload));
    }
  } catch {}
};

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

  // Track latest user in ref to avoid stale closures in event listeners
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const logout = useCallback(async (notifyServer = true) => {
    const activeToken = localStorage.getItem('courier_token');

    // Immediately and synchronously purge local session to prevent race-condition 401s
    localStorage.removeItem('courier_token');
    localStorage.removeItem('courier_user');
    localStorage.removeItem('courier_super_backup_token');
    localStorage.removeItem('courier_super_backup_user');
    localStorage.removeItem('courier_active_module');
    setToken(null);
    setUser(null);
    setIsImpersonating(false);

    // Broadcast non-sensitive logout event to all other tabs
    broadcastAuthEvent({ type: 'AUTH_LOGOUT' });

    // Transition protected views to login page
    const hash = (window.location.hash || '').toLowerCase();
    const protectedRoutes = ['#portal', '#dashboard', '#create-booking', '#dispatch', '#bookings', '#reports', '#settings', '#staff', '#superadmin'];
    if (protectedRoutes.some((route) => hash.startsWith(route))) {
      window.location.hash = '#login';
    }

    if (notifyServer && activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`,
          },
        }).catch(() => {});
      } catch {}
    }
  }, []);

  // Validate session against server on startup and refresh
  const validateSession = useCallback(async () => {
    const storedToken = localStorage.getItem('courier_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setToken(storedToken);
        localStorage.setItem('courier_user', JSON.stringify(res.user));
        return res.user;
      } else {
        logout(false);
        return null;
      }
    } catch (error) {
      console.warn('Session verification notice:', error.message);
      logout(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Cross-Tab Session Synchronization via BroadcastChannel & Storage Event fallback
  useEffect(() => {
    let channel;

    const handleAuthMessage = async (eventData) => {
      if (!eventData || !eventData.type) return;

      const { type, userId, role } = eventData;

      if (type === 'AUTH_LOGOUT' || type === 'SESSION_REVOKED') {
        // Shared session logged out or revoked in another tab
        localStorage.removeItem('courier_token');
        localStorage.removeItem('courier_user');
        localStorage.removeItem('courier_super_backup_token');
        localStorage.removeItem('courier_super_backup_user');
        localStorage.removeItem('courier_active_module');
        setToken(null);
        setUser(null);
        setIsImpersonating(false);

        const hash = (window.location.hash || '').toLowerCase();
        const protectedRoutes = ['#portal', '#dashboard', '#create-booking', '#dispatch', '#bookings', '#reports', '#settings', '#staff', '#superadmin'];
        if (protectedRoutes.some((route) => hash.startsWith(route))) {
          window.location.hash = '#login';
        }
      } else if (type === 'AUTH_LOGIN') {
        // Another tab logged in: check if identity switched
        const currentUser = userRef.current;
        const currentId = currentUser?.id || currentUser?._id;

        // If identity or role changed, or currently unauthenticated
        if (!currentUser || currentId !== userId || currentUser?.role !== role) {
          // Immediately unmount privileged UI by showing loading state
          setIsLoading(true);

          // Clear stale caches
          localStorage.removeItem('courier_active_module');

          // Revalidate current session against backend
          const validatedUser = await validateSession();

          if (validatedUser) {
            // Redirect each tab to the appropriate dashboard for the new user role
            if (validatedUser.role === 'staff') {
              localStorage.setItem('courier_active_module', 'create-booking');
              window.location.hash = '#create-booking';
            } else if (validatedUser.role === 'superadmin') {
              window.location.hash = '#superadmin';
            } else {
              localStorage.setItem('courier_active_module', 'dashboard');
              window.location.hash = '#dashboard';
            }
          } else {
            window.location.hash = '#login';
          }
        }
      }
    };

    // 1. BroadcastChannel listener
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.onmessage = (event) => {
          handleAuthMessage(event.data);
        };
      }
    } catch {}

    // 2. Storage event listener (fallback for older browsers & cross-window synchronization)
    const handleStorage = (event) => {
      if (event.key === 'courier_auth_sync_event' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          handleAuthMessage(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [validateSession]);

  const login = async (credentials) => {
    const safeCredentials = { ...credentials };
    if (typeof safeCredentials.identifier === 'string') {
      safeCredentials.identifier = safeCredentials.identifier.trim().toLowerCase();
    }
    if (typeof safeCredentials.username === 'string') {
      safeCredentials.username = safeCredentials.username.trim().toLowerCase();
    }
    if (typeof safeCredentials.email === 'string') {
      safeCredentials.email = safeCredentials.email.trim().toLowerCase();
    }
    const res = await api.auth.login(safeCredentials);
    if (res.success && res.token) {
      localStorage.setItem('courier_token', res.token);
      localStorage.setItem('courier_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);

      // Broadcast non-sensitive login notification to all other tabs
      broadcastAuthEvent({
        type: 'AUTH_LOGIN',
        userId: res.user.id || res.user._id,
        role: res.user.role,
      });

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

      broadcastAuthEvent({
        type: 'AUTH_LOGIN',
        userId: res.user.id || res.user._id,
        role: res.user.role,
      });

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

      const parsedUser = JSON.parse(backupUser);
      setToken(backupToken);
      setUser(parsedUser);
      setIsImpersonating(false);

      broadcastAuthEvent({
        type: 'AUTH_LOGIN',
        userId: parsedUser.id || parsedUser._id,
        role: parsedUser.role,
      });

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
