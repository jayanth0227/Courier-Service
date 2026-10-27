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
  Shield,
  UserCheck,
  Building,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';

export const Sidebar = ({
  activeModule = 'dashboard',
  onSelectModule,
  pendingDispatchCount = 0,
  onNavigatePublic,
  companySettings: propCompanySettings,
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
  onOpenStaff,
}) => {
  const { user, logout } = useAuth();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navGroups = isStaff
    ? [
        {
          title: 'Counter Ops',
          items: [
            { id: 'create-booking', label: 'New Booking', icon: PackagePlus, highlight: true },
            { id: 'bookings', label: 'Consignment List', icon: Package },
            { id: 'tracking', label: 'Live Tracking', icon: Search },
          ],
        },
      ]
    : [
        {
          title: 'Operations',
          items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'create-booking', label: 'New Booking', icon: PackagePlus, highlight: true },
            { id: 'bookings', label: 'Consignment List', icon: Package },
            {
              id: 'dispatch',
              label: 'Bus Dispatch',
              icon: Bus,
              badge: pendingDispatchCount > 0 ? pendingDispatchCount : null,
            },
          ],
        },
        {
          title: 'Clients & Data',
          items: [
            { id: 'tracking', label: 'Parcel Tracking', icon: Search },
            { id: 'customers', label: 'Customer Directory', icon: Users },
            { id: 'reports', label: 'Reports & Revenue', icon: BarChart3 },
          ],
        },
        {
          title: 'Configuration',
          items: [
            { id: 'settings', label: 'Branch Settings', icon: Settings },
            ...(onOpenStaff || isAdmin
              ? [{ id: 'staff', label: 'Staff Accounts', icon: UserCheck }]
              : []),
          ],
        },
      ];

  const handleLinkClick = (id) => {
    if (id === 'staff' && onOpenStaff) {
      onOpenStaff();
    } else {
      onSelectModule(id);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="portal-sidebar-backdrop no-print"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`portal-sidebar no-print ${collapsed ? 'collapsed' : ''} ${
          mobileOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Brand Header */}
        <div
          className="portal-sidebar-brand"
          onClick={() => handleLinkClick(isStaff ? 'create-booking' : 'dashboard')}
          title="Go to main dashboard"
        >
          <div className="portal-sidebar-logo">
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
                color: '#4f46e5',
              }}
            >
              <Truck size={18} />
            </div>
          </div>

          {!collapsed && (
            <div className="portal-sidebar-title-area">
              <div className="portal-sidebar-title">
                {company.companyName || 'Logistics SaaS'}
              </div>
              <div className="portal-sidebar-sub">
                {isStaff ? 'Staff Counter Station' : 'Operations Terminal'}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="portal-sidebar-nav">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="portal-sidebar-group">
              {!collapsed && (
                <div className="portal-sidebar-group-title">{group.title}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`portal-sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleLinkClick(item.id)}
                    title={item.label}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge !== null && item.badge !== undefined && (
                      <span className="portal-sidebar-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Card & Footer */}
        <div className="portal-sidebar-footer">
          {!collapsed && (
            <div className="portal-operator-card">
              <div className="portal-operator-avatar">
                {(user?.username || user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="portal-operator-info">
                <div className="portal-operator-name">
                  {user?.name || user?.username || 'Staff User'}
                </div>
                <div className="portal-operator-role">
                  {user?.role === 'admin'
                    ? 'Terminal Admin'
                    : user?.role === 'superadmin'
                    ? 'Super Admin'
                    : 'Counter Operator'}
                </div>
              </div>
            </div>
          )}

          <div className="portal-footer-actions">
            <button
              type="button"
              className="portal-footer-btn danger"
              onClick={logout}
              title="Sign Out of Session"
            >
              <LogOut size={13} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
