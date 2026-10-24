import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CompanyProvider, useCompanySettings } from './context/CompanyContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { TrackingPage } from './pages/TrackingPage';
import { LoginPage } from './pages/LoginPage';
import { PortalLayout } from './pages/PortalLayout';
import { SuperAdminPage } from './pages/SuperAdminPage';

import './index.css';
import './styles/components.css';

const PORTAL_MODULES = [
  'dashboard',
  'create-booking',
  'bookings',
  'dispatch',
  'tracking',
  'customers',
  'reports',
  'settings',
  'staff',
];


/**
 * Parses the current URL hash, pathname, and local storage to determine
 * the initial view, active portal module, and query parameters.
 */
const parseCurrentRoute = () => {
  try {
    let raw = (window.location.hash || '').trim();
    if (raw.startsWith('#/')) raw = raw.slice(2);
    else if (raw.startsWith('#')) raw = raw.slice(1);

    // Fallback to pathname if hash is absent
    if (!raw) {
      const path = (window.location.pathname || '').trim().replace(/^\//, '');
      if (path) raw = path;
    }

    const [routePath, queryString] = raw.split('?');
    const normalized = (routePath || '').trim().toLowerCase();

    // Query param helper
    let orderId = '';
    if (queryString) {
      const params = new URLSearchParams(queryString);
      orderId = params.get('orderId') || params.get('id') || '';
    }

    // 1. Public home
    if (!normalized || normalized === 'home' || normalized === 'index.html') {
      return { view: 'home', module: 'dashboard', orderId: '' };
    }

    // 2. Super Admin SaaS portal
    if (normalized === 'superadmin' || normalized === 'saas' || normalized === 'admin-saas') {
      return { view: 'superadmin', module: 'dashboard', orderId: '' };
    }

    // 3. Login screen
    if (normalized === 'login' || normalized === 'portal/login') {
      return { view: 'login', module: 'dashboard', orderId: '' };
    }

    // 4. Public tracking
    if (normalized === 'track' || normalized === 'tracking-public' || normalized.startsWith('track/')) {
      const subId = normalized.startsWith('track/') ? normalized.split('/')[1] : '';
      return { view: 'track', module: 'tracking', orderId: orderId || subId };
    }

    // 5. Portal modules (e.g. #create-booking, #dispatch, #reports, #portal/create-booking)
    const cleanedModule = normalized.replace(/^portal\//, '');
    if (PORTAL_MODULES.includes(cleanedModule)) {
      return { view: 'portal', module: cleanedModule, orderId };
    }

    // 6. Generic #portal
    if (normalized === 'portal') {
      const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
      return { view: 'portal', module: lastMod, orderId: '' };
    }

    // 7. LocalStorage fallback
    const savedRoute = localStorage.getItem('courier_active_route');
    const savedMod = localStorage.getItem('courier_active_module') || 'dashboard';
    if (savedRoute === 'superadmin') {
      return { view: 'superadmin', module: 'dashboard', orderId: '' };
    }
    if (savedRoute === 'portal') {
      return { view: 'portal', module: savedMod, orderId: '' };
    }
    if (savedRoute === 'track' || savedRoute === 'login') {
      return { view: savedRoute, module: 'dashboard', orderId: '' };
    }

    return { view: 'home', module: 'dashboard', orderId: '' };
  } catch {
    return { view: 'home', module: 'dashboard', orderId: '' };
  }
};

const MainApp = () => {
  const { isAuthenticated, isLoading, user, isImpersonating, exitImpersonation } = useAuth();
  const { companySettings, refreshCompanySettings } = useCompanySettings();

  // Initialize route state directly from current URL on load / refresh
  const [routeState, setRouteState] = useState(() => parseCurrentRoute());
  const [trackedOrderId, setTrackedOrderId] = useState(() => routeState.orderId || '');

  // Synchronize route state with URL hash and LocalStorage
  const updateRoute = useCallback((view, module = 'dashboard', orderId = '') => {
    let hash = '';
    if (view === 'superadmin') {
      hash = '#superadmin';
      localStorage.setItem('courier_active_route', 'superadmin');
    } else if (view === 'portal') {
      hash = `#${module}`;
      localStorage.setItem('courier_active_route', 'portal');
      localStorage.setItem('courier_active_module', module);
    } else if (view === 'track') {
      hash = orderId ? `#track?id=${encodeURIComponent(orderId)}` : '#track';
      localStorage.setItem('courier_active_route', 'track');
    } else if (view === 'login') {
      hash = '#login';
      localStorage.setItem('courier_active_route', 'login');
    } else {
      hash = '#home';
      localStorage.setItem('courier_active_route', 'home');
    }

    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }

    setRouteState({ view, module, orderId });
    if (orderId) {
      setTrackedOrderId(orderId);
    }
  }, []);

  // Listen for browser back/forward and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const next = parseCurrentRoute();
      setRouteState(next);
      if (next.orderId) {
        setTrackedOrderId(next.orderId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Sync initial URL hash on mount if currently empty
  useEffect(() => {
    if (!window.location.hash && routeState.view !== 'home') {
      if (routeState.view === 'portal') {
        window.location.hash = `#${routeState.module}`;
      } else {
        window.location.hash = `#${routeState.view}`;
      }
    }
  }, [routeState]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0d2137',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            {companySettings?.companyName || 'Courier & Logistics Management'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
            Loading secure operations workspace...
          </div>
        </div>
      </div>
    );
  }

  // If in superadmin view:
  if (routeState.view === 'superadmin') {
    if (!isAuthenticated) {
      return (
        <LoginPage
          onNavigate={(view) => updateRoute(view)}
          onLoginSuccess={(loggedUser) => {
            const role = loggedUser?.role || user?.role;
            if (role === 'superadmin') {
              updateRoute('superadmin');
            } else if (role === 'staff') {
              updateRoute('portal', 'create-booking');
            } else {
              const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
              updateRoute('portal', lastMod);
            }
          }}
          companySettings={companySettings}
        />
      );
    }

    if (user?.role !== 'superadmin' && !isImpersonating) {
      // Regular tenant admin or staff attempted to open superadmin route; fallback to tenant portal
      return (
        <PortalLayout
          key={user?.id || user?.tenantId || 'portal-admin'}
          activeModule={routeState.module}
          onSelectModule={(mod) => updateRoute('portal', mod)}
          onNavigatePublic={() => updateRoute('home')}
          companySettings={companySettings}
          onRefreshCompanySettings={refreshCompanySettings}
        />
      );
    }

    return (
      <SuperAdminPage
        onNavigatePublic={() => updateRoute('home')}
        onOpenTenantPortal={() => updateRoute('portal', 'dashboard')}
      />
    );
  }

  // If in portal view:
  if (routeState.view === 'portal') {
    if (!isAuthenticated) {
      return (
        <LoginPage
          onNavigate={(view) => updateRoute(view)}
          onLoginSuccess={(loggedUser) => {
            const role = loggedUser?.role || user?.role;
            if (role === 'superadmin') {
              updateRoute('superadmin');
            } else if (role === 'staff') {
              updateRoute('portal', 'create-booking');
            } else {
              const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
              updateRoute('portal', lastMod);
            }
          }}
          companySettings={companySettings}
        />
      );
    }

    // If logged in as platform Super Admin and NOT impersonating, route to Super Admin SaaS Console
    if (user?.role === 'superadmin' && !isImpersonating) {
      return (
        <SuperAdminPage
          onNavigatePublic={() => updateRoute('home')}
          onOpenTenantPortal={() => updateRoute('portal', 'dashboard')}
        />
      );
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Impersonation Top Floating Notification Bar */}
        {isImpersonating && (
          <div
            style={{
              backgroundColor: '#f59e0b',
              color: '#78350f',
              padding: '0.5rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              fontWeight: 700,
              position: 'sticky',
              top: 0,
              zIndex: 99999,
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
              borderBottom: '2px solid #d97706',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', backgroundColor: '#78350f', color: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>Super Admin</span>
              <span>
                Impersonation Mode: viewing & managing{' '}
                <strong>{user?.tenant?.companyName || user?.name || 'Tenant'}</strong> workspace
              </span>
            </div>
            <button
              onClick={async () => {
                exitImpersonation();
                if (refreshCompanySettings) {
                  await refreshCompanySettings();
                }
                updateRoute('superadmin');
              }}
              style={{
                backgroundColor: '#78350f',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 0.9rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.02em',
                transition: 'all 0.15s ease',
              }}
            >
              Exit Impersonation & Return to SaaS Platform &rarr;
            </button>
          </div>
        )}

        <div style={{ flex: 1 }}>
          <PortalLayout
            key={user?.id || user?.tenantId || 'portal'}
            activeModule={routeState.module}
            onSelectModule={(mod) => updateRoute('portal', mod)}
            onNavigatePublic={() => updateRoute('home')}
            companySettings={companySettings}
            onRefreshCompanySettings={refreshCompanySettings}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={routeState.view}
        companySettings={companySettings}
        onNavigate={(view) => {
          if (view === 'portal') {
            if (!isAuthenticated) {
              updateRoute('login');
            } else if (user?.role === 'superadmin' && !isImpersonating) {
              updateRoute('superadmin');
            } else if (user?.role === 'staff') {
              const savedMod = localStorage.getItem('courier_active_module');
              const staffMod = ['create-booking', 'bookings', 'dispatch', 'tracking'].includes(savedMod) ? savedMod : 'create-booking';
              updateRoute('portal', staffMod);
            } else {
              const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
              updateRoute('portal', lastMod);
            }
          } else {
            updateRoute(view);
          }
        }}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {routeState.view === 'home' && (
          <HomePage
            companySettings={companySettings}
            onNavigate={(view) => {
              if (view === 'portal') {
                if (user?.role === 'superadmin' && !isImpersonating) {
                  updateRoute('superadmin');
                } else if (user?.role === 'staff') {
                  const savedMod = localStorage.getItem('courier_active_module');
                  const staffMod = ['create-booking', 'bookings', 'dispatch', 'tracking'].includes(savedMod) ? savedMod : 'create-booking';
                  updateRoute('portal', staffMod);
                } else {
                  const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
                  updateRoute('portal', lastMod);
                }
              } else {
                updateRoute(view);
              }
            }}
            onTrackOrder={(id) => {
              updateRoute('track', 'tracking', id);
            }}
          />
        )}

        {routeState.view === 'track' && (
          <TrackingPage
            initialOrderId={trackedOrderId}
            companySettings={companySettings}
            onNavigate={(view) => updateRoute(view)}
          />
        )}

        {routeState.view === 'login' && (
          <LoginPage
            companySettings={companySettings}
            onNavigate={(view) => updateRoute(view)}
            onLoginSuccess={(loggedUser) => {
              const role = loggedUser?.role || user?.role;
              if (role === 'superadmin') {
                updateRoute('superadmin');
              } else {
                const lastMod = localStorage.getItem('courier_active_module') || 'dashboard';
                updateRoute('portal', lastMod);
              }
            }}
          />
        )}
      </main>

      <Footer companySettings={companySettings} onNavigate={(view) => updateRoute(view)} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CompanyProvider>
          <MainApp />
        </CompanyProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

