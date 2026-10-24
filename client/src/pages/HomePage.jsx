import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Truck,
  Bus,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  Send,
  MapPin,
  Phone,
  ShieldCheck,
  Building,
  Calculator,
  Navigation,
  Sparkles,
  Zap,
  Check,
  ChevronRight,
  Layers,
  IndianRupee,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useCompanySettings } from '../context/CompanyContext';

export const HomePage = ({ onNavigate, onTrackOrder, companySettings: propCompanySettings }) => {
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  const companyName = company.companyName || 'Sri Vinayaka Logistics';
  const tagline = company.tagline || 'Parcel & Bus Dispatch Network';
  const companyPhone = company.companyPhone || '';
  const companyEmail = company.companyEmail || '';
  const companyAddress = company.companyAddress || '';
  const gstin = company.gstin;

  // Real-time Database States
  const [cities, setCities] = useState([]);
  const [parcelTypes, setParcelTypes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter States
  const [orderIdInput, setOrderIdInput] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedCityDetails, setSelectedCityDetails] = useState(null);

  // Interactive Freight Estimator State
  const [calcFromCity, setCalcFromCity] = useState('');
  const [calcToCity, setCalcToCity] = useState('');
  const [calcParcelType, setCalcParcelType] = useState('');
  const [calcWeight, setCalcWeight] = useState(5);
  const [calcQty, setCalcQty] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState(null);

  // Fetch real-time cities, parcel types, and fleet from MongoDB
  const fetchPublicData = async () => {
    try {
      setLoadingData(true);
      const [citiesRes, parcelTypesRes, busesRes] = await Promise.allSettled([
        api.cities.list(),
        api.parcelTypes.list(),
        api.buses.list(),
      ]);

      if (citiesRes.status === 'fulfilled' && citiesRes.value?.success && citiesRes.value.data) {
        setCities(citiesRes.value.data);
        if (citiesRes.value.data.length > 0) {
          setCalcFromCity(citiesRes.value.data[0].name);
          if (citiesRes.value.data.length > 1) {
            setCalcToCity(citiesRes.value.data[1].name);
          } else {
            setCalcToCity(citiesRes.value.data[0].name);
          }
        }
      }

      if (parcelTypesRes.status === 'fulfilled' && parcelTypesRes.value?.success && parcelTypesRes.value.data) {
        setParcelTypes(parcelTypesRes.value.data);
        if (parcelTypesRes.value.data.length > 0) {
          setCalcParcelType(parcelTypesRes.value.data[0].name);
        }
      }

      if (busesRes.status === 'fulfilled' && busesRes.value?.success && busesRes.value.data) {
        setBuses(busesRes.value.data);
      }
    } catch (err) {
      console.warn('Failed to load public database records:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  // Handle Tracking Form
  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      onTrackOrder(orderIdInput.trim());
    }
  };

  // Filtered Deliverable Cities from Database
  const filteredCities = useMemo(() => {
    const q = citySearchQuery.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter((c) => {
      const nameMatch = c.name && c.name.toLowerCase().includes(q);
      const addrMatch = c.deliveryAddress && c.deliveryAddress.toLowerCase().includes(q);
      const locMatch = c.locations && c.locations.some((l) => l.toLowerCase().includes(q));
      return nameMatch || addrMatch || locMatch;
    });
  }, [cities, citySearchQuery]);

  // Recalculate estimated cost when inputs change
  useEffect(() => {
    if (!calcParcelType) return;
    const selectedPt = parcelTypes.find((p) => p.name === calcParcelType);
    const baseRate = selectedPt?.defaultCharge ? Number(selectedPt.defaultCharge) : 150;
    const weightNum = Number(calcWeight) || 1;
    const qtyNum = Number(calcQty) || 1;

    // Surcharge for weight > 10kg
    const extraWeight = Math.max(0, weightNum - 10);
    const calculated = Math.round((baseRate + extraWeight * 15) * qtyNum);
    setEstimatedCost(calculated);
  }, [calcParcelType, calcWeight, calcQty, calcFromCity, calcToCity, parcelTypes]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* 1. HERO SECTION WITH STREAMLINED TRANSIT MONITOR */}
      <section
        id="home"
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          padding: '3.75rem 1.5rem 5.5rem 1.5rem',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Subtle Ambient Radial Highlight */}
        <div
          style={{
            position: 'absolute',
            top: '-30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '500px',
            background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.18) 0%, rgba(15, 23, 42, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            {/* Hero Left: Brand Pitch & Call to Action */}
            <div>
              {/* Trust Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  color: '#93c5fd',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#60a5fa' }} />
                <span>Verified Counter-to-Counter Parcel Network</span>
              </div>

              {/* Company Title */}
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.4rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  marginBottom: '0.65rem',
                }}
              >
                {companyName}
              </h1>

              <div style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.125rem)', fontWeight: 600, color: '#38bdf8', marginBottom: '0.85rem' }}>
                {tagline}
              </div>

              <p style={{ fontSize: '0.9375rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '520px' }}>
                Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => onNavigate('login')}
                  style={{
                    backgroundColor: '#2563eb',
                    borderColor: '#2563eb',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                  }}
                >
                  <span>Operations Portal</span>
                  <ArrowRight size={17} />
                </button>

                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => onNavigate('track')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '0.75rem 1.35rem',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                  }}
                >
                  <Search size={16} />
                  <span>Track Consignment</span>
                </button>
              </div>
            </div>

            {/* Hero Right: Live Fleet Transit Monitor (Corporate Dark Slate) */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header of Transit Canvas */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                    borderBottom: '1px solid #334155',
                    paddingBottom: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}>
                      LIVE DISPATCH TELEMETRY
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                    <span style={{ fontSize: '0.6875rem', color: '#4ade80', fontWeight: 700 }}>
                      Fleet In-Transit
                    </span>
                  </div>
                </div>

                {/* Route Corridor Visualizer */}
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1.25rem 1rem 1rem 1rem',
                    marginBottom: '1rem',
                    position: 'relative',
                  }}
                >
                  {/* Station Track */}
                  <div
                    style={{
                      position: 'relative',
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 1rem',
                    }}
                  >
                    {/* Connecting Line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '2.5rem',
                        right: '2.5rem',
                        height: '2px',
                        transform: 'translateY(-50%)',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #2563eb 50%, #22c55e 100%)',
                        opacity: 0.6,
                        zIndex: 1,
                      }}
                    />

                    {/* Origin Hub Icon */}
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        border: '1.5px solid #38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <Building size={16} color="#38bdf8" />
                    </div>

                    {/* Active In-Transit Bus Badge */}
                    <div
                      className="animate-transit-vehicle"
                      style={{
                        backgroundColor: '#1d4ed8',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: '1px solid #60a5fa',
                        position: 'relative',
                        zIndex: 3,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                      }}
                    >
                      <Bus size={13} />
                      <span>SCHEDULED RUN</span>
                    </div>

                    {/* Destination Hub Icon */}
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        border: '1.5px solid #22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      <MapPin size={16} color="#22c55e" />
                    </div>
                  </div>

                  {/* Route Labels */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.2fr 1fr',
                      gap: '0.5rem',
                      marginTop: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ textAlign: 'left', paddingLeft: '0.25rem' }}>
                      <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700 }}>
                        Origin Counter
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cities[0]?.name || 'Origin Hub'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
                        Express Route
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}>
                        Sealed Luggage Bay
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', paddingRight: '0.25rem' }}>
                      <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#4ade80', fontWeight: 700 }}>
                        Destination Hub
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cities[1]?.name || 'Destination Hub'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fleet Connectivity Footer */}
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#1e3a8a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#93c5fd',
                        flexShrink: 0,
                      }}
                    >
                      <Truck size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                        Daily Scheduled Bus Connectivity
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                        Instant SMS & WhatsApp alert upon arrival
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Operational
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INSTANT 6-DIGIT ORDER TRACKING BOX (OVERLAPPING HERO) */}
      <div style={{ maxWidth: '840px', margin: '-2.5rem auto 2.5rem auto', padding: '0 1.5rem', position: 'relative', zIndex: 10, width: '100%' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={15} />
              </div>
              <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Track Consignment / Parcel Status
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Enter 6-digit Order ID printed on your booking receipt
            </span>
          </div>

          <form onSubmit={handleTrackSubmit} className="tracking-form" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', width: '100%' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Enter Order ID (e.g. LR4821 or 6-digit)"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
              maxLength={6}
              required
              style={{
                fontSize: '0.9375rem',
                letterSpacing: '0.05em',
                fontWeight: 600,
                height: '44px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                flex: 1,
                minWidth: '220px',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0 1.75rem',
                height: '44px',
                fontSize: '0.875rem',
                fontWeight: 700,
                backgroundColor: '#2563eb',
                borderColor: '#2563eb',
                borderRadius: '6px',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <Search size={15} />
              <span>Track Live</span>
            </button>
          </form>
        </div>
      </div>

      {/* 3. LIVE NETWORK HIGHLIGHTS (UNIFIED CORPORATE SCORECARD) */}
      <section style={{ maxWidth: '1120px', margin: '0 auto 2.5rem auto', padding: '0 1.5rem', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Card 1: Connected Hubs */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {cities.length > 0 ? `${cities.length}+ Hubs` : '8+ Hubs'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                Connected Destination Cities
              </div>
            </div>
          </div>

          {/* Card 2: Daily Scheduled Runs */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bus size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {buses.length > 0 ? `${buses.length}+ Runs` : 'Daily Fleet'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                Scheduled Bus Dispatches
              </div>
            </div>
          </div>

          {/* Card 3: Accepted Freight Slabs */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {parcelTypes.length > 0 ? `${parcelTypes.length} Types` : 'All Cargo'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                Standard Freight Categories
              </div>
            </div>
          </div>

          {/* Card 4: Verified Handover SLA */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                99.8%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                Verified Handover SLA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC DELIVERABLE LOCATIONS SECTION (FETCHED FROM MONGODB) */}
      <section
        id="deliverable-locations"
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '3.5rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          {/* Section Heading & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                <MapPin size={14} />
                <span>Operational Express Hubs</span>
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                Deliverable Cities & Counter Network
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
                Active destination booking counters and parcel collection points across network
              </p>
            </div>

            {/* City Filter Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search city, address, or stop..."
                value={citySearchQuery}
                onChange={(e) => setCitySearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '0.8125rem', height: '40px', borderRadius: '6px', width: '100%' }}
              />
            </div>
          </div>

          {/* City Grid */}
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
              <div>Loading deliverable network...</div>
            </div>
          ) : filteredCities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <Info size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                {cities.length === 0 ? 'No Deliverable Hubs Configured Yet' : 'No Destinations Match Your Filter'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {cities.length === 0
                  ? 'Add cities and delivery addresses from Settings > From & To Cities tab.'
                  : 'Try searching for another city name or delivery location.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {filteredCities.map((city) => (
                <div
                  key={city._id || city.name}
                  className="city-hub-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                    minHeight: '270px',
                  }}
                >
                  <div>
                    {/* City Title and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Building size={16} />
                        </div>
                        <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                          {city.name}
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#065f46',
                          backgroundColor: '#ecfdf5',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                        Active Hub
                      </span>
                    </div>

                    {/* Delivery Address / Counter */}
                    <div style={{ marginBottom: '0.85rem', backgroundColor: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Main Delivery Counter
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {city.deliveryAddress || city.counterAddress || 'Express Terminal Counter Booking'}
                      </div>
                    </div>

                    {/* Available Delivery Locations / Stops (Capped to 2 items with +N more popup) */}
                    {city.locations && city.locations.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Pickup Stops ({city.locations.length})
                          </span>
                          {city.locations.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSelectedCityDetails(city)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              View all ({city.locations.length})
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {city.locations.slice(0, 2).map((loc, lIdx) => (
                            <span
                              key={lIdx}
                              style={{
                                fontSize: '0.6875rem',
                                color: '#1e40af',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              {loc}
                            </span>
                          ))}

                          {city.locations.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setSelectedCityDetails(city)}
                              style={{
                                fontSize: '0.6875rem',
                                color: '#2563eb',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Click to view all locations in a popup"
                            >
                              +{city.locations.length - 2} more...
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta (Cleanly Stacked Top and Bottom) */}
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      marginTop: 'auto',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                      <Clock size={13} color="#2563eb" />
                      <span>Same-day / Overnight Dispatch</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={13} color="#16a34a" /> Luggage Bay Secured
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCityDetails(city)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '2px 0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                        title="View complete hub details"
                      >
                        <span>Details</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. SUPPORTED FREIGHT & CARGO CATEGORIES (CLEAN CORPORATE SLABS) */}
      <section id="freight-categories" style={{ padding: '3.5rem 1.5rem', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <Layers size={14} />
              <span>Accepted Cargo Categories</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              Supported Freight & Standard Slabs
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
              All consignments are weighted, issued a 6-digit Order ID sticker, and secured in passenger bus luggage bays
            </p>
          </div>

          {/* Unified Corporate Category Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            {(parcelTypes.length > 0 ? parcelTypes : [
              { name: 'Standard Box', defaultCharge: 150, description: 'Commercial cartons, shoes, cosmetics, electronics' },
              { name: 'Rice Bag & Grains', defaultCharge: 200, description: 'Agricultural bags, grain sacks, heavy dry provisions' },
              { name: 'Documents & Covers', defaultCharge: 80, description: 'Legal deeds, invoices, certificates, urgent envelopes' },
              { name: 'Fragile Electronics', defaultCharge: 250, description: 'Screens, laptops, medical gear with upright handling' },
            ]).map((pt) => (
              <div
                key={pt._id || pt.name}
                className="parcel-category-card"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div>
                  {/* Top Bar with Icon & Price Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Package size={18} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      From ₹{pt.defaultCharge || 100}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 6px 0', fontWeight: 800 }}>
                    {pt.name}
                  </h4>

                  <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.45, margin: '0 0 1rem 0' }}>
                    {pt.description || 'Standard secure freight handling via passenger bus fleet'}
                  </p>
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '4px', fontWeight: 600, fontSize: '0.6875rem' }}>
                    Standard Luggage Bay
                  </span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>Trackable</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE FREIGHT & DURATION ESTIMATOR */}
      <section id="calculator" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <Calculator size={14} />
              <span>Instant Cost Calculator</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              Estimate Your Freight & Delivery Time
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Get quick estimated costs for sending parcels via our daily scheduled bus network
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.75rem',
              alignItems: 'center',
            }}
          >
            {/* Left: Input Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>From Origin City</label>
                  <select
                    className="form-control"
                    value={calcFromCity}
                    onChange={(e) => setCalcFromCity(e.target.value)}
                    style={{ borderRadius: '6px', height: '42px' }}
                  >
                    {cities.length > 0 ? (
                      cities.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <option value="">No origin cities available</option>
                    )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>To Destination City</label>
                  <select
                    className="form-control"
                    value={calcToCity}
                    onChange={(e) => setCalcToCity(e.target.value)}
                    style={{ borderRadius: '6px', height: '42px' }}
                  >
                    {cities.length > 0 ? (
                      cities.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <option value="">No destination cities available</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cargo Category</label>
                  <select
                    className="form-control"
                    value={calcParcelType}
                    onChange={(e) => setCalcParcelType(e.target.value)}
                    style={{ borderRadius: '6px', height: '42px' }}
                  >
                    {parcelTypes.length > 0 ? (
                      parcelTypes.map((pt) => (
                        <option key={pt.name} value={pt.name}>{pt.name} (Base ₹{pt.defaultCharge || 150})</option>
                      ))
                    ) : (
                      <option value="Standard Box">Standard Box (₹150)</option>
                    )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-control"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(e.target.value)}
                    style={{ borderRadius: '6px', height: '42px' }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Output Cost Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                Estimated Freight Charge
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.25rem' }}>
                ₹{estimatedCost || 150}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600, marginBottom: '1rem' }}>
                {calcFromCity || 'Origin'} &rarr; {calcToCity || 'Destination'} ({calcWeight} kg)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', color: '#475569', textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#16a34a" /> <span>Same-evening bus dispatch if booked before 6 PM</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#16a34a" /> <span>Automated WhatsApp alert on bus departure</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} color="#16a34a" /> <span>Pickup directly from destination counter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. HOW IT WORKS 4-STEP OPERATIONAL PIPELINE */}
      <section id="how-it-works" className="steps-section" style={{ padding: '3.5rem 1.5rem' }}>
        <div className="section-heading">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            <Zap size={14} />
            <span>Operational Workflow</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
            How Our Bus Parcel Service Works
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Streamlined for business speed, counter safety, and instantaneous customer tracking
          </p>
        </div>

        <div className="steps-grid">
          {/* Step 1 */}
          <div className="step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span className="step-number">01</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                <Package size={18} />
              </div>
            </div>
            <div className="step-title">Submit Parcel at Counter</div>
            <div className="step-desc">
              Bring your cartons, bags, merchandise, or envelopes to any of our booking counters before evening bus departure.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Same-day counter intake</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span className="step-number">02</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                <ShieldCheck size={18} />
              </div>
            </div>
            <div className="step-title">Get 6-Digit Order ID</div>
            <div className="step-desc">
              Counter staff generates your unique 6-digit Order ID, applies barcode identification tags, and hands you an official receipt.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Instant receipt & SMS tag</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span className="step-number">03</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                <Bus size={18} />
              </div>
            </div>
            <div className="step-title">Loaded on Scheduled Bus</div>
            <div className="step-desc">
              Parcels are secured inside designated passenger bus luggage bays with driver and vehicle numbers registered in the system.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Locked passenger bus bay</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span className="step-number">04</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="step-title">WhatsApp Alert & Collect</div>
            <div className="step-desc">
              Sender and receiver get instant WhatsApp updates with bus arrival info. Receiver collects with the 6-digit Order ID.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Verified counter delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TERMINAL CONTACT & COUNTER HOURS SECTION */}
      <section id="contact" style={{ padding: '3.5rem 1.5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <Phone size={14} />
              <span>Customer Help Desk</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
              Main Booking Counter & Support
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Visit our terminal counter or call our dispatch desk for bulk cargo and corporate accounts
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Contact Card 1: Office Address */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Terminal Location</div>
                  <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>Main Office & Booking Counter</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {companyAddress}
              </p>
              {gstin && (
                <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700, marginTop: '0.75rem', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  GSTIN / Reg No: {gstin}
                </div>
              )}
            </div>

            {/* Contact Card 2: Helpline */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Direct Helpline</div>
                  <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>Support & Dispatch Desk</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                <strong>Phone:</strong> {companyPhone}<br />
                {companyEmail && <span><strong>Email:</strong> {companyEmail}</span>}
              </p>
            </div>

            {/* Contact Card 3: Operating Hours */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Timings</div>
                  <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>Counter Operating Hours</strong>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Monday to Sunday: 06:00 AM – 10:30 PM<br />
                <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                  Evening Bus Cut-off: 45 mins before bus departure
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CITY HUB FULL DETAILS IN-PAGE FLOATING PANEL */}
      {selectedCityDetails && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1050, maxWidth: '480px', width: '92%', backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          <div>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedCityDetails.name} Terminal Hub
                  </h3>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: '#065f46',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    Active Destination & Collection Counter
                  </span>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedCityDetails(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              {/* Main Delivery Counter Box */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Main Delivery Counter & Collection Point
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                  {selectedCityDetails.deliveryAddress || selectedCityDetails.counterAddress || 'Express Terminal Counter Booking'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} color="#2563eb" />
                  <span>Counter Timings: 06:00 AM – 10:30 PM (Daily)</span>
                </div>
              </div>

              {/* Complete Pickup Stops List */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                    All Pickup & Drop Stops ({selectedCityDetails.locations?.length || 0})
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Connected via scheduled bus routes
                  </span>
                </div>

                {selectedCityDetails.locations && selectedCityDetails.locations.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '4px 0' }}>
                    {selectedCityDetails.locations.map((loc, lIdx) => (
                      <div
                        key={lIdx}
                        style={{
                          fontSize: '0.75rem',
                          color: '#1e40af',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{loc}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                    Standard terminal counter pickup and handover.
                  </div>
                )}
              </div>

              {/* Express Logistics SLA & Safety Guarantee */}
              <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0.85rem', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={13} color="#16a34a" />
                  <span><strong>Sealed Luggage Bay:</strong> Transported via daily scheduled passenger buses</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={13} color="#16a34a" />
                  <span><strong>Instant Alerts:</strong> Automated WhatsApp update sent on bus arrival</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={13} color="#16a34a" />
                  <span><strong>Secure Handover:</strong> 6-digit Order ID verification required at counter</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedCityDetails(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCalcToCity(selectedCityDetails.name);
                  setSelectedCityDetails(null);
                  const calcElem = document.getElementById('calculator');
                  if (calcElem) calcElem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Estimate Freight to {selectedCityDetails.name}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
