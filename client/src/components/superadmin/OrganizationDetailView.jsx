import React from 'react';
import {
  ArrowLeft,
  Building2,
  Package,
  TrendingUp,
  Bus,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  Phone,
  Key,
  LogIn,
  Edit,
  Power,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Layers,
  Calendar,
  AlertTriangle,
  Trash2,
  MessageSquare,
} from 'lucide-react';

export const OrganizationDetailView = ({
  tenantId,
  data,
  loading,
  onBack,
  onRefresh,
  onImpersonate,
  onEditTenant,
  onResetPassword,
  onConfigureWhatsApp,
  onSendCredentialsMail,
  onToggleStatus,
  onDeleteTenant,
  onCopyText,
  copiedKey,
}) => {
  if (loading && !data) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem', color: '#2563eb' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Loading organization details & analytics...</div>
        <div style={{ fontSize: '0.8125rem', marginTop: '4px' }}>Fetching operational metrics, staff directory, and consignments</div>
      </div>
    );
  }

  const tenant = data?.tenant;
  const settings = data?.settings;
  const metrics = data?.metrics || {};
  const staff = data?.staff || [];
  const recentBookings = data?.recentBookings || [];

  if (!tenant) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Organization Not Found</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Unable to find organization profile or it may have been deleted.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to All Organizations</span>
        </button>
      </div>
    );
  }

  const isActive = tenant.status === 'ACTIVE';
  const planColor =
    tenant.plan === 'ENTERPRISE'
      ? { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' }
      : tenant.plan === 'PRO'
      ? { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
      : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Top Navigation & Action Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Breadcrumb / Back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, padding: '0.35rem 0.75rem' }}
          >
            <ArrowLeft size={15} />
            <span>Back to All Organizations</span>
          </button>

          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Super Admin</span>
            <span>/</span>
            <span>Registered Organizations</span>
            <span>/</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{tenant.companyName}</span>
          </div>
        </div>

        {/* Organization Title Row & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <Building2 size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                  {tenant.companyName}
                </h2>

                {/* ID badge */}
                <button
                  type="button"
                  onClick={() => onCopyText(tenant.uniqueId || tenant.slug, 'detail_id')}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    backgroundColor: '#f8fafc',
                    color: '#1e3a5f',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Click to copy Unique ID"
                >
                  <span>ID: {tenant.uniqueId || tenant.slug?.toUpperCase()}</span>
                  {copiedKey === 'detail_id' ? <Check size={12} color="#059669" /> : <Copy size={12} color="#64748b" />}
                </button>

                {/* Plan Badge */}
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
                  {tenant.plan || 'PRO'} PLAN
                </span>

                {/* Status Badge */}
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
                  {tenant.status}
                </span>
              </div>

              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>Organization Slug: <strong>{tenant.slug}</strong></span>
                <span>•</span>
                <span>Primary Admin: <strong>{tenant.adminUser?.name || 'Administrator'}</strong> (@{tenant.adminUser?.username || 'admin'})</span>
                <span>•</span>
                <span>Member since {formatDate(tenant.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Quick Management Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onImpersonate(tenant._id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem' }}
              title="1-Click Impersonate & Launch Tenant Workspace"
            >
              <LogIn size={14} />
              <span>Launch Portal</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEditTenant(tenant)}
              title="Edit Organization Master Profile"
            >
              <Edit size={14} />
              <span>Edit Info</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onResetPassword(tenant)}
              title="Reset Administrator Password"
            >
              <Key size={14} />
              <span>Reset Password</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onConfigureWhatsApp && onConfigureWhatsApp(tenant)}
              title="Configure WhatsApp & OpenWA Gateway for this Organization"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
                fontWeight: 600,
              }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp Config</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onSendCredentialsMail && onSendCredentialsMail(tenant)}
              title="Dispatch Official Welcome Email with Banner and Client Credentials"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#1e40af',
                backgroundColor: '#eff6ff',
                borderColor: '#bfdbfe',
                fontWeight: 600,
              }}
            >
              <Mail size={14} />
              <span>Send Credentials Mail</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => onToggleStatus(tenant)}
              title={isActive ? 'Suspend Organization' : 'Activate Organization'}
            >
              <Power size={14} />
              <span>{isActive ? 'Suspend' : 'Activate'}</span>
            </button>

            {onDeleteTenant && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onDeleteTenant(tenant)}
                title="Permanently Delete Organization"
                style={{
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  backgroundColor: '#fff5f5',
                }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Analytics & Operational Metrics Grid (5 KPI Cards) */}
      <div className="dashboard-stats-grid" style={{ marginBottom: 0 }}>
        {/* Consignments */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Consignments</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-card-value">{metrics.bookingsCount ?? 0}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Today: {metrics.todayBookingsCount ?? 0} booked</span>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>90 Days</span>
          </div>
        </div>

        {/* Gross Revenue */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Gross Freight Revenue</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-card-value">₹{(metrics.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Collected freight</span>
            <span style={{ fontWeight: 600, color: '#059669' }}>Operational</span>
          </div>
        </div>

        {/* Fleet Transit Buses */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Fleet Transit Buses</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
              <Bus size={18} />
            </div>
          </div>
          <div className="stat-card-value">{metrics.busesCount ?? 0}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Assigned buses</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Active Fleet</span>
          </div>
        </div>

        {/* Staff / Operators */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Staff Members</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-card-value">{metrics.staffCount ?? staff.length ?? 0}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Plan Limit: {tenant.maxStaff || 25} staff</span>
            <span style={{ fontWeight: 600, color: '#7c3aed' }}>Allocated</span>
          </div>
        </div>

        {/* Dispatch Health */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Dispatch Status</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.25rem', paddingTop: '0.2rem' }}>
            {metrics.pendingCount ?? 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Waiting</span>
          </div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivered: {metrics.deliveredCount ?? 0}</span>
            <span style={{ fontWeight: 600, color: '#059669' }}>Healthy</span>
          </div>
        </div>
      </div>

      {/* 3. Simple Information & Staff Management Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Simple Information Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              <Building2 size={16} color="#2563eb" />
              <span>Simple Information & Profile</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEditTenant(tenant)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Edit
            </button>
          </div>

          <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Info Item 1: Organization Name & Unique ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Company Name:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>{tenant.companyName}</span>
            </div>

            {/* Info Item 2: Unique ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Automated Unique ID:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8125rem', color: '#1e3a5f' }}>
                {tenant.uniqueId || tenant.slug?.toUpperCase()}
              </span>
            </div>

            {/* Info Item 3: Admin Username */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Primary Admin Username:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600 }}>@{tenant.adminUser?.username || 'admin'}</span>
            </div>

            {/* Info Item 4: Contact Email */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Registered Email:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600 }}>{tenant.contactEmail || tenant.adminUser?.email || '—'}</span>
            </div>

            {/* Info Item 5: Contact Phone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Support Contact Mobile:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600 }}>{tenant.contactPhone || '—'}</span>
            </div>

            {/* Info Item 6: Head Office / Counter Address */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Counter Address:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>
                {tenant.address || 'Main Office Counter'}
              </span>
            </div>

            {/* Info Item 7: Primary From City */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Operating Hub (From City):</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
                {settings?.fromCity || tenant.adminUser?.branch || 'Not Set'}
              </span>
            </div>

            {/* Info Item 8: Subscription Plan & Limits */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Subscription Plan:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 700 }}>
                {tenant.plan || 'PRO'} (Max Staff: {tenant.maxStaff || 25}, Max Buses: {tenant.maxBuses || 100})
              </span>
            </div>

            {/* Info Item 9: GSTIN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>GSTIN / Tax Registration:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>
                {settings?.gstin || 'Unregistered / NA'}
              </span>
            </div>

            {/* Info Item 10: Registration Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Onboarded On:</span>
              <span style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600 }}>{formatDateTime(tenant.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Staff Members Directory Table Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              <Users size={16} color="#7c3aed" />
              <span>Authorized Staff Directory ({staff.length})</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Quota: {staff.length} / {tenant.maxStaff || 25} used
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Branch / Counter</th>
                  <th>Contact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No staff members registered under this organization yet.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s._id}>
                      {/* Name & Username */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>{s.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>@{s.username}</div>
                      </td>

                      {/* Role */}
                      <td>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: s.role === 'admin' ? '#eff6ff' : '#f8fafc',
                            color: s.role === 'admin' ? '#1e40af' : '#475569',
                            border: `1px solid ${s.role === 'admin' ? '#bfdbfe' : '#e2e8f0'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {s.role}
                        </span>
                      </td>

                      {/* Branch */}
                      <td style={{ fontSize: '0.75rem', color: '#0f172a' }}>
                        {s.branch || 'Main Counter'}
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#0f172a' }}>{s.phone || '—'}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{s.email}</div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: s.active ? '#065f46' : '#991b1b',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: s.active ? '#10b981' : '#ef4444',
                            }}
                          />
                          {s.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3.5. WhatsApp & Notification Gateway Configuration Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            <MessageSquare size={16} color="#059669" />
            <span>WhatsApp Notification Gateway & OpenWA Configuration</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onConfigureWhatsApp && onConfigureWhatsApp(tenant)}
            style={{
              color: '#059669',
              backgroundColor: '#ecfdf5',
              borderColor: '#a7f3d0',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <MessageSquare size={13} />
            <span>Configure Gateway</span>
          </button>
        </div>

        <div style={{ padding: '1rem 1.15rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Active Provider</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: settings?.whatsappProvider === 'OPENWA' ? '#ecfdf5' : '#f1f5f9',
                  color: settings?.whatsappProvider === 'OPENWA' ? '#047857' : '#334155',
                  border: `1px solid ${settings?.whatsappProvider === 'OPENWA' ? '#a7f3d0' : '#cbd5e1'}`,
                }}
              >
                {settings?.whatsappProvider || 'MOCK'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {settings?.whatsappProvider === 'OPENWA' ? 'Local Gateway' : 'Simulated'}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Gateway / API Endpoint</div>
            <div style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, marginTop: '4px', fontFamily: 'monospace' }}>
              {settings?.whatsappApiUrl || 'http://localhost:2785'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Session Identifier</div>
            <div style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, marginTop: '4px', fontFamily: 'monospace' }}>
              {settings?.openwaSessionId || 'default'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Sender Mobile Number</div>
            <div style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600, marginTop: '4px' }}>
              {settings?.whatsappSenderNumber || 'Not configured'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Consignments Dispatched Under this Organization */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            <Package size={16} color="#2563eb" />
            <span>Recent Consignments & Dispatches ({recentBookings.length})</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Latest 10 bookings dispatched by this organization
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer / Mobile</th>
                <th>Route</th>
                <th>Parcel Details</th>
                <th>Freight</th>
                <th>Status</th>
                <th>Booked By & Time</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No consignments registered under this organization yet.
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => {
                  const statusColors = {
                    BOOKED: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
                    WAITING_FOR_BUS: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
                    DISPATCHED: { bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
                    DELIVERED: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
                    CANCELLED: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
                  };
                  const color = statusColors[b.status] || { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };

                  return (
                    <tr key={b._id}>
                      {/* Order ID */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#1e3a5f',
                            fontSize: '0.8125rem',
                            padding: '2px 6px',
                            backgroundColor: '#f8fafc',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          #{b.orderId}
                        </span>
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8125rem' }}>{b.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{b.customerPhone}</div>
                      </td>

                      {/* Route */}
                      <td style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                        {b.destination || (b.fromCity && b.toCity ? `${b.fromCity} → ${b.toCity}` : '—')}
                      </td>

                      {/* Parcel Details */}
                      <td style={{ fontSize: '0.75rem', color: '#0f172a' }}>
                        <div>{b.parcelType || 'Standard Parcel'}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          Qty: {b.quantity || 1} • {b.weight || 0} kg
                        </div>
                      </td>

                      {/* Freight Amount */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                          ₹{Number(b.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: b.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                          }}
                        >
                          {b.paymentStatus || 'PAID'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '999px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`,
                          }}
                        >
                          {b.status?.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Booked By & Time */}
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 500 }}>
                          {b.bookedByName || 'Staff'}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {formatDateTime(b.createdAt)}
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
    </div>
  );
};
