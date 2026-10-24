import React, { useState } from 'react';
import { Truck, LogIn, Lock, User, AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { useCompanySettings } from '../context/CompanyContext';

export const LoginPage = ({ onNavigate, onLoginSuccess, companySettings: propCompanySettings }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const companyName = company.companyName || 'Logistics Operations';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot / Reset Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim() || !forgotEmail.trim() || !forgotNewPassword) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (forgotNewPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await api.auth.forgotPassword({
        identifier: forgotIdentifier,
        email: forgotEmail,
        newPassword: forgotNewPassword,
      });

      if (res.success) {
        showToast(res.message || 'Password reset successfully! You can now sign in.', 'success');
        setIdentifier(forgotIdentifier);
        setPassword('');
        setShowForgotModal(false);
        setForgotIdentifier('');
        setForgotEmail('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both username/email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login({ identifier: identifier.trim(), password });
      showToast('Login successful! Welcome to Counter Operations.', 'success');
      if (onLoginSuccess) {
        onLoginSuccess(res?.user);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button
          onClick={() => onNavigate('home')}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '1.25rem' }}
        >
          <ArrowLeft size={14} />
          Back to Website
        </button>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 0.85rem auto',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '6px',
              }}
            >
              <img
                src={company.logoUrl || '/logo.png'}
                alt={companyName}
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
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Truck size={24} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 700, fontFamily: 'var(--font-family)', margin: 0 }}>
              {companyName}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500, fontFamily: 'var(--font-family)' }}>
              Sign in to manage consignments & fleet operations
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                fontFamily: 'var(--font-family)',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '0.8125rem' }}>
                Username or Email
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your username..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ fontFamily: 'var(--font-family)', fontWeight: 600, fontSize: '0.8125rem', margin: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotIdentifier(identifier);
                    setShowForgotModal(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  Forgot / Reset Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '42px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem', fontWeight: 600, fontSize: '0.875rem' }}
              disabled={loading}
            >
              <LogIn size={16} />
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px dashed #e2e8f0',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.5rem', fontFamily: 'var(--font-family)' }}>
              Quick Credentials Auto-Fill:
            </div>
            <div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{
                  width: '100%',
                  fontSize: '0.75rem',
                  padding: '0.45rem',
                }}
                onClick={() => {
                  setIdentifier('superadmin');
                  setPassword('superadmin123');
                }}
              >
                Platform Super Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Reset Account Password</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>For Admin or Counter Staff accounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleForgotPasswordSubmit}>
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Username or Email <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter account username or email..."
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Registered Account Email <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter registered official email for verification..."
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                    Used to verify account ownership before updating credentials.
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>New Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showForgotNew ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimum 6 characters..."
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      style={{ paddingRight: '38px' }}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNew(!showForgotNew)}
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
                      {showForgotNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Confirm New Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showForgotConfirm ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Re-enter new password..."
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      style={{ paddingRight: '38px' }}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirm(!showForgotConfirm)}
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
                      {showForgotConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={forgotLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CheckCircle2 size={14} />
                  <span>{forgotLoading ? 'Updating...' : 'Reset & Save Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
