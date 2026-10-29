import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PackagePlus,
  Printer,
  Send,
  PlusCircle,
  CheckCircle2,
  User,
  MapPin,
  Package,
  Plus,
  X,
  RotateCcw,
  Trash2,
  Phone,
  Search,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCompanySettings } from '../../context/CompanyContext';
import { useLiveData } from '../../context/LiveDataContext';
import { CitySearchInput } from '../../components/CitySearchInput';
import { bookingFormSchema } from '../../schemas/bookingSchema';

export const CreateBookingPage = ({
  onOpenReceipt,
  onOpenWhatsApp,
  onNavigateModule,
  cities: propCities = [],
  onRefreshCities,
  parcelTypes: propParcelTypes = [],
  onRefreshParcelTypes,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { companySettings } = useCompanySettings();
  const { notifyLocalChange } = useLiveData();

  const defaultOrigin = companySettings?.fromCity || user?.branch || '';

  const canManageMasterData = user?.role === 'admin' || user?.role === 'superadmin';

  const [citiesList, setCitiesList] = useState(propCities);
  const [showAddCityModal, setShowAddCityModal] = useState(false);

  // Quick Add City Modal State
  const [quickCity, setQuickCity] = useState({
    name: '',
    deliveryAddress: '',
  });
  const [quickCitySaving, setQuickCitySaving] = useState(false);

  // Parcel Types State (Loaded from MongoDB)
  const [parcelTypesList, setParcelTypesList] = useState(propParcelTypes);
  const [showAddParcelTypeModal, setShowAddParcelTypeModal] = useState(false);
  const [quickParcelType, setQuickParcelType] = useState({
    name: '',
    defaultCharge: '',
    defaultWeight: '',
    description: '',
  });
  const [quickParcelTypeSaving, setQuickParcelTypeSaving] = useState(false);

  const fetchCities = async () => {
    try {
      const res = await api.cities.list();
      if (res.success && res.data) {
        setCitiesList(res.data);
      }
    } catch (err) {
      console.error('Failed to load cities in CreateBookingPage:', err);
    }
  };

  const fetchParcelTypes = async () => {
    try {
      const res = await api.parcelTypes.list();
      if (res.success && res.data) {
        setParcelTypesList(res.data);
      }
    } catch (err) {
      console.error('Failed to load parcel types in CreateBookingPage:', err);
    }
  };

  useEffect(() => {
    if (propCities && propCities.length > 0) {
      setCitiesList(propCities);
    } else {
      fetchCities();
    }
  }, [propCities]);

  useEffect(() => {
    if (propParcelTypes && propParcelTypes.length > 0) {
      setParcelTypesList(propParcelTypes);
    } else {
      fetchParcelTypes();
    }
  }, [propParcelTypes]);

  // Form Data (Destination first, Sender phone-first with auto-fetch name, Receiver phone-first)
  const [formData, setFormData] = useState({
    fromCity: defaultOrigin || '',
    toCity: '',
    deliveryAddress: '',
    customerPhone: '',
    customerName: '',
    receiverPhone: '',
    receiverName: '',
    paymentStatus: 'PAID',
  });

  useEffect(() => {
    if (defaultOrigin) {
      setFormData((prev) => ({
        ...prev,
        fromCity: prev.fromCity || defaultOrigin,
      }));
    }
  }, [defaultOrigin]);

  // Multi-Parcel Items State (under same LR ID)
  const [parcelItems, setParcelItems] = useState([
    {
      id: 'item-1',
      parcelType: propParcelTypes.length > 0 ? propParcelTypes[0].name : '',
      quantity: 1,
      weight: propParcelTypes.length > 0 && propParcelTypes[0].defaultWeight ? String(propParcelTypes[0].defaultWeight) : '',
      charge: propParcelTypes.length > 0 && propParcelTypes[0].defaultCharge ? String(propParcelTypes[0].defaultCharge) : '',
      notes: '',
    },
  ]);

  // Editable Grand Total LR Charge state (allows direct counter input/override)
  const [customTotalAmount, setCustomTotalAmount] = useState('');
  const [isTotalCustom, setIsTotalCustom] = useState(false);

  // Zod form validation field errors
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Keep first parcel type synced if list loads dynamically
  useEffect(() => {
    if (parcelTypesList.length > 0) {
      setParcelItems((prevItems) => {
        if (prevItems.length === 1 && !prevItems[0].parcelType) {
          const first = parcelTypesList[0];
          return [
            {
              ...prevItems[0],
              parcelType: first.name,
              charge: first.defaultCharge ? String(first.defaultCharge) : '',
              weight: first.defaultWeight ? String(first.defaultWeight) : '',
            },
          ];
        }
        return prevItems;
      });
    }
  }, [parcelTypesList]);

  // Customer Phone Auto-Suggest State
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);
  const [phoneActiveIdx, setPhoneActiveIdx] = useState(0);
  const phoneContainerRef = useRef(null);
  const phoneDebounceRef = useRef(null);

  // Close phone suggestion dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (phoneContainerRef.current && !phoneContainerRef.current.contains(e.target)) {
        setPhoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search existing customers by phone digits
  const searchCustomerPhone = useCallback(async (query) => {
    const cleaned = (query || '').replace(/\D/g, '');
    if (!cleaned || cleaned.length < 2) {
      setPhoneSuggestions([]);
      setPhoneDropdownOpen(false);
      return;
    }

    try {
      const res = await api.customers.list({ search: cleaned, limit: 6 });
      if (res.success && Array.isArray(res.data)) {
        const matches = res.data.filter((c) => {
          const p = (c.phone || '').replace(/\D/g, '');
          return p.includes(cleaned);
        });

        // Exact match auto-fill
        const exactMatch = matches.find((c) => (c.phone || '').replace(/\D/g, '') === cleaned);
        if (cleaned.length === 10 && exactMatch && !formData.customerName) {
          setFormData((prev) => ({
            ...prev,
            customerName: exactMatch.name || prev.customerName,
          }));
        }

        setPhoneSuggestions(matches);
        setPhoneDropdownOpen(matches.length > 0);
        setPhoneActiveIdx(0);
      }
    } catch (err) {
      console.error('Customer phone search error:', err);
    }
  }, [formData.customerName]);

  const handlePhoneInputChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, customerPhone: cleaned }));

    if (phoneDebounceRef.current) {
      clearTimeout(phoneDebounceRef.current);
    }

    if (!cleaned) {
      setPhoneSuggestions([]);
      setPhoneDropdownOpen(false);
      return;
    }

    phoneDebounceRef.current = setTimeout(() => {
      searchCustomerPhone(cleaned);
    }, 180);
  };

  const handleSelectSuggestedCustomer = (cust) => {
    if (!cust) return;
    clearFieldError('customerPhone');
    clearFieldError('customerName');
    setFormData((prev) => ({
      ...prev,
      customerPhone: cust.phone || prev.customerPhone,
      customerName: cust.name || prev.customerName,
    }));
    setPhoneDropdownOpen(false);
    showToast(`Existing Customer Loaded: ${cust.name}`, 'info');

    setTimeout(() => {
      document.getElementById('cb_receiver_phone')?.focus();
    }, 60);
  };

  const handlePhoneKeyDown = (e) => {
    if (phoneDropdownOpen && phoneSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPhoneActiveIdx((prev) => (prev < phoneSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPhoneActiveIdx((prev) => (prev > 0 ? prev - 1 : phoneSuggestions.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phoneActiveIdx >= 0 && phoneActiveIdx < phoneSuggestions.length) {
          handleSelectSuggestedCustomer(phoneSuggestions[phoneActiveIdx]);
        } else {
          setPhoneDropdownOpen(false);
          document.getElementById('cb_sender_name')?.focus();
        }
        return;
      }
      if (e.key === 'Escape') {
        setPhoneDropdownOpen(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('cb_sender_name')?.focus();
    }
  };

  // Multi-Parcel Item Handlers
  const handleAddItem = () => {
    setIsTotalCustom(false);
    setCustomTotalAmount('');
    const defaultPt = parcelTypesList.length > 0 ? parcelTypesList[0] : null;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      parcelType: defaultPt ? defaultPt.name : '',
      quantity: 1,
      weight: defaultPt && defaultPt.defaultWeight ? String(defaultPt.defaultWeight) : '',
      charge: defaultPt && defaultPt.defaultCharge ? String(defaultPt.defaultCharge) : '',
      notes: '',
    };
    setParcelItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index) => {
    if (parcelItems.length <= 1) {
      showToast('At least one parcel item is required for the consignment', 'info');
      return;
    }
    setIsTotalCustom(false);
    setCustomTotalAmount('');
    setParcelItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    clearFieldError(`items.${index}.${field}`);
    clearFieldError('items');

    setParcelItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };

      // If user changed parcel type, auto-populate default charge and weight if empty
      if (field === 'parcelType') {
        const pt = parcelTypesList.find((p) => p.name === value);
        if (pt) {
          if (pt.defaultCharge && (!current.charge || current.charge === '0')) {
            current.charge = String(pt.defaultCharge);
          }
          if (pt.defaultWeight && !current.weight) {
            current.weight = String(pt.defaultWeight);
          }
        }
      }

      updated[index] = current;
      return updated;
    });

    if (field === 'charge') {
      clearFieldError('totalAmount');
      setIsTotalCustom(false);
      setCustomTotalAmount('');
    }
  };

  const handleGrandTotalChange = (val) => {
    clearFieldError('totalAmount');
    setIsTotalCustom(true);
    setCustomTotalAmount(val);
    if (parcelItems.length === 1) {
      setParcelItems((prev) => [{ ...prev[0], charge: val }]);
    }
  };

  // Calculate Consolidated Live Totals
  const totalQuantity = parcelItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const totalWeight = parcelItems.reduce((acc, item) => acc + (Number(item.weight) || 0), 0);
  const calculatedItemsTotal = parcelItems.reduce((acc, item) => acc + (Number(item.charge) || 0), 0);
  const finalTotalAmount = isTotalCustom
    ? (customTotalAmount === '' ? 0 : Number(customTotalAmount))
    : calculatedItemsTotal;

  const [loading, setLoading] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const selectedToCityObj = citiesList.find(
    (c) => (c.name || '').trim().toLowerCase() === (formData.toCity || '').trim().toLowerCase()
  );

  const availableLocations = Array.from(
    new Set(
      [
        ...(Array.isArray(selectedToCityObj?.locations) ? selectedToCityObj.locations : []),
        selectedToCityObj?.deliveryAddress,
        selectedToCityObj?.counterAddress,
      ]
        .map((l) => (l || '').trim())
        .filter(Boolean)
    )
  );

  // Quick Add Parcel Type Handler (Admin only)
  const handleQuickAddParcelType = async (e) => {
    e.preventDefault();
    if (!canManageMasterData) {
      showToast('Permission denied: Only administrators can add parcel categories', 'error');
      setShowAddParcelTypeModal(false);
      return;
    }
    if (!quickParcelType.name.trim()) {
      showToast('Parcel type name is required', 'error');
      return;
    }

    try {
      setQuickParcelTypeSaving(true);
      const payload = {
        name: quickParcelType.name.trim(),
        defaultCharge: quickParcelType.defaultCharge ? Number(quickParcelType.defaultCharge) : 0,
        defaultWeight: quickParcelType.defaultWeight ? Number(quickParcelType.defaultWeight) : 0,
        description: quickParcelType.description.trim(),
      };

      const res = await api.parcelTypes.create(payload);
      if (res.success && res.data) {
        showToast(`Parcel Type '${payload.name}' added successfully!`, 'success');
        const newPt = res.data;

        setParcelTypesList((prev) => [newPt, ...prev.filter((p) => p.name !== newPt.name)]);

        // Update the last parcel item or add to active item
        setParcelItems((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          copy[lastIdx] = {
            ...copy[lastIdx],
            parcelType: newPt.name,
            charge: newPt.defaultCharge ? String(newPt.defaultCharge) : copy[lastIdx].charge,
            weight: newPt.defaultWeight ? String(newPt.defaultWeight) : copy[lastIdx].weight,
          };
          return copy;
        });

        setShowAddParcelTypeModal(false);
        setQuickParcelType({
          name: '',
          defaultCharge: '',
          defaultWeight: '',
          description: '',
        });

        if (onRefreshParcelTypes) {
          onRefreshParcelTypes();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to add parcel type', 'error');
    } finally {
      setQuickParcelTypeSaving(false);
    }
  };

  // Quick Add City Handler (Admin only)
  const handleQuickAddCity = async (e) => {
    e.preventDefault();
    if (!canManageMasterData) {
      showToast('Permission denied: Only administrators can add destination hubs', 'error');
      setShowAddCityModal(false);
      return;
    }
    if (!quickCity.name.trim()) {
      showToast('City name is required', 'error');
      return;
    }
    if (!quickCity.deliveryAddress.trim()) {
      showToast('Delivery address is required', 'error');
      return;
    }

    try {
      setQuickCitySaving(true);
      const payload = {
        name: quickCity.name.trim(),
        deliveryAddress: quickCity.deliveryAddress.trim(),
      };

      const res = await api.cities.create(payload);
      if (res.success && res.data) {
        showToast(`Destination '${payload.name}' added successfully!`, 'success');
        const newCity = res.data;

        setCitiesList((prev) => [newCity, ...prev.filter((c) => c.name !== newCity.name)]);
        setFormData((prev) => ({
          ...prev,
          toCity: newCity.name,
          deliveryAddress: newCity.deliveryAddress || newCity.counterAddress || '',
        }));

        setShowAddCityModal(false);
        setQuickCity({
          name: '',
          deliveryAddress: '',
        });

        if (onRefreshCities) {
          onRefreshCities();
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to add destination city', 'error');
    } finally {
      setQuickCitySaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const origin = (formData.fromCity || defaultOrigin || '').trim();
    const finalTo = (formData.toCity || '').trim();

    // Prepare candidate data for Zod validation
    const candidateData = {
      fromCity: origin,
      toCity: finalTo,
      deliveryAddress: (formData.deliveryAddress || '').trim(),
      customerPhone: (formData.customerPhone || '').trim(),
      customerName: (formData.customerName || '').trim(),
      receiverPhone: (formData.receiverPhone || '').trim(),
      receiverName: (formData.receiverName || '').trim(),
      paymentStatus: formData.paymentStatus,
      items: parcelItems.map((item) => ({
        parcelType: (item.parcelType || '').trim(),
        quantity: item.quantity,
        weight: item.weight || 0,
        charge: item.charge,
        notes: item.notes ? item.notes.trim() : '',
      })),
      totalAmount: finalTotalAmount,
    };

    const validation = bookingFormSchema.safeParse(candidateData);
    if (!validation.success) {
      const errors = {};
      let firstMsg = '';
      let firstKey = '';

      for (const issue of validation.error.issues) {
        const pathKey = issue.path.join('.');
        if (!errors[pathKey]) {
          errors[pathKey] = issue.message;
        }
        if (!firstMsg) {
          firstMsg = issue.message;
          firstKey = pathKey;
        }
      }

      setFieldErrors(errors);
      showToast(firstMsg || 'Please complete all required fields correctly', 'error');

      // Auto-focus the first invalid field
      if (firstKey === 'toCity') document.getElementById('cb_to_city')?.focus();
      else if (firstKey === 'deliveryAddress') document.getElementById('cb_delivery_addr')?.focus();
      else if (firstKey === 'customerPhone') document.getElementById('cb_sender_phone')?.focus();
      else if (firstKey === 'customerName') document.getElementById('cb_sender_name')?.focus();
      else if (firstKey === 'receiverPhone') document.getElementById('cb_receiver_phone')?.focus();
      else if (firstKey.startsWith('items.')) {
        const parts = firstKey.split('.');
        const rowIdx = parts[1];
        const fieldName = parts[2];
        if (fieldName === 'parcelType') document.getElementById(`cb_item_pt_${rowIdx}`)?.focus();
      } else if (firstKey === 'totalAmount') {
        document.getElementById('cb_grand_total_charge')?.focus();
      }
      return;
    }

    setFieldErrors({});

    const validated = validation.data;
    const cleanedItems = validated.items.map((item) => ({
      parcelType: item.parcelType,
      quantity: item.quantity,
      weight: item.weight,
      charge: item.charge,
      notes: item.notes || '',
    }));

    // Consolidated summary
    const consolidatedParcelType =
      cleanedItems.length === 1
        ? cleanedItems[0].parcelType
        : `${cleanedItems[0].parcelType} +${cleanedItems.length - 1} more items`;

    const payload = {
      fromCity: validated.fromCity,
      toCity: validated.toCity,
      deliveryAddress: validated.deliveryAddress,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerWhatsapp: validated.customerPhone,
      receiverPhone: validated.receiverPhone || '',
      receiverName: validated.receiverName || '',
      items: cleanedItems,
      quantity: totalQuantity,
      weight: totalWeight,
      amount: validated.totalAmount,
      parcelType: consolidatedParcelType,
      notes: cleanedItems.map((i) => i.notes).filter(Boolean).join('; ') || '',
      paymentStatus: validated.paymentStatus,
    };

    // Require user confirmation before issuing the official booking
    setPendingPayload(payload);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!pendingPayload) return;

    try {
      setLoading(true);
      const res = await api.bookings.create(pendingPayload);

      if (res.success && res.data) {
        showToast(`Consignment Booked Successfully! LR ID: ${res.data.orderId}`, 'success');
        setShowConfirmModal(false);
        setPendingPayload(null);
        setCreatedBooking(res.data);
        notifyLocalChange('BOOKING_CREATED', res.data);
        await fetchCities();
        if (onRefreshCities) onRefreshCities();
        // WhatsApp booking confirmation is sent automatically by the server via OpenWA
      }
    } catch (error) {
      showToast(error.message || 'Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultPt = parcelTypesList.length > 0 ? parcelTypesList[0] : null;
    setFormData({
      fromCity: defaultOrigin || '',
      toCity: '',
      deliveryAddress: '',
      customerPhone: '',
      customerName: '',
      receiverPhone: '',
      receiverName: '',
      paymentStatus: 'PAID',
    });
    setParcelItems([
      {
        id: `item-${Date.now()}`,
        parcelType: defaultPt ? defaultPt.name : '',
        quantity: 1,
        weight: defaultPt && defaultPt.defaultWeight ? String(defaultPt.defaultWeight) : '',
        charge: defaultPt && defaultPt.defaultCharge ? String(defaultPt.defaultCharge) : '',
        notes: '',
      },
    ]);
    setCreatedBooking(null);
    setShowConfirmModal(false);
    setPendingPayload(null);
    setFieldErrors({});
    setPhoneSuggestions([]);
    setPhoneDropdownOpen(false);
    setIsTotalCustom(false);
    setCustomTotalAmount('');
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '1.5rem' }}>
      {/* Page Title & Actions */}
      <div className="booking-page-header">
        <div>
          <h1 className="booking-page-title">
            New Consignment Booking
          </h1>
          <p className="booking-page-subtitle">
            Consignment waybill entry, route stop selection, and parcel manifest billing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!createdBooking && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              disabled={loading}
              title="Clear all fields"
              style={{ fontWeight: 600 }}
            >
              <RotateCcw size={13} />
              <span>Clear Form</span>
            </button>
          )}
        </div>
      </div>

      {createdBooking ? (
        /* Confirmation Card with Multi-Parcel Breakdown - Modern Clean Style */
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-card)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '0.75rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '50%',
              marginBottom: '0.75rem',
            }}
          >
            <CheckCircle2 size={36} color="#059669" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', fontFamily: 'var(--font-family)' }}>
            Consignment Manifest Recorded
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', fontFamily: 'var(--font-family)' }}>
            Status: Waiting for Bus Dispatch • Single LR Docket Ready
          </p>

          <div
            style={{
              margin: '1.5rem auto',
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-md)',
              maxWidth: '740px',
              textAlign: 'left',
            }}
          >
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Official LR Docket ID
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-family)' }}>
                  #{createdBooking.orderId}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="status-badge status-waiting_for_bus">Waiting for Bus</span>
                <div style={{ fontSize: '1rem', color: '#059669', fontWeight: 700, marginTop: '0.35rem' }}>
                  Total: ₹{createdBooking.amount} [{createdBooking.paymentStatus || 'PAID'}]
                </div>
              </div>
            </div>

            {/* Core details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Destination & Stop</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>
                  {createdBooking.toCity ? `${createdBooking.toCity} - ${createdBooking.deliveryAddress}` : createdBooking.deliveryAddress}
                </strong>
                <div style={{ color: '#2563eb', fontSize: '0.75rem', marginTop: '3px', fontWeight: 600 }}>
                  Route: {createdBooking.fromCity || 'Origin'} → {createdBooking.toCity || 'Destination'}
                </div>
              </div>
              <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Sender (Customer)</span>
                <strong style={{ color: '#0f172a' }}>{createdBooking.customerName}</strong>
                <div style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '2px' }}>{createdBooking.customerPhone}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Receiver (Consignee)</span>
                <strong style={{ color: '#0f172a' }}>{createdBooking.receiverName || 'Self / Counter Pickup'}</strong>
                <div style={{ color: '#475569', fontSize: '0.8125rem', marginTop: '2px' }}>
                  {createdBooking.receiverPhone ? createdBooking.receiverPhone : 'No phone specified'}
                </div>
              </div>
            </div>

            {/* Multi-Parcel Items Breakdown */}
            <div style={{ marginTop: '0.85rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Consignment Manifest Items ({Array.isArray(createdBooking.items) ? createdBooking.items.length : 1} Lines):
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem' }}>#</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem' }}>Parcel Type</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem' }}>Qty</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.75rem' }}>Weight</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem' }}>Remarks</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem' }}>Charge (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(createdBooking.items) && createdBooking.items.length > 0 ? (
                    createdBooking.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.55rem 0.75rem', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>{it.parcelType}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{it.weight ? `${it.weight} kg` : '-'}</td>
                        <td style={{ padding: '0.55rem 0.75rem', color: '#64748b' }}>{it.notes || '-'}</td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{it.charge}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#64748b' }}>1</td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>{createdBooking.parcelType}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{createdBooking.quantity || 1}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>{createdBooking.weight ? `${createdBooking.weight} kg` : '-'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#64748b' }}>{createdBooking.notes || '-'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{createdBooking.amount}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={() => onOpenReceipt(createdBooking)}>
              <Printer size={16} />
              Print Official LR Receipt
            </button>
            <button className="btn btn-secondary" onClick={() => onOpenWhatsApp(createdBooking)}>
              <Send size={16} />
              Send WhatsApp Alert
            </button>
            <button className="btn btn-outline" onClick={handleReset}>
              <PlusCircle size={16} />
              Book Another Parcel
            </button>
          </div>
        </div>
      ) : (
        /* Booking Input Form */
        <form onSubmit={handleSubmit} autoComplete="off" data-lpignore="true">
          {/* Section 1: Route & Destination */}
          <div className="docket-card">
            <div className="docket-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="#0f172a" />
                <span className="docket-card-title">Route & Destination</span>
              </div>
            </div>

            <div className="docket-route-grid">
              {/* Origin Station */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="docket-field-label">
                  Origin Branch
                </label>
                <input
                  type="text"
                  id="cb_from_city"
                  name="cb_from_city"
                  className="form-control docket-input"
                  placeholder="Enter origin branch..."
                  value={formData.fromCity || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromCity: e.target.value }))}
                  required
                />
              </div>

              {/* Destination City Input */}
              <CitySearchInput
                id="cb_to_city"
                name="cb_to_city"
                label="Destination City *"
                placeholder="Type or select destination city..."
                value={formData.toCity}
                error={fieldErrors.toCity}
                onChange={(cityName, cityObj) => {
                  clearFieldError('toCity');
                  setFormData((prev) => {
                    const updated = { ...prev, toCity: cityName };
                    if (!cityName) {
                      updated.deliveryAddress = '';
                    } else if (cityObj) {
                      const locs = Array.isArray(cityObj.locations) && cityObj.locations.length > 0
                        ? cityObj.locations
                        : (cityObj.deliveryAddress ? [cityObj.deliveryAddress] : []);
                      if (locs.length > 0) {
                        updated.deliveryAddress = locs[0];
                      }
                    }
                    return updated;
                  });
                }}
                onSelectNext={() => {
                  document.getElementById('cb_delivery_addr')?.focus();
                }}
                cities={citiesList}
                required
                autoFocus
              />

              {/* Delivery Address / Collection Stop */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="docket-field-label">
                  Delivery Stop / Counter <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="cb_delivery_addr"
                  name="cb_dest_stop_addr"
                  className={`form-control docket-input ${fieldErrors.deliveryAddress ? 'input-error' : ''}`}
                  placeholder={
                    availableLocations.length > 0
                      ? 'Select a stop below or enter counter address...'
                      : 'e.g. Bus Stand Counter #4, Benz Circle / Station Road'
                  }
                  value={formData.deliveryAddress}
                  onChange={(e) => {
                    clearFieldError('deliveryAddress');
                    setFormData((prev) => ({ ...prev, deliveryAddress: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('cb_sender_phone')?.focus();
                    }
                  }}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                />
                {fieldErrors.deliveryAddress && (
                  <div className="form-error-msg">{fieldErrors.deliveryAddress}</div>
                )}
              </div>
            </div>

            {/* Branch Stops Chips */}
            {availableLocations.length > 1 && (
              <div className="docket-stops-bar">
                <span className="docket-stops-label">Configured Stops:</span>
                <div className="docket-stops-chips">
                  {availableLocations.map((loc, idx) => {
                    const isSelected =
                      (formData.deliveryAddress || '').trim().toLowerCase() === loc.trim().toLowerCase();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          clearFieldError('deliveryAddress');
                          setFormData((prev) => ({ ...prev, deliveryAddress: loc }));
                        }}
                        className={`docket-stop-chip ${isSelected ? 'active' : ''}`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{loc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Consignor & Consignee (Sender & Receiver) */}
          <div className="docket-parties-grid">
            {/* Sender Information Card */}
            <div className="docket-card" style={{ marginBottom: 0 }}>
              <div className="docket-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <User size={16} color="#0f172a" />
                  <span className="docket-card-title">Consignor (Sender)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Sender Mobile */}
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={phoneContainerRef}>
                  <label className="docket-field-label">
                    Sender Mobile <span className="required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      id="cb_sender_phone"
                      name="cb_sender_phone"
                      className={`form-control docket-input ${fieldErrors.customerPhone ? 'input-error' : ''}`}
                      placeholder="10-digit mobile"
                      value={formData.customerPhone}
                      onChange={(e) => {
                        clearFieldError('customerPhone');
                        handlePhoneInputChange(e.target.value);
                      }}
                      onFocus={() => {
                        if (formData.customerPhone.length >= 2 && phoneSuggestions.length > 0) {
                          setPhoneDropdownOpen(true);
                        }
                      }}
                      onKeyDown={handlePhoneKeyDown}
                      maxLength={10}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                    />
                  </div>

                  {/* Suggestions Dropdown */}
                  {phoneDropdownOpen && phoneSuggestions.length > 0 && (
                    <div className="phone-suggestions-dropdown">
                      <div
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} color="#2563eb" />
                          <span>Matching Customers ({phoneSuggestions.length})</span>
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: '#94a3b8' }}>
                          ↵ to select
                        </span>
                      </div>

                      <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                        {phoneSuggestions.map((cust, idx) => {
                          const isHighlighted = phoneActiveIdx === idx;
                          return (
                            <div
                              key={cust._id || idx}
                              onClick={() => handleSelectSuggestedCustomer(cust)}
                              onMouseEnter={() => setPhoneActiveIdx(idx)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isHighlighted ? '#eff6ff' : 'transparent',
                                borderLeft: isHighlighted ? '3px solid #2563eb' : '3px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyItems: 'space-between',
                                transition: 'all 0.1s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: isHighlighted ? '#dbeafe' : '#f1f5f9',
                                    color: isHighlighted ? '#1e40af' : '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  {(cust.name || 'C').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84375rem' }}>
                                    {cust.name}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '1px' }}>
                                    <span>{cust.phone}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {cust.totalBookings > 0 && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      padding: '2px 7px',
                                      backgroundColor: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '12px',
                                      color: '#475569',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {cust.totalBookings} orders
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {fieldErrors.customerPhone && (
                    <div className="form-error-msg">{fieldErrors.customerPhone}</div>
                  )}
                </div>

                {/* Sender Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="docket-field-label">
                    Sender Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="cb_sender_name"
                    name="cb_sender_name"
                    className={`form-control docket-input ${fieldErrors.customerName ? 'input-error' : ''}`}
                    placeholder="Full name or company"
                    value={formData.customerName}
                    onChange={(e) => {
                      clearFieldError('customerName');
                      setFormData((prev) => ({ ...prev, customerName: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('cb_receiver_phone')?.focus();
                      }
                    }}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  {fieldErrors.customerName && (
                    <div className="form-error-msg">{fieldErrors.customerName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Receiver Information Card */}
            <div className="docket-card" style={{ marginBottom: 0 }}>
              <div className="docket-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Phone size={16} color="#0f172a" />
                  <span className="docket-card-title">Consignee (Receiver)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Receiver Mobile */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="docket-field-label">
                    Receiver Mobile
                  </label>
                  <input
                    type="tel"
                    id="cb_receiver_phone"
                    name="cb_receiver_phone"
                    className={`form-control docket-input ${fieldErrors.receiverPhone ? 'input-error' : ''}`}
                    placeholder="10-digit mobile"
                    value={formData.receiverPhone}
                    onChange={(e) => {
                      clearFieldError('receiverPhone');
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData((prev) => ({ ...prev, receiverPhone: digits }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('cb_receiver_name')?.focus();
                      }
                    }}
                    maxLength={10}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                  {fieldErrors.receiverPhone && (
                    <div className="form-error-msg">{fieldErrors.receiverPhone}</div>
                  )}
                </div>

                {/* Receiver Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="docket-field-label">
                    Contact / Shop Name
                  </label>
                  <input
                    type="text"
                    id="cb_receiver_name"
                    name="cb_receiver_name"
                    className="form-control docket-input"
                    placeholder="e.g. Annapurna Depot"
                    value={formData.receiverName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, receiverName: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('cb_item_pt_0')?.focus();
                      }
                    }}
                    autoComplete="off"
                    data-lpignore="true"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Consignment Articles & Manifest */}
          <div className="docket-card" style={{ marginTop: '1rem' }}>
            <div className="docket-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Package size={16} color="#0f172a" />
                <span className="docket-card-title">Consignment Articles (Parcels)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddItem}
                  title="Add another parcel item"
                  style={{ fontWeight: 600, fontSize: '0.785rem' }}
                >
                  <Plus size={13} />
                  <span>Add Article</span>
                </button>
              </div>
            </div>

            {/* Tabular Representation of Items */}
            <div className="parcel-table-responsive">
              <table className="parcel-table">
                <thead>
                  <tr>
                    <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '180px' }}>Parcel Type *</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Qty *</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Weight (kg)</th>
                    <th style={{ width: '145px', textAlign: 'right' }}>Charge (₹) *</th>
                    <th style={{ minWidth: '170px' }}>Remarks / Content Notes</th>
                    <th style={{ width: '54px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelItems.map((item, index) => (
                    <tr key={item.id || index}>
                      {/* Row index */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>
                        {index + 1}
                      </td>

                      {/* Parcel Type Dropdown */}
                      <td>
                        <select
                          id={`cb_item_pt_${index}`}
                          className={`form-control ${fieldErrors[`items.${index}.parcelType`] ? 'input-error' : ''}`}
                          value={item.parcelType}
                          onChange={(e) => handleItemChange(index, 'parcelType', e.target.value)}
                          required
                          style={{ fontWeight: 600, color: '#0f172a' }}
                        >
                          {parcelTypesList.length === 0 ? (
                            <option value="">
                              {canManageMasterData ? 'No types available (+ Add Type)' : 'No categories configured'}
                            </option>
                          ) : (
                            <>
                              {!item.parcelType && <option value="">-- Choose Category --</option>}
                              {parcelTypesList.map((pt) => (
                                <option key={pt._id || pt.name} value={pt.name}>
                                  {pt.name} {pt.defaultCharge ? `(₹${pt.defaultCharge})` : ''}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        {fieldErrors[`items.${index}.parcelType`] && (
                          <div className="form-error-msg">{fieldErrors[`items.${index}.parcelType`]}</div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          className={`form-control ${fieldErrors[`items.${index}.quantity`] ? 'input-error' : ''}`}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          required
                          style={{ textAlign: 'center', fontWeight: 600 }}
                        />
                      </td>

                      {/* Weight (kg) */}
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-control"
                          placeholder="e.g. 20"
                          value={item.weight}
                          onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          style={{ textAlign: 'center' }}
                        />
                      </td>

                      {/* Delivery Charge (₹) Input Field */}
                      <td>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '8px',
                              fontSize: '0.8125rem',
                              fontWeight: 700,
                              color: '#64748b',
                              pointerEvents: 'none',
                            }}
                          >
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            className={`form-control charge-input-field ${fieldErrors[`items.${index}.charge`] ? 'input-error' : ''}`}
                            placeholder="0"
                            value={item.charge}
                            onChange={(e) => handleItemChange(index, 'charge', e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            required
                            style={{
                              paddingLeft: '22px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#0f172a',
                              backgroundColor: '#ffffff',
                            }}
                          />
                        </div>
                        {fieldErrors[`items.${index}.charge`] && (
                          <div className="form-error-msg" style={{ textAlign: 'right' }}>
                            {fieldErrors[`items.${index}.charge`]}
                          </div>
                        )}
                      </td>

                      {/* Remarks / Content */}
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Fragile / Box 1 of 2"
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        />
                      </td>

                      {/* Delete Action */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={parcelItems.length <= 1}
                          title={parcelItems.length <= 1 ? 'At least one item required' : 'Remove this item'}
                          style={{
                            padding: '0.3rem 0.5rem',
                            color: parcelItems.length <= 1 ? '#cbd5e1' : '#dc2626',
                            border: '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-sm)',
                            background: '#ffffff',
                            cursor: parcelItems.length <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fieldErrors.items && (
              <div className="form-error-msg" style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                {fieldErrors.items}
              </div>
            )}

            {/* Live Totals & Payment Summary Bar - Modern Executive Card */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-card)',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Total Items
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>
                    {parcelItems.length} lines ({totalQuantity} pcs)
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Estimated Weight
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '0.9375rem' }}>
                    {totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'N/A'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Payment Docket
                  </span>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                    style={{
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #cbd5e1',
                      color: formData.paymentStatus === 'PAID' ? '#059669' : '#d97706',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="PAID">PAID (Counter Cash)</option>
                    <option value="TO_PAY">TO PAY (Pay on Delivery)</option>
                  </select>
                </div>
              </div>

              {/* Grand Total LR Charge Input Field */}
              <div style={{ textAlign: 'right' }}>
                <label
                  htmlFor="cb_grand_total_charge"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    letterSpacing: '0.04em',
                    display: 'block',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  Grand Total LR Charge (₹) *
                </label>
                <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      pointerEvents: 'none',
                    }}
                  >
                    ₹
                  </span>
                  <input
                    id="cb_grand_total_charge"
                    type="number"
                    min="0"
                    className={`form-control charge-input-field ${fieldErrors.totalAmount ? 'input-error' : ''}`}
                    value={isTotalCustom ? customTotalAmount : (calculatedItemsTotal !== 0 ? calculatedItemsTotal : '')}
                    onChange={(e) => handleGrandTotalChange(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    style={{
                      width: '150px',
                      height: '40px',
                      paddingLeft: '28px',
                      textAlign: 'right',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      backgroundColor: '#ffffff',
                      border: fieldErrors.totalAmount ? '2px solid #ef4444' : '2px solid #93c5fd',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.12)',
                    }}
                    required
                  />
                </div>
                {fieldErrors.totalAmount && (
                  <div className="form-error-msg" style={{ textAlign: 'right', marginTop: '4px' }}>
                    {fieldErrors.totalAmount}
                  </div>
                )}
                {isTotalCustom && (
                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTotalCustom(false);
                        setCustomTotalAmount('');
                        if (parcelItems.length === 1 && calculatedItemsTotal) {
                          setParcelItems((prev) => [{ ...prev[0], charge: String(calculatedItemsTotal) }]);
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Reset to calculated (₹{calculatedItemsTotal})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="booking-action-bar">
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {formData.toCity ? (
                  <span>
                    Destination: <strong>{formData.toCity}</strong> • Consignee Stop: <strong>{formData.deliveryAddress || 'Pending'}</strong>
                  </span>
                ) : (
                  <span>Please select destination city above to proceed</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleReset} disabled={loading}>
                  Clear Form
                </button>
                <button
                  id="cb_submit_btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ padding: '0.55rem 1.4rem', fontWeight: 800 }}
                >
                  <PackagePlus size={16} />
                  {loading ? 'Processing Consignment...' : 'Issue Consignment Note (LR)'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Quick Add City / Location In-Page Card (Admin only) */}
      {canManageMasterData && showAddCityModal && (
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Add Destination City or Stop</h3>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddCityModal(false)}
            >
              <X size={15} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleQuickAddCity} autoComplete="off" data-lpignore="true">
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Search an existing city to add a new collection stop, or create a new destination hub.
            </p>

            <CitySearchInput
              id="quick_city_name"
              name="quick_city_name"
              label="Destination City Name *"
              placeholder="Search existing city or type new..."
              value={quickCity.name}
              onChange={(name) => setQuickCity((prev) => ({ ...prev, name }))}
              onSelectNext={() => {
                document.getElementById('quick_city_address')?.focus();
              }}
              cities={citiesList}
              required
              autoFocus
            />

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">
                Delivery Address / Counter Stop in this City <span className="required">*</span>
              </label>
              <input
                type="text"
                id="quick_city_address"
                name="quick_city_address"
                className="form-control"
                placeholder="e.g. Bus Stand Counter #4, Benz Circle / Station Road"
                value={quickCity.deliveryAddress}
                onChange={(e) => setQuickCity((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                required
                autoComplete="off"
                data-lpignore="true"
              />
              <div className="form-hint">Saved under this city and immediately selectable for booking</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddCityModal(false)}
                disabled={quickCitySaving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={quickCitySaving}>
                <Plus size={16} />
                {quickCitySaving ? 'Saving...' : 'Save Destination'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Add Parcel Type In-Page Card (Admin only) */}
      {canManageMasterData && showAddParcelTypeModal && (
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Add New Parcel Category</h3>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddParcelTypeModal(false)}
            >
              <X size={15} />
              Cancel
            </button>
          </div>

          <form onSubmit={handleQuickAddParcelType} autoComplete="off" data-lpignore="true">
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Create a new parcel category. It will instantly be selectable in the multi-parcel table.
            </p>

            <div className="form-group">
              <label className="form-label">
                Parcel Type Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="quick_pt_name"
                name="quick_pt_name"
                className="form-control"
                placeholder="e.g. Rice Bag (25kg), Electronics Box, Fruits Carton"
                value={quickParcelType.name}
                onChange={(e) => setQuickParcelType((prev) => ({ ...prev, name: e.target.value }))}
                required
                autoFocus
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Default Delivery Charge (₹)</label>
                <input
                  type="number"
                  id="quick_pt_charge"
                  name="quick_pt_charge"
                  min="0"
                  className="form-control"
                  placeholder="e.g. 250"
                  value={quickParcelType.defaultCharge}
                  onChange={(e) => setQuickParcelType((prev) => ({ ...prev, defaultCharge: e.target.value }))}
                  onWheel={(e) => e.target.blur()}
                  autoComplete="off"
                  data-lpignore="true"
                />
                <div className="form-hint">Auto-fills price when selected</div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Default Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  id="quick_pt_weight"
                  name="quick_pt_weight"
                  className="form-control"
                  placeholder="e.g. 25"
                  value={quickParcelType.defaultWeight}
                  onChange={(e) => setQuickParcelType((prev) => ({ ...prev, defaultWeight: e.target.value }))}
                  onWheel={(e) => e.target.blur()}
                  autoComplete="off"
                  data-lpignore="true"
                />
                <div className="form-hint">Approximate weight</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Description / Handling Notes</label>
              <input
                type="text"
                id="quick_pt_desc"
                name="quick_pt_desc"
                className="form-control"
                placeholder="e.g. Standard cartons, Agricultural bags"
                value={quickParcelType.description}
                onChange={(e) => setQuickParcelType((prev) => ({ ...prev, description: e.target.value }))}
                autoComplete="off"
                data-lpignore="true"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddParcelTypeModal(false)}
                disabled={quickParcelTypeSaving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={quickParcelTypeSaving}>
                <Plus size={16} />
                {quickParcelTypeSaving ? 'Saving...' : 'Save Parcel Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Consignment Booking Confirmation Modal */}
      {showConfirmModal && pendingPayload && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowConfirmModal(false)}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal-dialog modal-dialog-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Confirm Consignment Booking
                  </h3>
                  <div style={{ fontSize: '0.775rem', color: '#64748b' }}>
                    Please review details before issuing official LR
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !loading && setShowConfirmModal(false)}
                disabled={loading}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Route Path Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Origin Branch
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {pendingPayload.fromCity}
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#2563eb', fontWeight: 800, fontSize: '1.1rem' }}>
                  ➔
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Destination City & Counter
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {pendingPayload.toCity}
                  </div>
                  {pendingPayload.deliveryAddress && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pendingPayload.deliveryAddress}
                    </div>
                  )}
                </div>
              </div>

              {/* Sender & Receiver Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <User size={13} color="#2563eb" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Consignor (Sender)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {pendingPayload.customerName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                    📱 {pendingPayload.customerPhone}
                  </div>
                </div>

                <div style={{ padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                    <Phone size={13} color="#059669" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Consignee (Receiver)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {pendingPayload.receiverName || 'Self / Counter Collection'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                    {pendingPayload.receiverPhone ? `📱 ${pendingPayload.receiverPhone}` : 'No phone specified'}
                  </div>
                </div>
              </div>

              {/* Parcels Breakdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Articles Breakdown ({pendingPayload.items.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                    Total Qty: <strong>{pendingPayload.quantity} pcs</strong> • Weight: <strong>{pendingPayload.weight ? `${pendingPayload.weight} kg` : '0 kg'}</strong>
                  </span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '0.45rem 0.75rem' }}>Parcel Item</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>Weight</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayload.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < pendingPayload.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>
                            {item.parcelType}
                            {item.notes && <span style={{ color: '#64748b', fontSize: '0.725rem', marginLeft: '6px' }}>({item.notes})</span>}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }}>{item.weight ? `${item.weight} kg` : '-'}</td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>₹{item.charge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Payment Mode Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1.1rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Freight Amount
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#15803d' }}>
                    ₹{pendingPayload.amount}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Payment Mode
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.775rem',
                      fontWeight: 800,
                      backgroundColor: pendingPayload.paymentStatus === 'PAID' ? '#dcfce7' : '#fef3c7',
                      color: pendingPayload.paymentStatus === 'PAID' ? '#15803d' : '#b45309',
                      border: `1px solid ${pendingPayload.paymentStatus === 'PAID' ? '#86efac' : '#fde68a'}`,
                    }}
                  >
                    {pendingPayload.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', padding: '0.85rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Back to Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmBooking}
                disabled={loading}
                style={{ minWidth: '180px', fontWeight: 700 }}
              >
                <Check size={16} />
                <span>{loading ? 'Issuing LR Docket...' : 'Confirm & Book Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
