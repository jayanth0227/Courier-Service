import React, { useState } from 'react';
import { X, Send, MessageSquare, Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCompanySettings } from '../context/CompanyContext';

export const WhatsAppModal = ({ booking, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const { companySettings } = useCompanySettings();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('SENDER'); // 'SENDER' or 'RECEIVER'

  if (!booking) return null;

  const senderPhone = booking.customerWhatsapp || booking.customerPhone || '';
  const senderName = booking.customerName || 'Sender';
  const receiverPhone = booking.receiverWhatsapp || booking.receiverPhone || '';
  const receiverName = booking.receiverName || 'Receiver';

  const busNo = booking.busDetails?.busNumber || '';
  const busName = booking.busDetails?.busName || booking.busDetails?.operator || '';
  const busDisplay = busNo ? `${busNo}${busName ? ` (${busName})` : ''}` : (busName || 'Assigned Bus');
  const route = booking.busDetails?.route || booking.destination || `${booking.fromCity || 'Origin'} → ${booking.toCity || 'Destination'}`;
  const driverName = booking.busDetails?.driverName || '';
  const driverPhone = booking.busDetails?.driverPhone || '';
  const driverInfo = driverName || driverPhone
    ? `${driverName ? `${driverName} ` : ''}${driverPhone ? `(${driverPhone})` : ''}`.trim()
    : '';

  const cleanToCity = booking.toCity || (booking.destination?.includes('→') ? booking.destination.split('→').slice(1).join('→').trim() : '');
  const stopAddr = booking.deliveryAddress || booking.busDetails?.destinationAddress || '';
  const fullStop = stopAddr && cleanToCity && !stopAddr.toLowerCase().includes(cleanToCity.toLowerCase())
    ? `${cleanToCity} - ${stopAddr}`
    : (stopAddr || cleanToCity || 'Destination Counter');

  const payStatus = (booking.paymentStatus || 'PAID').toUpperCase();
  const payDisplay = payStatus === 'TO PAY'
    ? `₹${Number(booking.amount || 0).toFixed(2)} (TO PAY)`
    : `PAID (₹${Number(booking.amount || 0).toFixed(2)})`;

  const isSenderTab = activeTab === 'SENDER';
  const currentRecipientName = isSenderTab ? senderName : receiverName;
  const currentPhone = isSenderTab ? senderPhone : receiverPhone;

  const cleanId = String(booking.orderId || '').replace(/^#/, '');
  const brand = booking.companyName || companySettings?.companyName || 'Mr Cargo';
  const companyPhone = companySettings?.companyPhone || '';

  const lines = [
    `*${brand} - Parcel In Transit*`,
    '',
    `Dear ${currentRecipientName}, your parcel is on the way.`,
    '',
    `• LR Number: #${cleanId}`,
    `• Bus / Vehicle: ${busDisplay}`,
  ];

  if (driverInfo) {
    lines.push(`• Driver: ${driverInfo}`);
  }
  lines.push(`• Delivery Counter: ${fullStop}`);
  lines.push('');
  lines.push('Track live:');
  lines.push(`https://mrcargo.online/#track?id=${cleanId}`);
  lines.push('');
  lines.push(`*Show LR #${cleanId} at the counter to collect.*`);

  if (companyPhone) {
    lines.push(`Help: ${companyPhone}`);
  }

  const messageText = lines.join('\n');

  const cleanPhone = (currentPhone || '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast('WhatsApp message copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTriggerApi = async () => {
    try {
      setSending(true);
      const res = await api.notifications.resend(booking._id);
      if (res.success) {
        showToast(`WhatsApp dispatch notifications triggered for Sender & Receiver!`, 'success');
        if (onSuccess) onSuccess();
      } else {
        showToast(res.message || 'Notification triggered', 'info');
      }
    } catch (error) {
      showToast(error.message || 'Failed to send notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Order <strong>#{booking.orderId}</strong>
        </span>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Send WhatsApp Bus & Parcel Dispatch Notification
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
            Supports Sender & Receiver
          </span>
        </div>

        {/* Sender / Receiver Switch Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${isSenderTab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('SENDER')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Sender (Consignor): {senderName}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${!isSenderTab ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('RECEIVER')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Receiver (Consignee): {receiverName || 'Receiver'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.875rem', backgroundColor: isSenderTab ? '#f8fafc' : '#f0fdf4', border: isSenderTab ? '1px solid #e2e8f0' : '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div>
            <span style={{ color: '#64748b' }}>{isSenderTab ? 'Sender (Consignor)' : 'Receiver (Consignee)'}: </span>
            <strong style={{ color: '#0f172a' }}>{currentRecipientName}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>WhatsApp: </span>
            <strong style={{ color: isSenderTab ? '#2563eb' : '#15803d' }}>
              {currentPhone ? `+${formattedPhone}` : 'No phone provided'}
            </strong>
          </div>
        </div>

        <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>Notification Message Preview ({isSenderTab ? 'Sender Copy' : 'Receiver Copy'}):</span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>Clean & Concise Format</span>
        </label>
        <div className="whatsapp-preview-box" style={{ marginBottom: '1.25rem', whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' }}>
          {messageText}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} color="#0f172a" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Message'}</span>
          </button>
          {currentPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ExternalLink size={14} />
              <span>Open in WhatsApp Web ({isSenderTab ? 'Sender' : 'Receiver'})</span>
            </a>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            Current Status:{' '}
            <strong style={{ color: booking.notificationStatus === 'SENT' ? '#16a34a' : '#b45309' }}>
              {booking.notificationStatus === 'SENT' ? 'SENT' : (booking.notificationStatus === 'PARTIAL' ? 'PARTIAL' : 'NOT SENT / PENDING')}
            </strong>
            {booking.notificationSentAt && (
              <span style={{ marginLeft: '0.5rem' }}>
                (Last sent: {new Date(booking.notificationSentAt).toLocaleTimeString()})
              </span>
            )}
          </div>

          <button className="btn btn-primary btn-sm" onClick={handleTriggerApi} disabled={sending}>
            <Send size={14} />
            {sending ? 'Sending...' : 'Trigger WhatsApp to Both'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const WhatsAppView = WhatsAppModal;
