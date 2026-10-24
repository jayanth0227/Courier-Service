import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Printer,
  Send,
  Bus,
  CheckCircle2,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ArrowLeft,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  Copy,
  Check,
  Ban,
  AlertTriangle,
  Lock,
  Save,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const getBookedByInfo = (booking) => {
  if (!booking) return { name: 'Admin', roleLabel: 'Admin', isAdmin: true, branch: '' };
  const name =
    booking.bookedByName ||
    booking.createdBy?.name ||
    booking.createdBy?.username ||
    (Array.isArray(booking.timeline) && booking.timeline.find((t) => t.status === 'BOOKED')?.updatedBy) ||
    (Array.isArray(booking.timeline) && booking.timeline[0]?.updatedBy) ||
    'Admin';

  const rawRole = (
    booking.bookedByRole ||
    booking.createdBy?.role ||
    (name.toLowerCase().includes('admin') ? 'admin' : 'staff')
  ).toLowerCase();

  const isAdmin = rawRole === 'admin' || rawRole === 'superadmin';
  const roleLabel = isAdmin ? 'Admin' : 'Staff';
  const branch = booking.branch || booking.createdBy?.branch || '';

  return { name, roleLabel, isAdmin, branch };
};

export const BookingsPage = ({
  onNavigateModule,
  onOpenReceipt,
  onOpenWhatsApp,
  onOpenAssignBus,
  standardRoutes = [],
  parcelTypes = [],
}) => {
  const { showToast } = useToast();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [destination, setDestination] = useState('ALL');
  const [parcelType, setParcelType] = useState('ALL');
  const [bookedByRole, setBookedByRole] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Booking for View/Edit modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Customer requested cancellation');
  const [customReason, setCustomReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Delivery Modal state (replaces browser window.confirm)
  const [deliveringBooking, setDeliveringBooking] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('Parcel collected by customer / consignee at destination terminal.');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Edit Modal saving state
  const [savingEdit, setSavingEdit] = useState(false);

  const handleCopyLR = (lrNumber, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const cleanLR = String(lrNumber || '').replace(/^#/, '');
    if (!cleanLR) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanLR).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = cleanLR;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanLR;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(cleanLR);
      showToast(`LR #${cleanLR} copied to clipboard!`, 'success');
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const fetchBookings = async (page = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
      };
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (status !== 'ALL') params.status = status;
      if (destination !== 'ALL') params.destination = destination;
      if (parcelType !== 'ALL') params.parcelType = parcelType;
      if (bookedByRole !== 'ALL') params.bookedByRole = bookedByRole;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.bookings.list(params);
      if (res.success) {
        setBookings(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      showToast(error.message || 'Failed to fetch bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live search: automatically re-fetches as user types word by word / character by character
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(1, search);
    }, 200);

    return () => clearTimeout(timer);
  }, [search, status, destination, parcelType, bookedByRole, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchBookings(1, search);
  };

  const handleOpenDeliveryModal = (booking, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setDeliveringBooking(booking);
    setDeliveryNotes('Parcel collected by customer / consignee at destination terminal.');
  };

  const handleConfirmDelivery = async () => {
    if (!deliveringBooking) return;

    try {
      setIsSubmittingDelivery(true);
      const res = await api.bookings.updateStatus(deliveringBooking._id, {
        status: 'DELIVERED',
        deliveryNotes: deliveryNotes.trim() || 'Parcel collected by customer / consignee at destination terminal.',
      });
      if (res.success) {
        showToast(`Order #${deliveringBooking.orderId} marked as DELIVERED!`, 'success');
        const updatedId = deliveringBooking._id;
        setDeliveringBooking(null);

        if (selectedBooking && selectedBooking._id === updatedId) {
          setSelectedBooking((prev) => ({ ...prev, status: 'DELIVERED' }));
        }

        fetchBookings(pagination.page);
      }
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleOpenCancelModal = (booking, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setCancellingBooking(booking);
    setCancellationReason('Customer requested cancellation');
    setCustomReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;

    const finalReason =
      cancellationReason === 'Other'
        ? (customReason.trim() || 'Cancelled before bus dispatch')
        : cancellationReason;

    try {
      setIsCancelling(true);
      const res = await api.bookings.updateStatus(cancellingBooking._id, {
        status: 'CANCELLED',
        cancellationReason: finalReason,
      });

      if (res.success) {
        showToast(`Consignment #${cancellingBooking.orderId} cancelled successfully`, 'success');
        const updatedId = cancellingBooking._id;
        setCancellingBooking(null);

        // If the detail modal is currently showing this booking, update its status
        if (selectedBooking && selectedBooking._id === updatedId) {
          setSelectedBooking((prev) => ({
            ...prev,
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: finalReason,
          }));
        }

        fetchBookings(pagination.page);
      }
    } catch (error) {
      showToast(error.message || 'Failed to cancel booking', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenEditModal = (booking, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    let rawItems = [];
    if (Array.isArray(booking.items) && booking.items.length > 0) {
      rawItems = booking.items.map((it) => ({
        parcelType: it.parcelType || it.category || 'Box',
        quantity: it.quantity || 1,
        weight: it.weight || it.unitWeight || 0,
        notes: it.notes || '',
        charge: it.charge || 0,
      }));
    } else {
      rawItems = [
        {
          parcelType: booking.parcelType || 'Box',
          quantity: booking.quantity || 1,
          weight: booking.weight || 0,
          notes: booking.notes || '',
          charge: booking.amount || 0,
        },
      ];
    }

    setEditBooking({
      ...booking,
      items: rawItems,
      customerName: booking.customerName || '',
      customerPhone: booking.customerPhone || '',
      customerWhatsapp: booking.customerWhatsapp || '',
      receiverName: booking.receiverName || '',
      receiverPhone: booking.receiverPhone || '',
      fromCity: booking.fromCity || '',
      toCity: booking.toCity || '',
      destination: booking.destination || '',
      deliveryAddress: booking.deliveryAddress || '',
      notes: booking.notes || '',
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editBooking) return;

    try {
      setSavingEdit(true);
      const res = await api.bookings.update(editBooking._id, editBooking);
      if (res.success) {
        showToast(`Consignment #${editBooking.orderId} updated successfully`, 'success');
        const updated = res.data;
        setEditBooking(null);

        if (selectedBooking && selectedBooking._id === updated._id) {
          setSelectedBooking((prev) => ({
            ...prev,
            ...updated,
          }));
        }

        fetchBookings(pagination.page);
      }
    } catch (error) {
      showToast(error.message || 'Failed to update booking', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const defaultRouteList = Array.isArray(standardRoutes) ? standardRoutes : [];

  const isWaiting = selectedBooking && (selectedBooking.status === 'BOOKED' || selectedBooking.status === 'WAITING_FOR_BUS');
  const isDispatched = selectedBooking && selectedBooking.status === 'DISPATCHED';
  const isDelivered = selectedBooking && selectedBooking.status === 'DELIVERED';

  return (
    <div>
      {selectedBooking ? (
        <div style={{ maxWidth: '1050px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Navigation & Action Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedBooking(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Bookings List</span>
          </button>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {isWaiting && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onNavigateModule('dispatch');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Bus size={14} />
                <span>Go to Dispatch</span>
              </button>
            )}

            {isDispatched && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenDeliveryModal(selectedBooking)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={14} />
                <span>Mark Delivered</span>
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenReceipt(selectedBooking)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              <span>Print Receipt</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenWhatsApp(selectedBooking)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEditModal(selectedBooking)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={14} />
              <span>Edit Consignment</span>
            </button>

            {isWaiting && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleOpenCancelModal(selectedBooking)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#b91c1c',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Cancel consignment booking (available before bus dispatch)"
              >
                <Ban size={14} />
                <span>Cancel Booking</span>
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Alert Banner if Cancelled */}
        {selectedBooking.status === 'CANCELLED' && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(239, 68, 68, 0.08)',
            }}
          >
            <Ban size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                This consignment has been cancelled
                {selectedBooking.cancelledAt
                  ? ` on ${new Date(selectedBooking.cancelledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                  : ''}
              </div>
              <div style={{ fontSize: '0.8125rem', marginTop: '4px', color: '#b91c1c' }}>
                <strong>Reason:</strong> {selectedBooking.cancellationReason || 'Cancelled before bus dispatch'}
              </div>
            </div>
          </div>
        )}

        {/* Header Hero Card */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={(e) => handleCopyLR(selectedBooking.orderId, e)}
                  className="order-id-badge"
                  style={{
                    fontSize: '1.15rem',
                    padding: '5px 12px',
                    cursor: 'pointer',
                    border: copiedId === selectedBooking.orderId ? '1px solid #86efac' : '1px solid #bfdbfe',
                    backgroundColor: copiedId === selectedBooking.orderId ? '#dcfce7' : '#eff6ff',
                    color: copiedId === selectedBooking.orderId ? '#15803d' : '#1e40af',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  title="Click to copy LR Number to clipboard"
                >
                  <span>#{selectedBooking.orderId}</span>
                  {copiedId === selectedBooking.orderId ? (
                    <>
                      <Check size={16} color="#15803d" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} color="#3b82f6" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>Copy LR</span>
                    </>
                  )}
                </button>
                <span className={`status-badge status-${selectedBooking.status.toLowerCase()}`} style={{ fontSize: '0.8125rem' }}>
                  {selectedBooking.status.replace(/_/g, ' ')}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: selectedBooking.paymentStatus === 'TO_PAY' ? '#b45309' : '#15803d',
                    backgroundColor: selectedBooking.paymentStatus === 'TO_PAY' ? '#fef3c7' : '#dcfce7',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {selectedBooking.paymentStatus === 'TO_PAY' ? 'TO PAY (ON DELIVERY)' : 'PAID (CASH)'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8125rem', color: '#64748b', marginTop: '6px' }}>
                <span>
                  Booked on {new Date(selectedBooking.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                {(() => {
                  const op = getBookedByInfo(selectedBooking);
                  return (
                    <>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ color: '#64748b' }}>Booked by:</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: op.isAdmin ? '#1e40af' : '#065f46',
                            backgroundColor: op.isAdmin ? '#eff6ff' : '#ecfdf5',
                            border: op.isAdmin ? '1px solid #bfdbfe' : '1px solid #a7f3d0',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {op.isAdmin ? 'Admin' : 'Staff'}
                        </span>
                        <strong style={{ color: '#0f172a' }}>{op.name}</strong>
                        {op.branch && (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            ({op.branch})
                          </span>
                        )}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Freight</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0d2137' }}>₹{selectedBooking.amount}</div>
            </div>
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* SENDER & RECEIVER CARD */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} color="#2563eb" />
              <span>Sender & Receiver Information</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Sender (Customer)
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedBooking.customerName}</div>
                <div style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.8125rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={`tel:${selectedBooking.customerPhone}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} />
                    <span>{selectedBooking.customerPhone}</span>
                  </a>
                  {selectedBooking.customerWhatsapp && selectedBooking.customerWhatsapp !== selectedBooking.customerPhone && (
                    <span style={{ color: '#059669', fontSize: '0.75rem' }}>
                      (WhatsApp: {selectedBooking.customerWhatsapp})
                    </span>
                  )}
                </div>
                {selectedBooking.fromCity && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Origin Station: <strong>{selectedBooking.fromCity}</strong>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Receiver (Consignee)
                </span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedBooking.receiverName || 'Counter Delivery'}</div>
                {selectedBooking.receiverPhone && (
                  <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.8125rem', marginTop: '2px' }}>
                    <a href={`tel:${selectedBooking.receiverPhone}`} style={{ color: '#059669', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} />
                      <span>{selectedBooking.receiverPhone}</span>
                    </a>
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                  Destination Route: <strong>{selectedBooking.destination}</strong>
                </div>
                {selectedBooking.deliveryAddress && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    Delivery Stop / Counter: <strong>{selectedBooking.deliveryAddress}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BUS DISPATCH & DRIVER CARD */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bus size={16} color="#2563eb" />
              <span>Bus & Driver Dispatch Assignment</span>
            </h3>

            {selectedBooking.busDetails?.busNumber ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>Bus Number</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.04em' }}>
                      {selectedBooking.busDetails.busNumber}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>
                      {selectedBooking.busDetails.busName || selectedBooking.busDetails.operator || 'Express Travels'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <span style={{ fontSize: '0.6875rem', color: '#1e40af', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Driver</span>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e3a8a' }}>
                      {selectedBooking.busDetails.driverName || 'Driver Assigned'}
                    </div>
                    {selectedBooking.busDetails.driverPhone ? (
                      <a href={`tel:${selectedBooking.busDetails.driverPhone}`} style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Phone size={12} />
                        <span>{selectedBooking.busDetails.driverPhone}</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No phone recorded</span>
                    )}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Scheduled Departure:</span>
                    <strong>{selectedBooking.busDetails.departureTime || 'Evening Trip'}</strong>
                  </div>
                  {selectedBooking.busDetails.destinationAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Unloading Counter:</span>
                      <strong>{selectedBooking.busDetails.destinationAddress}</strong>
                    </div>
                  )}
                  {selectedBooking.busDetails.dispatchNotes && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', color: '#475569' }}>
                      <em>Note: {selectedBooking.busDetails.dispatchNotes}</em>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <Clock size={28} color="#94a3b8" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.875rem' }}>Waiting for Bus Assignment</div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 12px 0' }}>
                  This consignment has not been assigned to an evening bus departure yet.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigateModule('dispatch')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Bus size={14} />
                  <span>Assign Bus & Driver in Dispatch</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PARCEL ITEMS & MANIFEST DETAILS CARD */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={16} color="#2563eb" />
            <span>Consignment Manifest & Goods Breakdown</span>
          </h3>

          <div className="table-container" style={{ marginBottom: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Parcel Type / Category</th>
                  <th style={{ width: '15%' }}>Quantity</th>
                  <th style={{ width: '15%' }}>Unit Weight</th>
                  <th style={{ width: '20%' }}>Handling Notes</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Charge</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(selectedBooking.items) && selectedBooking.items.length > 0 ? (
                  selectedBooking.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{it.parcelType || it.category || 'Standard Goods'}</td>
                      <td>{it.quantity || 1} pcs</td>
                      <td>{it.weight || it.unitWeight ? `${it.weight || it.unitWeight} kg` : '—'}</td>
                      <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{it.notes || selectedBooking.notes || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{it.charge || it.totalPrice || selectedBooking.amount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{selectedBooking.parcelType || 'Standard Package'}</td>
                    <td>{selectedBooking.quantity || 1} pcs</td>
                    <td>{selectedBooking.weight ? `${selectedBooking.weight} kg` : '—'}</td>
                    <td style={{ color: '#64748b', fontSize: '0.75rem' }}>{selectedBooking.notes || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{selectedBooking.amount}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', fontSize: '0.875rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#64748b' }}>Total Quantity:</span> <strong>{selectedBooking.quantity} pcs</strong></div>
            <div><span style={{ color: '#64748b' }}>Total Weight:</span> <strong>{selectedBooking.weight || 0} kg</strong></div>
            <div><span style={{ color: '#64748b' }}>Total Freight:</span> <strong style={{ color: '#0d2137', fontSize: '1.1rem' }}>₹{selectedBooking.amount}</strong></div>
          </div>
        </div>
      </div>
    ) : (
      <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Consignment Bookings</h1>
          <p className="page-subtitle">Click on any consignment record to view full manifest, bus assignment, and operations</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onNavigateModule('create-booking')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>New Booking</span>
        </button>
      </div>

      {/* Minimal Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 280px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px', paddingRight: search ? '28px' : '10px', fontSize: '0.875rem' }}
              placeholder="Search by Order ID, Sender, Mobile, Staff, Bus..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            style={{ width: '145px', fontSize: '0.8125rem' }}
            value={bookedByRole}
            onChange={(e) => setBookedByRole(e.target.value)}
            title="Filter by who booked the order (Admin or Counter Staff)"
          >
            <option value="ALL">All Operators</option>
            <option value="admin">Admin Booked</option>
            <option value="staff">Staff Booked</option>
          </select>

          <select
            className="form-control"
            style={{ width: '150px', fontSize: '0.8125rem' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="WAITING_FOR_BUS">Waiting for Bus</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="form-control"
            style={{ width: '160px', fontSize: '0.8125rem' }}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="ALL">All Destinations</option>
            {defaultRouteList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {(search || status !== 'ALL' || destination !== 'ALL' || parcelType !== 'ALL' || bookedByRole !== 'ALL') && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setDestination('ALL');
                setParcelType('ALL');
                setBookedByRole('ALL');
                setStartDate('');
                setEndDate('');
              }}
              style={{ fontSize: '0.75rem' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Minimal Bookings Table */}
      <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>Order ID / LR</th>
              <th style={{ width: '15%' }}>Booked By</th>
              <th style={{ width: '16%' }}>Customer / Sender</th>
              <th style={{ width: '16%' }}>Destination Route</th>
              <th style={{ width: '14%' }}>Goods & Quantity</th>
              <th style={{ width: '9%' }}>Freight</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Status</th>
              <th style={{ width: '9%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                  <Package size={32} color="#cbd5e1" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No consignment bookings found.</div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                return (
                  <tr
                    key={booking._id}
                    onClick={() => setSelectedBooking(booking)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    title="Click to open full consignment details & operations in a fresh page"
                  >
                    <td>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleCopyLR(booking.orderId, e)}
                            className="order-id-badge"
                            style={{
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              border: copiedId === booking.orderId ? '1px solid #86efac' : '1px solid #bfdbfe',
                              backgroundColor: copiedId === booking.orderId ? '#dcfce7' : '#eff6ff',
                              color: copiedId === booking.orderId ? '#15803d' : '#1e40af',
                              transition: 'all 0.15s ease',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                            }}
                            title="Click to copy LR Number"
                          >
                            <span>#{booking.orderId}</span>
                            {copiedId === booking.orderId ? (
                              <Check size={13} color="#15803d" />
                            ) : (
                              <Copy size={13} color="#3b82f6" />
                            )}
                          </button>
                          {copiedId === booking.orderId && (
                            <span style={{ fontSize: '0.6875rem', color: '#15803d', fontWeight: 700 }}>
                              Copied!
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                          {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </td>

                    {/* Booked By Column (Column 2) */}
                    <td>
                      {(() => {
                        const operator = getBookedByInfo(booking);
                        return (
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#0f172a',
                                fontSize: '0.8125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '140px',
                              }}
                              title={`${operator.name} (${operator.roleLabel})`}
                            >
                              {operator.name}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: operator.isAdmin ? '#1e40af' : '#065f46',
                                  backgroundColor: operator.isAdmin ? '#eff6ff' : '#ecfdf5',
                                  border: operator.isAdmin ? '1px solid #bfdbfe' : '1px solid #a7f3d0',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em',
                                  lineHeight: '1.2',
                                }}
                              >
                                {operator.roleLabel}
                              </span>
                              {operator.branch && (
                                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                  • {operator.branch}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                          {booking.customerName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                          {booking.customerPhone}
                        </div>
                        {booking.receiverName && (
                          <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '1px' }}>
                            To: {booking.receiverName}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8125rem' }}>
                        {booking.destination}
                      </span>
                      {booking.deliveryAddress && (
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          {booking.deliveryAddress}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '0.8125rem', color: '#0f172a', fontWeight: 600 }}>
                        {booking.parcelType || 'General Goods'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {booking.quantity} pcs {booking.weight ? `• ${booking.weight} kg` : ''}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800, color: '#0d2137', fontSize: '0.9375rem' }}>
                        ₹{booking.amount}
                      </div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: booking.paymentStatus === 'TO_PAY' ? '#b45309' : '#15803d',
                          backgroundColor: booking.paymentStatus === 'TO_PAY' ? '#fef3c7' : '#dcfce7',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          display: 'inline-block',
                          marginTop: '2px',
                        }}
                      >
                        {booking.paymentStatus === 'TO_PAY' ? 'TO PAY' : 'PAID'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <span
                        className={`status-badge status-${booking.status.toLowerCase()}`}
                        style={{
                          fontSize: '0.71875rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '6px',
                        }}
                      >
                        {booking.status === 'DISPATCHED' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              handleOpenDeliveryModal(booking, e);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.71875rem',
                              fontWeight: 700,
                              padding: '4px 9px',
                              backgroundColor: '#2563eb',
                              whiteSpace: 'nowrap',
                            }}
                            title="Confirm parcel delivery & customer collection at destination"
                          >
                            <CheckCircle2 size={13} />
                            <span>Mark Delivered</span>
                          </button>
                        ) : ['BOOKED', 'WAITING_FOR_BUS'].includes(booking.status) ? (
                          <button
                            type="button"
                            onClick={(e) => handleOpenCancelModal(booking, e)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.71875rem',
                              fontWeight: 600,
                              padding: '4px 9px',
                              color: '#dc2626',
                              backgroundColor: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                            title="Cancel consignment booking before bus dispatch"
                          >
                            <Ban size={12} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.875rem', paddingRight: '6px' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          fontSize: '0.8125rem',
          color: '#64748b',
        }}
      >
        <div>
          Showing {bookings.length} of {pagination.total} total bookings (Page {pagination.page} of{' '}
          {pagination.pages})
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchBookings(pagination.page - 1)}
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchBookings(pagination.page + 1)}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancellingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isCancelling && setCancellingBooking(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#fff5f5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                  }}
                >
                  <Ban size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>
                    Cancel Consignment Booking
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                    LR #{cancellingBooking.orderId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCancelling && setCancellingBooking(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                disabled={isCancelling}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.875rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Customer:</span>
                  <strong style={{ color: '#0f172a' }}>{cancellingBooking.customerName} ({cancellingBooking.customerPhone})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Route:</span>
                  <strong style={{ color: '#0f172a' }}>{cancellingBooking.destination}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Freight:</span>
                  <strong style={{ color: '#0f172a' }}>₹{cancellingBooking.amount} ({cancellingBooking.paymentStatus})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{ color: '#d97706', fontWeight: 700 }}>Waiting for Bus (Not Dispatched)</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reason for Cancellation
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.875rem', marginBottom: '0.5rem' }}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  disabled={isCancelling}
                >
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Sender changed destination / route">Sender changed destination / route</option>
                  <option value="Incorrect parcel weight or charges">Incorrect parcel weight or charges</option>
                  <option value="Customer did not deposit parcel at counter">Customer did not deposit parcel at counter</option>
                  <option value="Duplicate booking entry">Duplicate booking entry</option>
                  <option value="Other">Other / Custom Reason</option>
                </select>

                {cancellationReason === 'Other' && (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter custom cancellation reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    style={{ width: '100%', fontSize: '0.875rem' }}
                    disabled={isCancelling}
                    autoFocus
                  />
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                This parcel will be removed from the bus dispatch list and marked as cancelled. This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCancellingBooking(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Ban size={14} />
                <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP DELIVERY CONFIRMATION MODAL (NO BROWSER JAVASCRIPT POPUP) */}
      {deliveringBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isSubmittingDelivery && setDeliveringBooking(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f0fdf4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#166534' }}>
                    Confirm Parcel Delivery & Collection
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    LR #{deliveringBooking.orderId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingDelivery && setDeliveringBooking(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                disabled={isSubmittingDelivery}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.875rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Recipient / Consignee:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {deliveringBooking.receiverName || deliveringBooking.customerName} ({deliveringBooking.receiverPhone || deliveringBooking.customerPhone})
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Destination Stop:</span>
                  <strong style={{ color: '#0f172a' }}>{deliveringBooking.destination}</strong>
                </div>
                {deliveringBooking.busDetails?.busNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Dispatched Bus:</span>
                    <strong style={{ color: '#0f172a' }}>{deliveringBooking.busDetails.busNumber}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Freight Status:</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>{deliveringBooking.paymentStatus || 'PAID'} (₹{deliveringBooking.amount})</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Handover & Delivery Notes
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', fontSize: '0.875rem' }}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Handed over to recipient, ID verified"
                  disabled={isSubmittingDelivery}
                />
              </div>

              <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
                This will finalize the consignment status as DELIVERED and record customer collection.
              </p>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeliveringBooking(null)}
                disabled={isSubmittingDelivery}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={isSubmittingDelivery}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: isSubmittingDelivery ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingDelivery ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isSubmittingDelivery ? 'Marking Delivered...' : 'Confirm Delivery'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EDIT CONSIGNMENT MODAL (IN-PAGE MODAL DIALOG) */}
      {editBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !savingEdit && setEditBooking(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb',
                  }}
                >
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>
                    Edit Consignment #{editBooking.orderId}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Modify customer, recipient, route, delivery address & items manifest
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !savingEdit && setEditBooking(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
                disabled={savingEdit}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. SENDER & CUSTOMER DETAILS */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfdfe' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#2563eb" />
                    <span>Sender (Customer) Details</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sender Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.customerName || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, customerName: e.target.value })}
                        required
                        disabled={savingEdit}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sender Mobile *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.customerPhone || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, customerPhone: e.target.value })}
                        required
                        disabled={savingEdit}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sender WhatsApp</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.customerWhatsapp || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, customerWhatsapp: e.target.value })}
                        placeholder="Same as mobile if blank"
                        disabled={savingEdit}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. RECEIVER (CONSIGNEE) DETAILS */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfdfe' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#059669" />
                    <span>Receiver (Consignee) Details</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Receiver Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.receiverName || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, receiverName: e.target.value })}
                        placeholder="Person collecting parcel"
                        disabled={savingEdit}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Receiver Mobile</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.receiverPhone || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, receiverPhone: e.target.value })}
                        placeholder="Recipient contact phone"
                        disabled={savingEdit}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. DESTINATION ROUTE & DELIVERY ADDRESS */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfdfe' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="#d97706" />
                    <span>Destination & Delivery Location</span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Destination Route *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.destination || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, destination: e.target.value })}
                        placeholder="e.g. KPHB Metro -> Vijayawada"
                        required
                        disabled={savingEdit}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Delivery Stop / Counter Address *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBooking.deliveryAddress || ''}
                        onChange={(e) => setEditBooking({ ...editBooking, deliveryAddress: e.target.value })}
                        placeholder="e.g. Bus Stand Counter / Office"
                        required
                        disabled={savingEdit}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ITEMS & QUANTITY MANIFEST LIST */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfdfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={15} color="#6366f1" />
                      <span>Parcel Items Manifest ({Array.isArray(editBooking.items) ? editBooking.items.length : 1} items)</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const curItems = Array.isArray(editBooking.items) ? [...editBooking.items] : [];
                        curItems.push({ parcelType: 'Box', quantity: 1, weight: 0, notes: '', charge: 0 });
                        setEditBooking({ ...editBooking, items: curItems });
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      disabled={savingEdit}
                    >
                      <Plus size={13} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {Array.isArray(editBooking.items) && editBooking.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(130px, 1.5fr) minmax(75px, 0.8fr) minmax(85px, 0.9fr) minmax(130px, 2fr) auto',
                          gap: '0.5rem',
                          alignItems: 'center',
                          backgroundColor: '#ffffff',
                          padding: '0.5rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                      >
                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                            Item Type / Category
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontSize: '0.8125rem', padding: '4px 8px' }}
                            value={item.parcelType || ''}
                            onChange={(e) => {
                              const updated = [...editBooking.items];
                              updated[idx] = { ...updated[idx], parcelType: e.target.value };
                              setEditBooking({ ...editBooking, items: updated });
                            }}
                            placeholder="e.g. Box, Bag, Cycle"
                            required
                            disabled={savingEdit}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                            Qty (pcs)
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            style={{ fontSize: '0.8125rem', padding: '4px 8px' }}
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const updated = [...editBooking.items];
                              updated[idx] = { ...updated[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                              setEditBooking({ ...editBooking, items: updated });
                            }}
                            required
                            disabled={savingEdit}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="form-control"
                            style={{ fontSize: '0.8125rem', padding: '4px 8px' }}
                            value={item.weight || 0}
                            onChange={(e) => {
                              const updated = [...editBooking.items];
                              updated[idx] = { ...updated[idx], weight: Math.max(0, parseFloat(e.target.value) || 0) };
                              setEditBooking({ ...editBooking, items: updated });
                            }}
                            disabled={savingEdit}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.6875rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                            Handling / Item Notes
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontSize: '0.8125rem', padding: '4px 8px' }}
                            value={item.notes || ''}
                            onChange={(e) => {
                              const updated = [...editBooking.items];
                              updated[idx] = { ...updated[idx], notes: e.target.value };
                              setEditBooking({ ...editBooking, items: updated });
                            }}
                            placeholder="Fragile, Handle with care, etc."
                            disabled={savingEdit}
                          />
                        </div>

                        <div style={{ paddingTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (editBooking.items.length <= 1) return;
                              const updated = editBooking.items.filter((_, i) => i !== idx);
                              setEditBooking({ ...editBooking, items: updated });
                            }}
                            disabled={editBooking.items.length <= 1 || savingEdit}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: editBooking.items.length <= 1 ? '#cbd5e1' : '#ef4444',
                              cursor: editBooking.items.length <= 1 ? 'not-allowed' : 'pointer',
                              padding: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px',
                            }}
                            title="Remove this item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. FREIGHT RATE / AMOUNT (LOCKED - NON-EDITABLE PER REQUIREMENTS) */}
                <div
                  style={{
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '0.875rem 1.25rem',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Lock size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e3a8a' }}>
                        Booked Freight Charge: ₹{editBooking.amount} ({editBooking.paymentStatus || 'PAID'})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                        Freight rate is locked and cannot be edited.
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.71875rem',
                      fontWeight: 700,
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    Non-Editable
                  </span>
                </div>

                {/* 6. GENERAL NOTES */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>General Consignment Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editBooking.notes || ''}
                    onChange={(e) => setEditBooking({ ...editBooking, notes: e.target.value })}
                    placeholder="General remarks or instructions..."
                    disabled={savingEdit}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditBooking(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingEdit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} />
                  <span>{savingEdit ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
