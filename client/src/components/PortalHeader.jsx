import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  MapPin,
  Plus,
  Globe,
  User,
  Shield,
  Layers,
  ChevronRight,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

const MODULE_TITLES = {
  dashboard: { category: 'Overview', title: 'Operational Analytics & KPI Metrics' },
  'create-booking': { category: 'Counter Operations', title: 'New Consignment Booking & Docket' },
  bookings: { category: 'Consignments', title: 'Live Consignments & Manifest Ledger' },
  dispatch: { category: 'Fleet Logistics', title: 'Scheduled Bus Loading & Dispatch' },
  tracking: { category: 'Live Status', title: 'Parcel & Consignment Status Tracker' },
  customers: { category: 'Directory', title: 'Commercial Clients & Consignors' },
  reports: { category: 'Financials', title: 'Revenue, Audits & Daily Summary' },
  settings: { category: 'System', title: 'Branch Stations & Network Configurations' },
  staff: { category: 'Access Control', title: 'Counter Staff & Permissions' },
};

export const PortalHeader = ({
  activeModule = 'dashboard',
  onSelectModule,
  sidebarOpen = true,
  onToggleSidebar,
  pendingDispatchCount = 0,
  onNavigatePublic,
  onNewBooking,
  companySettings: propCompanySettings,
}) => {
  const { user } = useAuth();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setTimeStr(now.toLocaleString('en-IN', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const meta = MODULE_TITLES[activeModule] || {
    category: 'Logistics',
    title: activeModule ? activeModule.replace('-', ' ').toUpperCase() : 'PORTAL',
  };

  const isStaff = user?.role === 'staff';

  return (
    <header className="portal-header-bar no-print">
      <div className="portal-header-left">
        <button
          type="button"
          className="portal-sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Toggle Navigation Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="portal-header-breadcrumb">
          <span style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500 }}>
            {meta.category}
          </span>
          <ChevronRight size={13} color="#a1a1aa" />
          <span className="active-crumb">{meta.title}</span>
        </div>
      </div>

      <div className="portal-header-right">
        {/* Branch Station Badge */}
        {user?.branch && (
          <div className="portal-header-pill" title="Operational Station Counter">
            <MapPin size={13} color="#6366f1" />
            <span style={{ fontWeight: 600, color: '#18181b' }}>{user.branch}</span>
          </div>
        )}

        {/* Live Network Clock */}
        <div className="portal-header-pill" title="System Live Time">
          <Clock size={13} color="#71717a" />
          <span style={{ fontFamily: 'monospace', fontSize: '0.725rem' }}>{timeStr}</span>
        </div>

        {/* View Public Website */}
        {onNavigatePublic && (
          <button
            type="button"
            className="portal-footer-btn"
            style={{ padding: '0.35rem 0.65rem' }}
            onClick={onNavigatePublic}
            title="Open Public Customer Portal"
          >
            <Globe size={13} color="#64748b" />
            <span className="no-mobile">Public Site</span>
          </button>
        )}

        {/* Fast Action: New Booking Shortcut Button */}
        {activeModule !== 'create-booking' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onNewBooking || (() => onSelectModule && onSelectModule('create-booking'))}
            title="Record New Consignment (Fast Entry)"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.775rem',
              boxShadow: '0 1px 2px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Plus size={14} />
            <span>New Booking</span>
          </button>
        )}
      </div>
    </header>
  );
};
