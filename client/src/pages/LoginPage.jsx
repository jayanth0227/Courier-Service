import React, { useState, useEffect } from 'react';
import {
  Truck,
  LogIn,
  Lock,
  User,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  X,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Send,
} from 'lucide-react';
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

  // 2-Step Email OTP Forgot / Reset Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP & Reset
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Timer for OTP resend cooldown
  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown]);

  const resetForgotState = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotIdentifier('');
    setMaskedEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotLoading(false);
    setResendCountdown(0);
  };

  // Step 1: Send OTP to User's registered email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanKey = forgotIdentifier.trim();
    if (!cleanKey) {
      showToast('Please enter your account username or registered email', 'error');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await api.auth.sendResetOtp({ identifier: cleanKey });
      if (res.success) {
        setMaskedEmail(res.maskedEmail || 'your registered email');
        setForgotStep(2);
        setResendCountdown(60);
        showToast(res.message || 'Verification code sent to your email!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch verification code', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP and apply new password
  const handleVerifyAndResetPassword = async (e) => {
    e.preventDefault();
    const cleanKey = forgotIdentifier.trim();
    const cleanCode = forgotOtp.trim();

    if (!cleanKey || !cleanCode || !forgotNewPassword) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (cleanCode.length !== 6) {
      showToast('Please enter the complete 6-digit verification code', 'error');
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
      const res = await api.auth.verifyAndResetPassword({
        identifier: cleanKey,
        otp: cleanCode,
        newPassword: forgotNewPassword,
      });

      if (res.success) {
        showToast(res.message || 'Password updated successfully! You can now log in.', 'success');
        setIdentifier(cleanKey);
        setPassword('');
        resetForgotState();
      }
    } catch (err) {
      showToast(err.message || 'Verification failed. Please check the code.', 'error');
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
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        backgroundColor: '#ffffff',
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
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '2.5rem 2rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 0.85rem auto',
                borderRadius: '10px',
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
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '6px',
                }}
              >
                <Truck size={24} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', color: '#09090b', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.02em' }}>
              {companyName}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#71717a', marginTop: '0.35rem', fontWeight: 500, fontFamily: 'var(--font-family)' }}>
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
        </div>
      </div>

      {/* 2-Step Email OTP Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={resetForgotState}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.15rem 1.35rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.975rem', color: '#0f172a', fontWeight: 700 }}>
                    {forgotStep === 1 ? 'Forgot Password' : 'Enter Verification Code'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    {forgotStep === 1 ? 'Step 1 of 2: Request Email OTP' : 'Step 2 of 2: Verify & Reset Password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForgotState}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp}>
                <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      fontSize: '0.785rem',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    <Mail size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      Enter your account <strong>username</strong> or <strong>registered email</strong>. We will dispatch a 6-digit one-time verification code (OTP) to your inbox.
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      Username or Registered Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. staff1 or admin@mrcargo.com"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ padding: '0.875rem 1.35rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={resetForgotState}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={forgotLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Enter OTP & New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyAndResetPassword}>
                <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontSize: '0.785rem',
                      color: '#1e40af',
                    }}
                  >
                    <ShieldCheck size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      Code sent to <strong>{maskedEmail}</strong>. Valid for 10 minutes.
                    </div>
                  </div>

                  {/* 6-Digit OTP Input */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      6-Digit Verification Code (OTP) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="form-control"
                      placeholder="• • • • • •"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        letterSpacing: '0.35em',
                        fontFamily: 'monospace',
                        height: '46px',
                        backgroundColor: '#fbfcfe',
                      }}
                      required
                      autoFocus
                    />
                  </div>

                  {/* New Password */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showForgotNew ? 'text' : 'password'}
                        className="form-control"
                        placeholder="At least 6 characters..."
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

                  {/* Confirm Password */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
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

                  {/* Resend Code Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '2px' }}>
                    <span style={{ color: '#64748b' }}>Didn't receive email?</span>
                    {resendCountdown > 0 ? (
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                        Resend code in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={forgotLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        Resend Verification Code
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: '0.875rem 1.35rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setForgotStep(1)}
                    disabled={forgotLoading}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={forgotLoading || forgotOtp.length !== 6}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{forgotLoading ? 'Verifying...' : 'Verify & Reset Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
