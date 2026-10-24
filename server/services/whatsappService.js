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
   */
  buildDispatchMessage({
    customerName,
    orderId,
    busNumber,
    busName,
    route,
    fromCity,
    toCity,
    destinationAddress,
    departureTime,
    arrivalTime,
    operator,
    driverName,
    driverPhone,
    alternatePhone,
    platformNumber,
    companyName,
  }) {
    const brand = companyName || 'SRI VINAYAKA LOGISTICS';
    const travels = busName || operator || '';
    const travelsStr = travels ? ` (${travels})` : '';

    let detailsList = [];
    detailsList.push(`• Bus Number: ${busNumber}${travelsStr}`);
    if (route) detailsList.push(`• Route: ${route}`);
    if (destinationAddress) {
      const fullDestAddr = toCity && !destinationAddress.toLowerCase().includes(toCity.toLowerCase())
        ? `${toCity} - ${destinationAddress}`
        : destinationAddress;
      detailsList.push(`• Delivery Counter / To Address: ${fullDestAddr}`);
    }
    if (departureTime) detailsList.push(`• Departure Time: ${departureTime}${platformNumber ? ` (Platform: ${platformNumber})` : ''}`);
    if (arrivalTime) detailsList.push(`• Est. Arrival: ${arrivalTime}`);
    if (driverName || driverPhone) detailsList.push(`• Driver Contact: ${driverName ? `${driverName} - ` : ''}${driverPhone || 'N/A'}`);
    if (alternatePhone) detailsList.push(`• Alt / Conductor Contact: ${alternatePhone}`);

    return `Hello ${customerName || 'Customer'},\n\nYour parcel with Order ID #${orderId} has been successfully assigned and dispatched!\n\nBus & Dispatch Details:\n${detailsList.join('\n')}\n\nPlease present Order ID #${orderId} at the destination counter to receive your parcel.\n\nThank you for choosing ${brand}.`;
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
   * Send dispatch notification to customer
   */
  async sendDispatchNotification(params) {
    const { booking, busNumber, busName, route, fromCity, toCity, destinationAddress, departureTime, arrivalTime, operator, driverName, driverPhone, alternatePhone, platformNumber } = params;
    let companyName = '';
    try {
      const setting = await Setting.findOne();
      if (setting && setting.companyName) {
        companyName = setting.companyName;
      }
    } catch {
      // Ignore setting query error
    }

    const recipientPhone = booking.customerWhatsapp || booking.customerPhone;
    const message = this.buildDispatchMessage({
      customerName: booking.customerName,
      orderId: booking.orderId,
      busNumber,
      busName,
      route,
      fromCity,
      toCity,
      destinationAddress: destinationAddress || booking.deliveryAddress,
      departureTime,
      arrivalTime,
      operator,
      driverName,
      driverPhone,
      alternatePhone,
      platformNumber,
      companyName,
    });

    const directLink = this.generateWhatsAppLink(recipientPhone, message);

    let status = 'SENT';
    let failureReason = null;
    let providerResponse = null;

    try {
      const provider = process.env.WHATSAPP_PROVIDER || 'MOCK';

      if (provider === 'TWILIO' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        // Twilio integration hook
        providerResponse = { provider: 'TWILIO', simulated: true };
      } else if (provider === 'META' && process.env.WHATSAPP_API_KEY) {
        // Meta WhatsApp Cloud API hook
        providerResponse = { provider: 'META', simulated: true };
      } else if (provider === 'WEBHOOK' && process.env.WHATSAPP_API_URL) {
        // Generic Webhook POST hook
        providerResponse = { provider: 'WEBHOOK', simulated: true };
      } else {
        // MOCK / Log Mode
        console.log(`[WhatsApp Notification Service - MOCK MODE]`);
        console.log(`To: ${recipientPhone}`);
        console.log(`Message:\n${message}`);
        providerResponse = { provider: 'MOCK', status: 'logged_to_console' };
      }

      // Persist Notification record to DB
      const notification = await Notification.create({
        bookingId: booking._id,
        orderId: booking.orderId,
        customerId: booking.customer,
        customerName: booking.customerName,
        type: 'WHATSAPP',
        recipientPhone,
        message,
        provider: process.env.WHATSAPP_PROVIDER || 'MOCK',
        status,
        failureReason,
        providerResponse,
        sentAt: new Date(),
      });

      return {
        success: true,
        notificationId: notification._id,
        status,
        message,
        directLink,
        recipientPhone,
      };
    } catch (error) {
      console.error('[WhatsApp Notification Error]:', error.message);
      status = 'FAILED';
      failureReason = error.message;

      // Log failure in DB
      try {
        await Notification.create({
          bookingId: booking._id,
          orderId: booking.orderId,
          customerId: booking.customer,
          customerName: booking.customerName,
          type: 'WHATSAPP',
          recipientPhone,
          message,
          provider: process.env.WHATSAPP_PROVIDER || 'MOCK',
          status: 'FAILED',
          failureReason,
          sentAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to log failed notification:', err.message);
      }

      return {
        success: false,
        status: 'FAILED',
        error: error.message,
        directLink,
        message,
      };
    }
  }
}

module.exports = new WhatsAppNotificationService();
