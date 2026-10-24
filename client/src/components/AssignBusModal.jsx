import React, { useState, useEffect } from 'react';
import {
  X,
  Bus,
  Send,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Clock,
  User,
  Building,
  Navigation,
  FileText,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCompanySettings } from '../context/CompanyContext';


const DEPARTURE_TIME_PRESETS = [
  '06:00 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
  '10:30 PM',
  '11:00 PM',
];

export const AssignBusModal = ({
  bookings = [],
  onClose,
  onSuccess,
  standardRoutes = [],
  cities = [],
}) => {
  const { showToast } = useToast();
  const { companySettings } = useCompanySettings();

  // Extract initial booking values if 1 or more bookings selected
  const firstBooking = bookings[0] || {};
  const initialFromCity = firstBooking.fromCity || '';
  const initialToCity = firstBooking.toCity || firstBooking.destination || '';
  const initialDeliveryAddress = firstBooking.deliveryAddress || '';

  // Form State
  const [fromCity, setFromCity] = useState(initialFromCity);
  const [originAddress, setOriginAddress] = useState(
    companySettings?.companyAddress || ''
  );
  const [toCity, setToCity] = useState(initialToCity);
  const [destinationAddress, setDestinationAddress] = useState(initialDeliveryAddress);

  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [operator, setOperator] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [departureTime, setDepartureTime] = useState('07:30 PM');
  const [arrivalTime, setArrivalTime] = useState('05:30 AM (Next Day)');
  const [platformNumber, setPlatformNumber] = useState('Platform #4');
  const [dispatchNotes, setDispatchNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [dispatchSuccessData, setDispatchSuccessData] = useState(null);

  const [registeredBuses, setRegisteredBuses] = useState([]);
  const [registeredDrivers, setRegisteredDrivers] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Fetch dynamically registered buses and drivers independently from MongoDB
  useEffect(() => {
    const fetchFleetAndDrivers = async () => {
      try {
        setLoadingFleet(true);
        const [busesRes, driversRes] = await Promise.all([
          api.buses.list(),
          api.drivers.list(),
        ]);
        if (busesRes.success && Array.isArray(busesRes.data)) {
          setRegisteredBuses(busesRes.data);
        }
        if (driversRes.success && Array.isArray(driversRes.data)) {
          setRegisteredDrivers(driversRes.data);
        }
      } catch (err) {
        console.error('Error fetching fleet and drivers in modal:', err);
      } finally {
        setLoadingFleet(false);
      }
    };
    fetchFleetAndDrivers();
  }, []);

  // Unique travels dynamically extracted from existing registered buses (Zero hardcoding)
  const dynamicTravels = Array.from(
    new Set(
      registeredBuses
        .map((b) => (b.busName || b.operator || '').trim())
        .filter(Boolean)
    )
  );

  // Sync destination address if toCity matches a city in database with stops
  const selectedCityObj = cities.find(
    (c) => (c.name || '').trim().toLowerCase() === (toCity || '').trim().toLowerCase()
  );
  const availableStops =
    selectedCityObj && Array.isArray(selectedCityObj.locations) && selectedCityObj.locations.length > 0
      ? selectedCityObj.locations
      : selectedCityObj?.deliveryAddress
      ? [selectedCityObj.deliveryAddress]
      : [];

  const handleSelectCityStop = (stop) => {
    setDestinationAddress(stop);
  };

  const handleSelectQuickTime = (time) => {
    setDepartureTime(time);
  };

  const handleSelectTravels = (name) => {
    setBusName(name);
    setOperator(name);
  };

  // Bus Vehicle Selection (Independent)
  const handleSelectRegisteredBus = (busOrId) => {
    let bus = typeof busOrId === 'object' ? busOrId : registeredBuses.find((b) => b._id === busOrId || b.busNumber === busOrId);
    if (!bus) {
      setSelectedBusId('');
      return;
    }

    setSelectedBusId(bus._id);
    if (bus.busNumber) setBusNumber(bus.busNumber.toUpperCase());
    if (bus.busName) setBusName(bus.busName);
    if (bus.operator) setOperator(bus.operator);
    if (bus.defaultDepartureTime) setDepartureTime(bus.defaultDepartureTime);
    if (bus.defaultArrivalTime) setArrivalTime(bus.defaultArrivalTime);
    if (bus.platformNumber) setPlatformNumber(bus.platformNumber);

    showToast(`Selected Bus: ${bus.busNumber} (${bus.busName || 'Express'})`, 'info');
  };

  // Driver Personnel Selection (Independent)
  const handleSelectRegisteredDriver = (driverOrId) => {
    let driver = typeof driverOrId === 'object' ? driverOrId : registeredDrivers.find((d) => d._id === driverOrId || d.phone === driverOrId);
    if (!driver) {
      setSelectedDriverId('');
      return;
    }

    setSelectedDriverId(driver._id);
    if (driver.name) setDriverName(driver.name);
    if (driver.phone) setDriverPhone(driver.phone);
    if (driver.alternatePhone) setAlternatePhone(driver.alternatePhone);

    showToast(`Assigned Driver: ${driver.name} (${driver.phone})`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!busNumber.trim()) {
      showToast('Please enter the Bus Registration Number (e.g. TS09AB1234)', 'error');
      return;
    }

    if (!departureTime.trim()) {
      showToast('Please specify the Departure Time', 'error');
      return;
    }

    try {
      setLoading(true);
      const bookingIds = bookings.map((b) => b._id);
      const routeStr = `${fromCity.trim()} → ${toCity.trim()}`;

      const payload = {
        bookingIds,
        busNumber: busNumber.trim().toUpperCase(),
        busName: busName.trim(),
        operator: operator.trim() || busName.trim(),
        route: routeStr,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        originAddress: originAddress.trim(),
        destinationAddress: destinationAddress.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        alternatePhone: alternatePhone.trim(),
        departureTime: departureTime.trim(),
        arrivalTime: arrivalTime.trim(),
        platformNumber: platformNumber.trim(),
        dispatchNotes: dispatchNotes.trim(),
      };

      const res = await api.dispatch.assignBus(payload);

      if (res.success) {
        showToast(`Assigned ${bookings.length} parcel(s) to Bus ${busNumber.toUpperCase()}!`, 'success');
        setDispatchSuccessData(res);
        if (onSuccess) {
          onSuccess(res);
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to assign bus', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog modal-dialog-lg" style={{ maxWidth: '850px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
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
              <Bus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Assign Bus Dispatch & Manifest
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Assign vehicle registration, travels operator, driver mobile, and delivery counter address
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        {dispatchSuccessData ? (
          <div className="modal-body" style={{ overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  border: '1px solid #cbd5e1',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h4 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '0.25rem', fontWeight: 700 }}>
                Dispatch Confirmed & Notification Triggered!
              </h4>
              <p style={{ color: '#475569', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto' }}>
                Status updated to <strong style={{ color: '#0f172a' }}>DISPATCHED</strong> for{' '}
                <strong>{bookings.length}</strong> parcel{bookings.length > 1 ? 's' : ''}.
              </p>

              {/* Manifest summary card */}
              <div
                style={{
                  margin: '1.5rem auto',
                  maxWidth: '650px',
                  padding: '1.25rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontSize: '0.8125rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Bus & Travels:</span>
                  <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>
                    {busNumber.toUpperCase()} {busName ? `(${busName})` : ''}
                  </strong>
                </div>

                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Route & Time:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {fromCity} → {toCity} @ {departureTime}
                  </strong>
                </div>

                {driverName || driverPhone ? (
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Driver Contact:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {driverName || 'Driver'} {driverPhone ? `(${driverPhone})` : ''}
                    </strong>
                  </div>
                ) : null}

                {destinationAddress && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Delivery Counter:</span>
                    <strong style={{ color: '#0f172a' }}>{destinationAddress}</strong>
                  </div>
                )}
              </div>

              {/* WhatsApp Notification Links */}
              {dispatchSuccessData.notifications && dispatchSuccessData.notifications.length > 0 && (
                <div style={{ textAlign: 'left', maxWidth: '650px', margin: '0 auto 1.5rem auto' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.75rem' }}>
                    Customer WhatsApp Alerts Triggered ({dispatchSuccessData.notifications.length}):
                  </div>
                  {dispatchSuccessData.notifications.map((n, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        marginBottom: '0.5rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          Order #{n.orderId} • {n.customerName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Phone: {n.phone} • Status: {n.notification?.status || 'SENT'}
                        </div>
                      </div>
                      {n.notification?.directLink && (
                        <a
                          href={n.notification.directLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: '#cbd5e1' }}
                        >
                          <Send size={13} />
                          Open WhatsApp Web
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.6rem 2rem' }}>
                Done & Return to Dispatch Bay
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
              {/* Parcels summary badge banner */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>
                    Selected Consignments ({bookings.length} Parcel{bookings.length > 1 ? 's' : ''}):
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    Total Weight: {bookings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0)} kg
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {bookings.map((b) => (
                    <span
                      key={b._id}
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-xs)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <strong style={{ color: 'var(--primary-accent)' }}>#{b.orderId}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>({b.customerName} → {b.destination})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 1. Origin & Destination Address Section */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Navigation size={16} color="var(--primary-accent)" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    1. Origin Terminal & Destination Delivery Address
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  {/* Origin Column */}
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#475569" />
                      <span>FROM (Origin Counter)</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                        From City <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                        value={fromCity}
                        onChange={(e) => setFromCity(e.target.value)}
                        placeholder="e.g. Hyderabad"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                        Origin Counter / Office Address
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                        value={originAddress}
                        onChange={(e) => setOriginAddress(e.target.value)}
                        placeholder="e.g. MGBS Terminal Counter #4"
                      />
                    </div>
                  </div>

                  {/* Destination Column */}
                  <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="#475569" />
                      <span>TO (Destination Counter)</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                        To Destination City <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                        value={toCity}
                        onChange={(e) => setToCity(e.target.value)}
                        placeholder="e.g. Eluru / Vijayawada"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                        Delivery Stop / Counter Address <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="e.g. Old Bus Stand, Complex #2, Eluru"
                        required
                      />

                      {/* Quick stop selection chips if available */}
                      {availableStops.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                          <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Stops:</span>
                          {availableStops.map((stop, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectCityStop(stop)}
                              style={{
                                fontSize: '0.6875rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: destinationAddress === stop ? '1px solid #0f172a' : '1px solid #cbd5e1',
                                backgroundColor: destinationAddress === stop ? '#0f172a' : '#ffffff',
                                color: destinationAddress === stop ? '#ffffff' : '#334155',
                                cursor: 'pointer',
                                fontWeight: destinationAddress === stop ? 600 : 400,
                              }}
                            >
                              {stop}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Bus Vehicle & Travels Details (Independent Vehicle Selection) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bus size={16} color="var(--primary-accent)" />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      2. Bus Vehicle & Fleet Agency Information
                    </h4>
                  </div>
                  {registeredBuses.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                      {registeredBuses.length} Bus{registeredBuses.length > 1 ? 'es' : ''} in Fleet
                    </span>
                  )}
                </div>

                {/* Registered Bus Smart Dropdown & Quick Selector */}
                {registeredBuses.length > 0 ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Select Registered Bus Vehicle (1-Click Auto-Fill):
                      </label>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        Auto-fills Reg No, Travels Agency & Category
                      </span>
                    </div>

                    <select
                      className="form-control"
                      style={{ fontSize: '0.8125rem', fontWeight: 600, borderColor: '#cbd5e1', marginBottom: '0.5rem' }}
                      value={selectedBusId}
                      onChange={(e) => handleSelectRegisteredBus(e.target.value)}
                    >
                      <option value="">-- Choose from Registered Fleet ({registeredBuses.length} available) --</option>
                      {registeredBuses.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.busNumber} • {b.busName || 'Express'} ({b.operator || 'Standard'}) {b.toCity ? `[Route: ${b.fromCity || ''} → ${b.toCity}]` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Quick Bus Fleet Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600 }}>Quick Buses:</span>
                      {registeredBuses.slice(0, 8).map((b) => {
                        const isMatch = toCity && b.toCity && b.toCity.toLowerCase().includes(toCity.toLowerCase());
                        const isSelected = selectedBusId === b._id || busNumber.toUpperCase() === b.busNumber.toUpperCase();
                        return (
                          <button
                            key={b._id}
                            type="button"
                            onClick={() => handleSelectRegisteredBus(b)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: isSelected ? '1px solid #0f172a' : isMatch ? '1px solid #94a3b8' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#0f172a' : isMatch ? '#f1f5f9' : '#ffffff',
                              color: isSelected ? '#ffffff' : isMatch ? '#0f172a' : '#334155',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: isSelected || isMatch ? 700 : 500,
                            }}
                            title={`Click to select ${b.busNumber} (${b.busName})`}
                          >
                            <span>{b.busNumber}</span>
                            <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>
                              ({b.busName ? b.busName.split(' ')[0] : 'Bus'})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Bus Registration Number <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      placeholder="e.g. AP 39 CN 3580 or TS09AB1234"
                      value={busNumber}
                      onChange={(e) => {
                        setBusNumber(e.target.value.toUpperCase());
                        setSelectedBusId('');
                      }}
                      required
                      autoFocus
                    />
                    <div className="form-hint" style={{ fontSize: '0.6875rem' }}>Vehicle number carrying the cargo</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Travels / Bus Agency Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. Fresh Bus / Kaveri Travels / APSRTC"
                      value={busName}
                      onChange={(e) => setBusName(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Service / Bus Category
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. AC Sleeper / Super Luxury / Express"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick travels selection chips from existing database fleet (Zero hardcoding) */}
                {dynamicTravels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Registered Travels:</span>
                    {dynamicTravels.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectTravels(t)}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          border: busName === t ? '1px solid #0f172a' : '1px solid #e2e8f0',
                          backgroundColor: busName === t ? '#0f172a' : '#f8fafc',
                          color: busName === t ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          fontWeight: busName === t ? 600 : 400,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Driver & Crew Mobile Contacts (Independent Personnel Selection) */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} color="var(--primary-accent)" />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      3. Driver & Crew Mobile Contacts
                    </h4>
                  </div>
                  {registeredDrivers.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                      {registeredDrivers.length} Driver{registeredDrivers.length > 1 ? 's' : ''} in Roster
                    </span>
                  )}
                </div>

                {/* Registered Driver Smart Dropdown & Quick Selector */}
                {registeredDrivers.length > 0 ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Select Assigned Driver on Duty:
                      </label>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        Auto-fills Driver Name, Primary Phone & Cleaner Contact
                      </span>
                    </div>

                    <select
                      className="form-control"
                      style={{ fontSize: '0.8125rem', fontWeight: 600, borderColor: '#cbd5e1', marginBottom: '0.5rem' }}
                      value={selectedDriverId}
                      onChange={(e) => handleSelectRegisteredDriver(e.target.value)}
                    >
                      <option value="">-- Choose Assigned Driver ({registeredDrivers.length} registered) --</option>
                      {registeredDrivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} — Phone: {d.phone} {d.alternatePhone ? `• Cleaner: ${d.alternatePhone}` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Quick Driver Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600 }}>Quick Drivers:</span>
                      {registeredDrivers.slice(0, 8).map((d) => {
                        const isSelected = selectedDriverId === d._id || driverPhone === d.phone;
                        return (
                          <button
                            key={d._id}
                            type="button"
                            onClick={() => handleSelectRegisteredDriver(d)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: isSelected ? '1px solid #0f172a' : '1px solid #cbd5e1',
                              backgroundColor: isSelected ? '#0f172a' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#0f172a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: isSelected ? 700 : 500,
                            }}
                            title={`Click to assign ${d.name} (${d.phone})`}
                          >
                            <span>{d.name}</span>
                            <span style={{ fontSize: '0.6875rem', opacity: 0.85 }}>({d.phone})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '0.85rem',
                      fontSize: '0.75rem',
                      color: '#475569',
                    }}
                  >
                    <strong>Tip:</strong> You can add and manage driver contacts in <strong>System Settings → Drivers & Crew</strong> for 1-click driver duty assignments.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Driver / In-charge Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. Ramesh Kumar / Driver 1"
                      value={driverName}
                      onChange={(e) => {
                        setDriverName(e.target.value);
                        setSelectedDriverId('');
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Driver Primary Mobile Number
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. 9494958319"
                      value={driverPhone}
                      onChange={(e) => {
                        setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                        setSelectedDriverId('');
                      }}
                      maxLength={10}
                    />
                    <div className="form-hint" style={{ fontSize: '0.6875rem' }}>Shared in customer WhatsApp alert</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Alternative / Cleaner / Conductor Phone
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. 9876543210 (Optional)"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Schedule, Platform & Notes */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Clock size={16} color="var(--primary-accent)" />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    4. Departure Schedule, Bay & Handling Notes
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Departure Time <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem', fontWeight: 600 }}
                      placeholder="e.g. 07:30 PM"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Est. Arrival Time
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. 05:30 AM (Next Day)"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                      Loading Platform / Bay
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8125rem' }}
                      placeholder="e.g. Platform #4 / Cargo Bay 2"
                      value={platformNumber}
                      onChange={(e) => setPlatformNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick time selection presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>Time Presets:</span>
                  {DEPARTURE_TIME_PRESETS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleSelectQuickTime(time)}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: departureTime === time ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        backgroundColor: departureTime === time ? '#0f172a' : '#f8fafc',
                        color: departureTime === time ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        fontWeight: departureTime === time ? 600 : 400,
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                    Dispatch Handling / Manifest Notes
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8125rem' }}
                    placeholder="e.g. Loaded in front cargo compartment / Handover to station incharge at Eluru"
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Notification Banner */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  fontSize: '0.75rem',
                  color: '#334155',
                }}
              >
                <Send size={16} color="#0f172a" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px', color: '#0f172a' }}>
                    Automated Customer WhatsApp Notification
                  </strong>
                  <span>
                    Confirming dispatch immediately updates status to <strong>DISPATCHED</strong> and triggers WhatsApp tracking alerts to {bookings.length} customer(s) with the Bus Number, Driver Phone, and Destination Counter Address.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.55rem 1.5rem' }}>
                <Bus size={16} />
                {loading ? 'Assigning & Dispatching...' : `Confirm Dispatch (${bookings.length} Parcel${bookings.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
