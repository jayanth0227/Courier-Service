import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Save,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Building2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const WhatsAppConfigModal = ({ tenant, isOpen, onClose, onSaved }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const [config, setConfig] = useState({
    whatsappProvider: 'OPENWA',
    whatsappApiUrl: 'http://localhost:2785',
    whatsappApiKey: '',
    openwaSessionId: '',
    whatsappSenderNumber: '',
  });

  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (!isOpen || !tenant) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        setTestResult(null);
        setTestPhone(tenant.contactPhone || '');
        setTestMessage(
          `Hello! This is a WhatsApp gateway test message for *${tenant.companyName}*.\nYour WhatsApp notifications are successfully active!`
        );

        const res = await api.superadmin.getTenantWhatsApp(tenant._id);
        if (res.success && res.data) {
          setConfig({
            whatsappProvider: res.data.whatsappProvider || 'OPENWA',
            whatsappApiUrl: res.data.whatsappApiUrl || 'http://localhost:2785',
            whatsappApiKey: res.data.whatsappApiKey || '',
            openwaSessionId: res.data.openwaSessionId || '',
            whatsappSenderNumber: res.data.whatsappSenderNumber || tenant.contactPhone || '',
          });
        }
      } catch (err) {
        showToast(err.message || 'Failed to load tenant WhatsApp settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [isOpen, tenant, showToast]);

  if (!isOpen || !tenant) return null;

  const handleCopy = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      const res = await api.superadmin.updateTenantWhatsApp(tenant._id, config);
      if (res.success) {
        showToast(res.message || `WhatsApp configuration updated for ${tenant.companyName}`, 'success');
        if (onSaved) onSaved(res.data);
        onClose();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save WhatsApp settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      showToast('Please enter a recipient phone number for the test', 'error');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.superadmin.testTenantWhatsApp(tenant._id, {
        phone: testPhone.trim(),
        message: testMessage.trim(),
      });

      setTestResult({
        success: res.success,
        provider: res.provider,
        message: res.message,
        details: res.details,
        directLink: res.directLink,
      });

      if (res.success) {
        showToast(res.message || 'Test message sent successfully!', 'success');
      } else {
        showToast(res.message || 'Gateway test failed', 'error');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Test connection failed',
      });
      showToast(err.message || 'Test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  WhatsApp Gateway Configuration
                </h3>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    backgroundColor: '#eff6ff',
                    color: '#1e40af',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  ID: {tenant.uniqueId || tenant.slug?.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                Dedicated messaging configuration for <strong>{tenant.companyName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem', color: '#2563eb' }} />
              <div>Loading WhatsApp settings for {tenant.companyName}...</div>
            </div>
          ) : (
            <>
              {/* Provider Selector Card */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.35rem',
                  }}
                >
                  WhatsApp Notification Provider
                </label>
                <select
                  value={config.whatsappProvider}
                  onChange={(e) => setConfig({ ...config, whatsappProvider: e.target.value })}
                  className="form-control"
                  style={{ fontWeight: 600 }}
                >
                  <option value="OPENWA">OpenWA (Self-Hosted WhatsApp Gateway) — Recommended</option>
                  <option value="MOCK">MOCK (Disabled / Console Simulation Mode)</option>
                  <option value="TWILIO">Twilio Programmable WhatsApp</option>
                  <option value="META">Meta WhatsApp Cloud API</option>
                  <option value="WEBHOOK">Custom HTTP Webhook Gateway</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                  {config.whatsappProvider === 'OPENWA'
                    ? 'Connects directly to your local or self-hosted OpenWA gateway for 100% automated consignment updates.'
                    : config.whatsappProvider === 'MOCK'
                    ? 'Messages will be simulated in server logs; no live WhatsApp messages will be dispatched.'
                    : 'External cloud API integration mode.'}
                </div>
              </div>

              {/* OpenWA Configuration Block */}
              {config.whatsappProvider === 'OPENWA' && (
                <div
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(34, 197, 94, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#065f46' }}>
                        OpenWA Gateway Credentials
                      </span>
                    </div>

                    <a
                      href="http://localhost:2785"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#059669',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        backgroundColor: '#ecfdf5',
                        borderRadius: '4px',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>OpenWA Dashboard (Port 2785)</span>
                    </a>
                  </div>

                  {/* API URL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      OpenWA API Base URL
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="http://localhost:2785"
                      value={config.whatsappApiUrl}
                      onChange={(e) => setConfig({ ...config, whatsappApiUrl: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                    />
                    <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '2px' }}>
                      Local gateway address (defaults to http://localhost:2785)
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      OpenWA API Key
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        className="form-control"
                        placeholder="owa_k1_..."
                        value={config.whatsappApiKey}
                        onChange={(e) => setConfig({ ...config, whatsappApiKey: e.target.value })}
                        style={{ fontFamily: 'monospace', fontSize: '0.8125rem', paddingRight: '4.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          padding: '2px 4px',
                        }}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{showApiKey ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '2px' }}>
                      Found in OpenWA project data folder (.api-key) or OpenWA dashboard API settings.
                    </div>
                  </div>

                  {/* Session ID */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      OpenWA Session ID (UUID)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 4f42fc14-ba0e-4f7f-a62b-3a4b0a6c696d"
                      value={config.openwaSessionId}
                      onChange={(e) => setConfig({ ...config, openwaSessionId: e.target.value })}
                      style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                    />
                    <div style={{ fontSize: '0.71875rem', color: '#64748b', marginTop: '2px' }}>
                      UUID of the active authenticated session in OpenWA (e.g. for {tenant.companyName}).
                    </div>
                  </div>
                </div>
              )}

              {/* Other Providers (Twilio / Meta / Webhook) */}
              {config.whatsappProvider !== 'OPENWA' && config.whatsappProvider !== 'MOCK' && (
                <div
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      API URL / Webhook Endpoint
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://api.provider.com/v1/messages"
                      value={config.whatsappApiUrl}
                      onChange={(e) => setConfig({ ...config, whatsappApiUrl: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      API Key / Secret Token
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter provider token"
                      value={config.whatsappApiKey}
                      onChange={(e) => setConfig({ ...config, whatsappApiKey: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                      Sender Phone / Account ID
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 919010253076"
                      value={config.whatsappSenderNumber}
                      onChange={(e) => setConfig({ ...config, whatsappSenderNumber: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Live Test Gateway Section */}
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                  <Zap size={16} color="#d97706" />
                  <span>Verify & Live Test Gateway</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                  Send an immediate test dispatch message to any 10-digit mobile number to verify this client organization's gateway.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Recipient 10-digit mobile (e.g. 9010253076)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    style={{ flex: '1 1 200px', fontSize: '0.8125rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSendTest}
                    disabled={testing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                    }}
                  >
                    {testing ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                    <span>{testing ? 'Sending...' : 'Send Live Test'}</span>
                  </button>
                </div>

                {/* Test Feedback Result */}
                {testResult && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                      color: testResult.success ? '#065f46' : '#991b1b',
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {testResult.success ? (
                        <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                      ) : (
                        <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                      )}
                      <div>
                        <strong>{testResult.success ? 'Gateway Verified!' : 'Test Failed:'}</strong>{' '}
                        <span>{testResult.message}</span>
                      </div>
                    </div>

                    {testResult.directLink && (
                      <a
                        href={testResult.directLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#059669',
                          textDecoration: 'underline',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        wa.me preview
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Updates apply immediately to all upcoming dispatches for {tenant.companyName}.
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 700,
                backgroundColor: '#059669',
                borderColor: '#047857',
              }}
            >
              {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
