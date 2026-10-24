import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  MessageSquare,
  Users,
  Save,
  CheckCircle2,
  Plus,
  Lock,
  UserPlus,
  Shield,
  Send,
  MapPin,
  Package,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  IndianRupee,
  Phone,
  Clock,
  Navigation,
  Map,
  X,
  Bus,
  Truck,
  User,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCompanySettings } from '../../context/CompanyContext';
import { CitySearchInput } from '../../components/CitySearchInput';

export const SettingsPage = ({ onRefreshGlobalDestinations }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { setCompanySettings: setGlobalCompanySettings } = useCompanySettings();

  const [activeTab, setActiveTab] = useState('cities'); // 'cities' | 'parcelTypes' | 'buses' | 'drivers' | 'company' | 'whatsapp' | 'users'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);



  // System Settings State
  const [settings, setSettings] = useState({
    companyName: '',
    logoUrl: '/logo.png',
    tagline: 'Parcel & Bus Dispatch Network',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    gstin: '',
    receiptFooterNote: '',
    whatsappProvider: 'MOCK',
    whatsappSenderNumber: '',
    whatsappApiKey: '',
    whatsappApiUrl: '',
    standardRoutes: [],
  });

  // Cities & Destination Locations State (Persisted in MongoDB)
  const [cities, setCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [cityLoading, setCityLoading] = useState(false);

  // Form State for Adding / Editing City & Delivery Details (Only City Name & Delivery Address)
  const [editingCityId, setEditingCityId] = useState(null);
  const [cityForm, setCityForm] = useState({
    name: '',
    deliveryAddress: '',
  });

  // Parcel Types State (Persisted in MongoDB)
  const [parcelTypes, setParcelTypes] = useState([]);
  const [parcelTypeSearch, setParcelTypeSearch] = useState('');
  const [parcelTypeLoading, setParcelTypeLoading] = useState(false);
  const [editingParcelTypeId, setEditingParcelTypeId] = useState(null);
  const [parcelTypeForm, setParcelTypeForm] = useState({
    name: '',
    defaultCharge: '',
    defaultWeight: '',
    description: '',
  });

  // Buses & Fleet State (Persisted in MongoDB)
  const [buses, setBuses] = useState([]);
  const [busSearch, setBusSearch] = useState('');
  const [busLoading, setBusLoading] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null);
  const [busForm, setBusForm] = useState({
    busNumber: '',
    busName: '',
    driverName: '',
    driverPhone: '',
    toCity: '',
    defaultDepartureTime: '',
  });

  // Drivers & Crew State (Persisted in MongoDB - Independent of Buses)
  const [drivers, setDrivers] = useState([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverLoading, setDriverLoading] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    alternatePhone: '',
    licenseNumber: '',
    notes: '',
  });

  // Users State (for Admin)
  const [users, setUsers] = useState([]);

  // Test WhatsApp message state
  const [testPhone, setTestPhone] = useState('9876543210');

  // Admin Change Password Form State
  const [adminCurrentPassword, setAdminCurrentPassword] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminCurrent, setShowAdminCurrent] = useState(false);
  const [showAdminNew, setShowAdminNew] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();

    if (!adminCurrentPassword) {
      showToast('Please enter your current administrator password', 'error');
      return;
    }

    if (adminNewPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      showToast('New password and confirmation do not match', 'error');
      return;
    }

    if (adminCurrentPassword === adminNewPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    try {
      setPasswordUpdating(true);
      const res = await api.auth.changePassword({
        currentPassword: adminCurrentPassword,
        newPassword: adminNewPassword,
      });

      if (res.success) {
        showToast('Administrator password updated successfully!', 'success');
        setAdminCurrentPassword('');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update administrator password', 'error');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const fetchCities = async () => {
    try {
      setCityLoading(true);
      const res = await api.cities.list();
      if (res.success && res.data) {
        setCities(res.data);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setCityLoading(false);
    }
  };

  const fetchParcelTypes = async () => {
    try {
      setParcelTypeLoading(true);
      const res = await api.parcelTypes.list();
      if (res.success && res.data) {
        setParcelTypes(res.data);
      }
    } catch (error) {
      console.error('Error fetching parcel types:', error);
    } finally {
      setParcelTypeLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      setBusLoading(true);
      const res = await api.buses.list({ all: true });
      if (res.success && res.data) {
        setBuses(res.data);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setBusLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      setDriverLoading(true);
      const res = await api.drivers.list({ all: true });
      if (res.success && res.data) {
        setDrivers(res.data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setDriverLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.settings.get();
      if (res.success && res.data) {
        setSettings(res.data);
      }

      await Promise.all([fetchCities(), fetchParcelTypes(), fetchBuses(), fetchDrivers()]);

      if (user?.role === 'admin') {
        const usersRes = await api.auth.getUsers();
        if (usersRes.success) {
          setUsers(usersRes.data || []);
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo file size should be less than 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setSettings((prev) => ({ ...prev, logoUrl: base64 }));
      showToast('New logo loaded! Click "Save Company Details" below to apply changes.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.settings.update(settings);
      if (res.success) {
        showToast('Company profile & system settings saved successfully!', 'success');
        if (setGlobalCompanySettings && res.data) {
          setGlobalCompanySettings(res.data);
        }
        if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
      }
    } catch (error) {
      showToast(error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- City & Destination Location Handlers ---
  const handleResetCityForm = () => {
    setEditingCityId(null);
    setCityForm({
      name: '',
      deliveryAddress: '',
    });
  };

  const handleEditCity = (city) => {
    setEditingCityId(city._id);
    setCityForm({
      name: city.name || '',
      deliveryAddress: city.deliveryAddress || city.counterAddress || '',
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleAddStopToCity = (city) => {
    setEditingCityId(null);
    setCityForm({
      name: city.name || '',
      deliveryAddress: '',
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSaveCity = async (e) => {
    e.preventDefault();
    if (!cityForm.name.trim()) {
      showToast('City / Destination name is required (e.g. Vijayawada)', 'error');
      return;
    }
    if (!cityForm.deliveryAddress.trim()) {
      showToast('Delivery address / office location is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: cityForm.name.trim(),
        deliveryAddress: cityForm.deliveryAddress.trim(),
      };

      if (editingCityId) {
        const res = await api.cities.update(editingCityId, payload);
        if (res.success) {
          showToast(`City '${payload.name}' updated successfully!`, 'success');
          handleResetCityForm();
          await fetchCities();
          if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
        }
      } else {
        const res = await api.cities.create(payload);
        if (res.success) {
          showToast(`City '${payload.name}' and delivery location saved successfully!`, 'success');
          handleResetCityForm();
          await fetchCities();
          if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to save city', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (cityId, cityName, loc) => {
    if (!window.confirm(`Delete stop location '${loc}' from '${cityName}'?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await api.cities.deleteLocation(cityId, loc);
      if (res.success) {
        showToast(`Location '${loc}' removed from '${cityName}'`, 'success');
        await fetchCities();
        if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
      }
    } catch (error) {
      showToast(error.message || 'Failed to remove location', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCity = async (id, cityName) => {
    if (!window.confirm(`Are you sure you want to delete city '${cityName}' and all its stops?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await api.cities.delete(id);
      if (res.success) {
        showToast(`City '${cityName}' deleted successfully`, 'success');
        if (editingCityId === id) handleResetCityForm();
        await fetchCities();
        if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete city', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Parcel Types Handlers ---
  const handleResetParcelTypeForm = () => {
    setEditingParcelTypeId(null);
    setParcelTypeForm({
      name: '',
      defaultCharge: '',
      defaultWeight: '',
      description: '',
    });
  };

  const handleEditParcelType = (pt) => {
    setEditingParcelTypeId(pt._id);
    setParcelTypeForm({
      name: pt.name || '',
      defaultCharge: pt.defaultCharge || '',
      defaultWeight: pt.defaultWeight || '',
      description: pt.description || '',
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSaveParcelType = async (e) => {
    e.preventDefault();
    if (!parcelTypeForm.name.trim()) {
      showToast('Parcel type name is required (e.g. Rice Bag (25kg/50kg), Box, Carton)', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: parcelTypeForm.name.trim(),
        defaultCharge: parcelTypeForm.defaultCharge ? Number(parcelTypeForm.defaultCharge) : 0,
        defaultWeight: parcelTypeForm.defaultWeight ? Number(parcelTypeForm.defaultWeight) : 0,
        description: parcelTypeForm.description.trim(),
      };

      if (editingParcelTypeId) {
        const res = await api.parcelTypes.update(editingParcelTypeId, payload);
        if (res.success) {
          showToast(`Parcel Type '${payload.name}' updated successfully!`, 'success');
          handleResetParcelTypeForm();
          await fetchParcelTypes();
          if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
        }
      } else {
        const res = await api.parcelTypes.create(payload);
        if (res.success) {
          showToast(`Parcel Type '${payload.name}' saved successfully!`, 'success');
          handleResetParcelTypeForm();
          await fetchParcelTypes();
          if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to save parcel type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParcelType = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete parcel type '${name}'?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await api.parcelTypes.delete(id);
      if (res.success) {
        showToast(`Parcel Type '${name}' deleted successfully`, 'success');
        if (editingParcelTypeId === id) handleResetParcelTypeForm();
        await fetchParcelTypes();
        if (onRefreshGlobalDestinations) onRefreshGlobalDestinations();
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete parcel type', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Bus Fleet Handlers (Vehicles Only) ---
  const handleResetBusForm = () => {
    setEditingBusId(null);
    setBusForm({
      busNumber: '',
      busName: '',
      toCity: '',
      defaultDepartureTime: '',
    });
  };

  const handleEditBus = (b) => {
    setEditingBusId(b._id);
    setBusForm({
      busNumber: b.busNumber || '',
      busName: b.busName || '',
      toCity: b.toCity || b.route || '',
      defaultDepartureTime: b.defaultDepartureTime || '',
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSaveBus = async (e) => {
    e.preventDefault();
    if (!busForm.busNumber.trim()) {
      showToast('Bus registration number is required (e.g. AP 39 CN 3580)', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        busNumber: busForm.busNumber.trim().toUpperCase(),
        busName: busForm.busName.trim(),
        operator: busForm.busName.trim() || 'Express Travels',
        toCity: busForm.toCity.trim(),
        route: busForm.toCity.trim(),
        defaultDepartureTime: busForm.defaultDepartureTime.trim(),
      };

      if (editingBusId) {
        const res = await api.buses.update(editingBusId, payload);
        if (res.success) {
          showToast(`Bus ${payload.busNumber} updated successfully!`, 'success');
          handleResetBusForm();
          await fetchBuses();
        }
      } else {
        const res = await api.buses.create(payload);
        if (res.success) {
          showToast(`Bus ${payload.busNumber} registered successfully!`, 'success');
          handleResetBusForm();
          await fetchBuses();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to save bus', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBus = async (id, busNum) => {
    if (!window.confirm(`Are you sure you want to delete Bus '${busNum}'?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await api.buses.delete(id);
      if (res.success) {
        showToast(`Bus '${busNum}' deleted successfully`, 'success');
        if (editingBusId === id) handleResetBusForm();
        await fetchBuses();
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete bus', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Drivers & Crew Handlers (Personnel Only) ---
  const handleResetDriverForm = () => {
    setEditingDriverId(null);
    setDriverForm({
      name: '',
      phone: '',
      alternatePhone: '',
      licenseNumber: '',
      notes: '',
    });
  };

  const handleEditDriver = (d) => {
    setEditingDriverId(d._id);
    setDriverForm({
      name: d.name || '',
      phone: d.phone || '',
      alternatePhone: d.alternatePhone || '',
      licenseNumber: d.licenseNumber || '',
      notes: d.notes || '',
    });
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    if (!driverForm.name.trim()) {
      showToast('Driver name is required (e.g. Ramesh Kumar)', 'error');
      return;
    }
    if (!driverForm.phone.trim() || driverForm.phone.replace(/\D/g, '').length < 10) {
      showToast('Valid 10-digit primary mobile number is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: driverForm.name.trim(),
        phone: driverForm.phone.replace(/\D/g, '').slice(-10),
        alternatePhone: driverForm.alternatePhone ? driverForm.alternatePhone.replace(/\D/g, '').slice(-10) : '',
        licenseNumber: driverForm.licenseNumber.trim(),
        notes: driverForm.notes.trim(),
      };

      if (editingDriverId) {
        const res = await api.drivers.update(editingDriverId, payload);
        if (res.success) {
          showToast(`Driver '${payload.name}' updated successfully!`, 'success');
          handleResetDriverForm();
          await fetchDrivers();
        }
      } else {
        const res = await api.drivers.create(payload);
        if (res.success) {
          showToast(`Driver '${payload.name}' registered successfully!`, 'success');
          handleResetDriverForm();
          await fetchDrivers();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to save driver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async (id, driverName) => {
    if (!window.confirm(`Are you sure you want to delete Driver '${driverName}'?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await api.drivers.delete(id);
      if (res.success) {
        showToast(`Driver '${driverName}' deleted successfully`, 'success');
        if (editingDriverId === id) handleResetDriverForm();
        await fetchDrivers();
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete driver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = () => {
    const brand = settings.companyName || 'our Courier & Bus Dispatch Service';
    const message = `Hello Customer,\n\nYour parcel with Order ID 583214 has been dispatched via Bus TS09AB1234.\n\nTrack anytime using your 6-digit Order ID.\n\nThank you for choosing ${brand}.`;
    const clean = testPhone.replace(/\D/g, '');
    const full = clean.length === 10 ? `91${clean}` : clean;
    const url = `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showToast(`Opened WhatsApp Test preview for +${full}`, 'success');
  };

  // Filtered cities list
  const filteredCities = cities.filter((c) => {
    const q = citySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.deliveryAddress && c.deliveryAddress.toLowerCase().includes(q)) ||
      (c.counterAddress && c.counterAddress.toLowerCase().includes(q))
    );
  });

  // Filtered parcel types list
  const filteredParcelTypes = parcelTypes.filter((pt) => {
    const q = parcelTypeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (pt.name && pt.name.toLowerCase().includes(q)) ||
      (pt.description && pt.description.toLowerCase().includes(q))
    );
  });

  // Filtered buses list (Vehicles Only)
  const filteredBuses = buses.filter((b) => {
    const q = busSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.busNumber && b.busNumber.toLowerCase().includes(q)) ||
      (b.busName && b.busName.toLowerCase().includes(q)) ||
      (b.operator && b.operator.toLowerCase().includes(q)) ||
      (b.fromCity && b.fromCity.toLowerCase().includes(q)) ||
      (b.toCity && b.toCity.toLowerCase().includes(q)) ||
      (b.route && b.route.toLowerCase().includes(q))
    );
  });

  // Filtered drivers list (Personnel Only)
  const filteredDrivers = drivers.filter((d) => {
    const q = driverSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.alternatePhone && d.alternatePhone.toLowerCase().includes(q)) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q)) ||
      (d.notes && d.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings & Operations Management</h1>
          <p className="page-subtitle">Configure dynamic from/to cities, parcel types, bus vehicles, driver roster, company profile, and WhatsApp alerts</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="settings-tabs-bar">
        <button
          className={`btn btn-sm ${activeTab === 'cities' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('cities')}
        >
          <Map size={14} />
          <span>From & To Cities ({cities.length})</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'parcelTypes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('parcelTypes')}
        >
          <Package size={14} />
          <span>Parcel Types ({parcelTypes.length})</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'buses' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('buses')}
        >
          <Bus size={14} />
          <span>Bus Fleet ({buses.length})</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'drivers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('drivers')}
        >
          <User size={14} />
          <span>Drivers & Crew ({drivers.length})</span>
        </button>
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <button
            className={`btn btn-sm ${activeTab === 'company' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('company')}
          >
            <Building size={14} />
            <span>Company Profile</span>
          </button>
        )}
        <button
          className={`btn btn-sm ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('whatsapp')}
        >
          <MessageSquare size={14} />
          <span>WhatsApp Notification Setup</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Shield size={14} />
          <span>Admin Account</span>
        </button>
      </div>

      {/* 1. Cities & Destination Locations Tab */}
      {activeTab === 'cities' && (
        <div>
          {/* Add / Edit City Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: editingCityId ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#1b3d63" />
                <h3 style={{ fontSize: '1rem', color: '#0d2137' }}>
                  {editingCityId ? 'Edit City & Delivery Address Details' : 'Add New City / Destination Hub'}
                </h3>
              </div>
              {editingCityId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetCityForm}
                >
                  <RotateCcw size={13} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCity} autoComplete="off" data-lpignore="true">
              <div className="form-row">
                <CitySearchInput
                  id="settings_city_name"
                  name="settings_city_name"
                  label="City / Destination Name *"
                  placeholder="Search existing city or enter new city..."
                  value={cityForm.name}
                  onChange={(name) => setCityForm((prev) => ({ ...prev, name }))}
                  onSelectNext={() => {
                    document.getElementById('settings_city_address')?.focus();
                  }}
                  cities={cities}
                  required
                  helperText="Search to add a new stop to an existing city, or type to create a new city"
                />

                <div className="form-group" style={{ flex: '2' }}>
                  <label className="form-label">
                    Delivery Address / Stop Location <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="settings_city_address"
                    name="settings_city_address"
                    className="form-control"
                    placeholder="e.g. Main Bus Stand Counter #4, Benz Circle / Fire Station Road"
                    value={cityForm.deliveryAddress}
                    onChange={(e) => setCityForm({ ...cityForm, deliveryAddress: e.target.value })}
                    required
                    autoComplete="new-password"
                    data-lpignore="true"
                  />
                  <div className="form-hint">
                    {cities.some((c) => (c.name || '').trim().toLowerCase() === (cityForm.name || '').trim().toLowerCase())
                      ? `Adding this new location under '${cityForm.name.trim()}'`
                      : `Will create '${cityForm.name.trim() || 'New City'}' with this location`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingCityId && (
                  <button type="button" className="btn btn-secondary" onClick={handleResetCityForm} disabled={saving}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving
                    ? 'Saving...'
                    : editingCityId
                    ? 'Update City'
                    : 'Save Location'}
                </button>
              </div>
            </form>
          </div>

          {/* Directory of Saved Cities & Multiple Locations */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137' }}>
                  Configured Cities & Delivery Locations ({cities.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Each city can have multiple stops/locations. They appear in booking search bars and stop selection chips.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search city name or address..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredCities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                {cities.length === 0
                  ? 'No cities added yet. Use the form above to add cities.'
                  : 'No cities match your search filter.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>City Name</th>
                      <th style={{ width: '52%' }}>Configured Stops / Delivery Locations</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCities.map((c) => {
                      const locs = Array.isArray(c.locations) && c.locations.length > 0
                        ? c.locations
                        : (c.deliveryAddress ? [c.deliveryAddress] : []);

                      return (
                        <tr key={c._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#0d2137', fontSize: '0.95rem' }}>
                                {c.name}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  padding: '2px 6px',
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                }}
                              >
                                {locs.length} {locs.length === 1 ? 'stop' : 'stops'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                              {locs.map((loc, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.8125rem',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    color: '#1e293b',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>{loc}</span>
                                  {locs.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLocation(c._id, c.name, loc)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                      title={`Remove stop '${loc}'`}
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </span>
                              ))}

                              {/* Quick + Add Stop button */}
                              <button
                                type="button"
                                onClick={() => handleAddStopToCity(c)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px dashed #2563eb',
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title={`Add another stop to ${c.name}`}
                              >
                                <Plus size={11} />
                                Add Stop
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ marginRight: '0.4rem', padding: '0.25rem 0.5rem' }}
                              onClick={() => handleEditCity(c)}
                              title="Edit primary location"
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleDeleteCity(c._id, c.name)}
                              title="Delete city"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Parcel Types Configuration Tab */}
      {activeTab === 'parcelTypes' && (
        <div>
          {/* Add / Edit Parcel Type Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: editingParcelTypeId ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={18} color="#1b3d63" />
                <h3 style={{ fontSize: '1rem', color: '#0d2137' }}>
                  {editingParcelTypeId ? 'Edit Parcel Type Details' : 'Add New Parcel Type'}
                </h3>
              </div>
              {editingParcelTypeId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetParcelTypeForm}
                >
                  <RotateCcw size={13} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveParcelType} autoComplete="off" data-lpignore="true">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Parcel Type Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="settings_pt_name"
                    name="settings_pt_name"
                    className="form-control"
                    placeholder="e.g. Rice Bag (25kg/50kg), Electronics Box, Fruits Carton"
                    value={parcelTypeForm.name}
                    onChange={(e) => setParcelTypeForm({ ...parcelTypeForm, name: e.target.value })}
                    required
                    autoComplete="new-password"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Displayed in Counter Booking & dispatch screens</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Default Delivery Charge (₹)</label>
                  <input
                    type="number"
                    id="settings_pt_charge"
                    name="settings_pt_charge"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 250 (Optional)"
                    value={parcelTypeForm.defaultCharge}
                    onChange={(e) => setParcelTypeForm({ ...parcelTypeForm, defaultCharge: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Auto-fills price when selected in booking</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Default Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    id="settings_pt_weight"
                    name="settings_pt_weight"
                    className="form-control"
                    placeholder="e.g. 25 (Optional)"
                    value={parcelTypeForm.defaultWeight}
                    onChange={(e) => setParcelTypeForm({ ...parcelTypeForm, defaultWeight: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Standard approximate weight</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description / Category Notes</label>
                  <input
                    type="text"
                    id="settings_pt_desc"
                    name="settings_pt_desc"
                    className="form-control"
                    placeholder="e.g. Grain bags, Commercial goods, Fragile items"
                    value={parcelTypeForm.description}
                    onChange={(e) => setParcelTypeForm({ ...parcelTypeForm, description: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Brief info or handling guidelines</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingParcelTypeId && (
                  <button type="button" className="btn btn-secondary" onClick={handleResetParcelTypeForm} disabled={saving}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving
                    ? 'Saving...'
                    : editingParcelTypeId
                    ? 'Update Parcel Type'
                    : 'Save Parcel Type'}
                </button>
              </div>
            </form>
          </div>

          {/* Directory of Saved Parcel Types */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137' }}>
                  Configured Parcel Types ({parcelTypes.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Dynamically available in Create Booking, Filter lists, and Dispatch workflows.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search parcel types..."
                    value={parcelTypeSearch}
                    onChange={(e) => setParcelTypeSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredParcelTypes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                {parcelTypes.length === 0
                  ? 'No parcel types added yet. Use the form above to add parcel types.'
                  : 'No parcel types match your search filter.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Parcel Type Name</th>
                      <th style={{ width: '18%' }}>Default Charge</th>
                      <th style={{ width: '16%' }}>Default Weight</th>
                      <th style={{ width: '22%' }}>Description / Notes</th>
                      <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParcelTypes.map((pt) => (
                      <tr key={pt._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Package size={15} color="#1e293b" />
                            </div>
                            <span style={{ fontWeight: 700, color: '#0d2137', fontSize: '0.9rem' }}>
                              {pt.name}
                            </span>
                          </div>
                        </td>
                        <td>
                          {pt.defaultCharge ? (
                            <span style={{ fontWeight: 700, color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8125rem', border: '1px solid #cbd5e1' }}>
                              ₹{pt.defaultCharge}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Flexible</span>
                          )}
                        </td>
                        <td>
                          {pt.defaultWeight ? (
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.8125rem' }}>
                              {pt.defaultWeight} kg
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                            {pt.description || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '0.4rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleEditParcelType(pt)}
                            title="Edit parcel type"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDeleteParcelType(pt._id, pt.name)}
                            title="Delete parcel type"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Bus Fleet Tab (Vehicles Only) */}
      {activeTab === 'buses' && (
        <div>
          {/* Add / Edit Bus Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: editingBusId ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bus size={18} color="#1b3d63" />
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>
                  {editingBusId ? 'Edit Bus Vehicle Details' : 'Add New Bus Vehicle'}
                </h3>
              </div>
              {editingBusId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetBusForm}
                >
                  <RotateCcw size={13} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBus} autoComplete="off" data-lpignore="true">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Bus Registration Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="bus_reg_number"
                    name="bus_reg_number"
                    className="form-control"
                    placeholder="e.g. AP 39 CN 3580"
                    style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                    value={busForm.busNumber}
                    onChange={(e) => setBusForm({ ...busForm, busNumber: e.target.value.toUpperCase() })}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Vehicle number plate</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bus / Travels Agency Name</label>
                  <input
                    type="text"
                    id="bus_agency_name"
                    name="bus_agency_name"
                    className="form-control"
                    placeholder="e.g. Kaveri Travels / Morning Star / APSRTC"
                    value={busForm.busName}
                    onChange={(e) => setBusForm({ ...busForm, busName: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Operator or travel company</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Destination Route / City</label>
                  <input
                    type="text"
                    id="bus_to_city"
                    name="bus_to_city"
                    className="form-control"
                    placeholder="e.g. Vijayawada / Eluru / Visakhapatnam"
                    value={busForm.toCity}
                    onChange={(e) => setBusForm({ ...busForm, toCity: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Destination city or route</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Scheduled Departure Time</label>
                  <input
                    type="text"
                    id="bus_dep_time"
                    name="bus_dep_time"
                    className="form-control"
                    placeholder="e.g. 08:30 PM"
                    value={busForm.defaultDepartureTime}
                    onChange={(e) => setBusForm({ ...busForm, defaultDepartureTime: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Default scheduled departure time</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingBusId && (
                  <button type="button" className="btn btn-secondary" onClick={handleResetBusForm} disabled={saving}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving
                    ? 'Saving...'
                    : editingBusId
                    ? 'Update Bus Vehicle'
                    : 'Save Bus Vehicle'}
                </button>
              </div>
            </form>
          </div>

          {/* Directory of Saved Bus Fleet */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>
                  Registered Bus Fleet ({buses.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Vehicles available for parcel dispatch. Drivers can be assigned independently for each trip.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search bus number, agency, or route..."
                    value={busSearch}
                    onChange={(e) => setBusSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredBuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                {buses.length === 0
                  ? 'No buses registered yet. Use the form above to add a bus vehicle.'
                  : 'No buses match your search filter.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '32%' }}>Bus Registration & Agency</th>
                      <th style={{ width: '30%' }}>Destination Route</th>
                      <th style={{ width: '20%' }}>Departure</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuses.map((b) => (
                      <tr key={b._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                              <Bus size={17} />
                            </div>
                            <div>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  fontSize: '0.9375rem',
                                  letterSpacing: '0.04em',
                                  display: 'block',
                                }}
                              >
                                {b.busNumber}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                                {b.busName || 'Express Travels'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem', display: 'block' }}>
                            {b.toCity || b.route || (b.fromCity ? `${b.fromCity} → Destination` : 'General Route')}
                          </span>
                        </td>

                        <td>
                          {b.defaultDepartureTime ? (
                            <span style={{ fontWeight: 700, color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1' }}>
                              <Clock size={11} /> {b.defaultDepartureTime}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Evening</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '0.4rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleEditBus(b)}
                            title="Edit bus vehicle"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDeleteBus(b._id, b.busNumber)}
                            title="Delete bus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Drivers & Crew Tab (Personnel Only) */}
      {activeTab === 'drivers' && (
        <div>
          {/* Add / Edit Driver Form */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: editingDriverId ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} color="#1b3d63" />
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>
                  {editingDriverId ? 'Edit Driver & Crew Profile' : 'Add New Driver & Crew Member'}
                </h3>
              </div>
              {editingDriverId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetDriverForm}
                >
                  <RotateCcw size={13} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveDriver} autoComplete="off" data-lpignore="true">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Driver Full Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="driver_name"
                    name="driver_name"
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Driver / crew member name</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Primary Mobile Phone Number <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="driver_phone"
                    name="driver_phone"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    maxLength={10}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Shared with customers during parcel dispatch</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alternate Mobile / Conductor Phone</label>
                  <input
                    type="tel"
                    id="driver_alt_phone"
                    name="driver_alt_phone"
                    className="form-control"
                    placeholder="e.g. 9848012345 (Optional)"
                    value={driverForm.alternatePhone}
                    onChange={(e) => setDriverForm({ ...driverForm, alternatePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    maxLength={10}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Backup contact or conductor number</div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Driving License / Badge Number</label>
                  <input
                    type="text"
                    id="driver_license"
                    name="driver_license"
                    className="form-control"
                    placeholder="e.g. DL-0420180012345 (Optional)"
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  <div className="form-hint">Commercial license or badge ID</div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Notes / Route Experience</label>
                <input
                  type="text"
                  id="driver_notes"
                  name="driver_notes"
                  className="form-control"
                  placeholder="e.g. Night express specialist, Hyderabad - Vijayawada route"
                  value={driverForm.notes}
                  onChange={(e) => setDriverForm({ ...driverForm, notes: e.target.value })}
                  autoComplete="off"
                  data-lpignore="true"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                {editingDriverId && (
                  <button type="button" className="btn btn-secondary" onClick={handleResetDriverForm} disabled={saving}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} />
                  {saving
                    ? 'Saving...'
                    : editingDriverId
                    ? 'Update Driver Profile'
                    : 'Save Driver Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Directory of Saved Drivers & Crew */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>
                  Registered Drivers & Crew ({drivers.length})
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Available to be assigned to any bus vehicle during daily dispatch.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search driver by name, phone, or license..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredDrivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                {drivers.length === 0
                  ? 'No drivers registered yet. Use the form above to add a driver.'
                  : 'No drivers match your search filter.'}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Driver Full Name</th>
                      <th style={{ width: '24%' }}>Primary Mobile</th>
                      <th style={{ width: '20%' }}>Alternate / Emergency</th>
                      <th style={{ width: '16%' }}>License / Notes</th>
                      <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((d) => (
                      <tr key={d._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontWeight: 700,
                                fontSize: '0.875rem',
                              }}
                            >
                              {d.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', display: 'block' }}>
                                {d.name}
                              </span>
                              {d.licenseNumber && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                                  Lic: {d.licenseNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Phone size={13} color="#2563eb" />
                            <a
                              href={`tel:${d.phone}`}
                              style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
                            >
                              {d.phone}
                            </a>
                          </div>
                        </td>

                        <td>
                          {d.alternatePhone ? (
                            <a
                              href={`tel:${d.alternatePhone}`}
                              style={{ color: '#475569', textDecoration: 'none', fontSize: '0.8125rem' }}
                            >
                              {d.alternatePhone}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>

                        <td>
                          <span style={{ color: '#475569', fontSize: '0.8125rem' }}>
                            {d.notes || '—'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '0.4rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleEditDriver(d)}
                            title="Edit driver"
                          >
                            <Edit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDeleteDriver(d._id, d.name)}
                            title="Delete driver"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Company Profile & Logo Tab */}
      {activeTab === 'company' && (user?.role === 'admin' || user?.role === 'superadmin') && (
        <form onSubmit={handleSaveSettings}>
          {/* Brand Logo & Visual Identity Card */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Building size={18} color="#0f172a" />
              <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Brand Logo & Visual Identity
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Upload your company logo or select the sleek Sri Vinayaka / FastTrack logo. Applies instantly across Public Home, Tracking, Admin TopNav, Bill Receipts, and Reports.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
              {/* Logo Previews (Light & Dark BG) */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Light Header / Receipt Preview
                  </div>
                  <div
                    style={{
                      width: '140px',
                      height: '80px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={settings.logoUrl || '/logo.png'}
                      alt="Logo Light Preview"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Admin Dark TopNav Preview
                  </div>
                  <div
                    style={{
                      width: '140px',
                      height: '80px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={settings.logoUrl || '/logo.png'}
                      alt="Logo Dark Preview"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Upload and Logo Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '4px' }}>
                    Upload New Logo Image (PNG / JPG / SVG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="form-control"
                    style={{ padding: '6px 8px', fontSize: '0.8125rem' }}
                  />
                  <div className="form-hint">Converts to high-resolution format and saves to system profile</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, logoUrl: '/sv-logo.png' }));
                      showToast('Selected Sleek SV Logistics Logo! Click Save to apply.', 'success');
                    }}
                  >
                    Use Sleek SV Logo
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, logoUrl: '/logo.png' }));
                      showToast('Reset to default logo. Click Save to apply.', 'success');
                    }}
                  >
                    Reset to Default Logo
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Logo URL / Tagline */}
            <div className="form-row" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Custom Logo Image URL / Path (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="/logo.png or https://example.com/logo.png"
                  value={settings.logoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Company Sub-Tagline</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Parcel & Bus Dispatch Network"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 700 }}>
              Company Details (Appears on Consignment Receipts & Public Portal)
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company / Service Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Helpline / Counter Contact Phone <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.companyPhone || ''}
                  onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Official Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={settings.companyEmail || ''}
                  onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN / Registration No. (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Main Office & Booking Counter Address <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                value={settings.companyAddress || ''}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Receipt Footer Note / Terms of Carriage</label>
              <textarea
                className="form-control"
                rows={2}
                value={settings.receiptFooterNote || ''}
                onChange={(e) => setSettings({ ...settings, receiptFooterNote: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Company Details'}
            </button>
          </div>
        </form>
      )}

      {/* 3. WhatsApp Notification Tab */}
      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveSettings}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#0d2137', marginBottom: '0.25rem' }}>
              WhatsApp Notification Service Configuration
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              The system automatically sends dispatch notifications when parcels are assigned to a bus. Configure the delivery provider below or use direct WhatsApp Web links.
            </p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">WhatsApp Provider Mode</label>
                <select
                  className="form-control"
                  value={settings.whatsappProvider || 'MOCK'}
                  onChange={(e) => setSettings({ ...settings, whatsappProvider: e.target.value })}
                >
                  <option value="MOCK">MOCK / Console Logger (Development & Direct Links)</option>
                  <option value="TWILIO">Twilio WhatsApp API</option>
                  <option value="META">Meta WhatsApp Cloud API</option>
                  <option value="WEBHOOK">Custom HTTP Webhook API</option>
                </select>
                <div className="form-hint">
                  All modes support 1-click Direct WhatsApp Web dispatch links out of the box.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sender Phone / Business Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.whatsappSenderNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappSenderNumber: e.target.value })}
                  placeholder="+919876543210"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">API Key / Auth Token (Configurable in .env)</label>
                <input
                  type="password"
                  className="form-control"
                  value={settings.whatsappApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappApiKey: e.target.value })}
                  placeholder="Enter API token or leave blank to use .env"
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Endpoint URL (if Custom Webhook)</label>
                <input
                  type="text"
                  className="form-control"
                  value={settings.whatsappApiUrl || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappApiUrl: e.target.value })}
                  placeholder="https://api.yourprovider.com/v1/send"
                />
              </div>
            </div>

            {/* Test WhatsApp Link Generator */}
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                Test WhatsApp Notification Trigger:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '200px' }}
                  placeholder="Enter 10-digit mobile"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleTestWhatsApp}
                >
                  <Send size={14} />
                  Send Test WhatsApp Message
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save WhatsApp Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* 4. Admin Account Profile & Change Password Tab */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Administrator Account Details */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>Administrator Account Details</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Authorized organization administrator account with full administrative privileges</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Admin Name</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{user?.name || 'Administrator'}</div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Admin Username</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563eb' }}>@{user?.username || 'admin'}</div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>System Role</div>
                <div>
                  <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 700 }}>
                    ADMINISTRATOR (Full Access)
                  </span>
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Counter Branch</div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{user?.branch || 'Main Operations Desk'}</div>
              </div>

              {user?.email && (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Official Email</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{user.email}</div>
                </div>
              )}

              {user?.phone && (
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Contact Phone</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{user.phone}</div>
                </div>
              )}
            </div>

            <div style={{ padding: '0.875rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#334155', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={15} color="#2563eb" />
              <span><strong>Security Notice:</strong> Credentials and passwords are encrypted with industry-standard bcrypt encryption. You can update your password below.</span>
            </div>
          </div>

          {/* Card 2: Change Administrator Password */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#0d2137', margin: 0, fontWeight: 700 }}>Change Administrator Password</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Securely change your account password. Requires your current password for verification.</p>
              </div>
            </div>

            <form onSubmit={handleAdminChangePassword} style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Current Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Current Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAdminCurrent ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter your current password..."
                      value={adminCurrentPassword}
                      onChange={(e) => setAdminCurrentPassword(e.target.value)}
                      style={{ paddingRight: '42px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminCurrent(!showAdminCurrent)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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
                      {showAdminCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAdminNew ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimum 6 characters..."
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      style={{ paddingRight: '42px' }}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNew(!showAdminNew)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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
                      {showAdminNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Must be at least 6 characters with a combination of letters, numbers, or symbols.
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAdminConfirm ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Re-enter your new password..."
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      style={{ paddingRight: '42px' }}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminConfirm(!showAdminConfirm)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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
                      {showAdminConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordUpdating}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem' }}
                >
                  <Save size={15} />
                  <span>{passwordUpdating ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
                {(adminCurrentPassword || adminNewPassword || adminConfirmPassword) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAdminCurrentPassword('');
                      setAdminNewPassword('');
                      setAdminConfirmPassword('');
                    }}
                  >
                    Clear Form
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
