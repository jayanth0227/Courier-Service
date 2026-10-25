const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const BusDispatch = require('../models/BusDispatch');
const whatsappService = require('../services/whatsappService');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');
const liveEmitter = require('../services/liveEmitter');

// All dispatch routes require authentication, tenant scoping, and admin role (staff restricted)
router.use(protect, tenantScope, authorize('admin', 'superadmin'));

// @route   GET /api/dispatch/pending
// @desc    Get all parcels waiting for bus dispatch (Tenant Scoped)
// @access  Private
router.get('/pending', async (req, res, next) => {
  try {
    const { destination, parcelType, search } = req.query;
    const query = {
      ...req.tenantFilter,
      status: { $in: ['BOOKED', 'WAITING_FOR_BUS'] },
    };

    if (destination && destination !== 'ALL') {
      query.destination = new RegExp(escapeRegex(destination), 'i');
    }

    if (parcelType && parcelType !== 'ALL') {
      query.parcelType = parcelType;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { orderId: searchRegex },
          { customerName: searchRegex },
          { customerPhone: searchRegex },
          { destination: searchRegex },
        ],
      });
    }

    const pendingBookings = await Booking.find(query)
      .populate('customer', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 }) // First in, first out for dispatch
      .lean();

    res.json({
      success: true,
      count: pendingBookings.length,
      data: pendingBookings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/dispatch/assign
// @desc    Assign parcel(s) to a bus, update status to DISPATCHED, and send WhatsApp notification (Tenant Scoped)
// @access  Private
router.post('/assign', async (req, res, next) => {
  try {
    const {
      bookingIds, // Array of MongoDB IDs or single ID
      busNumber,
      busName,
      operator,
      fromCity,
      toCity,
      originAddress,
      destinationAddress,
      route,
      driverName,
      driverPhone,
      alternatePhone,
      departureTime,
      arrivalTime,
      platformNumber,
      dispatchNotes,
    } = req.body;

    if (!busNumber || !busNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bus registration number is required',
      });
    }

    const finalDepartureTime = departureTime && departureTime.trim()
      ? departureTime.trim()
      : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const ids = Array.isArray(bookingIds) ? bookingIds : [bookingIds];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one parcel to dispatch',
      });
    }

    const bookings = await Booking.find({
      _id: { $in: ids },
      ...req.tenantFilter,
    });

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid bookings found in your organization to assign',
      });
    }

    const dispatchCode = `DSP-${Date.now().toString().slice(-6)}`;
    const orderIds = [];
    let totalParcels = 0;
    let totalWeight = 0;
    const notificationResults = [];

    const now = new Date();

    const finalBusNumber = busNumber.trim().toUpperCase();
    const finalBusName = (busName || operator || '').trim();
    const finalOperator = (operator || busName || 'Express Bus').trim();
    const finalFromCity = (fromCity || (bookings[0] ? bookings[0].fromCity : '') || 'Origin Terminal').trim();
    const finalToCity = (toCity || (bookings[0] ? bookings[0].toCity || bookings[0].destination : '') || 'Destination').trim();
    const finalOriginAddress = (originAddress || '').trim();
    const finalDestinationAddress = (destinationAddress || (bookings[0] ? bookings[0].deliveryAddress : '') || '').trim();
    const finalRoute = (route || `${finalFromCity} → ${finalToCity}`).trim();
    const finalDriverName = (driverName || '').trim();
    const finalDriverPhone = (driverPhone || '').trim();
    const finalAlternatePhone = (alternatePhone || '').trim();
    const finalArrivalTime = (arrivalTime || '').trim();
    const finalPlatformNumber = (platformNumber || '').trim();
    const finalDispatchNotes = (dispatchNotes || '').trim();

    for (const booking of bookings) {
      booking.status = 'DISPATCHED';
      booking.busDetails = {
        busNumber: finalBusNumber,
        busName: finalBusName,
        operator: finalOperator,
        route: finalRoute,
        fromCity: finalFromCity,
        toCity: finalToCity,
        originAddress: finalOriginAddress,
        destinationAddress: finalDestinationAddress || booking.deliveryAddress,
        driverName: finalDriverName,
        driverPhone: finalDriverPhone,
        alternatePhone: finalAlternatePhone,
        departureTime: finalDepartureTime,
        arrivalTime: finalArrivalTime,
        platformNumber: finalPlatformNumber,
        dispatchNotes: finalDispatchNotes,
        dispatchedAt: now,
        dispatchedBy: req.user._id,
      };

      booking.timeline.push({
        status: 'DISPATCHED',
        timestamp: now,
        description: `Assigned to Bus ${finalBusNumber} (${finalRoute})${finalDriverName ? ` | Driver: ${finalDriverName} (${finalDriverPhone})` : ''} at ${finalDepartureTime}`,
        updatedBy: req.user.name,
      });

      orderIds.push(booking.orderId);
      totalParcels += booking.quantity || 1;
      totalWeight += booking.weight || 0;

      // Trigger WhatsApp Notification for BOTH Sender & Receiver (non-blocking)
      let notifyResults = [];
      try {
        notifyResults = await whatsappService.sendDispatchNotification({
          booking,
          tenantId: req.tenantId || booking.tenantId,
          busNumber: finalBusNumber,
          busName: finalBusName,
          route: finalRoute,
          fromCity: finalFromCity,
          toCity: finalToCity,
          originAddress: finalOriginAddress,
          destinationAddress: finalDestinationAddress || booking.deliveryAddress,
          departureTime: finalDepartureTime,
          arrivalTime: finalArrivalTime,
          operator: finalOperator,
          driverName: finalDriverName,
          driverPhone: finalDriverPhone,
          alternatePhone: finalAlternatePhone,
          platformNumber: finalPlatformNumber,
          dispatchNotes: finalDispatchNotes,
        });
      } catch (notifyErr) {
        console.warn(`[Dispatch] WhatsApp notification warning for ${booking.orderId}:`, notifyErr.message);
      }

      const anySent = Array.isArray(notifyResults) && notifyResults.some((r) => r.success);
      const allSent = Array.isArray(notifyResults) && notifyResults.length > 0 && notifyResults.every((r) => r.success);

      // If at least one recipient received WhatsApp message, mark SENT. If neither, mark NOT_SENT.
      booking.notificationStatus = anySent ? 'SENT' : (allSent ? 'SENT' : 'NOT_SENT');
      booking.notificationSentAt = now;
      booking.lastNotificationMessage = Array.isArray(notifyResults) && notifyResults.length > 0
        ? notifyResults.map((r) => `[${r.recipientRole}] ${r.message}`).join('\n---\n')
        : (booking.lastNotificationMessage || '');

      try {
        await booking.save();
      } catch (saveErr) {
        console.warn(`[Dispatch] Fallback saving booking ${booking.orderId}:`, saveErr.message);
        booking.notificationStatus = 'NOT_SENT';
        await booking.save();
      }

      if (Array.isArray(notifyResults)) {
        notifyResults.forEach((nr) => {
          notificationResults.push({
            orderId: booking.orderId,
            recipientRole: nr.recipientRole,
            recipientLabel: nr.recipientLabel,
            customerName: nr.recipientName,
            phone: nr.phone,
            notification: nr,
          });
        });
      } else {
        notificationResults.push({
          orderId: booking.orderId,
          customerName: booking.customerName,
          phone: booking.customerWhatsapp || booking.customerPhone,
          notification: notifyResults,
        });
      }
    }

    // Create BusDispatch manifest record (Scoped to this tenant)
    const busDispatch = await BusDispatch.create({
      tenantId: req.tenantId,
      dispatchManifestNumber: dispatchCode,
      busNumber: finalBusNumber,
      busName: finalBusName,
      operator: finalOperator,
      route: finalRoute,
      fromCity: finalFromCity,
      toCity: finalToCity,
      originAddress: finalOriginAddress,
      destinationAddress: finalDestinationAddress,
      driverName: finalDriverName,
      driverPhone: finalDriverPhone,
      alternatePhone: finalAlternatePhone,
      departureTime: finalDepartureTime,
      arrivalTime: finalArrivalTime,
      platformNumber: finalPlatformNumber,
      bookingIds: bookings.map((b) => b._id),
      orderIds,
      totalParcels,
      totalWeight,
      dispatchNotes: finalDispatchNotes,
      dispatchedBy: req.user._id,
      dispatchedAt: now,
      status: 'DISPATCHED',
    });

    // Real-time broadcast: dispatch list updated and bookings updated
    liveEmitter.broadcast(req.tenantId, 'DISPATCH_ASSIGNED', { busDispatch });
    bookings.forEach((b) => {
      liveEmitter.broadcast(req.tenantId, 'BOOKING_UPDATED', b);
    });

    res.json({
      success: true,
      message: `Successfully assigned ${bookings.length} parcel(s) to Bus ${finalBusNumber} and triggered customer WhatsApp notifications`,
      dispatchManifest: busDispatch,
      notifications: notificationResults,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/dispatch/history
// @desc    Get past bus dispatch manifests and logs (Tenant Scoped)
// @access  Private
router.get('/history', async (req, res, next) => {
  try {
    const { busNumber, startDate, endDate, page = 1, limit = 15 } = req.query;
    const query = { ...req.tenantFilter };

    if (busNumber) {
      query.busNumber = new RegExp(busNumber.trim(), 'i');
    }

    if (startDate || endDate) {
      query.dispatchedAt = {};
      if (startDate) query.dispatchedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.dispatchedAt.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [dispatches, total] = await Promise.all([
      BusDispatch.find(query)
        .populate('dispatchedBy', 'name username')
        .populate('bookingIds', 'orderId customerName parcelType destination amount status')
        .sort({ dispatchedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BusDispatch.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: dispatches,
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

module.exports = router;
