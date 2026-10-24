import React, { useState } from 'react';
import { X, Send, MessageSquare, Copy, Check, ExternalLink, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const WhatsAppModal = ({ booking, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  if (!booking) return null;

  const recipientPhone = booking.customerWhatsapp || booking.customerPhone;
  const busNo = booking.busDetails?.busNumber || 'Assigned Bus';
  const route = booking.busDetails?.route || booking.destination;
  const departure = booking.busDetails?.departureTime || 'Evening Dispatch';
  const cleanToCity = booking.toCity || (booking.destination?.includes('→') ? booking.destination.split('→').slice(1).join('→').trim() : '');
  const stopAddr = booking.deliveryAddress || booking.busDetails?.destinationAddress || '';
  const fullStop = stopAddr && cleanToCity && !stopAddr.toLowerCase().includes(cleanToCity.toLowerCase())
    ? `${cleanToCity} - ${stopAddr}`
    : (stopAddr || cleanToCity);

  const messageText = `Hello ${booking.customerName || 'Customer'},\n\nYour parcel with Order ID #${booking.orderId} has been dispatched.\n\nBus Number: ${busNo}\nRoute: ${route}${operator}${fullStop ? `\nDelivery Stop / To Address: ${fullStop}` : ''}\nDeparture: ${departure}\n\nPlease present Order ID #${booking.orderId} at the delivery counter to receive your parcel.\n\nThank you for choosing our Courier & Bus Dispatch Service.`;

  const cleanPhone = (recipientPhone || '').replace(/\D/g, '');
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
        showToast(`WhatsApp notification sent to ${recipientPhone}!`, 'success');
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
    <div style={{ maxWidth: '750px', margin: '0 auto', paddingBottom: '3rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <MessageSquare size={18} color="#2563eb" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            Send WhatsApp Notification
          </h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          <div>
            <span style={{ color: '#64748b' }}>Customer: </span>
            <strong style={{ color: '#0f172a' }}>{booking.customerName}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>WhatsApp: </span>
            <strong style={{ color: '#2563eb' }}>+{formattedPhone}</strong>
          </div>
        </div>

        <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Notification Message Preview:
        </label>
        <div className="whatsapp-preview-box" style={{ marginBottom: '1.25rem' }}>
          {messageText}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} color="#0f172a" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Message'}</span>
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <ExternalLink size={14} />
            <span>Open in WhatsApp Web / App</span>
          </a>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            Current Status:{' '}
            <strong style={{ color: booking.notificationStatus === 'SENT' ? '#16a34a' : '#b45309' }}>
              {booking.notificationStatus === 'SENT' ? 'SENT' : 'NOT SENT / PENDING'}
            </strong>
            {booking.notificationSentAt && (
              <span style={{ marginLeft: '0.5rem' }}>
                (Last sent: {new Date(booking.notificationSentAt).toLocaleTimeString()})
              </span>
            )}
          </div>

          <button className="btn btn-primary btn-sm" onClick={handleTriggerApi} disabled={sending}>
            <Send size={14} />
            {sending ? 'Sending...' : 'Trigger Service Notification'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const WhatsAppView = WhatsAppModal;
