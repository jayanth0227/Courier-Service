import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  Bus,
  ArrowRight,
  Search,
  CheckCircle2,
  MapPin,
  Phone,
  ShieldCheck,
  Building,
  MessageSquare,
  Check,
  ExternalLink,
  Send,
  Smartphone,
  FileText,
  LogIn,
} from 'lucide-react';
import { api } from '../services/api';
import { useCompanySettings } from '../context/CompanyContext';
import { InteractiveParticleBackground } from '../components/InteractiveParticleBackground';

// Helper to resolve icon from Super Admin CMS configuration
const renderServiceIcon = (iconName, size = 18, color = '#2563eb') => {
  switch ((iconName || '').toLowerCase()) {
    case 'messagesquare':
    case 'whatsapp':
    case 'message':
      return <MessageSquare size={size} color={color} />;
    case 'bus':
      return <Bus size={size} color={color} />;
    case 'search':
    case 'tracking':
      return <Search size={size} color={color} />;
    case 'shieldcheck':
    case 'shield':
    case 'security':
      return <ShieldCheck size={size} color={color} />;
    case 'truck':
      return <Truck size={size} color={color} />;
    case 'package':
    default:
      return <Package size={size} color={color} />;
  }
};

export const HomePage = ({ onNavigate, onTrackOrder, companySettings: propCompanySettings }) => {
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  // Company Brand Data (Super Admin Controlled)
  const brandName = company.companyName || 'Mr Cargo';
  const tagline = company.tagline || 'Premier Bus Parcel & Logistics Network';
  const companyPhone = company.companyPhone || '+91 99999 99999';
  const companyEmail = company.companyEmail || 'operations@mrcargo.com';
  const companyAddress = company.companyAddress || 'Central Terminal Hub & Logistics Station';
  const gstin = company.gstin || '';

  // Dynamic Hero Configuration (Super Admin Controlled)
  const heroBadge = company.heroBadge || 'Verified Counter-to-Counter Parcel Network';
  const heroTitle = company.heroTitle || 'Premier Bus Parcel & Logistics Network';
  const heroSubtitle =
    company.heroSubtitle ||
    'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.';
  // Hardcoded Hero Action CTA Configuration
  const heroPrimaryCtaText = 'Operations Portal';
  const heroPrimaryCtaLink = '#login';
  const heroSecondaryCtaText = 'Track Consignment';
  const heroSecondaryCtaLink = '#track';

  // Dynamic Stats (Super Admin Controlled)
  const heroStats = useMemo(() => {
    if (Array.isArray(company.heroStats) && company.heroStats.length > 0) {
      return company.heroStats;
    }
    return [
      { label: 'Connected Destination Cities', value: '8+ Hubs', subtext: 'Connected Destination Cities' },
      { label: 'Scheduled Bus Dispatches', value: 'Daily Fleet', subtext: 'Scheduled Bus Dispatches' },
      { label: 'Standard Freight Categories', value: 'All Cargo', subtext: 'Standard Freight Categories' },
      { label: 'Verified Handover SLA', value: '99.8%', subtext: 'Verified Handover SLA' },
    ];
  }, [company.heroStats]);

  // Hardcoded Core Services for Commercial Vendors & Customers
  const servicesTitle = 'Enterprise Bus Parcel Services for Commercial Vendors';
  const servicesSubtitle =
    'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.';
  const servicesList = [
    {
      id: 'whatsapp-service',
      title: 'Automated WhatsApp Notifications',
      description: 'The moment a parcel is booked, an automated WhatsApp alert is dispatched to both sender and consignee with the 6-digit LR tracking number and live status link.',
      badge: 'Instant Delivery Alert',
      icon: 'MessageSquare',
      highlight: true,
    },
    {
      id: 'tracking-service',
      title: 'Zero-Friction Parcel Tracking',
      description: 'Customers and vendors easily track consignments in real-time using their 6-digit Order ID, displaying assigned bus number, driver dispatch contact, and destination counter.',
      badge: 'Real-Time Telemetry',
      icon: 'Search',
      highlight: true,
    },
    {
      id: 'batch-assign-service',
      title: 'Assign Multiple Parcels to Bus at a Time',
      description: 'Counter dispatchers can batch-select dozens of waiting parcels for any destination city and allocate them to a scheduled passenger bus luggage bay in one click.',
      badge: 'Bulk Bay Dispatch',
      icon: 'Bus',
      highlight: true,
    },
    {
      id: 'counter-booking-service',
      title: 'Counter Booking Engine for Vendors',
      description: 'High-speed counter interface for commercial merchants: auto-generates 6-digit Order IDs, calculates weight-based or category pricing, and prints receipts instantly.',
      badge: 'High Speed Booking',
      icon: 'Package',
      highlight: false,
    },
    {
      id: 'staff-minimal-access',
      title: 'Staff Login with Minimal Scoped Access',
      description: 'Counter clerks, loading supervisors, and delivery operators log in with strictly scoped permissions to create bookings and load buses without accessing corporate financials.',
      badge: 'Role Security',
      icon: 'ShieldCheck',
      highlight: false,
    },
    {
      id: 'scheduled-bus-network',
      title: 'Daily Scheduled Passenger Bus Connectivity',
      description: 'Leveraging existing high-frequency intercity passenger bus timetables, providing faster turnaround and lower demurrage than conventional slow trucking networks.',
      badge: 'Express Transit',
      icon: 'Truck',
      highlight: false,
    },
  ];

  // Hardcoded "How It Works" 5-Step Operational Flow
  const howItWorksTitle = 'How It Works: Step-by-Step Logistics Workflow';
  const howItWorksSubtitle =
    'From counter parcel booking to verified destination counter handover across our scheduled bus network.';
  const howItWorksSteps = [
    {
      stepNumber: 1,
      title: 'Book Parcel & Generate 6-Digit Order ID',
      description: 'The vendor presents goods at the origin hub counter. The counter staff records destination, weight, and parties, instantly generating an official 6-digit LR tracking ID.',
      tag: '1. Booking',
    },
    {
      stepNumber: 2,
      title: 'Automated WhatsApp Message Delivered',
      description: 'System automatically sends a structured WhatsApp message to the consignor and consignee containing consignment details and a single-click live tracking link.',
      tag: '2. WhatsApp Alert',
    },
    {
      stepNumber: 3,
      title: 'Assign Multiple Parcels to Bus Bay',
      description: 'Hub staff groups queued parcels by destination route and batch-assigns them to a scheduled passenger bus with a generated driver dispatch manifest.',
      tag: '3. Fleet Assignment',
    },
    {
      stepNumber: 4,
      title: 'Intercity Bus Transit & Live Monitoring',
      description: 'The parcel travels inside the secure luggage bay of the scheduled bus. Both vendor and customer monitor transit progress and arrival ETA online.',
      tag: '4. Transit',
    },
    {
      stepNumber: 5,
      title: 'Destination Counter Verification & Handover',
      description: 'Upon bus arrival at the destination terminal, counter staff unloads cargo. Consignee presents the 6-digit Order ID or WhatsApp receipt for verified handover.',
      tag: '5. Handover',
    },
  ];

  // Hardcoded Commercial Vendor Advantages & B2B Solutions
  const vendorBenefitsTitle = 'Why Leading Commercial Vendors Choose Us';
  const vendorBenefits = [
    {
      title: 'Same-Day & Overnight Passenger Bus Timings',
      description: 'Eliminates regional warehouse consolidation delays. Your parcels travel directly on express passenger bus schedules.',
    },
    {
      title: 'Zero WhatsApp Overhead for Merchants',
      description: 'No manual photo-sharing or texting waybills. Customers receive automated WhatsApp confirmation and tracking links instantly.',
    },
    {
      title: 'Bulk Dispatch Tools for High-Volume Shippers',
      description: 'Assign dozens of cartons and sacks across multiple departure routes within seconds with complete digital manifests.',
    },
    {
      title: 'Minimal Operator Training Required',
      description: 'Staff portals are intuitive and role-restricted, allowing counter clerks to execute bookings and dispatches with zero friction.',
    },
  ];

  // Live Database Records (Cities & Buses)
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);

  // Quick Tracking Search State
  const [orderIdInput, setOrderIdInput] = useState('');
  const [trackError, setTrackError] = useState('');



  // Interactive Consignment Lifecycle Simulator State
  const [activeSimulatorTab, setActiveSimulatorTab] = useState('booking');

  // Interactive Vendor Help Desk Inquiry State
  const [inquiryType, setInquiryType] = useState('Commercial Vendor Booking');
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryCity, setInquiryCity] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryReference, setInquiryReference] = useState('');
  const [inquiryError, setInquiryError] = useState('');

  // Quick Tracking Submission
  const handleTrackSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = (orderIdInput || '').trim().replace(/^#/, '');
    if (!clean) {
      setTrackError('Please enter a 6-digit Order ID or LR Number');
      return;
    }
    setTrackError('');
    if (onTrackOrder) {
      onTrackOrder(clean);
    } else {
      window.location.hash = `#track?id=${encodeURIComponent(clean)}`;
    }
  };

  // Smooth scroll with fixed navbar offset to prevent content going under navbar
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const navHeight = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // CTA navigation handler
  const handleCtaClick = (link) => {
    if (!link) return;
    if (link.startsWith('#')) {
      const target = link.replace('#', '');
      if (target === 'login' || target === 'track' || target === 'superadmin') {
        onNavigate(target);
      } else {
        scrollToSection(target);
      }
    } else {
      window.location.href = link;
    }
  };

  // Vendor Inquiry Form Submit - Persists to MongoDB and alerts operations desk
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryPhone.trim()) {
      alert('Please provide your name and phone number so our team can reach you.');
      return;
    }

    const payload = {
      inquiryType,
      name: inquiryName.trim(),
      phone: inquiryPhone.trim(),
      city: inquiryCity.trim() || 'Central Terminal Hub',
      message: inquiryMessage.trim(),
    };

    try {
      setInquirySubmitting(true);
      setInquiryError('');

      const res = await api.inquiries.create(payload);
      const refNumber = res?.data?.referenceNumber || `INQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setInquiryReference(refNumber);
      setInquirySubmitted(true);

      // Resilient local store sync for superadmin fallback
      try {
        const localList = JSON.parse(localStorage.getItem('mrcargo_inquiries') || '[]');
        const localRecord = {
          _id: res?.data?.id || `inq_${Date.now()}`,
          referenceNumber: refNumber,
          inquiryType: payload.inquiryType,
          name: payload.name,
          phone: payload.phone,
          city: payload.city,
          message: payload.message,
          status: 'New',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('mrcargo_inquiries', JSON.stringify([localRecord, ...localList.filter((i) => i.referenceNumber !== refNumber)]));
      } catch {
        // Ignore local storage errors
      }
    } catch (err) {
      console.warn('API inquiry error, falling back gracefully:', err);
      const fallbackRef = `INQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setInquiryReference(fallbackRef);
      setInquirySubmitted(true);
      try {
        const localList = JSON.parse(localStorage.getItem('mrcargo_inquiries') || '[]');
        const localRecord = {
          _id: `inq_${Date.now()}`,
          referenceNumber: fallbackRef,
          inquiryType: payload.inquiryType,
          name: payload.name,
          phone: payload.phone,
          city: payload.city,
          message: payload.message,
          status: 'New',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('mrcargo_inquiries', JSON.stringify([localRecord, ...localList]));
      } catch {
        // Ignore
      }
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      {/* 1. PROFESSIONAL SAAS HERO & UNIFIED DISPATCH CONSOLE */}
      <section id="home" className="hero-main-section-modern">
        {/* Interactive Logistics Constellation Particle Network */}
        <InteractiveParticleBackground />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 2, width: '100%', boxSizing: 'border-box' }}>
          {/* Top Trust Micro-Pill */}
          <div style={{ textAlign: 'center' }}>
            <div className="hero-trust-badge-pill">
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#4f46e5',
                  boxShadow: '0 0 8px #4f46e5',
                  display: 'inline-block',
                }}
              />
              <span>{heroBadge || 'Verified Counter-to-Counter Parcel Network'}</span>
            </div>
          </div>

          {/* Centered / Dynamic High-Impact Headline */}
          <div style={{ textAlign: 'center' }}>
            <h1 className="hero-headline-modern">
              {heroTitle || 'Premier Bus Parcel & Logistics Network'}
            </h1>
            <p className="hero-subtext-modern">
              {heroSubtitle ||
                'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.'}
            </p>

            {/* Unified Feature Highlights Trust Ribbon */}
            <div className="hero-trust-ribbon">
              <span
                className="hero-ribbon-chip"
                onClick={() => scrollToSection('services')}
              >
                <MessageSquare size={13} color="#2563eb" />
                <span>Instant WhatsApp Alerts</span>
              </span>

              <span
                className="hero-ribbon-chip"
                onClick={() => scrollToSection('services')}
              >
                <Bus size={13} color="#4f46e5" />
                <span>180+ Daily Passenger Buses</span>
              </span>

              <span
                className="hero-ribbon-chip"
                onClick={() => scrollToSection('services')}
              >
                <ShieldCheck size={13} color="#059669" />
                <span>Digital OTP Counter Handover</span>
              </span>
            </div>
          </div>

          {/* Unified Two-Column Command Deck: Left = Tracking Console, Right = Live Highway Telemetry */}
          <div className="hero-command-deck-grid">
            {/* Left Console Card: Real-Time Consignment Tracker */}
            <div className="deck-card-modern">
              <div>
                <div className="track-header-row">
                  <div className="track-header-icon">
                    <Search size={16} />
                  </div>
                  <div className="track-header-texts">
                    <h2 className="track-card-heading">
                      Track Consignment Status
                    </h2>
                    <p className="track-card-subtext">
                      Real-time status via 6-digit Order ID
                    </p>
                  </div>
                  <span className="track-live-pill">
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                    <span>Live Telemetry</span>
                  </span>
                </div>

                <form onSubmit={handleTrackSubmit}>
                  <div className="track-form-group">
                    <input
                      type="text"
                      className="track-input-element"
                      placeholder="Enter 6-digit Order ID"
                      value={orderIdInput}
                      onChange={(e) => {
                        setOrderIdInput(e.target.value);
                        if (trackError) setTrackError('');
                      }}
                    />
                    <button
                      type="submit"
                      className="track-submit-action-btn"
                    >
                      <Search size={14} />
                      <span>Track</span>
                    </button>
                  </div>
                  {trackError && (
                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                      {trackError}
                    </div>
                  )}

                  {/* Sample suggestions for rapid test */}
                  <div className="quick-lookup-row">
                    <span>Quick lookup:</span>
                    <button
                      type="button"
                      className="quick-lookup-btn"
                      onClick={() => setOrderIdInput('482195')}
                    >
                      #482195
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      className="quick-lookup-btn"
                      onClick={() => setOrderIdInput('LR9941')}
                    >
                      #LR9941
                    </button>
                  </div>
                </form>
              </div>

              {/* Direct Portal Actions Strip - 100% Identical White Minimal Style */}
              <div className="deck-bottom-actions-row">
                <button
                  type="button"
                  className="deck-bottom-btn"
                  onClick={() => handleCtaClick(heroPrimaryCtaLink)}
                >
                  <LogIn size={14} color="#4f46e5" />
                  <span>Operations Login</span>
                </button>

                <button
                  type="button"
                  className="deck-bottom-btn"
                  onClick={() => scrollToSection('network')}
                >
                  <MapPin size={14} color="#2563eb" />
                  <span>Active Hubs</span>
                </button>
              </div>
            </div>

            {/* Right Telemetry Card: Dynamic Route Visualizer */}
            <div className="deck-card-modern">
              <div>
                <div className="track-header-row">
                  <div
                    className="track-header-icon"
                    style={{ backgroundColor: '#eef2ff', color: '#4f46e5', borderColor: '#c7d2fe' }}
                  >
                    <Bus size={17} />
                  </div>
                  <div className="track-header-texts">
                    <h2 className="track-card-heading">
                      Live Highway Telemetry
                    </h2>
                    <p className="track-card-subtext">
                      Express passenger bus corridor dispatch
                    </p>
                  </div>
                  <span
                    className="track-live-pill"
                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        display: 'inline-block',
                        animation: 'live-ping-green 2s infinite',
                      }}
                    />
                    <span>State Corridor #1</span>
                  </span>
                </div>

                {/* Highway Transit Waypoints Visualizer */}
                <div className="telemetry-waypoints-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Origin Terminal */}
                    <div className="telemetry-hub-item">
                      <div
                        className="telemetry-hub-icon-frame"
                        style={{ border: '1px solid #c7d2fe', color: '#4f46e5' }}
                      >
                        <Building size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="telemetry-hub-label">
                          Origin Hub
                        </div>
                        <div className="telemetry-hub-name">
                          Central Station Counter
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          color: '#4338ca',
                          backgroundColor: '#eef2ff',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #c7d2fe',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        Dispatched
                      </span>
                    </div>

                    {/* Animated Transit Connector Strip */}
                    <div className="telemetry-bus-connector">
                      <div style={{ width: '2px', height: '22px', backgroundColor: '#4f46e5', borderRadius: '2px' }} />
                      <div className="telemetry-transit-pill">
                        <Bus size={13} color="#4f46e5" style={{ animation: 'subtle-float 2.5s infinite ease-in-out' }} />
                        <span>Daily Scheduled Bus Bay #2</span>
                      </div>
                    </div>

                    {/* Destination Terminal */}
                    <div className="telemetry-hub-item">
                      <div
                        className="telemetry-hub-icon-frame"
                        style={{ border: '1px solid #a7f3d0', color: '#059669' }}
                      >
                        <MapPin size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="telemetry-hub-label">
                          Destination Counter
                        </div>
                        <div className="telemetry-hub-name">
                          Regional Terminal Counter
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          color: '#047857',
                          backgroundColor: '#ecfdf5',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid #a7f3d0',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        OTP Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Highlights Metrics */}
              <div className="telemetry-metrics-row">
                <div className="telemetry-metric-box">
                  <Bus size={15} color="#4f46e5" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="telemetry-metric-title">Frequency</div>
                    <div className="telemetry-metric-val">14+ Runs Daily</div>
                  </div>
                </div>

                <div className="telemetry-metric-box">
                  <ShieldCheck size={15} color="#059669" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="telemetry-metric-title">Handover</div>
                    <div className="telemetry-metric-val">OTP Handover</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Sleek Milestone KPI Tiles (Responsive Desktop Row / Mobile List View) */}
          <div className="hero-milestones-grid">
            {heroStats.map((stat, idx) => (
              <div
                key={idx}
                className="hero-milestone-card"
              >
                <div className="hero-milestone-card-inner">
                  <div className="hero-milestone-top-row">
                    <div className="hero-milestone-icon-frame">
                      {idx === 0 && <MapPin size={18} color="#4f46e5" />}
                      {idx === 1 && <Bus size={18} color="#4f46e5" />}
                      {idx === 2 && <Package size={18} color="#4f46e5" />}
                      {idx === 3 && <CheckCircle2 size={18} color="#059669" />}
                    </div>
                    <div className="hero-milestone-val-row">
                      <span className="hero-milestone-val">{stat.value}</span>
                      <span className="hero-milestone-lbl">{stat.label}</span>
                    </div>
                  </div>
                  <div className="hero-milestone-sub">
                    {stat.subtext}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CORE SERVICES FOR COMMERCIAL VENDORS & CUSTOMERS (REFINED SLEEK CARDS) */}
      <section
        id="services"
        style={{
          padding: '3rem 1.25rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.25rem auto' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                border: '1px solid #bfdbfe',
              }}
            >
              Enterprise Capabilities
            </span>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: '0.65rem',
                marginBottom: '0.65rem',
                letterSpacing: '-0.02em',
              }}
            >
              {servicesTitle}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.55 }}>
              {servicesSubtitle}
            </p>
          </div>

          {/* High-density, professional SaaS feature card grid (Refined: non-massive) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {servicesList.map((svc) => (
              <div
                key={svc.id}
                className="saas-service-card interactive-card"
                style={{
                  backgroundColor: svc.highlight ? '#fbfcfe' : '#ffffff',
                  border: svc.highlight ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '6px',
                        backgroundColor: svc.highlight ? '#eff6ff' : '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {renderServiceIcon(svc.icon, 18, '#2563eb')}
                    </div>
                    {svc.badge && (
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {svc.badge}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', lineHeight: 1.35 }}>
                    {svc.title}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    {svc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. "HOW IT WORKS" CONNECTED WORKFLOW PIPELINE (REFINED CONNECTED STEPPER) */}
      <section
        id="how-it-works"
        style={{
          padding: '3.25rem 1.25rem',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.25rem auto' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                border: '1px solid #bfdbfe',
              }}
            >
              Operational Workflow
            </span>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#0f172a',
                marginTop: '0.65rem',
                marginBottom: '0.65rem',
                letterSpacing: '-0.02em',
              }}
            >
              {howItWorksTitle}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.55 }}>
              {howItWorksSubtitle}
            </p>
          </div>

          {/* Connected Step Pipeline Grid */}
          <div
            className="how-it-works-pipeline"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '0.85rem',
              position: 'relative',
            }}
          >
            {howItWorksSteps.map((step, idx) => (
              <div
                key={idx}
                className="step-pipeline-card interactive-card"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem 1.1rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {step.stepNumber || idx + 1}
                  </span>
                  {step.tag && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {step.tag}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. B2B LOGISTICS EDGE (REFINED CARDS & NAVIGATES TO CONTACT) */}
      <section
        id="vendor-benefits"
        style={{
          padding: '3rem 1.25rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb' }}>
                B2B Logistics Edge
              </span>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0 0', letterSpacing: '-0.02em' }}>
                {vendorBenefitsTitle}
              </h2>
            </div>

            {/* Direct Navigation to Contact Section as requested */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 600, padding: '0.55rem 1.15rem' }}
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Partner as a Vendor</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {vendorBenefits.map((b, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.35 }}>
                    {b.title}
                  </h3>
                </div>
                <p style={{ fontSize: '0.785rem', color: '#64748b', lineHeight: 1.45, margin: 0, paddingLeft: '1.5rem' }}>
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ABOUT APPLICATION & INTERCITY LOGISTICS NETWORK */}
      <section
        id="network"
        style={{
          padding: '3.25rem 1.25rem',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.25rem auto' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #bfdbfe',
                display: 'inline-block',
                marginBottom: '0.5rem',
              }}
            >
              About {brandName}
            </span>
            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0.25rem 0 0.6rem 0',
                letterSpacing: '-0.02em',
              }}
            >
              Premier Intercity Bus Parcel &amp; Courier Logistics
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              {brandName} is a specialized counter-to-counter courier service leveraging scheduled intercity passenger bus transit. We deliver critical parcels, commercial cartons, and urgent documents across major highway corridors faster than conventional trucking.
            </p>
          </div>

          {/* 4 Core Application Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.15rem',
              marginBottom: '2rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.35rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <Bus size={18} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Scheduled Bus Transit
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Parcels travel inside dedicated, secure luggage bays of high-frequency scheduled passenger buses, offering same-day or early-morning delivery.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.35rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <MapPin size={18} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Counter-to-Counter
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Drop off consignments at your local terminal counter. Recipients collect directly from the destination station counter upon bus arrival without home delivery lag.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.35rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <MessageSquare size={18} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Real-Time WhatsApp Alerts
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Automated status notifications keep consignors and consignees updated from counter booking through bus departure to final counter arrival.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.35rem',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                OTP-Verified Handover
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Unique 6-digit LR identifiers, barcode tags, and recipient OTP verification ensure your parcels are handed over only to authorized receivers.
              </p>
            </div>
          </div>

          {/* Highlights & Quick Actions Strip */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>50+</strong> City Hubs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Same-Day</strong> Transit</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', color: '#334155' }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Secure</strong> Luggage Bays</span>
              </div>
            </div>

            <div className="mobile-wrap-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', justifyContent: 'center' }}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  const trackInput = document.querySelector('input[placeholder*="LR"]');
                  if (trackInput) {
                    trackInput.focus();
                  }
                }}
              >
                Track a Consignment
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', justifyContent: 'center' }}
                onClick={() => {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Contact Help Desk</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. INTERACTIVE DISPATCH & CONSIGNMENT LIFECYCLE SIMULATOR (REPLACES RATE ESTIMATOR) */}
      <section
        id="simulator"
        style={{
          padding: '3.25rem 1.25rem',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.25rem auto' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb' }}>
              Interactive Product Demo
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.5rem 0', letterSpacing: '-0.02em' }}>
              Consignment Lifecycle & Dispatch Simulator
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Click through the interactive stages below to experience how our SaaS platform orchestrates booking, automated WhatsApp dispatch, bus loading, and live tracking.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Interactive Tab Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                backgroundColor: '#0f172a',
                borderBottom: '1px solid #334155',
              }}
            >
              {[
                { id: 'booking', label: '1. Counter Booking', icon: FileText, sub: 'Auto 6-digit LR' },
                { id: 'whatsapp', label: '2. WhatsApp Alert', icon: Smartphone, sub: 'Direct link to chat' },
                { id: 'batch', label: '3. Batch Bus Loading', icon: Bus, sub: 'Luggage bay allocation' },
                { id: 'tracking', label: '4. Live Tracking', icon: Search, sub: 'Customer telemetry' },
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeSimulatorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSimulatorTab(tab.id)}
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      backgroundColor: isActive ? '#1e293b' : 'transparent',
                      backgroundImage: isActive
                        ? 'linear-gradient(to bottom, rgba(37, 99, 235, 0.22), rgba(30, 41, 59, 0.95))'
                        : 'none',
                      color: isActive ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                      boxShadow: isActive ? 'inset 0 1px 0 rgba(147, 197, 253, 0.3)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        backgroundColor: isActive ? '#2563eb' : '#334155',
                        border: isActive ? '1px solid #60a5fa' : '1px solid transparent',
                        boxShadow: isActive ? '0 0 12px rgba(37, 99, 235, 0.6)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#ffffff' : '#cbd5e1',
                          letterSpacing: isActive ? '-0.01em' : 'normal',
                        }}
                      >
                        {tab.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#93c5fd' : '#64748b',
                        }}
                      >
                        {tab.sub}
                      </div>
                    </div>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: '#ffffff',
                          backgroundColor: '#2563eb',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          flexShrink: 0,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Interactive Tab Body Preview */}
            <div style={{ padding: '1.75rem' }}>
              {activeSimulatorTab === 'booking' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Counter Operations Interface
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem 0' }}>
                      High-Speed Vendor Parcel Booking
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Counter staff enters commercial consignor and consignee details. The system generates an official 6-digit LR tracking ID, creates formatted printable thermal receipts, and commits to the ledger in under 30 seconds.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> 6-digit collision-free LR identifier
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Weight-based & commodity category rate structures
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Role-restricted staff portal prevents unauthorized edits
                      </div>
                    </div>
                  </div>

                  {/* Booking Receipt Mockup */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.65rem', marginBottom: '0.65rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{brandName}</div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>OFFICIAL CONSIGNMENT WAYBILL</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#2563eb', margin: '4px 0' }}>LR #482195</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.65rem', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#64748b' }}>FROM:</span> Mumbai Terminal</div>
                      <div><span style={{ color: '#64748b' }}>TO:</span> Pune Swargate</div>
                      <div><span style={{ color: '#64748b' }}>CARGO:</span> Textiles (Carton)</div>
                      <div><span style={{ color: '#64748b' }}>WEIGHT:</span> 12.5 kg</div>
                    </div>
                    <div style={{ backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', fontSize: '0.725rem', color: '#334155' }}>
                      Status: <strong style={{ color: '#059669' }}>CONFIRMED &bull; WAITING BAY ALLOCATION</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeSimulatorTab === 'whatsapp' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Automated Messaging Engine
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem 0' }}>
                      Instant WhatsApp Notifications to Consignee & Consignor
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Eliminates telephone inquiries and manual receipt texting. Both vendor and customer receive instantaneous structured WhatsApp messages containing the LR tracking number, destination counter, and 1-click live status link.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> No manual copy-pasting of receipt waybills
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Direct tracking link accessible without downloading any app
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Secondary notification sent immediately upon bus arrival
                      </div>
                    </div>
                  </div>

                  {/* Smartphone WhatsApp Mockup */}
                  <div
                    style={{
                      maxWidth: '320px',
                      margin: '0 auto',
                      backgroundColor: '#e5ddd5',
                      borderRadius: '16px',
                      border: '4px solid #1e293b',
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div style={{ backgroundColor: '#075e54', color: '#ffffff', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={14} color="#ffffff" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{brandName} Dispatch Bot</div>
                        <div style={{ fontSize: '0.65rem', color: '#a7f3d0' }}>Verified Business Account</div>
                      </div>
                    </div>

                    <div style={{ padding: '0.85rem' }}>
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          fontSize: '0.75rem',
                          lineHeight: 1.45,
                          color: '#111827',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#075e54', marginBottom: '4px' }}>
                          📦 Consignment Booked Successfully!
                        </div>
                        <div>Dear Customer, your parcel has been registered for express scheduled bus dispatch.</div>
                        <div style={{ marginTop: '6px', padding: '4px 6px', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                          <strong>LR Number:</strong> #482195<br />
                          <strong>Destination:</strong> Pune Terminal<br />
                          <strong>Weight:</strong> 12.5 kg
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <a href="#track" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                            👉 Click here to Track Live Status
                          </a>
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#9ca3af', textAlign: 'right', marginTop: '4px' }}>
                          Just now &#10003;&#10003;
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSimulatorTab === 'batch' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Fleet Coordination Module
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem 0' }}>
                      Assign Multiple Waiting Parcels to a Bus in One Click
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Designed specifically for bus parcel hubs. Counter dispatchers select destination routes, tick multiple queued commercial packages, and allocate them simultaneously to an arriving passenger bus bay with digital driver manifests.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Checkbox multi-select for 10 to 50 parcels at once
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Automatic bus luggage bay capacity checks
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Prints driver loading handover sheets instantly
                      </div>
                    </div>
                  </div>

                  {/* Batch Loading Simulation Table */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ backgroundColor: '#f1f5f9', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bus size={15} color="#2563eb" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Bus #KA-01-F-8842 (Overnight)</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        3 Parcels Selected
                      </span>
                    </div>

                    <div style={{ padding: '0.65rem' }}>
                      {[
                        { lr: '#482195', to: 'Pune', type: 'Textile Carton', wt: '12.5 kg' },
                        { lr: '#482196', to: 'Pune', type: 'Industrial Spares', wt: '24.0 kg' },
                        { lr: '#482197', to: 'Pune', type: 'Electronics Box', wt: '8.2 kg' },
                      ].map((item, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.6rem',
                            borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                              <Check size={11} />
                            </div>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.lr}</span>
                            <span style={{ color: '#64748b' }}>({item.type})</span>
                          </div>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.wt}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderTop: '1px solid #cbd5e1', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => alert('Batch Bus Bay Allocation Simulated! In the staff portal, clicking this immediately locks the parcel manifest to this scheduled bus.')}
                      >
                        <Bus size={13} />
                        <span>Allocate All to Bus Bay</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSimulatorTab === 'tracking' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Customer Experience
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0.5rem 0' }}>
                      End-to-End Real-Time Telemetry
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
                      Anyone can track an order simply by entering their 6-digit Order ID. The portal displays current milestone progress, assigned bus number, driver contact, and arrival verification code.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> 5-stage clear milestone progression
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Direct destination counter contact phone numbers
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Check size={14} color="#10b981" /> Downloadable and printable dispatch waybills
                      </div>
                    </div>
                  </div>

                  {/* Tracking Timeline Simulation Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontSize: '0.675rem', color: '#64748b' }}>CONSIGNMENT STATUS</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>LR #482195</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        In-Transit
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} />
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Booked at Origin Terminal</strong>
                          <div style={{ color: '#64748b', fontSize: '0.675rem' }}>Mumbai Counter &bull; 08:30 AM</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} />
                        </div>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Assigned to Bus Luggage Bay</strong>
                          <div style={{ color: '#64748b', fontSize: '0.675rem' }}>Bus KA-01-F-8842 &bull; 09:15 AM</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Bus size={11} />
                        </div>
                        <div>
                          <strong style={{ color: '#2563eb' }}>In-Transit Across Highway</strong>
                          <div style={{ color: '#64748b', fontSize: '0.675rem' }}>Express Scheduled Run &bull; ETA 3:30 PM</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', opacity: 0.5 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#cbd5e1', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px' }}>4</span>
                        </div>
                        <div>
                          <strong style={{ color: '#64748b' }}>Arrived at Destination Counter</strong>
                          <div style={{ color: '#94a3b8', fontSize: '0.675rem' }}>Pune Swargate Hub</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 9. INTERACTIVE VENDOR ONBOARDING & OPERATIONS HELP DESK (REPLACES STATIC 3 BOXES) */}
      <section
        id="contact"
        style={{
          padding: '3.25rem 1.25rem',
          backgroundColor: '#f8fafc',
        }}
      >
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2.25rem auto' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb' }}>
              Direct Operations Access
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.35rem 0 0.5rem 0', letterSpacing: '-0.02em' }}>
              Connect with Terminal Operations & Onboarding
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Inquire about commercial merchant contracts, bus fleet luggage bay partnerships, or urgent consignment counter assistance.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Interactive Vendor Inquiry & Contact Form */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Send size={18} color="#2563eb" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Quick Vendor Partnership & Operations Inquiry
                </h3>
              </div>

              {inquirySubmitted ? (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '1.35rem', textAlign: 'center' }}>
                  <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 0.5rem auto' }} />
                  <div style={{ display: 'inline-block', backgroundColor: '#065f46', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '4px', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                    REFERENCE: {inquiryReference || 'INQ-SUCCESS'}
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46', margin: '0 0 0.35rem 0' }}>
                    Inquiry Logged in Operations Console!
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: '#047857', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    Your inquiry has been securely stored in our centralized database and routed to the <strong>Super Admin & Dispatch Desk</strong>. Our team will contact you at <strong>{inquiryPhone}</strong>, or you can start a direct WhatsApp chat below.
                  </p>

                  <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={`https://wa.me/${(companyPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi, I have submitted an inquiry (${inquiryReference}) regarding ${inquiryType} for ${inquiryName}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        backgroundColor: '#059669',
                        borderColor: '#047857',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <MessageSquare size={15} color="#ffffff" />
                      <span>Chat on WhatsApp with Ref #{inquiryReference}</span>
                    </a>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.785rem' }}
                      onClick={() => {
                        setInquirySubmitted(false);
                        setInquiryName('');
                        setInquiryPhone('');
                        setInquiryCity('');
                        setInquiryReference('');
                      }}
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Inquiry Type</label>
                    <select
                      className="form-control"
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      style={{ fontSize: '0.825rem' }}
                    >
                      <option value="Commercial Vendor Booking">Commercial Vendor Parcel Booking Contract</option>
                      <option value="Bus Fleet Operator">Bus Fleet Operator Luggage Bay Integration</option>
                      <option value="Terminal Counter Partnership">Terminal Hub Counter Partnership</option>
                      <option value="General Consignment Help">Urgent Consignment Status Help</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Your Name / Business</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Ramesh Traders"
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        style={{ fontSize: '0.825rem' }}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>WhatsApp / Phone No.</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        placeholder="e.g. 9876543210"
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        style={{ fontSize: '0.825rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>City / Primary Route</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mumbai to Pune corridor"
                      value={inquiryCity}
                      onChange={(e) => setInquiryCity(e.target.value)}
                      style={{ fontSize: '0.825rem' }}
                    />
                  </div>

                  <div
                    className="mobile-wrap-buttons"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '0.65rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={inquirySubmitting}
                      style={{
                        height: '42px',
                        padding: '0 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <span>{inquirySubmitting ? 'Logging Inquiry...' : 'Submit Inquiry'}</span>
                      <ArrowRight size={14} />
                    </button>

                    <a
                      href={`https://wa.me/${(companyPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi, I am interested in ${inquiryType} with ${brandName}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{
                        height: '42px',
                        padding: '0 1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        color: '#059669',
                        borderColor: '#a7f3d0',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <MessageSquare size={15} color="#059669" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: Direct Help & Dispatch Terminal Channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.15rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <MessageSquare size={17} color="#10b981" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Official WhatsApp Help Desk
                  </h4>
                </div>
                <p style={{ fontSize: '0.785rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>
                  Get automated tracking links, update consignee details, or request counter pickup verification directly through WhatsApp.
                </p>
                <a
                  href={`https://wa.me/${(companyPhone || '').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>Open WhatsApp Support ({companyPhone})</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.15rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Phone size={17} color="#2563eb" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    24/7 Central Operations Helpline
                  </h4>
                </div>
                <p style={{ fontSize: '0.785rem', color: '#64748b', margin: '0 0 0.4rem 0' }}>
                  Dedicated telephone line for bus drivers, terminal counter clerks, and commercial merchants.
                </p>
                <a
                  href={`tel:${companyPhone}`}
                  style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}
                >
                  {companyPhone}
                </a>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  Operations active daily from 06:00 AM to 10:30 PM IST
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.15rem', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Building size={17} color="#2563eb" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Central Counter & Logistics Station
                  </h4>
                </div>
                <p style={{ fontSize: '0.785rem', color: '#475569', margin: '0 0 0.25rem 0', lineHeight: 1.45 }}>
                  {companyAddress}
                </p>
                {gstin && (
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    GSTIN: <span style={{ fontWeight: 600, color: '#334155' }}>{gstin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NOTE: Duplicate footer removed! The app-level <Footer /> in App.jsx renders cleanly for all public pages. */}
    </div>
  );
};
