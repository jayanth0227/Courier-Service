import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const DEFAULT_COMPANY_SETTINGS = {
  companyName: '',
  logoUrl: '/logo.png',
  tagline: 'Parcel & Bus Dispatch Network',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  gstin: '',
  receiptFooterNote: 'Thank you for choosing our bus parcel service. Present this receipt or 6-digit Order ID at destination counter.',
  standardRoutes: [],
};

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const { user, isImpersonating, token } = useAuth() || {};
  const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);

  const applyDocumentTitle = (name) => {
    if (name) {
      document.title = `${name} - Parcel & Bus Dispatch System`;
    }
  };

  const applyFavicon = (logoUrl) => {
    try {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = logoUrl || '/favicon.svg';
    } catch {
      // Ignore in non-browser environments
    }
  };

  const fetchCompanySettings = useCallback(async () => {
    try {
      setLoading(true);
      let res = null;

      // Determine if active user context is tenant-specific or platform CMS
      const isTenantContext = token && (user?.role === 'admin' || user?.role === 'staff' || isImpersonating);

      if (isTenantContext) {
        try {
          res = await api.settings.get();
        } catch {
          res = await api.settings.getPublic();
        }
      } else {
        res = await api.settings.getPublic();
      }

      if (res && res.success && res.data) {
        setCompanySettings((prev) => ({
          ...prev,
          ...res.data,
        }));
        if (res.data.companyName) {
          applyDocumentTitle(res.data.companyName);
        }
        if (res.data.logoUrl) {
          applyFavicon(res.data.logoUrl);
        }
      }
    } catch (err) {
      console.warn('Could not load company settings:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, user?.tenantId, isImpersonating]);

  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  const updateCompanySettingsState = useCallback((newSettings) => {
    setCompanySettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (updated.companyName) {
        applyDocumentTitle(updated.companyName);
      }
      if (updated.logoUrl) {
        applyFavicon(updated.logoUrl);
      }
      return updated;
    });
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        companySettings,
        setCompanySettings: updateCompanySettingsState,
        refreshCompanySettings: fetchCompanySettings,
        loading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      companySettings: DEFAULT_COMPANY_SETTINGS,
      setCompanySettings: () => {},
      refreshCompanySettings: async () => {},
      loading: false,
    };
  }
  return context;
};
