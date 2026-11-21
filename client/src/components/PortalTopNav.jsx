import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  Bus,
  Search,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Truck,
  MapPin,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

export const PortalTopNav = ({
  activeModule,
  onSelectModule,
  pendingDispatchCount = 0,
  onOpenStaff,
  companySettings: propCompanySettings,
}) => {
  const { user, logout } = useAuth();
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
        year: 'numeric',
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

  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = isStaff
    ? [
        { id: 'create-booking', label: 'Create Booking', icon: PackagePlus },
        { id: 'bookings', label: 'Bookings List', icon: Package },
        { id: 'tracking', label: 'Parcel Tracking', icon: Search },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'create-booking', label: 'Create Booking', icon: PackagePlus },
        { id: 'bookings', label: 'Bookings List', icon: Package },
        {
          id: 'dispatch',
          label: 'Bus Dispatch',
          icon: Bus,
          badge: pendingDispatchCount > 0 ? pendingDispatchCount : null,
        },
        { id: 'tracking', label: 'Parcel Tracking', icon: Search },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'reports', label: 'Reports & Revenue', icon: BarChart3 },
        ...(isAdmin ? [{ id: 'settings', label: 'System Settings', icon: Settings }] : []),
        ...(isAdmin ? [{ id: 'staff', label: 'Staff Management', icon: UserCheck }] : []),
      ];

  const handleModuleClick = (modId) => {
    if (modId === 'staff' && onOpenStaff) {
      onOpenStaff();
      return;
    }
    onSelectModule(modId);
  };

  return (
    <header className="portal-topnav no-print">
      {/* Top Line: Brand on Left, Meta & Action Controls on Far Right */}
      <div className="portal-topnav-main">
        {/* Brand Area */}
        <div
          className="portal-brand-area"
          onClick={() => handleModuleClick(isStaff ? 'create-booking' : 'dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <div className="portal-brand-logo-wrap">
            <img
              src={company.logoUrl || '/logo.png'}
              alt={company.companyName || 'Brand Logo'}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              style={{
                display: 'none',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Truck size={22} />
            </div>
          </div>
          <div className="portal-brand-text-container">
            <div className="portal-brand-title">
              {company.companyName || user?.tenantName || user?.tenant?.companyName || 'Sri Vinayaka Logistics'}
            </div>
            <span className="portal-brand-desk-badge">
              {isStaff ? 'Counter Desk' : 'Operations Desk'}
            </span>
          </div>
        </div>

        {/* Status Indicators & Action Controls */}
        <div className="portal-meta-bar">
          {user?.branch && (
            <div className="portal-meta-item" title="Operational Branch">
              <MapPin size={14} />
              <span>{user.branch}</span>
            </div>
          )}

          <div className="portal-meta-item" title="System Live Time">
            <Clock size={14} />
            <span>{timeStr}</span>
          </div>

          {/* Active Logged-In User Details */}
          <div
            className="portal-meta-item"
            style={{
              fontWeight: 600,
              color: '#f8fafc',
              backgroundColor: 'rgba(255,255,255,0.08)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={`Logged in as ${user?.name || user?.username} (${user?.role || 'staff'})`}
          >
            <UserCheck size={14} color="#60a5fa" />
            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || user?.username || (user?.role === 'admin' ? 'Admin' : 'Staff')}
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '3px',
                backgroundColor: user?.role === 'admin' ? '#2563eb' : (user?.role === 'superadmin' ? '#7c3aed' : '#475569'),
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {user?.role === 'admin' ? 'Admin' : (user?.role === 'superadmin' ? 'Super Admin' : 'Staff')}
            </span>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={() => (onOpenStaff ? onOpenStaff() : handleModuleClick('staff'))}
              className={`portal-meta-action-btn ${activeModule === 'staff' ? 'active' : ''}`}
              title="Manage Counter Staff Accounts"
            >
              <Users size={13} />
              <span>Staff Accounts</span>
            </button>
          )}

          <button
            onClick={logout}
            className="portal-meta-logout-btn"
            title="Sign Out"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar (Clean Horizontal Navigation) */}
      <nav className="portal-nav-bar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <div
              key={item.id}
              className={`portal-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleModuleClick(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge !== null && item.badge !== undefined && (
                <span className="portal-nav-badge">{item.badge}</span>
              )}
            </div>
          );
        })}
      </nav>
    </header>
  );
};
