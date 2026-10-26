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
  fromCity: '',
  gstin: '',
  receiptFooterNote: 'Thank you for choosing our bus parcel service. Present this receipt or 6-digit Order ID at destination counter.',
  termsAndConditions: `1. Goods carried strictly at owner's risk; company is not liable for leakage, breakage, or natural damages.
2. Value of goods must be declared at booking; company liability for undeclared items is strictly limited to ₹500.
3. Hazardous, contraband, inflammable, or prohibited goods are strictly not accepted.
4. Demurrage will be levied if cargo is not claimed within 24 hours of bus arrival at destination.
5. Consignee must verify package condition before counter delivery acknowledgment.
6. Original LR copy or SMS verification must be produced at destination counter to claim consignment.
7. All disputes are subject to local jurisdiction only.`,
  standardRoutes: [],
  // Dynamic Enterprise SaaS Homepage CMS Defaults
  announcementText: 'Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts.',
  announcementLink: '#services',
  showAnnouncement: true,
  heroBadge: 'Verified Counter-to-Counter Parcel Network',
  heroTitle: 'Premier Bus Parcel & Logistics Network',
  heroSubtitle: 'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.',
  heroPrimaryCtaText: 'Operations Portal',
  heroPrimaryCtaLink: '#login',
  heroSecondaryCtaText: 'Track Consignment',
  heroSecondaryCtaLink: '#track',
  heroStats: [
    { label: 'Active Hubs', value: '8+', subtext: 'Connected Destination Cities' },
    { label: 'Daily Fleet', value: '180+', subtext: 'Scheduled Bus Dispatches' },
    { label: 'All Cargo', value: '100%', subtext: 'Standard Freight Categories' },
    { label: 'Verified SLA', value: '99.8%', subtext: 'Handover & Timely Delivery' },
  ],
  servicesTitle: 'Enterprise Bus Parcel Services for Commercial Vendors',
  servicesSubtitle: 'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.',
  services: [
    {
      id: 'whatsapp-service',
      title: 'Automated WhatsApp Notifications',
      description: 'The moment a parcel is booked, an automated WhatsApp alert is dispatched to both sender and consignee with the 6-digit LR tracking number and live status link.',
      badge: 'Instant Delivery Alert',
      icon: 'MessageSquare',
      highlight: true,
    },
    {
      id: 'tracking-service',
      title: 'Zero-Friction Parcel Tracking',
      description: 'Customers and vendors easily track consignments in real-time using their 6-digit Order ID, displaying assigned bus number, driver dispatch contact, and destination counter.',
      badge: 'Real-Time Telemetry',
      icon: 'Search',
      highlight: true,
    },
    {
      id: 'batch-assign-service',
      title: 'Assign Multiple Parcels to Bus at a Time',
      description: 'Counter dispatchers can batch-select dozens of waiting parcels for any destination city and allocate them to a scheduled passenger bus luggage bay in one click.',
      badge: 'Bulk Bay Dispatch',
      icon: 'Bus',
      highlight: true,
    },
    {
      id: 'counter-booking-service',
      title: 'Counter Booking Engine for Vendors',
      description: 'High-speed counter interface for commercial merchants: auto-generates 6-digit Order IDs, calculates weight-based or category pricing, and prints receipts instantly.',
      badge: 'High Speed Booking',
      icon: 'Package',
      highlight: false,
    },
    {
      id: 'staff-minimal-access',
      title: 'Staff Login with Minimal Scoped Access',
      description: 'Counter clerks, loading supervisors, and delivery operators log in with strictly scoped permissions to create bookings and load buses without accessing corporate financials.',
      badge: 'Role Security',
      icon: 'ShieldCheck',
      highlight: false,
    },
    {
      id: 'scheduled-bus-network',
      title: 'Daily Scheduled Passenger Bus Connectivity',
      description: 'Leveraging existing high-frequency intercity passenger bus timetables, providing faster turnaround and lower demurrage than conventional slow trucking networks.',
      badge: 'Express Transit',
      icon: 'Truck',
      highlight: false,
    },
  ],
  howItWorksTitle: 'How It Works: Step-by-Step Logistics Workflow',
  howItWorksSubtitle: 'From counter parcel booking to verified destination counter handover across our scheduled bus network.',
  howItWorksSteps: [
    {
      stepNumber: 1,
      title: 'Book Parcel & Generate 6-Digit Order ID',
      description: 'The vendor presents goods at the origin hub counter. The counter staff records destination, weight, and parties, instantly generating an official 6-digit LR tracking ID.',
      tag: '1. Booking',
    },
    {
      stepNumber: 2,
      title: 'Automated WhatsApp Message Delivered',
      description: 'System automatically sends a structured WhatsApp message to the consignor and consignee containing consignment details and a single-click live tracking link.',
      tag: '2. WhatsApp Alert',
    },
    {
      stepNumber: 3,
      title: 'Assign Multiple Parcels to Bus Bay',
      description: 'Hub staff groups queued parcels by destination route and batch-assigns them to a scheduled passenger bus with a generated driver dispatch manifest.',
      tag: '3. Fleet Assignment',
    },
    {
      stepNumber: 4,
      title: 'Intercity Bus Transit & Live Monitoring',
      description: 'The parcel travels inside the secure luggage bay of the scheduled bus. Both vendor and customer monitor transit progress and arrival ETA online.',
      tag: '4. Transit',
    },
    {
      stepNumber: 5,
      title: 'Destination Counter Verification & Handover',
      description: 'Upon bus arrival at the destination terminal, counter staff unloads cargo. Consignee presents the 6-digit Order ID or WhatsApp receipt for verified handover.',
      tag: '5. Handover',
    },
  ],
  vendorBenefitsTitle: 'Why Leading Commercial Vendors Choose Us',
  vendorBenefits: [
    {
      title: 'Same-Day & Overnight Passenger Bus Timings',
      description: 'Eliminates regional warehouse consolidation delays. Your parcels travel directly on express passenger bus schedules.',
    },
    {
      title: 'Zero WhatsApp Overhead for Merchants',
      description: 'No manual photo-sharing or texting waybills. Customers receive automated WhatsApp confirmation and tracking links instantly.',
    },
    {
      title: 'Bulk Dispatch Tools for High-Volume Shippers',
      description: 'Assign dozens of cartons and sacks across multiple departure routes within seconds with complete digital manifests.',
    },
    {
      title: 'Minimal Operator Training Required',
      description: 'Staff portals are intuitive and role-restricted, allowing counter clerks to execute bookings and dispatches with zero friction.',
    },
  ],
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
