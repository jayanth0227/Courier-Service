import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Package,
  TrendingUp,
  Search,
  Plus,
  Edit,
  Key,
  LogIn,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Globe,
  Bus,
  Mail,
  Phone,
  MapPin,
  Lock,
  BarChart3,
  Shield,
  Layers,
  ArrowRight,
  Save,
  Building,
  Upload,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shuffle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCompanySettings } from '../context/CompanyContext';

export const SuperAdminPage = ({ onNavigatePortal, onOpenTenantPortal, onNavigatePublic }) => {
  const { user, logout, impersonateTenant } = useAuth();
  const { showToast } = useToast();
  const { setCompanySettings: setGlobalCompanySettings, refreshCompanySettings } = useCompanySettings();

  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'analytics' | 'cms'
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Website CMS & Company Profile State (Super Admin Only)
  const [cmsSettings, setCmsSettings] = useState({
    companyName: '',
    logoUrl: '/logo.png',
    tagline: 'Parcel & Bus Dispatch Network',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    gstin: '',
    receiptFooterNote: '',
  });
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsSaving, setCmsSaving] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [resetPasswordTenant, setResetPasswordTenant] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmTenant, setDeleteConfirmTenant] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Helpers for unique ID and temporary password generation
  const generateUniqueTenantId = (name = '') => {
    let prefix = 'CR';
    if (name && name.trim().length >= 2) {
      const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (clean.length >= 2) {
        prefix = clean.slice(0, 2);
      }
    } else {
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      prefix = `${alpha[Math.floor(Math.random() * alpha.length)]}${alpha[Math.floor(Math.random() * alpha.length)]}`;
    }
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${num}`;
  };

  const generateTempPassword = () => {
    const prefixes = ['Temp', 'Pass', 'Fast', 'Admin'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${p}#${num}`;
  };

  // Streamlined New Tenant Form state
  const [formData, setFormData] = useState({
    companyName: '',
    uniqueId: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    plan: 'PRO',
    adminUsername: '',
    adminPassword: '',
    address: '',
    adminBranch: '',
  });

  const handleOpenAddModal = () => {
    const initialId = generateUniqueTenantId();
    const initialPass = generateTempPassword();
    setFormData({
      companyName: '',
      uniqueId: initialId,
      slug: initialId.toLowerCase(),
      contactEmail: '',
      contactPhone: '',
      plan: 'PRO',
      adminUsername: '',
      adminPassword: initialPass,
      address: '',
      adminBranch: 'Central Hub',
    });
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleCopyText = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopiedKey(''), 2500);
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes] = await Promise.all([
        api.superadmin.getStats(),
        api.superadmin.getTenants(),
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (tenantsRes.success) {
        setTenants(tenantsRes.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load Super Admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchCmsSettings();
  }, []);

  const fetchCmsSettings = async () => {
    try {
      setCmsLoading(true);
      const res = await api.superadmin.getSettings();
      if (res && res.success && res.data) {
        setCmsSettings({
          companyName: res.data.companyName || '',
          logoUrl: res.data.logoUrl || '/logo.png',
          tagline: res.data.tagline || 'Parcel & Bus Dispatch Network',
          companyPhone: res.data.companyPhone || '',
          companyEmail: res.data.companyEmail || '',
          companyAddress: res.data.companyAddress || '',
          gstin: res.data.gstin || '',
          receiptFooterNote: res.data.receiptFooterNote || '',
        });
      }
    } catch (err) {
      console.warn('Failed to load CMS settings:', err);
    } finally {
      setCmsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cms') {
      fetchCmsSettings();
    }
  }, [activeTab]);

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setCmsSettings((prev) => ({ ...prev, logoUrl: base64 }));
      showToast('Logo image uploaded! Click Save to apply changes across the platform.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCmsSettings = async (e) => {
    e.preventDefault();
    if (!cmsSettings.companyName.trim()) {
      showToast('Company Name is required', 'error');
      return;
    }

    try {
      setCmsSaving(true);
      const res = await api.superadmin.updateSettings(cmsSettings);
      if (res && res.success) {
        showToast('Company Profile & Website CMS updated successfully!', 'success');
        if (setGlobalCompanySettings) {
          setGlobalCompanySettings(res.data);
        }
        if (refreshCompanySettings) {
          refreshCompanySettings();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to save Company Profile & CMS', 'error');
    } finally {
      setCmsSaving(false);
    }
  };

  // Handle New Tenant submit (Streamlined with automated Unique ID and Temp Password)
  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.uniqueId.trim() || !formData.contactEmail.trim() || !formData.contactPhone.trim() || !formData.adminUsername.trim() || !formData.adminPassword.trim()) {
      showToast('Please fill in all required fields (Organization Name, Unique ID, Email, Phone, Username, Temporary Password)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanId = formData.uniqueId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const payload = {
        companyName: formData.companyName.trim(),
        uniqueId: cleanId,
        slug: cleanId.toLowerCase(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        plan: formData.plan || 'PRO',
        adminUsername: formData.adminUsername.trim().toLowerCase(),
        adminPassword: formData.adminPassword.trim(),
        address: (formData.address || '').trim() || 'Central Bus Terminal Office',
        adminBranch: (formData.adminBranch || '').trim() || 'Central Hub',
      };

      const res = await api.superadmin.createTenant(payload);
      if (res.success) {
        showToast(res.message || 'Tenant onboarded successfully!', 'success');
        setIsAddModalOpen(false);
        setCreatedCredentials({
          companyName: payload.companyName,
          uniqueId: payload.uniqueId,
          username: payload.adminUsername,
          password: payload.adminPassword,
          email: payload.contactEmail,
          phone: payload.contactPhone,
          plan: payload.plan,
          address: payload.address,
          branch: payload.adminBranch,
        });
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to onboard tenant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Permanent Delete Tenant
  const handleDeleteTenant = async () => {
    if (!deleteConfirmTenant) return;
    try {
      setIsDeleting(true);
      const res = await api.superadmin.deleteTenant(deleteConfirmTenant._id);
      if (res.success) {
        showToast(res.message || `Organization '${deleteConfirmTenant.companyName}' permanently deleted`, 'success');
        setDeleteConfirmTenant(null);
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete organization', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Edit Tenant submit
  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      setIsSubmitting(true);
      const res = await api.superadmin.updateTenant(editingTenant._id, editingTenant);
      if (res.success) {
        showToast('Tenant updated successfully', 'success');
        setEditingTenant(null);
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update tenant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Password submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordTenant || !newPassword) return;

    try {
      setIsSubmitting(true);
      const res = await api.superadmin.resetPassword(resetPasswordTenant._id, newPassword);
      if (res.success) {
        showToast(res.message || 'Password reset successfully', 'success');
        setResetPasswordTenant(null);
        setNewPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle 1-Click Impersonation
  const handleImpersonate = async (tenantId) => {
    try {
      showToast('Opening tenant operations workspace...', 'info');
      await impersonateTenant(tenantId);
      if (refreshCompanySettings) {
        await refreshCompanySettings();
      }
      if (onOpenTenantPortal) {
        onOpenTenantPortal('dashboard');
      } else if (onNavigatePortal) {
        onNavigatePortal('dashboard');
      } else {
        window.location.hash = '#dashboard';
      }
    } catch (err) {
      showToast(err.message || 'Failed to impersonate tenant', 'error');
    }
  };

  // Toggle Suspend/Active
  const handleToggleStatus = async (tenant) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.superadmin.updateTenant(tenant._id, { status: nextStatus });
      if (res.success) {
        showToast(`Tenant status changed to ${nextStatus}`, 'success');
        fetchDashboardData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.companyName?.toLowerCase().includes(q) ||
      t.slug?.toLowerCase().includes(q) ||
      t.contactEmail?.toLowerCase().includes(q) ||
      t.contactPhone?.includes(q) ||
      t.adminUser?.username?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || t.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="portal-layout-topbar">
      {/* 1. Standard Application Top Navigation (Matching PortalTopNav) */}
      <header className="portal-topnav no-print">
        <div className="portal-topnav-main">
          {/* Brand Area */}
          <div className="portal-brand-area" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('tenants')}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                padding: '2px',
              }}
            >
              <img
                src={cmsSettings.logoUrl || '/logo.png'}
                alt={cmsSettings.companyName || 'Brand Logo'}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Shield size={20} />
              </div>
            </div>
            <div>
              <div className="portal-brand-title">
                <span>{cmsSettings.companyName || 'Logistics Management SaaS'}</span>
                <span className="portal-admin-tag">SUPER ADMIN</span>
              </div>
              <div className="portal-brand-sub">{cmsSettings.tagline || 'Multi-Tenant Management & Business Directory'}</div>
            </div>
          </div>

          {/* Status Indicators & Action Controls */}
          <div className="portal-meta-bar">
            <div className="portal-clock-pill" title="System Live Time">
              <span>{timeStr}</span>
            </div>

            {onNavigatePublic && (
              <button
                onClick={onNavigatePublic}
                className="portal-globe-btn"
                title="View Website & Tracking"
              >
                <Globe size={13} />
                <span>Website</span>
              </button>
            )}

            <button
              onClick={fetchDashboardData}
              className="portal-globe-btn"
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={logout}
              className="portal-logout-btn"
              title="Logout"
            >
              <Power size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Module Navigation Tabs Bar */}
        <nav className="portal-nav-bar">
          <div
            className={`portal-nav-item ${activeTab === 'tenants' ? 'active' : ''}`}
            onClick={() => setActiveTab('tenants')}
          >
            <Building2 size={16} />
            <span>Courier Organizations</span>
            {tenants.length > 0 && <span className="portal-nav-badge">{tenants.length}</span>}
          </div>

          <div
            className={`portal-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            <span>Platform Analytics</span>
          </div>

          <div
            className={`portal-nav-item ${activeTab === 'cms' ? 'active' : ''}`}
            onClick={() => setActiveTab('cms')}
          >
            <Globe size={16} />
            <span>Company Profile & Website CMS</span>
          </div>
        </nav>
      </header>

      {/* 2. Main Workspace (Standard Light Background) */}
      <main className="portal-content" style={{ padding: '1.5rem 1.75rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              {activeTab === 'tenants'
                ? 'Registered Courier Organizations'
                : activeTab === 'analytics'
                ? 'Platform Operations & Revenue Analytics'
                : 'Company Profile & Website CMS Management'}
            </h1>
            <p className="page-subtitle" style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '3px' }}>
              {activeTab === 'tenants'
                ? 'Manage independent courier businesses, configure service limits, access branch portals, and onboard new organizations.'
                : activeTab === 'analytics'
                ? 'Platform-wide consignment totals, gross logistics freight revenue, and fleet utilization across all tenants.'
                : 'Super Admin exclusive control: customize platform logo, company sub-tagline, contact helpline, branch address, and receipt terms.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            {activeTab === 'cms' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchCmsSettings}
                disabled={cmsLoading}
              >
                <RefreshCw size={14} className={cmsLoading ? 'spin' : ''} />
                <span>Reload Profile</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} />
                  <span>Refresh Data</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenAddModal}
                >
                  <Plus size={15} />
                  <span>Onboard New Tenant</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Executive KPI Metric Cards (Only shown on Tenants & Analytics tabs) */}
        {activeTab !== 'cms' && (
          <div className="dashboard-stats-grid" style={{ marginBottom: '1.25rem' }}>
          {/* Card 1: Total Tenants */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Courier Tenants</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <Building2 size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.totalTenants || tenants.length || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Active: {stats?.activeTenants || 0} organizations</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Live</span>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Active Subscriptions</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#059669' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.activeTenants || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Suspended: {stats?.suspendedTenants || 0}</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>100% Operational</span>
            </div>
          </div>

          {/* Card 3: Total Bookings */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Platform Consignments</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#2563eb' }}>
                <Package size={18} />
              </div>
            </div>
            <div className="stat-card-value">{stats?.totalBookings || 0}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dispatches: {stats?.totalDispatches || 0}</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Across all tenants</span>
            </div>
          </div>

          {/* Card 4: Gross Freight Volume */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Gross Platform Revenue</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#d97706' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-card-value">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>All Tenancies Combined</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Consolidated Volume</span>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'tenants' ? (
          <>
            {/* Search and Filters Bar */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by company name, slug, phone, email, or admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2rem' }}
                />
                <Search
                  size={15}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>

              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>

              <select
                className="form-control"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="ALL">All Plans</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              {(searchQuery || statusFilter !== 'ALL' || planFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setPlanFilter('ALL');
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Organizations Table Container */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  Registered Courier Organizations ({filteredTenants.length})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Live Data Isolated per Tenant ID
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Company / Organization</th>
                      <th>Plan</th>
                      <th>Admin Account</th>
                      <th>Usage Metrics</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                          Loading tenant directory...
                        </td>
                      </tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                          No courier organizations match your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => {
                        const planColor =
                          t.plan === 'ENTERPRISE'
                            ? { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }
                            : t.plan === 'PRO'
                            ? { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
                            : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

                        const isActive = t.status === 'ACTIVE';

                        return (
                          <tr key={t._id}>
                            {/* Company Name, Unique ID & Contact */}
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                                {t.companyName}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    backgroundColor: '#f8fafc',
                                    color: '#1e3a5f',
                                    borderRadius: '3px',
                                    border: '1px solid #cbd5e1',
                                    letterSpacing: '0.04em',
                                  }}
                                  title="Automated Unique Organization ID"
                                >
                                  ID: {t.uniqueId || t.slug?.toUpperCase()}
                                </span>
                                {t.contactPhone && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    • {t.contactPhone}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Plan Badge */}
                            <td>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: planColor.bg,
                                  color: planColor.text,
                                  border: `1px solid ${planColor.border}`,
                                }}
                              >
                                {t.plan || 'PRO'}
                              </span>
                            </td>

                            {/* Admin User */}
                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>
                                {t.adminUser?.name || 'Administrator'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                @{t.adminUser?.username || 'admin'} • {t.adminUser?.email || t.contactEmail}
                              </div>
                            </td>

                            {/* Usage Metrics */}
                            <td>
                              <div style={{ fontSize: '0.8125rem', color: '#0f172a', display: 'flex', gap: '0.75rem' }}>
                                <span>
                                  <strong>{t.metrics?.bookingsCount ?? 0}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Bookings</span>
                                </span>
                                <span>
                                  <strong>{t.metrics?.busesCount ?? 0}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Buses</span>
                                </span>
                                <span>
                                  <strong>{t.metrics?.staffCount ?? 1}</strong>{' '}
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Staff</span>
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                                  color: isActive ? '#065f46' : '#991b1b',
                                  border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#10b981' : '#ef4444',
                                  }}
                                />
                                {t.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleImpersonate(t._id)}
                                  title="1-Click Impersonate & Enter Tenant Portal"
                                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                                >
                                  <LogIn size={13} />
                                  <span>Portal</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setEditingTenant(t)}
                                  title="Edit Organization Details"
                                  style={{ padding: '0.3rem 0.5rem' }}
                                >
                                  <Edit size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setResetPasswordTenant(t);
                                    setNewPassword('');
                                  }}
                                  title="Reset Admin Password"
                                  style={{ padding: '0.3rem 0.5rem' }}
                                >
                                  <Key size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleToggleStatus(t)}
                                  title={isActive ? 'Suspend Access' : 'Activate Access'}
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    color: isActive ? '#991b1b' : '#065f46',
                                    borderColor: isActive ? '#fecaca' : '#a7f3d0',
                                  }}
                                >
                                  <Power size={13} />
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setDeleteConfirmTenant(t)}
                                  title="Permanently Delete Organization"
                                  style={{
                                    padding: '0.3rem 0.5rem',
                                    color: '#dc2626',
                                    borderColor: '#fecaca',
                                    backgroundColor: '#fff5f5',
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Platform Analytics View (Matches style of Reports & Dashboard) */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {/* Box 1: Plan Breakdown */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                Subscription Plan Distribution
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Active tier allocation across all courier business tenancies
              </div>

              {['BASIC', 'PRO', 'ENTERPRISE'].map((plan) => {
                const count = tenants.filter((t) => (t.plan || 'PRO') === plan).length;
                const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
                return (
                  <div key={plan} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{plan}</span>
                      <span style={{ color: '#64748b' }}>
                        {count} tenants ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: plan === 'ENTERPRISE' ? '#7c3aed' : plan === 'PRO' ? '#2563eb' : '#64748b',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Box 2: Top Active Tenants by Consignment Volume */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                Top Tenancies by Consignments
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                Organizations generating the highest parcel traffic
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...tenants]
                  .sort((a, b) => (b.metrics?.bookingsCount || 0) - (a.metrics?.bookingsCount || 0))
                  .slice(0, 5)
                  .map((t, idx) => (
                    <div
                      key={t._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.625rem 0.75rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: idx === 0 ? '#fef3c7' : '#f1f5f9',
                            color: idx === 0 ? '#92400e' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.6875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a' }}>
                            {t.companyName}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                            slug: {t.slug}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          {t.metrics?.bookingsCount || 0}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>consignments</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Company Profile & Website CMS (Super Admin Exclusive) */}
        {activeTab === 'cms' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <form onSubmit={handleSaveCmsSettings}>
              {/* Brand Logo & Visual Identity Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Building size={18} color="#0f172a" />
                  <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                    Brand Logo & Visual Identity
                  </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Upload company logo or select preset logo. Applies across Public Home, Tracking, TopNav, Bill Receipts, and Reports.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Logo Previews (Light & Dark BG) */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Light Header / Receipt Preview
                      </div>
                      <div
                        style={{
                          width: '140px',
                          height: '80px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={cmsSettings.logoUrl || '/logo.png'}
                          alt="Logo Light Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Admin Dark TopNav Preview
                      </div>
                      <div
                        style={{
                          width: '140px',
                          height: '80px',
                          borderRadius: '6px',
                          border: '1px solid #334155',
                          backgroundColor: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={cmsSettings.logoUrl || '/logo.png'}
                          alt="Logo Dark Preview"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload and Logo Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ marginBottom: '4px' }}>
                        Upload New Logo Image (PNG / JPG / SVG)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="form-control"
                        style={{ padding: '6px 8px', fontSize: '0.8125rem' }}
                      />
                      <div className="form-hint">Converts to high-resolution format and applies platform-wide</div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setCmsSettings((prev) => ({ ...prev, logoUrl: '/sv-logo.png' }));
                          showToast('Selected Sleek SV Logistics Logo! Click Save to apply.', 'success');
                        }}
                      >
                        Use Sleek SV Logo
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setCmsSettings((prev) => ({ ...prev, logoUrl: '/logo.png' }));
                          showToast('Reset to default logo. Click Save to apply.', 'success');
                        }}
                      >
                        Reset to Default Logo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Logo URL / Tagline */}
                <div className="form-row" style={{ marginTop: '1rem', marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Custom Logo Image URL / Path (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="/logo.png or https://example.com/logo.png"
                      value={cmsSettings.logoUrl || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, logoUrl: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company Sub-Tagline</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Parcel & Bus Dispatch Network"
                      value={cmsSettings.tagline || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, tagline: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Company Details Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  marginBottom: '1.5rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 700 }}>
                  Company Details (Appears on Consignment Receipts & Public Portal)
                </h3>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Company / Service Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={cmsSettings.companyName || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Helpline / Counter Contact Phone <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={cmsSettings.companyPhone || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Official Support Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={cmsSettings.companyEmail || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, companyEmail: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GSTIN / Registration No. (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 36AAAAA0000A1Z5"
                      value={cmsSettings.gstin || ''}
                      onChange={(e) => setCmsSettings({ ...cmsSettings, gstin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Registered Branch / Physical Counter Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={cmsSettings.companyAddress || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, companyAddress: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Consignment Receipt Footer Terms / Note</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={cmsSettings.receiptFooterNote || ''}
                    onChange={(e) => setCmsSettings({ ...cmsSettings, receiptFooterNote: e.target.value })}
                  />
                </div>
              </div>

              {/* Save Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary" disabled={cmsSaving || cmsLoading}>
                  <Save size={16} />
                  <span>{cmsSaving ? 'Saving Profile...' : 'Save Company Profile & CMS'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* 3. Standard Modals (Clean White Enterprise Design System) */}

      {/* Modal: Onboard New Courier Organization (Streamlined with Required Details Only) */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="#0f172a" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Onboard New Courier Business
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
                  Automated onboarding initializes an isolated tenancy, creates the tenant administrator account with a temporary password, and provisions default operational routes.
                </div>

                {/* 1. Organization Details */}
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">Organization Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Navata Road Transport"
                    value={formData.companyName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData((prev) => {
                        const cleanWord = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const suggestedUsername = cleanWord ? `${cleanWord}_admin` : '';
                        return {
                          ...prev,
                          companyName: name,
                          adminUsername: (!prev.adminUsername || prev.adminUsername.endsWith('_admin')) ? suggestedUsername : prev.adminUsername,
                        };
                      });
                    }}
                    required
                  />
                </div>

                {/* Unique ID & Subscription Tier */}
                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Automated Unique ID <span className="required">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const newId = generateUniqueTenantId(formData.companyName);
                          setFormData((prev) => ({ ...prev, uniqueId: newId, slug: newId.toLowerCase() }));
                          showToast(`Generated Unique ID: ${newId}`, 'info');
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        <Shuffle size={12} /> Regenerate
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. NV4829"
                        value={formData.uniqueId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                          setFormData({ ...formData, uniqueId: val, slug: val.toLowerCase() });
                        }}
                        maxLength={8}
                        style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
                        required
                      />
                    </div>
                    <div className="form-hint">Unique 4-6 alphanumeric code for organization isolation</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subscription Tier <span className="required">*</span></label>
                    <select
                      className="form-control"
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      required
                    >
                      <option value="BASIC">Basic (Single Branch)</option>
                      <option value="PRO">Pro (Multi-Branch Fleet)</option>
                      <option value="ENTERPRISE">Enterprise (Unlimited Buses & Hubs)</option>
                    </select>
                  </div>
                </div>

                {/* Official Mail & Phone */}
                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Official Mail (Email) <span className="required">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. contact@navata.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9848012345"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 2. Admin Login Credentials */}
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.5rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  Admin Login & Temporary Password
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admin Username <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. navata_admin"
                      value={formData.adminUsername}
                      onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      required
                    />
                    <div className="form-hint">Used by tenant admin to sign in to portal</div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Automated Temp Password <span className="required">*</span></label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPass = generateTempPassword();
                          setFormData((prev) => ({ ...prev, adminPassword: newPass }));
                          showToast('Generated new temporary password', 'info');
                        }}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        <Shuffle size={12} /> Regenerate
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Temporary password"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        style={{ paddingRight: '65px', fontFamily: 'monospace', fontWeight: 600 }}
                        required
                      />
                      <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.adminPassword, 'tempPass')}
                          title="Copy temporary password"
                          style={{ background: 'none', border: 'none', color: copiedKey === 'tempPass' ? '#059669' : '#64748b', cursor: 'pointer', padding: '4px' }}
                        >
                          {copiedKey === 'tempPass' ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-hint">Admin must change password after first sign-in</div>
                  </div>
                </div>

                {/* 3. Operational Hub & Counter Address */}
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.5rem', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                  Operational Hub & Counter Address
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Primary Branch / Hub Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Central Hub / Counter 1"
                      value={formData.adminBranch || ''}
                      onChange={(e) => setFormData({ ...formData, adminBranch: e.target.value })}
                    />
                    <div className="form-hint">Displayed on operator topnav and parcel manifests</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Physical Office / Counter Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Platform 4, Central Bus Station, MG Road"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <div className="form-hint">Printed on customer receipts & delivery waybills</div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Onboarding...' : 'Onboard Business & Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Onboarded Credentials Summary (Copy & Share) */}
      {createdCredentials && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#166534' }}>
                  Organization Onboarded Successfully
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setCreatedCredentials(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
                The courier business has been registered and isolated in the platform. Please copy the temporary login credentials below and share them with the business admin.
              </p>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Organization:</span>
                  <strong style={{ color: '#0f172a' }}>{createdCredentials.companyName}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Unique Organization ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e3a5f', backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '3px' }}>
                    {createdCredentials.uniqueId}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Official Mail:</span>
                  <span style={{ color: '#0f172a' }}>{createdCredentials.email}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Phone Number:</span>
                  <span style={{ color: '#0f172a' }}>{createdCredentials.phone}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Subscription Tier:</span>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>{createdCredentials.plan}</span>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.65rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b' }}>Admin Username:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>@{createdCredentials.username}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#64748b' }}>Temporary Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                        {createdCredentials.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(createdCredentials.password, 'credPass')}
                        style={{ background: 'none', border: 'none', color: copiedKey === 'credPass' ? '#059669' : '#64748b', cursor: 'pointer', padding: '3px' }}
                        title="Copy password"
                      >
                        {copiedKey === 'credPass' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const summary = `=== Courier Service Organization Credentials ===\nOrganization: ${createdCredentials.companyName}\nUnique ID: ${createdCredentials.uniqueId}\nAdmin Username: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.password}\nOfficial Email: ${createdCredentials.email}\nPhone: ${createdCredentials.phone}\nSubscription Tier: ${createdCredentials.plan}\nPortal Login: ${window.location.origin}/#portal`;
                  handleCopyText(summary, 'allCreds');
                }}
              >
                {copiedKey === 'allCreds' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === 'allCreds' ? 'Credentials Copied!' : 'Copy All Credentials'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreatedCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permanent Delete Confirmation */}
      {deleteConfirmTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#991b1b' }}>
                  Permanently Delete Organization
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDeleteConfirmTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600, marginBottom: '0.75rem' }}>
                Are you sure you want to permanently delete "{deleteConfirmTenant.companyName}"?
              </p>
              <div style={{ backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '6px', padding: '0.85rem', fontSize: '0.8125rem', color: '#7f1d1d', lineHeight: '1.5' }}>
                <strong>Warning:</strong> This action cannot be undone. All data belonging to this organization will be permanently deleted from the database, including:
                <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                  <li>Staff & Admin accounts</li>
                  <li>All Consignment Bookings & Order History</li>
                  <li>Bus Dispatches, Schedules, & Assigned Fleet</li>
                  <li>Destinations, Cities, & Rate Cards</li>
                  <li>Customer Directories & Settings</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeleteConfirmTenant(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteTenant}
                disabled={isDeleting}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting Organization...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Tenant */}
      {editingTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Edit Organization: {editingTenant.companyName}
              </h3>
              <button className="modal-close-btn" onClick={() => setEditingTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTenant.companyName || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, companyName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingTenant.contactPhone || ''}
                      onChange={(e) => setEditingTenant({ ...editingTenant, contactPhone: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editingTenant.contactEmail || ''}
                      onChange={(e) => setEditingTenant({ ...editingTenant, contactEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Subscription Plan</label>
                    <select
                      className="form-control"
                      value={editingTenant.plan || 'PRO'}
                      onChange={(e) => setEditingTenant({ ...editingTenant, plan: e.target.value })}
                    >
                      <option value="BASIC">Basic</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={editingTenant.status || 'ACTIVE'}
                      onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Office Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingTenant.address || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingTenant(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Admin Password */}
      {resetPasswordTenant && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Reset Admin Password
              </h3>
              <button className="modal-close-btn" onClick={() => setResetPasswordTenant(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1rem' }}>
                  Resetting credentials for administrator account of{' '}
                  <strong>{resetPasswordTenant.companyName}</strong> (username:{' '}
                  <code>{resetPasswordTenant.adminUser?.username || 'admin'}</code>).
                </p>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setResetPasswordTenant(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting || !newPassword}
                >
                  {isSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
