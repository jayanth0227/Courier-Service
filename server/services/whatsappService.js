const Notification = require('../models/Notification');
const Setting = require('../models/Setting');

class WhatsAppNotificationService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'MOCK';
  }

  /**
   * Format phone number to international format with country code (defaults to +91 if 10 digits)
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Build the comprehensive WhatsApp notification text for bus dispatch
   * Includes complete Bus details AND complete Parcel details
   */
  buildDispatchMessage({
    recipientRole = 'CUSTOMER', // 'SENDER' or 'RECEIVER' or 'CUSTOMER'
    recipientName,
    orderId,
    // Bus details
    busNumber,
    busName,
    operator,
    route,
    fromCity,
    toCity,
    originAddress,
    destinationAddress,
    departureTime,
    arrivalTime,
    platformNumber,
    driverName,
    driverPhone,
    alternatePhone,
    dispatchNotes,
    // Parcel details
    parcelType,
    quantity,
    weight,
    items,
    amount,
    paymentStatus,
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    companyName,
    companyPhone,
  }) {
    const brand = companyName || 'Mr Cargo';
    const cleanId = String(orderId || '').replace(/^#/, '');
    const recipient = (recipientName || (recipientRole === 'RECEIVER' ? receiverName : senderName) || 'Customer').trim();
    const travels = busName || operator || '';
    const busDisplay = busNumber ? `${busNumber}${travels ? ` (${travels})` : ''}` : (travels || 'Assigned Bus');

    const cleanTo = toCity || 'Destination';
    const fullDest = destinationAddress
      ? (toCity && !destinationAddress.toLowerCase().includes(toCity.toLowerCase())
          ? `${toCity} - ${destinationAddress}`
          : destinationAddress)
      : cleanTo;

    const payStatusStr = (paymentStatus || 'PAID').toUpperCase();
    const payDisplay = payStatusStr === 'TO PAY'
      ? `₹${Number(amount || 0).toFixed(2)} (TO PAY)`
      : `PAID (₹${Number(amount || 0).toFixed(2)})`;

    const driverInfo = driverName || driverPhone
      ? `${driverName ? `${driverName} ` : ''}${driverPhone ? `(${driverPhone})` : ''}`.trim()
      : '';

    const lines = [
      `*${brand} - Parcel In Transit*`,
      '',
      `Dear ${recipient}, your parcel is on the way.`,
      '',
      `• LR Number: #${cleanId}`,
      `• Bus / Vehicle: ${busDisplay}`,
    ];

    if (driverInfo) {
      lines.push(`• Driver: ${driverInfo}`);
    }
    lines.push(`• Delivery Counter: ${fullDest}`);
    lines.push(`• Payment: ${payDisplay}`);
    lines.push('');
    lines.push('Track live:');
    lines.push(`https://mrcargo.online/#track?id=${cleanId}`);
    lines.push('');
    lines.push(`*Show LR #${cleanId} at the counter to collect.*`);

    if (companyPhone) {
      lines.push(`Help: ${companyPhone}`);
    }

    return lines.join('\n');
  }

  /**
   * Build WhatsApp booking confirmation message (sent immediately on booking)
   */
  buildBookingConfirmationMessage({
    recipientRole = 'CUSTOMER',
    recipientName,
    customerName,
    orderId,
    fromCity,
    toCity,
    deliveryAddress,
    items,
    amount,
    paymentStatus,
    remarks,
    companyName,
    companyPhone,
  }) {
    const brand = companyName || 'Mr Cargo';
    const cleanId = String(orderId || '').replace(/^#/, '');
    const recipient = (recipientName || customerName || 'Customer').trim();
    const route = `${fromCity || 'Origin'} → ${toCity || 'Destination'}`;
    const fullDest = deliveryAddress
      ? (toCity && !deliveryAddress.toLowerCase().includes(toCity.toLowerCase())
          ? `${toCity} - ${deliveryAddress}`
          : deliveryAddress)
      : (toCity || 'Destination Counter');

    const payStatus = (paymentStatus || 'PAID').toUpperCase();
    const payDisplay = payStatus === 'TO PAY'
      ? `₹${Number(amount || 0).toFixed(2)} (TO PAY at Destination)`
      : `₹${Number(amount || 0).toFixed(2)} (PAID)`;

    const lines = [
      `*${brand} - Booking Confirmation*`,
      '',
      `Dear ${recipient}, your parcel has been booked successfully.`,
      '',
      `• LR Number: #${cleanId}`,
      `• Route: ${route}`,
      `• Delivery Stop: ${fullDest}`,
      `• Payment: ${payDisplay}`,
    ];

    if (remarks && remarks.trim()) {
      lines.push(`• Remarks: ${remarks.trim()}`);
    }

    lines.push('');
    lines.push('Track online:');
    lines.push(`https://mrcargo.online/#track?id=${cleanId}`);

    if (companyPhone) {
      lines.push('');
      lines.push(`Help: ${companyPhone}`);
    }

    return lines.join('\n');
  }

  /**
   * Build direct wa.me link for browser/mobile staff dispatch
   */
  generateWhatsAppLink(phone, message) {
    const formattedPhone = this.formatPhoneNumber(phone);
    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  }

  /**
   * Send a text message via the configured WhatsApp provider (supports OpenWA gateway)
   * @param {string} phone - Recipient phone number
   * @param {string} message - Message text
   * @param {object} tenantSettings - Tenant settings object with provider config
   * @returns {object} - { success, provider, response }
   */
  async sendTextMessage(phone, message, tenantSettings = null) {
    const settings = tenantSettings || (await Setting.findOne()) || {};
    const provider = settings.whatsappProvider || this.provider || 'MOCK';
    const formattedPhone = this.formatPhoneNumber(phone);

    if (provider === 'OPENWA') {
      return this._sendViaOpenWA(formattedPhone, message, settings);
    } else if (provider === 'TWILIO') {
      return { success: true, provider: 'TWILIO', response: { simulated: true } };
    } else if (provider === 'META') {
      return { success: true, provider: 'META', response: { simulated: true } };
    } else if (provider === 'WEBHOOK') {
      return { success: true, provider: 'WEBHOOK', response: { simulated: true } };
    } else {
      // MOCK mode
      console.log(`[WhatsApp MOCK] To: ${formattedPhone}\n${message}`);
      return { success: true, provider: 'MOCK', response: { logged_to_console: true } };
    }
  }

  /**
   * Send message via OpenWA self-hosted gateway REST API
   * API: POST {baseUrl}/api/sessions/{sessionId}/messages/send-text
   * Header: X-API-Key: {apiKey}
   * Body: { chatId: "919876543210@c.us", text: "Hello..." }
   */
  async _sendViaOpenWA(formattedPhone, message, settings) {
    const baseUrl = (settings.whatsappApiUrl || '').replace(/\/+$/, '');
    const apiKey = settings.whatsappApiKey || '';
    const sessionId = settings.openwaSessionId || '';

    if (!baseUrl || !apiKey || !sessionId) {
      console.warn('[OpenWA] Missing configuration: URL, API Key, or Session ID');
      return {
        success: false,
        provider: 'OPENWA',
        error: 'OpenWA not configured: Missing API URL, API Key, or Session ID',
      };
    }

    const chatId = `${formattedPhone}@c.us`;
    const endpoint = `${baseUrl}/api/sessions/${sessionId}/messages/send-text`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ chatId, text: message }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        console.log(`[OpenWA] ✅ Message sent to ${chatId}`);
        return { success: true, provider: 'OPENWA', response: data };
      } else {
        const errorMsg = data.message || `OpenWA API returned ${response.status}`;
        const isNotOnWhatsApp = /not resolve the recipient|not on whatsapp/i.test(errorMsg);
        if (isNotOnWhatsApp) {
          console.log(`[OpenWA] ℹ️ Recipient ${formattedPhone} is not on WhatsApp or chat uninitialized. Gracefully skipping.`);
        } else {
          console.error(`[OpenWA] ❌ Failed (${response.status}):`, errorMsg);
        }
        return {
          success: false,
          skipped: isNotOnWhatsApp,
          notOnWhatsApp: isNotOnWhatsApp,
          provider: 'OPENWA',
          error: isNotOnWhatsApp ? 'Skipped: Not registered on WhatsApp' : errorMsg,
          response: data,
        };
      }
    } catch (error) {
      console.error('[OpenWA] ❌ Network error:', error.message);
      return {
        success: false,
        provider: 'OPENWA',
        error: `OpenWA connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Send booking confirmation notification to customer (called on booking creation)
   */
  async sendBookingConfirmation(booking, tenantId = null) {
    let companyName = '';
    let companyPhone = '';
    let settings = null;
    try {
      const activeTenantId = tenantId || booking?.tenantId;
      const query = activeTenantId ? { tenantId: activeTenantId } : {};
      settings = await Setting.findOne(query);
      if (!settings) {
        settings = await Setting.findOne({ whatsappProvider: 'OPENWA' });
      }
      if (!settings) {
        settings = await Setting.findOne();
      }
      if (settings) {
        companyName = settings.companyName || '';
        companyPhone = settings.companyPhone || '';
      }
    } catch {
      // Ignore
    }

    // Only send if provider is not MOCK
    if (!settings || settings.whatsappProvider === 'MOCK') {
      return { success: false, skipped: true, reason: 'WhatsApp provider is MOCK' };
    }

    const senderPhone = (booking.customerWhatsapp || booking.customerPhone || '').trim();
    const senderName = (booking.customerName || '').trim();
    const receiverPhone = (booking.receiverWhatsapp || booking.receiverPhone || '').trim();
    const receiverName = (booking.receiverName || '').trim();
    const remarks = (booking.remarks || booking.notes || '').trim();

    // Determine target recipients with strict deduplication
    const recipients = [];
    const cleanedSender = this.formatPhoneNumber(senderPhone);
    const cleanedReceiver = this.formatPhoneNumber(receiverPhone);

    // 1. Sender (Consignor)
    if (senderPhone && cleanedSender) {
      recipients.push({
        role: 'SENDER',
        roleLabel: 'Sender (Consignor)',
        name: senderName || 'Customer',
        phone: senderPhone,
      });
    }

    // 2. Receiver (Consignee) - send if provided AND different number from sender
    if (receiverPhone && cleanedReceiver && cleanedReceiver !== cleanedSender) {
      recipients.push({
        role: 'RECEIVER',
        roleLabel: 'Receiver (Consignee)',
        name: receiverName || 'Consignee',
        phone: receiverPhone,
      });
    }

    const results = [];
    for (const r of recipients) {
      const message = this.buildBookingConfirmationMessage({
        recipientRole: r.role,
        recipientName: r.name,
        customerName: senderName,
        orderId: booking.orderId,
        fromCity: booking.fromCity,
        toCity: booking.toCity,
        deliveryAddress: booking.deliveryAddress,
        items: booking.items,
        amount: booking.amount,
        paymentStatus: booking.paymentStatus,
        remarks,
        companyName,
        companyPhone,
      });

      const res = await this.sendTextMessage(r.phone, message, settings);
      results.push({
        recipientRole: r.role,
        recipientPhone: r.phone,
        success: res.success,
        message,
        error: res.error,
      });

      // Log notification to DB
      try {
        await Notification.create({
          tenantId: booking.tenantId || settings?.tenantId,
          bookingId: booking._id,
          orderId: booking.orderId,
          customerId: booking.customer,
          customerName: r.name,
          type: 'WHATSAPP',
          recipientPhone: r.phone,
          message,
          provider: settings.whatsappProvider || 'MOCK',
          status: res.success ? 'SENT' : 'FAILED',
          failureReason: res.error || null,
          providerResponse: res.response || null,
          sentAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to log booking confirmation notification:', err.message);
      }
    }

    return results.length === 1 ? results[0] : { success: results.some((r) => r.success), results };
  }

  /**
   * Send dispatch notification to BOTH Sender (Consignor) and Receiver (Consignee)
   * Dispatches complete Bus details AND complete Parcel details
   * Returns an array of notification result objects for both parties
   */
  async sendDispatchNotification(params) {
    const {
      booking,
      tenantId: paramTenantId,
      busNumber,
      busName,
      route,
      fromCity,
      toCity,
      originAddress,
      destinationAddress,
      departureTime,
      arrivalTime,
      operator,
      driverName,
      driverPhone,
      alternatePhone,
      platformNumber,
      dispatchNotes,
    } = params;

    const activeTenantId = paramTenantId || booking?.tenantId;
    let companyName = '';
    let companyPhone = '';
    let settings = null;
    try {
      if (activeTenantId) {
        settings = await Setting.findOne({ tenantId: activeTenantId });
      }
      if (!settings) {
        settings = await Setting.findOne({ whatsappProvider: 'OPENWA' });
      }
      if (!settings) {
        settings = await Setting.findOne();
      }
      if (settings) {
        companyName = settings.companyName || '';
        companyPhone = settings.companyPhone || '';
      }
    } catch (err) {
      console.warn('[WhatsApp Service] Error fetching settings:', err.message);
    }

    const senderPhone = (booking.customerWhatsapp || booking.customerPhone || '').trim();
    const senderName = (booking.customerName || '').trim();
    const receiverPhone = (booking.receiverWhatsapp || booking.receiverPhone || '').trim();
    const receiverName = (booking.receiverName || '').trim();

    const basePayload = {
      orderId: booking.orderId,
      busNumber,
      busName,
      operator,
      route,
      fromCity: fromCity || booking.fromCity,
      toCity: toCity || booking.toCity || booking.destination,
      originAddress,
      destinationAddress: destinationAddress || booking.deliveryAddress,
      departureTime,
      arrivalTime,
      platformNumber,
      driverName,
      driverPhone,
      alternatePhone,
      dispatchNotes,
      parcelType: booking.parcelType,
      quantity: booking.quantity,
      weight: booking.weight,
      items: booking.items,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      senderName,
      senderPhone,
      receiverName,
      receiverPhone,
      companyName,
      companyPhone,
    };

    // Determine target recipients
    const recipients = [];

    // 1. Sender (Consignor)
    if (senderPhone) {
      recipients.push({
        role: 'SENDER',
        roleLabel: 'Sender (Consignor)',
        name: senderName || 'Sender',
        phone: senderPhone,
      });
    }

    // 2. Receiver (Consignee) - send if provided and different from sender phone
    const cleanedSender = this.formatPhoneNumber(senderPhone);
    const cleanedReceiver = this.formatPhoneNumber(receiverPhone);

    if (receiverPhone && cleanedReceiver && cleanedReceiver !== cleanedSender) {
      recipients.push({
        role: 'RECEIVER',
        roleLabel: 'Receiver (Consignee)',
        name: receiverName || 'Receiver',
        phone: receiverPhone,
      });
    }

    const provider = settings?.whatsappProvider || process.env.WHATSAPP_PROVIDER || 'MOCK';
    const results = [];

    for (const r of recipients) {
      const message = this.buildDispatchMessage({
        ...basePayload,
        recipientRole: r.role,
        recipientName: r.name,
      });

      const directLink = this.generateWhatsAppLink(r.phone, message);

      let status = 'SENT';
      let failureReason = null;
      let providerResponse = null;

      try {
        if (provider === 'OPENWA') {
          // Automatic sending via OpenWA self-hosted gateway
          const sendRes = await this.sendTextMessage(r.phone, message, settings);
          providerResponse = sendRes.response;
          if (!sendRes.success) {
            status = 'FAILED';
            failureReason = sendRes.error;
          }
        } else if (provider === 'TWILIO' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          providerResponse = { provider: 'TWILIO', simulated: true };
        } else if (provider === 'META' && process.env.WHATSAPP_API_KEY) {
          providerResponse = { provider: 'META', simulated: true };
        } else if (provider === 'WEBHOOK' && process.env.WHATSAPP_API_URL) {
          providerResponse = { provider: 'WEBHOOK', simulated: true };
        } else {
          console.log(`[WhatsApp Notification Service - ${r.role} - MOCK MODE]`);
          console.log(`To: ${r.phone} (${r.name})`);
          console.log(`Message:\n${message}`);
          providerResponse = { provider: 'MOCK', status: 'logged_to_console' };
        }

        // Persist Notification record to DB
        const notification = await Notification.create({
          tenantId: booking.tenantId || settings?.tenantId,
          bookingId: booking._id,
          orderId: booking.orderId,
          customerId: booking.customer,
          customerName: r.name,
          type: 'WHATSAPP',
          recipientPhone: r.phone,
          message,
          provider: provider,
          status,
          failureReason,
          providerResponse,
          sentAt: new Date(),
        });

        results.push({
          success: status === 'SENT',
          recipientRole: r.role,
          recipientLabel: r.roleLabel,
          recipientName: r.name,
          phone: r.phone,
          notificationId: notification._id,
          status,
          failureReason,
          message,
          directLink,
        });
      } catch (err) {
        console.error(`[WhatsApp Notification Error for ${r.role}]:`, err.message);

        try {
          await Notification.create({
            tenantId: booking.tenantId || settings?.tenantId,
            bookingId: booking._id,
            orderId: booking.orderId,
            customerId: booking.customer,
            customerName: r.name,
            type: 'WHATSAPP',
            recipientPhone: r.phone,
            message,
            provider: provider,
            status: 'FAILED',
            failureReason: err.message,
            sentAt: new Date(),
          });
        } catch {
          // Ignore secondary DB error
        }

        results.push({
          success: false,
          recipientRole: r.role,
          recipientLabel: r.roleLabel,
          recipientName: r.name,
          phone: r.phone,
          status: 'FAILED',
          failureReason: err.message,
          message,
          directLink,
        });
      }
    }

    // Attach helper properties on array for backwards compatibility
    results.success = results.length > 0 && results.some((r) => r.success);
    results.allSuccess = results.length > 0 && results.every((r) => r.success);
    results.status = results.allSuccess ? 'SENT' : (results.success ? 'PARTIAL' : 'FAILED');
    results.directLink = results[0]?.directLink || '';
    results.message = results[0]?.message || '';
    results.recipientPhone = results[0]?.phone || '';

    return results;
  }
}

module.exports = new WhatsAppNotificationService();

