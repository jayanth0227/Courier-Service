import React from 'react';
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
  ExternalLink,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

export const Sidebar = ({ activeModule, onSelectModule, pendingDispatchCount = 0, onNavigatePublic, companySettings: propCompanySettings }) => {
  const { user, logout } = useAuth();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const navItems = [
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
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="portal-sidebar no-print">
      <div className="sidebar-header">
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            padding: '2px',
          }}
        >
          <img
            src={company.logoUrl || '/logo.png'}
            alt={company.companyName || 'Logo'}
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
              backgroundColor: '#0f172a',
              color: '#ffffff',
            }}
          >
            <Truck size={18} />
          </div>
        </div>
        <div>
          <div className="sidebar-brand-name">{company.companyName || 'Logistics Management'}</div>
          <div className="sidebar-brand-sub">{company.tagline || 'Parcel & Bus Dispatch'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <div
              key={item.id}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => onSelectModule(item.id)}
            >
              <div className="sidebar-link-content">
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onNavigatePublic}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
        >
          <div className="sidebar-link-content">
            <ExternalLink size={15} />
            <span>Public Website</span>
          </div>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'Staff User'}</span>
            <span className="sidebar-user-role">{user?.role === 'admin' ? 'Administrator' : 'Counter Staff'}</span>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
