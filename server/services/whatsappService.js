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
    const brand = companyName || 'JAYANTH CARGO';
    const travels = busName || operator || '';
    const travelsStr = travels ? ` (${travels})` : '';

    const cleanFrom = fromCity || 'Origin';
    const cleanTo = toCity || 'Destination';
    const routeDisplay = route || `${cleanFrom} → ${cleanTo}`;

    const fullDestAddr = destinationAddress
      ? (toCity && !destinationAddress.toLowerCase().includes(toCity.toLowerCase())
          ? `${toCity} - ${destinationAddress}`
          : destinationAddress)
      : cleanTo;

    // Build parcel items breakdown
    let itemsText = '';
    if (Array.isArray(items) && items.length > 0) {
      itemsText = items
        .map((it) => `  • ${it.parcelType || 'Parcel'} (Qty: ${it.quantity || 1}${it.weight ? `, ${it.weight}kg` : ''})`)
        .join('\n');
    } else {
      itemsText = `  • ${parcelType || 'Parcel'} (Qty: ${quantity || 1}${weight ? `, ${weight}kg` : ''})`;
    }

    const payStatusStr = (paymentStatus || 'PAID').toUpperCase();
    const paymentLine = payStatusStr === 'TO PAY'
      ? `TO PAY ₹${Number(amount || 0).toFixed(2)} (Collect at Destination)`
      : `PAID (₹${Number(amount || 0).toFixed(2)})`;

    // Role-tailored header and greeting
    let greeting = '';
    let intro = '';
    if (recipientRole === 'RECEIVER') {
      greeting = `Hello *${recipientName || receiverName || 'Consignee'}*,`;
      intro = `A parcel dispatched for you by *${senderName || 'Consignor'}* has been assigned to a bus and is now *IN TRANSIT*!`;
    } else if (recipientRole === 'SENDER') {
      greeting = `Hello *${recipientName || senderName || 'Consignor'}*,`;
      intro = `Your booked consignment has been assigned to a bus and is now *IN TRANSIT*!`;
    } else {
      greeting = `Hello *${recipientName || 'Customer'}*,`;
      intro = `Your parcel with LR Docket No *#${orderId}* has been assigned to a bus and is now *IN TRANSIT*!`;
    }

    let busLines = [];
    busLines.push(`• *Bus / Vehicle:* ${busNumber}${travelsStr}`);
    busLines.push(`• *Route:* ${routeDisplay}`);
    if (departureTime) busLines.push(`• *Departure Time:* ${departureTime}${platformNumber ? ` (${platformNumber})` : ''}`);
    if (arrivalTime) busLines.push(`• *Est. Arrival:* ${arrivalTime}`);
    if (driverName || driverPhone) busLines.push(`• *Driver:* ${driverName ? `${driverName} ` : ''}(${driverPhone || 'N/A'})`);
    if (alternatePhone) busLines.push(`• *Conductor / Alt:* ${alternatePhone}`);
    if (dispatchNotes) busLines.push(`• *Dispatch Note:* ${dispatchNotes}`);

    let parcelLines = [];
    parcelLines.push(`• *LR Docket No:* #${orderId}`);
    parcelLines.push(`• *Sender (Consignor):* ${senderName || 'N/A'}${senderPhone ? ` (${senderPhone})` : ''}`);
    parcelLines.push(`• *Receiver (Consignee):* ${receiverName || 'N/A'}${receiverPhone ? ` (${receiverPhone})` : ''}`);
    parcelLines.push(`• *Delivery Counter / Stop:* ${fullDestAddr}`);
    parcelLines.push(`• *Freight Payment:* ${paymentLine}`);
    parcelLines.push(`• *Package Contents:*\n${itemsText}`);

    return `🚍 *BUS DISPATCH & PARCEL IN-TRANSIT UPDATE*
*${brand}*

${greeting}

${intro}

📋 *PARCEL & CONSIGNMENT DETAILS:*
${parcelLines.join('\n')}

🚌 *BUS & TRANSPORT DETAILS:*
${busLines.join('\n')}

⚠️ *PICKUP INSTRUCTIONS:*
Please present LR Docket No *#${orderId}* at the destination delivery counter to collect your parcel.

Thank you for choosing *${brand}*!${companyPhone ? `\nHelpline: ${companyPhone}` : ''}`;
  }

  /**
   * Build WhatsApp booking confirmation message (sent immediately on booking)
   */
  buildBookingConfirmationMessage({ customerName, orderId, fromCity, toCity, deliveryAddress, items, amount, paymentStatus, companyName }) {
    const brand = companyName || 'our Courier & Bus Dispatch Service';
    const fullDest = toCity && deliveryAddress ? `${toCity} - ${deliveryAddress}` : (deliveryAddress || toCity || '');

    let itemLines = '';
    if (Array.isArray(items) && items.length > 0) {
      itemLines = items.map((it, i) => `  ${i + 1}. ${it.parcelType} (Qty: ${it.quantity}) - ₹${it.charge}`).join('\n');
    } else {
      itemLines = `  1. Parcel - ₹${amount}`;
    }

    return `Hello ${customerName || 'Customer'},\n\nYour parcel has been booked successfully!\n\n📋 *LR Docket ID:* #${orderId}\n📍 *Route:* ${fromCity || 'Origin'} → ${toCity || 'Destination'}\n🏪 *Delivery Stop:* ${fullDest}\n📦 *Items:*\n${itemLines}\n💰 *Total Amount:* ₹${amount} [${paymentStatus || 'PAID'}]\n📊 *Status:* Waiting for Bus Dispatch\n\nPlease keep your LR ID #${orderId} for tracking.\n\nThank you for choosing ${brand}.`;
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
    let settings = null;
    try {
      const query = tenantId ? { tenantId } : {};
      settings = await Setting.findOne(query);
      if (settings && settings.companyName) {
        companyName = settings.companyName;
      }
    } catch {
      // Ignore
    }

    // Only send if provider is not MOCK
    if (!settings || settings.whatsappProvider === 'MOCK') {
      return { success: false, skipped: true, reason: 'WhatsApp provider is MOCK' };
    }

    const recipientPhone = booking.customerWhatsapp || booking.customerPhone;
    const message = this.buildBookingConfirmationMessage({
      customerName: booking.customerName,
      orderId: booking.orderId,
      fromCity: booking.fromCity,
      toCity: booking.toCity,
      deliveryAddress: booking.deliveryAddress,
      items: booking.items,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      companyName,
    });

    const result = await this.sendTextMessage(recipientPhone, message, settings);

    // Log notification to DB
    try {
      await Notification.create({
        tenantId: booking.tenantId || settings?.tenantId,
        bookingId: booking._id,
        orderId: booking.orderId,
        customerId: booking.customer,
        customerName: booking.customerName,
        type: 'WHATSAPP',
        recipientPhone,
        message,
        provider: settings.whatsappProvider || 'MOCK',
        status: result.success ? 'SENT' : 'FAILED',
        failureReason: result.error || null,
        providerResponse: result.response || null,
        sentAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to log booking confirmation notification:', err.message);
    }

    return result;
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

