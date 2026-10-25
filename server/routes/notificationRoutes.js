const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const whatsappService = require('../services/whatsappService');
const { protect } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');

// All notification routes require authentication & tenant scoping
router.use(protect, tenantScope);

// @route   GET /api/notifications
// @desc    Get notification audit log (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { orderId, status, page = 1, limit = 20 } = req.query;
    const query = { ...req.tenantFilter };

    if (orderId) query.orderId = new RegExp(escapeRegex(orderId.trim()), 'i');
    if (status && status !== 'ALL') query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/notifications/resend/:bookingId
// @desc    Resend WhatsApp dispatch notification for a booking (Tenant Scoped)
// @access  Private
router.post('/resend/:bookingId', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      ...req.tenantFilter,
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const busDetails = booking.busDetails || {};
    const busNumber = busDetails.busNumber || 'Assigned Bus';
    const busName = busDetails.busName || busDetails.operator || '';
    const operator = busDetails.operator || busDetails.busName || '';
    const route = busDetails.route || booking.destination;
    const fromCity = busDetails.fromCity || booking.fromCity;
    const toCity = busDetails.toCity || booking.toCity;
    const originAddress = busDetails.originAddress || '';
    const destinationAddress = busDetails.destinationAddress || booking.deliveryAddress;
    const departureTime = busDetails.departureTime || 'Evening Dispatch';
    const arrivalTime = busDetails.arrivalTime || '';
    const platformNumber = busDetails.platformNumber || '';
    const driverName = busDetails.driverName || '';
    const driverPhone = busDetails.driverPhone || '';
    const alternatePhone = busDetails.alternatePhone || '';
    const dispatchNotes = busDetails.dispatchNotes || '';

    const notifyResults = await whatsappService.sendDispatchNotification({
      booking,
      tenantId: req.tenantId || booking.tenantId,
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
    });

    const anySent = Array.isArray(notifyResults) && notifyResults.some((r) => r.success);
    const allSent = Array.isArray(notifyResults) && notifyResults.every((r) => r.success);

    booking.notificationStatus = anySent ? 'SENT' : 'NOT_SENT';
    booking.notificationSentAt = new Date();
    booking.lastNotificationMessage = Array.isArray(notifyResults)
      ? notifyResults.map((r) => `[${r.recipientRole}] ${r.message}`).join('\n---\n')
      : (notifyResults.message || '');
    try {
      await booking.save();
    } catch {
      booking.notificationStatus = 'NOT_SENT';
      await booking.save();
    }

    res.json({
      success: anySent,
      message: anySent
        ? `WhatsApp dispatch notification triggered for ${notifyResults.length} recipient(s)`
        : `Failed to send notification: ${notifyResults[0]?.failureReason || 'Provider error'}`,
      directLink: notifyResults.directLink || notifyResults[0]?.directLink,
      notifications: notifyResults,
      data: notifyResults,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/notifications/preview-link
// @desc    Generate direct WhatsApp Web URL with pre-filled message for any booking
// @access  Private
router.post('/preview-link', protect, async (req, res, next) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: 'Phone and message required' });
    }

    const directLink = whatsappService.generateWhatsAppLink(phone, message);
    res.json({ success: true, directLink });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
