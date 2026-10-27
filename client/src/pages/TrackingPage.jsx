import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  Bus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Printer,
  Phone,
  MapPin,
  RotateCcw,
  User,
  ArrowRight,
  Truck,
  ShieldCheck,
  HelpCircle,
  Building,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';

export const TrackingPage = ({ initialOrderId = '', onNavigate, companySettings: propCompanySettings }) => {
  const { user } = useAuth();
  const isPortal = Boolean(user);
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const { showToast } = useToast();

  const company = propCompanySettings || contextCompanySettings || {};
  const companyName = company.companyName || 'Parcel & Bus Logistics Network';
  const companyPhone = company.companyPhone || '+91 99999 99999';
  const companyEmail = company.companyEmail || 'support@couriersaas.com';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const fetchTracking = async (idToSearch) => {
    const cleanId = (idToSearch || orderId || '').trim().replace(/^#/, '').toUpperCase();
    if (!cleanId) {
      setError('Please enter a valid Order ID (e.g. LR9941 or 6-digit number)');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setTrackingData(null);
      const res = await api.tracking.trackByOrderId(cleanId);
      if (res.success && res.data) {
        setTrackingData(res.data);
      } else {
        setError(res.message || `No consignment found for Order ID #${cleanId}. Please check your receipt.`);
      }
    } catch (err) {
      setError(err.message || 'Unable to load consignment tracking. Please verify the Order ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      setOrderId(initialOrderId);
      fetchTracking(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanId = (orderId || '').trim().replace(/^#/, '').toUpperCase();
    if (!cleanId) {
      setError('Please enter an Order ID or LR number.');
      return;
    }
    fetchTracking(cleanId);
  };

  const handleCopyOrderId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    if (showToast) showToast(`Order ID #${id} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!trackingData) return;
    const origin = window.location.origin;
    const trackingUrl = `${origin}/#track?id=${trackingData.orderId}`;
    const cleanToCity = trackingData.toCity || (trackingData.destination?.includes('→') ? trackingData.destination.split('→').slice(1).join('→').trim() : '');
    const stopAddr = trackingData.deliveryAddress || trackingData.busDetails?.destinationAddress || '';
    const fullStop = stopAddr && cleanToCity && !stopAddr.toLowerCase().includes(cleanToCity.toLowerCase())
      ? `${cleanToCity} - ${stopAddr}`
      : (stopAddr || cleanToCity);

    const text = `*Parcel Tracking - ${companyName}*\n\n*Order ID:* #${trackingData.orderId}\n*Route:* ${trackingData.destination || `${trackingData.fromCity} → ${trackingData.toCity}`}\n*Delivery Stop:* ${fullStop}\n*Status:* ${trackingData.status.replace(/_/g, ' ')}\n${trackingData.busDetails?.busNumber ? `*Bus:* ${trackingData.busDetails.busNumber}\n` : ''}${trackingData.busDetails?.driverPhone ? `*Driver:* ${trackingData.busDetails.driverPhone}\n` : ''}\n*Track Online:* ${trackingUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Determine timeline progress steps & weights
  const getTimelineProgress = (status) => {
    const weights = {
      BOOKED: 1,
      WAITING_FOR_BUS: 2,
      DISPATCHED: 3,
      DELIVERED: 4,
      CANCELLED: 0,
    };
    return weights[status] || 1;
  };

  const currentStepNum = trackingData ? getTimelineProgress(trackingData.status) : 1;
  const isCancelled = trackingData?.status === 'CANCELLED';

  const stepsConfig = [
    {
      step: 1,
      id: 'BOOKED',
      title: 'Booked',
      desc: 'Accepted & labeled at counter',
      icon: Package,
    },
    {
      step: 2,
      id: 'WAITING_FOR_BUS',
      title: 'Waiting for Bus',
      desc: 'Staged in departure bay',
      icon: Clock,
    },
    {
      step: 3,
      id: 'DISPATCHED',
      title: 'In Transit',
      desc: 'On bus en-route to destination',
      icon: Bus,
    },
    {
      step: 4,
      id: 'DELIVERED',
      title: 'Delivered',
      desc: 'Received at destination counter',
      icon: CheckCircle2,
    },
  ];

  return (
    <div style={{ width: '100%', minHeight: '80vh', backgroundColor: isPortal ? 'transparent' : '#ffffff' }}>
      {/* 1. PUBLIC HERO HEADER OR PORTAL HEADER */}
      {!isPortal ? (
        <section className="tracking-hero-section">
          <div className="tracking-hero-grid" />
          <div className="tracking-hero-content">
            {/* Top Navigation Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => (onNavigate ? onNavigate('home') : (window.location.hash = '#home'))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  color: '#18181b',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Home</span>
              </button>

              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#4338ca',
                  letterSpacing: '0.02em',
                }}
              >
                {companyName}
              </div>
            </div>

            {/* Live Tracking Headline Badge */}
            <div className="tracking-badge-pill">
              <span className="tracking-pulse-dot" />
              <span>Real-Time Consignment Tracking</span>
            </div>

            <h1 className="tracking-hero-title">Track Your Consignment</h1>
            <p className="tracking-hero-desc">
              Enter your LR Number or 6-digit Order ID to check live transit status, scheduled bus
              assignment, and counter delivery updates.
            </p>

            {/* Modern Elevated Search Bar */}
            <form onSubmit={handleSearchSubmit} className="tracking-search-box">
              <div className="tracking-input-wrapper">
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="Enter Order ID or LR Number (e.g. LR9941)"
                  value={orderId}
                  onChange={(e) =>
                    setOrderId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                  }
                  maxLength={10}
                  required
                />
                {orderId && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderId('');
                      setTrackingData(null);
                      setError('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: '#e2e8f0',
                      border: 'none',
                      color: '#475569',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                    title="Clear input"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button type="submit" className="tracking-search-btn" disabled={loading}>
                {loading ? (
                  <span>Searching...</span>
                ) : (
                  <>
                    <Search size={17} />
                    <span>Track Parcel</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      ) : (
        /* PORTAL HEADER FOR AUTHENTICATED STAFF / ADMIN */
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '1rem 1.25rem 0' }}>
          <div className="page-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h1 className="page-title">Parcel Consignment Tracking</h1>
              <p className="page-subtitle">
                Search and audit live consignment status, assigned bus dispatch, and destination counter handovers.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="tracking-search-box"
            style={{ marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="tracking-input-wrapper">
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Enter Order ID or LR Number (e.g. LR9941)"
                value={orderId}
                onChange={(e) =>
                  setOrderId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                }
                maxLength={10}
                required
              />
              {orderId && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderId('');
                    setTrackingData(null);
                    setError('');
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: '#e2e8f0',
                    border: 'none',
                    color: '#475569',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button type="submit" className="tracking-search-btn" disabled={loading}>
              {loading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <Search size={16} />
                  <span>Search Order</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 2. MAIN BODY CONTENT */}
      <div className="tracking-main-content">
        {/* Error Banner */}
        {error && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-lg)',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Unable to locate consignment</div>
              <div style={{ fontSize: '0.8125rem', marginTop: '2px', color: '#b91c1c' }}>
                {error}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* 3. ACTIVE TRACKING RESULT DASHBOARD */}
        {trackingData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Overview & Action Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {/* Card Header: LR#, Route, Live Badge & Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.04em',
                      }}
                    >
                      #{trackingData.orderId}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopyOrderId(trackingData.orderId)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.75rem', gap: '4px' }}
                      title="Copy Consignment ID"
                    >
                      {copiedId ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                      <span>{copiedId ? 'Copied' : 'Copy'}</span>
                    </button>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                      }}
                    >
                      <MapPin size={13} />
                      <span>{trackingData.destination || `${trackingData.fromCity} → ${trackingData.toCity}`}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Booked on:{' '}
                    <strong>
                      {new Date(trackingData.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </strong>{' '}
                    • Origin: <strong>{trackingData.fromCity || trackingData.branch || 'Origin Counter'}</strong>
                  </div>
                </div>

                {/* Status Badge & Action Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.45rem 1rem',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      backgroundColor:
                        trackingData.status === 'DELIVERED'
                          ? '#ecfdf5'
                          : trackingData.status === 'DISPATCHED'
                            ? '#eff6ff'
                            : trackingData.status === 'WAITING_FOR_BUS'
                              ? '#fef3c7'
                              : trackingData.status === 'CANCELLED'
                                ? '#fef2f2'
                                : '#e0f2fe',
                      color:
                        trackingData.status === 'DELIVERED'
                          ? '#047857'
                          : trackingData.status === 'DISPATCHED'
                            ? '#1d4ed8'
                            : trackingData.status === 'WAITING_FOR_BUS'
                              ? '#b45309'
                              : trackingData.status === 'CANCELLED'
                                ? '#b91c1c'
                                : '#0369a1',
                      border: `1px solid ${trackingData.status === 'DELIVERED'
                          ? '#a7f3d0'
                          : trackingData.status === 'DISPATCHED'
                            ? '#bfdbfe'
                            : trackingData.status === 'WAITING_FOR_BUS'
                              ? '#fde68a'
                              : trackingData.status === 'CANCELLED'
                                ? '#fecaca'
                                : '#bae6fd'
                        }`,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                      }}
                    />
                    <span>
                      {trackingData.status === 'WAITING_FOR_BUS'
                        ? 'Waiting for Bus'
                        : trackingData.status === 'DISPATCHED'
                          ? 'In Transit'
                          : trackingData.status.replace(/_/g, ' ')}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="btn btn-secondary btn-sm no-print"
                    style={{ gap: '5px' }}
                    title="Share details on WhatsApp"
                  >
                    <Share2 size={13} color="#16a34a" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-secondary btn-sm no-print"
                    style={{ gap: '5px' }}
                    title="Print Consignment Waybill"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTrackingData(null);
                      setOrderId('');
                    }}
                    className="btn btn-secondary btn-sm no-print"
                    style={{ gap: '5px' }}
                    title="Search another Order ID"
                  >
                    <RotateCcw size={13} />
                    <span>New Search</span>
                  </button>
                </div>
              </div>

              {/* TRANSIT PROGRESS STEPPER */}
              <div style={{ margin: '2rem 0 1rem 0' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    position: 'relative',
                    gap: '0.5rem',
                  }}
                >
                  {/* Connecting Progress Track Line */}
                  <div className="tracking-stepper-line">
                    <div
                      className="tracking-stepper-line-active"
                      style={{
                        width: isCancelled
                          ? '0%'
                          : `${Math.min(100, ((currentStepNum - 1) / 3) * 100)}%`,
                      }}
                    />
                  </div>

                  {stepsConfig.map((s) => {
                    const isDone = !isCancelled && s.step <= currentStepNum;
                    const isCurrent = !isCancelled && s.step === currentStepNum;
                    const StepIcon = s.icon;

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          zIndex: 2,
                        }}
                      >
                        {/* Step Node Circle */}
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: isCurrent ? '#2563eb' : isDone ? '#2563eb' : '#ffffff',
                            color: isDone ? '#ffffff' : '#94a3b8',
                            border: isCurrent
                              ? '3px solid #2563eb'
                              : isDone
                                ? '3px solid #2563eb'
                                : '2px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isCurrent
                              ? '0 0 0 4px rgba(37, 99, 235, 0.25)'
                              : '0 2px 4px rgba(0,0,0,0.06)',
                            marginBottom: '0.65rem',
                            transition: 'all 0.25s ease',
                          }}
                        >
                          {isDone && !isCurrent ? (
                            <Check size={18} strokeWidth={3} />
                          ) : (
                            <StepIcon size={17} />
                          )}
                        </div>

                        {/* Step Labels */}
                        <div
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: isCurrent ? 800 : isDone ? 700 : 600,
                            color: isCurrent ? '#2563eb' : isDone ? '#0f172a' : '#64748b',
                          }}
                        >
                          {s.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.71875rem',
                            color: '#64748b',
                            marginTop: '2px',
                            lineHeight: 1.3,
                            maxWidth: '140px',
                          }}
                        >
                          {s.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* TWO-COLUMN DETAILS GRID */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {/* Left Card: Consignment Details */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '1rem',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Package size={16} />
                  </div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Consignment & Cargo Details
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84375rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>From Origin Hub:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {trackingData.fromCity || trackingData.branch || 'Origin Counter'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>To Destination:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {trackingData.toCity || (trackingData.destination?.includes('→') ? trackingData.destination.split('→').slice(1).join('→').trim() : trackingData.destination)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Delivery Terminal / To Address:</span>
                    <span style={{ color: '#2563eb', fontWeight: 700, textAlign: 'right', maxWidth: '65%' }}>
                      {(() => {
                        const city = trackingData.toCity || (trackingData.destination?.includes('→') ? trackingData.destination.split('→').slice(1).join('→').trim() : '');
                        const addr = trackingData.deliveryAddress || trackingData.busDetails?.destinationAddress || '';
                        if (addr && city && !addr.toLowerCase().includes(city.toLowerCase())) {
                          return `${city} - ${addr}`;
                        }
                        return addr || city || 'Main Terminal Counter';
                      })()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sender:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {trackingData.customerName} ({trackingData.customerPhoneMasked})
                    </span>
                  </div>

                  {trackingData.receiverName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Receiver:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {trackingData.receiverName} ({trackingData.receiverPhoneMasked})
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Parcel Category:</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {trackingData.parcelType || 'General Parcel'} ({trackingData.quantity || 1} Pcs, {trackingData.weight || 0} kg)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.75rem',
                      borderTop: '1px dashed #e2e8f0',
                      marginTop: '0.25rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Amount & Payment:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#0f172a', fontSize: '1.05rem' }}>
                        ₹{trackingData.amount}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.71875rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            trackingData.paymentStatus === 'PAID' ? '#dcfce7' : '#fef3c7',
                          color:
                            trackingData.paymentStatus === 'PAID' ? '#166534' : '#92400e',
                        }}
                      >
                        {trackingData.paymentStatus === 'PAID' ? 'PAID' : 'TO PAY'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card: Bus Fleet & Driver Dispatch */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '1rem',
                    paddingBottom: '0.65rem',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bus size={16} />
                  </div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Bus Fleet & Driver Dispatch
                  </h3>
                </div>

                {trackingData.busDetails && trackingData.busDetails.busNumber ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84375rem' }}>
                    {/* Realistic Indian Number Plate Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned Bus:</span>
                      <div className="license-plate-badge">
                        <div className="license-plate-ind">
                          <span>IND</span>
                        </div>
                        <div className="license-plate-text">
                          {trackingData.busDetails.busNumber}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Bus Operator / Fleet:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {trackingData.busDetails.operator ||
                          trackingData.busDetails.busName ||
                          'Scheduled Express Service'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned Driver:</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>
                        {trackingData.busDetails.driverName || 'Designated Driver'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Driver Mobile:</span>
                      {trackingData.busDetails.driverPhone ? (
                        <a
                          href={`tel:${trackingData.busDetails.driverPhone}`}
                          style={{
                            color: '#2563eb',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#eff6ff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          <Phone size={13} />
                          <span>{trackingData.busDetails.driverPhone}</span>
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Not provided</span>
                      )}
                    </div>

                    {trackingData.busDetails.departureTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Departure Time:</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {trackingData.busDetails.departureTime}
                        </span>
                      </div>
                    )}

                    {trackingData.busDetails.dispatchedAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Dispatched Date:</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {new Date(trackingData.busDetails.dispatchedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      backgroundColor: '#fffbeb',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #fef3c7',
                    }}
                  >
                    <Clock size={32} color="#d97706" style={{ marginBottom: '0.65rem' }} />
                    <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.9375rem' }}>
                      Staged in Departure Bay
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#b45309', margin: '0.35rem 0 0 0', lineHeight: 1.45 }}>
                      This consignment is safely verified in the origin hub departure bay. As soon as the scheduled bus is assigned, the vehicle number, departure schedule, and driver contact will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. DEFAULT INITIAL STATE: RICH INFORMATIVE PORTAL (Replaces barren empty white void) */}
        {!trackingData && !loading && (
          <div>
            {/* Interactive How It Works Flow */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                boxShadow: 'var(--shadow-card)',
                marginBottom: '2rem',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#2563eb',
                    letterSpacing: '0.06em',
                  }}
                >
                  Transparent Journey
                </span>
                <h2
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0.25rem 0 0.5rem 0',
                  }}
                >
                  How Express Parcel Tracking Works
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto' }}>
                  From counter receipt to scheduled bus dispatch and terminal delivery, every step is logged live.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    1
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9375rem', color: '#0f172a', fontWeight: 700 }}>
                    Booked at Counter
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                    Consignment weighed, labeled with unique LR number, and digital receipt sent to consignor.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    2
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9375rem', color: '#0f172a', fontWeight: 700 }}>
                    Departure Bay Staged
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                    Sorted by destination city into the departure staging bay awaiting the scheduled evening bus.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    3
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9375rem', color: '#0f172a', fontWeight: 700 }}>
                    Bus In-Transit
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                    Loaded into luggage bay with manifest; bus vehicle number and driver phone become active.
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8125rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    4
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9375rem', color: '#0f172a', fontWeight: 700 }}>
                    Ready for Pickup
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45 }}>
                    Arrived at destination counter terminal. Consignee verified and handed over with proof.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 High-Impact Logistics Features Cards */}
            <div className="tracking-features-grid">
              <div className="tracking-feature-card">
                <div className="tracking-feature-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Bus size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    Scheduled Bus Dispatch
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Directly linked to intercity bus manifests. View assigned vehicle registration plate, departure timings, and direct driver phone line.
                  </p>
                </div>
              </div>

              <div className="tracking-feature-card">
                <div className="tracking-feature-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    Counter-to-Counter Security
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Zero mid-route hub handling. Parcels are safely loaded at departure counters and unloaded directly into destination office counters.
                  </p>
                </div>
              </div>

              <div className="tracking-feature-card">
                <div className="tracking-feature-icon" style={{ backgroundColor: '#fdf2f8', color: '#db2777' }}>
                  <Share2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                    Instant WhatsApp Sharing
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Send direct tracking links and booking summaries to recipients with one tap on WhatsApp. No mobile app download required.
                  </p>
                </div>
              </div>
            </div>

            {/* Helpline / Support Desk Card */}
            <div
              style={{
                marginTop: '2rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Phone size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>
                    Need Assistance with Your Waybill?
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Customer Help Desk operational 06:00 AM – 10:30 PM (7 Days a Week)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href={`tel:${companyPhone}`}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px', padding: '0.5rem 1rem' }}
                >
                  <Phone size={14} />
                  <span>Call {companyPhone}</span>
                </a>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hello ${companyName}, I need assistance tracking my parcel consignment.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px', padding: '0.5rem 1rem', background: '#16a34a', borderColor: '#16a34a' }}
                >
                  <Share2 size={14} />
                  <span>WhatsApp Desk</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
