import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Trash2, Power, UserCheck, UserX, Shield, RefreshCw, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const StaffManagementModal = ({ isOpen = true, onClose }) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // New staff form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState(user?.branch || 'Main Office Counter');
  const [submitting, setSubmitting] = useState(false);

  // Staff Password Reset State
  const [resettingStaff, setResettingStaff] = useState(null);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingLoading, setResettingLoading] = useState(false);

  const handleResetStaffPassword = async (e) => {
    e.preventDefault();
    if (!newStaffPassword || newStaffPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setResettingLoading(true);
      const res = await api.auth.resetStaffPassword(resettingStaff._id, newStaffPassword);
      if (res.success) {
        showToast(res.message || 'Staff password reset successfully!', 'success');
        setResettingStaff(null);
        setNewStaffPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset staff password', 'error');
    } finally {
      setResettingLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.auth.getUsers();
      if (res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
      setIsAdding(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!name || !username || !email || !password) {
      showToast('Name, username, email, and password are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.auth.createUser({
        name,
        username,
        email,
        password,
        phone,
        branch,
        role: 'staff',
      });

      if (res.success) {
        showToast('Staff member added successfully!', 'success');
        setName('');
        setUsername('');
        setEmail('');
        setPassword('');
        setPhone('');
        setIsAdding(false);
        fetchStaff();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add staff member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member) => {
    try {
      const res = await api.auth.updateUser(member._id, { active: !member.active });
      if (res.success) {
        showToast(`Staff member ${member.active ? 'deactivated' : 'activated'}`, 'success');
        fetchStaff();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update staff status', 'error');
    }
  };

  const handleDeleteStaff = async (member) => {
    if (!window.confirm(`Are you sure you want to remove staff member '${member.name}'?`)) {
      return;
    }

    try {
      const res = await api.auth.deleteUser(member._id);
      if (res.success) {
        showToast('Staff member removed successfully', 'success');
        fetchStaff();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete staff member', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setIsAdding(!isAdding)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          {isAdding ? 'View Staff Directory' : <><Plus size={14} /> Add Counter Staff Member</>}
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Counter Staff & Branch Team</h1>
          <p className="page-subtitle">
            Manage operational accounts for counter staff, set passwords, and grant parcel booking permissions
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          {isAdding ? (
            <form onSubmit={handleCreateStaff}>
              <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
                New counter operators can log into this branch portal to issue bookings, collect payments, and print receipts.
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Staff Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Login Username <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. suresh_counter1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Staff Email <span className="required">*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    placeholder="suresh@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password <span className="required">*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Contact Mobile Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch / Counter Hub</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Counter #1 - MGBS Hub"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Operator Account'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Loading staff accounts...
                </div>
              ) : staffList.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No staff accounts created yet. Click "Add Counter Staff" to invite operators.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {staffList.map((m) => (
                    <div
                      key={m._id}
                      style={{
                        padding: '0.875rem 1.25rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{m.name}</span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: m.role === 'admin' ? '#eff6ff' : '#ecfdf5',
                              color: m.role === 'admin' ? '#1e40af' : '#065f46',
                              fontWeight: 600,
                              border: m.role === 'admin' ? '1px solid #bfdbfe' : '1px solid #a7f3d0',
                            }}
                          >
                            {m.role === 'admin' ? 'Admin' : 'Staff'}
                          </span>
                          {!m.active && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: '#fef2f2',
                                color: '#991b1b',
                                fontWeight: 600,
                                border: '1px solid #fecaca',
                              }}
                            >
                              Deactivated
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          @{m.username} • {m.email} {m.phone ? `• ${m.phone}` : ''} • {m.branch || 'Branch Counter'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {m.role !== 'admin' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Reset Staff Password"
                              onClick={() => {
                                setResettingStaff(m);
                                setNewStaffPassword('');
                                setShowResetPassword(false);
                              }}
                              style={{
                                padding: '0.3rem 0.5rem',
                                color: '#7c3aed',
                                borderColor: '#ddd6fe',
                                backgroundColor: '#f5f3ff',
                              }}
                            >
                              <KeyRound size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title={m.active ? 'Deactivate Account' : 'Activate Account'}
                              onClick={() => handleToggleActive(m)}
                              style={{
                                padding: '0.3rem 0.5rem',
                                color: m.active ? '#991b1b' : '#065f46',
                                borderColor: m.active ? '#fecaca' : '#a7f3d0',
                              }}
                            >
                              <Power size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Delete Staff Member"
                              onClick={() => handleDeleteStaff(m)}
                              style={{ padding: '0.3rem 0.5rem', color: '#991b1b', borderColor: '#fecaca' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', marginTop: '1.5rem', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Reset Staff Password Sub-Modal */}
        {resettingStaff && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setResettingStaff(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '100%',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid #e2e8f0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                  <KeyRound size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Reset Staff Password</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>For {resettingStaff.name} (@{resettingStaff.username})</p>
                </div>
              </div>

              <form onSubmit={handleResetStaffPassword}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimum 6 characters..."
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      style={{ paddingRight: '38px' }}
                      minLength={6}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                        display: 'flex',
                      }}
                      tabIndex={-1}
                    >
                      {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                    Operator will use this new password on their next login.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setResettingStaff(null)}
                    disabled={resettingLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={resettingLoading}
                  >
                    {resettingLoading ? 'Resetting...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const StaffManagementPage = StaffManagementModal;
