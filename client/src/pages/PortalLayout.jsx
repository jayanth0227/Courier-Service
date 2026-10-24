import React, { useState, useEffect } from 'react';
import { PortalTopNav } from '../components/PortalTopNav';
import { DashboardPage } from './portal/DashboardPage';
import { CreateBookingPage } from './portal/CreateBookingPage';
import { BookingsPage } from './portal/BookingsPage';
import { BusDispatchPage } from './portal/BusDispatchPage';
import { CustomersPage } from './portal/CustomersPage';
import { ReportsPage } from './portal/ReportsPage';
import { SettingsPage } from './portal/SettingsPage';
import { TrackingPage } from './TrackingPage';

import { ReceiptModal } from '../components/ReceiptModal';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { StaffManagementModal } from '../components/StaffManagementModal';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings } from '../context/CompanyContext';
import { useLiveData } from '../context/LiveDataContext';

export const PortalLayout = ({
  activeModule: controlledModule,
  onSelectModule: controlledOnSelectModule,
  onNavigatePublic,
  companySettings: propCompanySettings,
  onRefreshCompanySettings,
}) => {
  const { user } = useAuth();
  const { companySettings: contextCompanySettings, setCompanySettings: setGlobalCompanySettings } = useCompanySettings();

  const isStaff = user?.role === 'staff';
  const STAFF_ALLOWED = ['create-booking', 'bookings', 'dispatch', 'tracking'];

  // If controlled from App.jsx routing, use controlledModule; else maintain internal state
  const [internalModule, setInternalModule] = useState(() => {
    const saved = localStorage.getItem('courier_active_module');
    if (user?.role === 'staff') {
      return STAFF_ALLOWED.includes(saved) ? saved : 'create-booking';
    }
    return saved || 'dashboard';
  });

  const rawModule = controlledModule || internalModule;
  const activeModule = isStaff && !STAFF_ALLOWED.includes(rawModule) ? 'create-booking' : rawModule;

  // Protect staff routes: staff should only have access to create booking, booking list, bus dispatch, parcel tracking
  useEffect(() => {
    if (isStaff && !STAFF_ALLOWED.includes(activeModule)) {
      handleSelectModule('create-booking');
    }
  }, [activeModule, isStaff]);

  const handleSelectModule = (mod) => {
    const targetMod = isStaff && !STAFF_ALLOWED.includes(mod) ? 'create-booking' : mod;
    if (controlledOnSelectModule) {
      controlledOnSelectModule(targetMod);
    } else {
      setInternalModule(targetMod);
      localStorage.setItem('courier_active_module', targetMod);
      window.location.hash = `#${targetMod}`;
    }
  };

  const [pendingDispatchCount, setPendingDispatchCount] = useState(0);
  const [companySettings, setCompanySettings] = useState(propCompanySettings || contextCompanySettings || null);

  useEffect(() => {
    if (propCompanySettings || contextCompanySettings) {
      setCompanySettings(propCompanySettings || contextCompanySettings);
    }
  }, [propCompanySettings, contextCompanySettings]);
  const [destinations, setDestinations] = useState([]);
  const [cities, setCities] = useState([]);
  const [parcelTypes, setParcelTypes] = useState([]);

  // Modals state
  const [receiptBooking, setReceiptBooking] = useState(null);
  const [assignBusBookings, setAssignBusBookings] = useState(null);
  const [assignBusCallback, setAssignBusCallback] = useState(null);
  const [whatsAppBooking, setWhatsAppBooking] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const refreshPendingCount = async () => {
    try {
      const res = await api.dispatch.getPending();
      if (res.success) {
        setPendingDispatchCount(res.count || (res.data ? res.data.length : 0));
      }
    } catch {
      // Ignore background poll errors
    }
  };

  const fetchCities = async () => {
    try {
      const res = await api.cities.list();
      if (res.success && res.data) {
        setCities(res.data);
      }
    } catch {
      // Ignore cities fetch errors
    }
  };

  const fetchParcelTypes = async () => {
    try {
      const res = await api.parcelTypes.list();
      if (res.success && res.data) {
        setParcelTypes(res.data);
      }
    } catch {
      // Ignore parcel types fetch errors
    }
  };

  const fetchDestinations = async () => {
    try {
      const res = await api.destinations.list();
      if (res.success && res.data) {
        setDestinations(res.data);
      }
    } catch {
      // Ignore destinations fetch errors
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.settings.get();
      if (res.success && res.data) {
        setCompanySettings(res.data);
        if (setGlobalCompanySettings) setGlobalCompanySettings(res.data);
      }
    } catch {
      // Ignore settings fetch errors
    }
  };

  const refreshAllGlobalState = async () => {
    await Promise.all([
      fetchCities(),
      fetchParcelTypes(),
      fetchDestinations(),
      fetchSettings(),
      refreshPendingCount(),
    ]);
  };

  useEffect(() => {
    refreshAllGlobalState();
    const interval = setInterval(refreshPendingCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const { subscribeToEvent } = useLiveData();

  // Instant real-time badge updates without waiting for interval
  useEffect(() => {
    const unsubCreated = subscribeToEvent('BOOKING_CREATED', () => {
      refreshPendingCount();
    });
    const unsubDispatched = subscribeToEvent('DISPATCH_ASSIGNED', () => {
      refreshPendingCount();
    });
    const unsubUpdated = subscribeToEvent('BOOKING_UPDATED', () => {
      refreshPendingCount();
    });
    return () => {
      unsubCreated();
      unsubDispatched();
      unsubUpdated();
    };
  }, [subscribeToEvent]);

  const handleOpenAssignBus = (bookings, callback) => {
    setAssignBusBookings(bookings);
    setAssignBusCallback(() => callback);
  };

  const handleAssignBusSuccess = () => {
    refreshPendingCount();
    if (assignBusCallback) {
      assignBusCallback();
    }
  };

  return (
    <div className="portal-layout-topbar">
      {/* Top Bar Navigation (Clean Top Navigation) */}
      <PortalTopNav
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        pendingDispatchCount={pendingDispatchCount}
        onNavigatePublic={onNavigatePublic}
        onNewBooking={() => handleSelectModule('create-booking')}
        onOpenStaff={() => handleSelectModule('staff')}
        companySettings={companySettings}
      />

      {/* Main Workspace Area */}
      <main className="portal-content">
        {receiptBooking ? (
          <ReceiptModal
            booking={receiptBooking}
            companySettings={companySettings}
            onClose={() => setReceiptBooking(null)}
          />
        ) : whatsAppBooking ? (
          <WhatsAppModal
            booking={whatsAppBooking}
            onClose={() => setWhatsAppBooking(null)}
            onSuccess={refreshPendingCount}
          />
        ) : (
          <>
            {activeModule === 'dashboard' && (
              <DashboardPage
                onNavigateModule={handleSelectModule}
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onOpenWhatsApp={(b) => setWhatsAppBooking(b)}
                onOpenAssignBus={() => handleSelectModule('dispatch')}
              />
            )}

            {activeModule === 'create-booking' && (
              <CreateBookingPage
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onOpenWhatsApp={(b) => setWhatsAppBooking(b)}
                onNavigateModule={handleSelectModule}
                cities={cities}
                onRefreshCities={fetchCities}
                parcelTypes={parcelTypes}
                onRefreshParcelTypes={fetchParcelTypes}
                standardRoutes={
                  destinations.length > 0
                    ? destinations.map((d) => d.route)
                    : companySettings?.standardRoutes || []
                }
                destinations={destinations}
                onRefreshDestinations={fetchDestinations}
              />
            )}

            {activeModule === 'bookings' && (
              <BookingsPage
                onNavigateModule={handleSelectModule}
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onOpenWhatsApp={(b) => setWhatsAppBooking(b)}
                onOpenAssignBus={() => handleSelectModule('dispatch')}
                parcelTypes={parcelTypes}
                standardRoutes={
                  destinations.length > 0
                    ? destinations.map((d) => d.route)
                    : companySettings?.standardRoutes || []
                }
              />
            )}

            {activeModule === 'dispatch' && (
              <BusDispatchPage
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onOpenWhatsApp={(b) => setWhatsAppBooking(b)}
                parcelTypes={parcelTypes}
                standardRoutes={
                  destinations.length > 0
                    ? destinations.map((d) => d.route)
                    : companySettings?.standardRoutes || []
                }
              />
            )}

            {activeModule === 'tracking' && (
              <TrackingPage
                onNavigate={() => handleSelectModule(isStaff ? 'create-booking' : 'dashboard')}
              />
            )}

            {activeModule === 'customers' && (
              <CustomersPage
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onNavigateModule={handleSelectModule}
              />
            )}

            {activeModule === 'reports' && (
              <ReportsPage
                parcelTypes={parcelTypes}
                companySettings={companySettings}
                onOpenReceipt={(b) => setReceiptBooking(b)}
                onOpenWhatsApp={(b) => setWhatsAppBooking(b)}
                standardRoutes={
                  destinations.length > 0
                    ? destinations.map((d) => d.route)
                    : companySettings?.standardRoutes || []
                }
              />
            )}

            {activeModule === 'settings' && (
              <SettingsPage onRefreshGlobalDestinations={refreshAllGlobalState} />
            )}

            {(activeModule === 'staff' || showStaffModal) && (
              <StaffManagementModal
                isOpen={true}
                onClose={() => {
                  setShowStaffModal(false);
                  handleSelectModule('dashboard');
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
