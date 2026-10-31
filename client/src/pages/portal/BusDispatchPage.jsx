import React, { useState, useEffect } from 'react';
import {
  Bus,
  Clock,
  CheckCircle2,
  Send,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileText,
  AlertCircle,
  Layers,
  Phone,
  User,
  MapPin,
  Package,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useLiveData } from '../../context/LiveDataContext';

const QUICK_TIMES = ['07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM'];

export const BusDispatchPage = ({
  onOpenReceipt,
  onOpenWhatsApp,
  standardRoutes = [],
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'assign'

  // Pending queue state
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [destinationFilter, setDestinationFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Registered bus fleet state for quick assignment
  const [fleetList, setFleetList] = useState([]);
  const [loadingFleet, setLoadingFleet] = useState(false);

  // Registered drivers state for independent driver selection
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Assign page state
  const [assigningBookings, setAssigningBookings] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [departureTime, setDepartureTime] = useState('08:30 PM');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Manifest Archive Date Range & Search State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyPreset, setHistoryPreset] = useState('all');
  const [historyBusSearch, setHistoryBusSearch] = useState('');

  const fetchFleet = async () => {
    try {
      setLoadingFleet(true);
      const res = await api.buses.list();
      if (res.success && Array.isArray(res.data)) {
        setFleetList(res.data);
      }
    } catch {
      // Ignore fleet error
    } finally {
      setLoadingFleet(false);
    }
  };

  const fetchDriversList = async () => {
    try {
      const res = await api.drivers.list();
      if (res.success && Array.isArray(res.data)) {
        setDriversList(res.data);
      }
    } catch {
      // Ignore drivers error
    }
  };

  const fetchPending = async () => {
    try {
      setLoadingPending(true);
      const params = {};
      if (destinationFilter !== 'ALL') params.destination = destinationFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.dispatch.getPending(params);
      if (res.success) {
        setPendingBookings(res.data || []);
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch pending dispatches', 'error');
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchHistory = async (customStart = historyStartDate, customEnd = historyEndDate, customBus = historyBusSearch) => {
    try {
      setLoadingHistory(true);
      const params = {};
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;
      if (customBus && customBus.trim()) params.busNumber = customBus.trim();

      const res = await api.dispatch.getHistory(params);
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch dispatch history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setHistoryPreset(preset);
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = fmt(today);
      setHistoryStartDate(dStr);
      setHistoryEndDate(dStr);
      fetchHistory(dStr, dStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const dStr = fmt(yest);
      setHistoryStartDate(dStr);
      setHistoryEndDate(dStr);
      fetchHistory(dStr, dStr);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      const start = fmt(past);
      const end = fmt(today);
      setHistoryStartDate(start);
      setHistoryEndDate(end);
      fetchHistory(start, end);
    } else {
      setHistoryStartDate('');
      setHistoryEndDate('');
      fetchHistory('', '');
    }
  };

  useEffect(() => {
    fetchFleet();
    fetchDriversList();
  }, []);

  const { subscribeToEvent } = useLiveData();

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPending();
    } else {
      fetchHistory();
    }
  }, [activeTab, destinationFilter]);

  // Live real-time sync without page refresh
  useEffect(() => {
    const unsubCreated = subscribeToEvent('BOOKING_CREATED', () => {
      if (activeTab === 'pending') fetchPending();
    });
    const unsubUpdated = subscribeToEvent('BOOKING_UPDATED', () => {
      if (activeTab === 'pending') fetchPending();
      else fetchHistory();
    });
    const unsubDispatched = subscribeToEvent('DISPATCH_ASSIGNED', () => {
      fetchPending();
      fetchHistory();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDispatched();
    };
  }, [subscribeToEvent, activeTab]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingBookings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingBookings.map((b) => b._id));
    }
  };

  // Open fresh page to assign bus and driver
  const startAssigning = (bookingsToAssign) => {
    if (!bookingsToAssign || bookingsToAssign.length === 0) {
      showToast('Please select at least one parcel to assign', 'error');
      return;
    }

    setAssigningBookings(bookingsToAssign);
    const first = bookingsToAssign[0];
    const targetDest = first.destination || first.toCity || '';
    setDestinationAddress(first.deliveryAddress || '');

    // Check if there is a matching registered bus for this destination
    const matchingBus = fleetList.find(
      (b) =>
        (b.toCity && targetDest.toLowerCase().includes(b.toCity.toLowerCase())) ||
        (b.route && targetDest.toLowerCase().includes(b.route.toLowerCase()))
    );

    if (matchingBus) {
      setSelectedBusId(matchingBus._id);
      setBusNumber(matchingBus.busNumber || '');
      setBusName(matchingBus.busName || '');
      if (matchingBus.defaultDepartureTime) setDepartureTime(matchingBus.defaultDepartureTime);
    } else if (fleetList.length > 0) {
      const b = fleetList[0];
      setSelectedBusId(b._id);
      setBusNumber(b.busNumber || '');
      setBusName(b.busName || '');
      if (b.defaultDepartureTime) setDepartureTime(b.defaultDepartureTime);
    } else {
      setSelectedBusId('');
      setBusNumber('');
      setBusName('');
      setDepartureTime('08:30 PM');
    }

    // Drivers are managed independently - preselect first driver or leave for quick choice
    if (driversList.length > 0) {
      const d = driversList[0];
      setSelectedDriverId(d._id);
      setDriverName(d.name || '');
      setDriverPhone(d.phone || '');
    } else {
      setSelectedDriverId('');
      setDriverName('');
      setDriverPhone('');
    }

    setViewMode('assign');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFleetBus = (busId) => {
    setSelectedBusId(busId);
    if (!busId) {
      setBusNumber('');
      setBusName('');
      return;
    }
    const bus = fleetList.find((b) => b._id === busId);
    if (bus) {
      setBusNumber(bus.busNumber || '');
      setBusName(bus.busName || '');
      if (bus.defaultDepartureTime) setDepartureTime(bus.defaultDepartureTime);
      showToast(`Selected Bus: ${bus.busNumber} (${bus.busName || 'Express'})`, 'info');
    }
  };

  const handleSelectDriver = (driverId) => {
    setSelectedDriverId(driverId);
    if (!driverId) {
      setDriverName('');
      setDriverPhone('');
      return;
    }
    const driver = driversList.find((d) => d._id === driverId);
    if (driver) {
      setDriverName(driver.name || '');
      setDriverPhone(driver.phone || '');
      showToast(`Selected Driver: ${driver.name}`, 'info');
    }
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!busNumber.trim()) {
      showToast('Please enter the Bus Registration Number (e.g. AP 39 CN 3580)', 'error');
      return;
    }

    try {
      setSubmittingDispatch(true);
      const bookingIds = assigningBookings.map((b) => b._id);
      const first = assigningBookings[0] || {};
      const routeStr = first.destination || first.toCity || 'Scheduled Route';

      const payload = {
        bookingIds,
        busNumber: busNumber.trim().toUpperCase(),
        busName: busName.trim(),
        operator: busName.trim() || 'Express Travels',
        route: routeStr,
        fromCity: first.fromCity || '',
        toCity: first.toCity || first.destination || '',
        destinationAddress: destinationAddress.trim(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        departureTime: departureTime.trim() || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        dispatchNotes: dispatchNotes.trim(),
      };

      const res = await api.dispatch.assignBus(payload);
      if (res.success) {
        showToast(`Successfully dispatched ${bookingIds.length} parcel(s) to Bus ${busNumber.toUpperCase()}!`, 'success');
        setSelectedIds([]);
        setAssigningBookings([]);
        setViewMode('list');
        await fetchPending();
        fetchFleet();
      } else {
        showToast(res.message || 'Failed to dispatch bus', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Failed to dispatch bus', 'error');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const defaultRouteList = Array.isArray(standardRoutes) ? standardRoutes : [];

  // ==========================================
  // FRESH FULL PAGE VIEW: ASSIGN BUS & DRIVER
  // ==========================================
  if (viewMode === 'assign') {
    const totalWeight = assigningBookings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
    const totalAmount = assigningBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const primaryRoute = assigningBookings[0]?.destination || assigningBookings[0]?.toCity || 'Selected Destination';

    return (
      <div style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Navigation Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewMode('list')}
            disabled={submittingDispatch}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Pending Dispatches</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
              Dispatching {assigningBookings.length} Consignment{assigningBookings.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
            Assign Bus & Driver Dispatch
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Select the bus vehicle and assign the driver independently for today's trip. All selected consignments will be marked dispatched with real-time tracking updates.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="dispatch-assign-container">
          {/* LEFT: Assignment Form */}
          <form onSubmit={handleConfirmDispatch} autoComplete="off">
            {/* SECTION 1: BUS VEHICLE DETAILS */}
            <div className="dispatch-card">
              <div className="dispatch-card-header">
                <div className="dispatch-card-title">
                  <Bus size={18} color="#2563eb" />
                  <span>1. Bus Vehicle Details</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vehicle assigned to route</span>
              </div>

              {/* Quick Select Fleet Bus */}
              <div className="dispatch-quick-select-box">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem' }}>
                  <Sparkles size={14} />
                  <span>Quick Select Registered Bus ({fleetList.length} in fleet)</span>
                </label>
                <select
                  className="form-control"
                  style={{ backgroundColor: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}
                  value={selectedBusId}
                  onChange={(e) => handleSelectFleetBus(e.target.value)}
                >
                  <option value="">-- Choose from Registered Buses or Enter Below --</option>
                  {fleetList.map((bus) => (
                    <option key={bus._id} value={bus._id}>
                      {bus.busNumber} — {bus.busName || 'Express'} • {bus.toCity || bus.route || 'Route'} {bus.defaultDepartureTime ? `(${bus.defaultDepartureTime})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bus Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Bus Registration Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="dispatch_bus_num"
                    className="form-control dispatch-input-plate"
                    placeholder="e.g. AP 39 CN 3580"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value.toUpperCase())}
                    required
                  />
                  <div className="form-hint">Vehicle number plate</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bus / Travels Agency Name</label>
                  <input
                    type="text"
                    id="dispatch_bus_name"
                    className="form-control"
                    placeholder="e.g. Kaveri Travels / Morning Star"
                    value={busName}
                    onChange={(e) => setBusName(e.target.value)}
                  />
                  <div className="form-hint">Operator name</div>
                </div>
              </div>

              {/* Departure Time & Delivery Counter */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '0.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Scheduled Departure Time</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontWeight: 700 }}
                    placeholder="e.g. 08:30 PM"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {QUICK_TIMES.slice(0, 4).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '1px 6px',
                          fontSize: '0.7rem',
                          backgroundColor: departureTime === t ? '#eff6ff' : '#ffffff',
                          borderColor: departureTime === t ? '#2563eb' : '#cbd5e1',
                          color: departureTime === t ? '#1d4ed8' : '#475569',
                          fontWeight: departureTime === t ? 700 : 500,
                        }}
                        onClick={() => setDepartureTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Delivery Counter / Unloading Stop</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Main Bus Stand Counter #4, Benz Circle"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                  />
                  <div className="form-hint">Stop where parcel can be collected</div>
                </div>
              </div>
            </div>

            {/* SECTION 2: DRIVER & CREW ASSIGNMENT */}
            <div className="dispatch-card">
              <div className="dispatch-card-header">
                <div className="dispatch-card-title">
                  <User size={18} color="#2563eb" />
                  <span>2. Driver & Crew Assignment</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned for today's trip</span>
              </div>

              {/* Quick Select Registered Driver */}
              <div className="dispatch-quick-select-box">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem' }}>
                  <Sparkles size={14} />
                  <span>Quick Select Registered Driver ({driversList.length} registered)</span>
                </label>
                <select
                  className="form-control"
                  style={{ backgroundColor: '#ffffff', fontWeight: 600, fontSize: '0.875rem' }}
                  value={selectedDriverId}
                  onChange={(e) => handleSelectDriver(e.target.value)}
                >
                  <option value="">-- Choose from Registered Drivers or Enter Below --</option>
                  {driversList.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name} — {driver.phone} {driver.licenseNumber ? `(Lic: ${driver.licenseNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Assigned Driver Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="dispatch_driver_name"
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                  />
                  <div className="form-hint">Driver in-charge for this run</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Driver Mobile Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="dispatch_driver_phone"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    required
                  />
                  <div className="form-hint" style={{ color: '#2563eb' }}>
                    Shared in customer WhatsApp/SMS notification
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: DISPATCH NOTES & CONFIRM ACTION */}
            <div className="dispatch-card" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Special Trip / Waybill Notes (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Fragile parcels in cabin; Call receiver on arrival at Benz Circle"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewMode('list')}
                  disabled={submittingDispatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingDispatch}
                  style={{
                    padding: '0.65rem 1.75rem',
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <Send size={16} />
                  {submittingDispatch
                    ? 'Dispatching Consignments...'
                    : `Confirm & Dispatch ${assigningBookings.length} Consignment(s)`}
                </button>
              </div>
            </div>
          </form>

          {/* RIGHT: Sticky Consignment Manifest Summary */}
          <div>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                position: 'sticky',
                top: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={17} color="#2563eb" />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Manifest Summary
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {assigningBookings.length} Item{assigningBookings.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Stat Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.625rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Freight</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0d2137' }}>₹{totalAmount}</div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.625rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Weight</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0d2137' }}>{totalWeight} kg</div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem', fontWeight: 600 }}>
                Route: <span style={{ color: '#0f172a' }}>{primaryRoute}</span>
              </div>

              {/* Scrollable list of Parcels */}
              <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingRight: '2px' }}>
                {assigningBookings.map((b) => (
                  <div
                    key={b._id}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span className="order-id-badge" style={{ fontSize: '0.8125rem' }}>
                        #{b.orderId}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: b.paymentStatus === 'TO_PAY' ? '#b45309' : '#15803d',
                          backgroundColor: b.paymentStatus === 'TO_PAY' ? '#fef3c7' : '#dcfce7',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        ₹{b.amount} {b.paymentStatus === 'TO_PAY' ? 'TO PAY' : 'PAID'}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                      {b.customerName} <span style={{ color: '#64748b', fontWeight: 400 }}>({b.customerPhone})</span>
                    </div>

                    <div style={{ color: '#475569', fontSize: '0.75rem' }}>
                      {b.parcelType || 'Parcel'} {b.quantity ? `• ${b.quantity} pcs` : ''} {b.weight ? `• ${b.weight} kg` : ''}
                    </div>

                    {b.receiverName && (
                      <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '3px' }}>
                        To: {b.receiverName} ({b.receiverPhone || '—'})
                      </div>
                    )}

                    <div style={{ color: '#2563eb', fontSize: '0.7rem', marginTop: '2px', fontWeight: 500 }}>
                      📍 {b.toCity && b.deliveryAddress && !b.deliveryAddress.toLowerCase().includes(b.toCity.toLowerCase())
                        ? `${b.toCity} - ${b.deliveryAddress}`
                        : (b.deliveryAddress || b.destination || 'Destination')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // NORMAL LIST VIEW: PENDING / HISTORY
  // ==========================================
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bus Dispatch & Loading</h1>
          <p className="page-subtitle">
            Allocate waiting parcels to scheduled departures and generate driver load manifests
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '3px', borderRadius: 'var(--radius-md)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('pending')}
            style={{ fontWeight: 600, border: 'none', boxShadow: activeTab === 'pending' ? 'var(--shadow-sm)' : 'none' }}
          >
            <Clock size={14} />
            <span>Pending Dispatch ({pendingBookings.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('history')}
            style={{ fontWeight: 600, border: 'none', boxShadow: activeTab === 'history' ? 'var(--shadow-sm)' : 'none' }}
          >
            <FileText size={14} />
            <span>Manifest Archive</span>
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div>
          {/* Pending Dispatch Controls */}
          <div className="filter-bar">
            <div className="filter-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search Pending Order / Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPending()}
                style={{ width: '250px' }}
              />
              <button className="btn btn-secondary btn-sm" onClick={fetchPending}>
                <Search size={14} />
                Search
              </button>

              <select
                className="form-control"
                style={{ width: '200px' }}
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
              >
                <option value="ALL">All Destination Routes</option>
                {defaultRouteList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Action */}
            <div className="filter-group">
              {selectedIds.length > 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const selected = pendingBookings.filter((b) => selectedIds.includes(b._id));
                    startAssigning(selected);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Bus size={14} />
                  <span>Assign Selected ({selectedIds.length}) to Bus</span>
                </button>
              )}
            </div>
          </div>

          {/* Pending Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={pendingBookings.length > 0 && selectedIds.length === pendingBookings.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Customer / Sender</th>
                  <th>Destination Route</th>
                  <th>Parcel Type</th>
                  <th>Quantity</th>
                  <th>Booking Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingPending ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      Loading pending dispatch parcels...
                    </td>
                  </tr>
                ) : pendingBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                      <CheckCircle2 size={36} color="#0f172a" style={{ margin: '0 auto 0.5rem auto' }} />
                      <div style={{ fontWeight: 600, color: '#0d2137' }}>All Parcels Dispatched!</div>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        No pending parcels waiting for bus assignment right now.
                      </p>
                    </td>
                  </tr>
                ) : (
                  pendingBookings.map((booking) => {
                    const isSelected = selectedIds.includes(booking._id);
                    return (
                      <tr key={booking._id} style={isSelected ? { backgroundColor: '#eff6ff' } : {}}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(booking._id)}
                          />
                        </td>
                        <td>
                          <span className="order-id-badge">#{booking.orderId}</span>
                        </td>
                        <td>
                          <strong style={{ color: '#0d2137' }}>{booking.customerName}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}> • {booking.customerPhone}</span>
                        </td>
                        <td>
                          {(() => {
                            const cleanTo = (booking.toCity || (booking.destination?.includes('→') ? booking.destination.split('→').slice(1).join('→').trim() : (booking.destination?.includes('->') ? booking.destination.split('->').slice(1).join('->').trim() : booking.destination)) || '').trim();
                            const cleanFrom = (booking.fromCity || (booking.destination?.includes('→') ? booking.destination.split('→')[0].trim() : (booking.destination?.includes('->') ? booking.destination.split('->')[0].trim() : '')) || 'Origin').trim();
                            const cleanRoute = cleanTo && cleanFrom ? `${cleanFrom} → ${cleanTo}` : (booking.destination || cleanTo);
                            const stop = (booking.deliveryAddress || '').trim();
                            const fullTo = stop && cleanTo && !stop.toLowerCase().includes(cleanTo.toLowerCase())
                              ? `${cleanTo} - ${stop}`
                              : (stop || cleanTo);

                            return (
                              <span style={{ fontWeight: 500 }} title={fullTo ? `${cleanRoute} (${fullTo})` : cleanRoute}>
                                {cleanRoute}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem' }} title={booking.parcelType}>
                            {booking.parcelType}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1b3d63' }}>
                            {booking.quantity} pcs
                          </span>
                          {booking.weight ? <span style={{ fontSize: '0.75rem', color: '#64748b' }}> ({booking.weight}kg)</span> : ''}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="status-badge status-waiting_for_bus">
                            WAITING FOR BUS
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => startAssigning([booking])}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Bus size={13} />
                            Assign Bus
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Manifest Archive History */
        <div>
          {/* Manifest Archive Date Range & Filter Bar */}
          <div
            className="filter-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Date:
              </span>
              {[
                { id: 'all', label: 'All (90 Days)' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p.id)}
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: historyPreset === p.id ? 700 : 500,
                    backgroundColor: historyPreset === p.id ? '#0f172a' : '#ffffff',
                    color: historyPreset === p.id ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From:</span>
                <input
                  type="date"
                  className="form-control"
                  min={new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '135px', padding: '4px 8px', fontSize: '0.75rem' }}
                  value={historyStartDate}
                  onChange={(e) => {
                    setHistoryStartDate(e.target.value);
                    setHistoryPreset('custom');
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
                <input
                  type="date"
                  className="form-control"
                  min={new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: '135px', padding: '4px 8px', fontSize: '0.75rem' }}
                  value={historyEndDate}
                  onChange={(e) => {
                    setHistoryEndDate(e.target.value);
                    setHistoryPreset('custom');
                  }}
                />
              </div>

              <input
                type="text"
                className="form-control"
                placeholder="Bus Number..."
                style={{ width: '130px', padding: '4px 8px', fontSize: '0.75rem' }}
                value={historyBusSearch}
                onChange={(e) => setHistoryBusSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
              />

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fetchHistory()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
              >
                <Filter size={12} />
                <span>Filter</span>
              </button>

              {(historyStartDate || historyEndDate || historyBusSearch) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleApplyPreset('all')}
                  style={{ fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Manifest ID</th>
                <th>Bus Number</th>
                <th>Destination Route</th>
                <th>Driver & Phone</th>
                <th>Departure Time</th>
                <th>Parcels Included</th>
                <th>Total Pieces</th>
                <th>Dispatched At</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading dispatch history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No bus dispatch manifests recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b3d63', fontSize: '0.75rem' }}>
                        {item.dispatchManifestNumber}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#0d2137' }}>{item.busNumber}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}> • {item.busName || item.operator || 'Express Lines'}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }} title={item.destinationAddress ? `${item.route} (${item.destinationAddress})` : item.route}>
                        {item.route}
                      </span>
                    </td>
                    <td>
                      {item.driverName || item.driverPhone ? (
                        <span>
                          <strong style={{ color: '#0d2137', fontSize: '0.8125rem' }}>{item.driverName || 'Driver'}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}> • {item.driverPhone || '—'}</span>
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{item.departureTime}</span>
                      {item.platformNumber && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}> (Plat {item.platformNumber})</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#1b3d63' }}>
                        {(item.orderIds || []).length} orders
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }} title={(item.orderIds || []).map((id) => `#${id}`).join(', ')}>
                        {' '}({(item.orderIds || []).slice(0, 2).map((id) => `#${id}`).join(', ')}{(item.orderIds || []).length > 2 ? ` +${item.orderIds.length - 2}` : ''})
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.totalParcels} pcs</td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(item.dispatchedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{item.dispatchedBy?.name || 'Staff'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
