const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Setting = require('../models/Setting');

// @route   GET /api/tracking/:orderId
// @desc    Public parcel tracking by LR**** or 6-digit Order ID (Resolves with tenant company branding)
// @access  Public
router.get('/:orderId', async (req, res, next) => {
  try {
    const rawOrderId = req.params.orderId.trim().replace(/^#/, '').toUpperCase();

    if (!/^(LR\d{4}|\d{6})$/i.test(rawOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Order ID (e.g., LR4821 or 6-digit number)',
      });
    }

    const booking = await Booking.findOne({ orderId: rawOrderId })
      .populate('tenantId', 'companyName contactPhone contactEmail address slug')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No parcel found with Order ID #${rawOrderId}. Please check the number or contact office.`,
      });
    }

    // Lookup tenant settings for custom branding
    let companySettings = null;
    if (booking.tenantId) {
      companySettings = await Setting.findOne({ tenantId: booking.tenantId._id || booking.tenantId }).lean();
    }

    // Mask phone for privacy in public tracking
    const maskPhone = (phone) => {
      if (!phone || phone.length < 5) return '***';
      return `${phone.slice(0, 2)}****${phone.slice(-3)}`;
    };

    // Construct customer safe public response
    const trackingData = {
      orderId: booking.orderId,
      status: booking.status,
      parcelType: booking.parcelType,
      quantity: booking.quantity,
      weight: booking.weight,
      items: booking.items || [],
      destination: booking.destination,
      deliveryAddress: booking.deliveryAddress || '',
      fromCity: booking.fromCity || '',
      toCity: booking.toCity || '',
      customerName: booking.customerName,
      customerPhoneMasked: maskPhone(booking.customerPhone),
      receiverName: booking.receiverName || '',
      receiverPhoneMasked: maskPhone(booking.receiverPhone),
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      busDetails: booking.busDetails
        ? {
            busNumber: booking.busDetails.busNumber || null,
            busName: booking.busDetails.busName || null,
            route: booking.busDetails.route || null,
            operator: booking.busDetails.operator || null,
            originAddress: booking.busDetails.originAddress || null,
            destinationAddress: booking.busDetails.destinationAddress || null,
            driverName: booking.busDetails.driverName || null,
            driverPhone: booking.busDetails.driverPhone || null,
            platformNumber: booking.busDetails.platformNumber || null,
            departureTime: booking.busDetails.departureTime || null,
            arrivalTime: booking.busDetails.arrivalTime || null,
            dispatchedAt: booking.busDetails.dispatchedAt || null,
          }
        : null,
      timeline: booking.timeline || [],
      deliveredAt: booking.deliveredAt || null,
      branch: booking.branch || 'Main Counter',
      company: companySettings
        ? {
            name: companySettings.companyName,
            phone: companySettings.companyPhone,
            logoUrl: companySettings.logoUrl,
            address: companySettings.companyAddress,
          }
        : booking.tenantId
        ? {
            name: booking.tenantId.companyName,
            phone: booking.tenantId.contactPhone,
            logoUrl: '/logo.png',
            address: booking.tenantId.address,
          }
        : null,
    };

    res.json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
