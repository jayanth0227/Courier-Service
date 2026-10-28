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
              {company.companyName || 'Logistics Management'}
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
              <MapPin size={13} color="#64748b" />
              <span>{user.branch}</span>
            </div>
          )}

          <div className="portal-meta-item" title="System Live Time">
            <Clock size={13} color="#64748b" />
            <span>{timeStr}</span>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={() => (onOpenStaff ? onOpenStaff() : handleModuleClick('staff'))}
              className={`portal-meta-action-btn ${activeModule === 'staff' ? 'active' : ''}`}
              title="Manage Staff Accounts"
            >
              <Users size={13} />
              <span>Staff</span>
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
