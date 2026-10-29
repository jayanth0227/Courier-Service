const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Destination = require('../models/Destination');
const City = require('../models/City');
const Setting = require('../models/Setting');
const { generateUniqueOrderId } = require('../services/orderIdService');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');
const liveEmitter = require('../services/liveEmitter');
const whatsappService = require('../services/whatsappService');

// All booking routes require authentication & tenant scoping
router.use(protect, tenantScope);

// @route   POST /api/bookings
// @desc    Create a new parcel booking with automatic 6-digit Order ID (Tenant Scoped)
// @access  Private (Staff/Admin)
router.post('/', async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerWhatsapp,
      receiverName,
      receiverPhone,
      fromCity,
      toCity,
      deliveryAddress,
      destination,
      parcelType,
      quantity,
      weight,
      notes,
      amount,
      items,
      paymentStatus,
    } = req.body;

    // Process multi-parcel items if provided
    let processedItems = [];
    let computedQuantity = Number(quantity) || 1;
    let computedWeight = Number(weight) || 0;
    let computedAmount = amount !== undefined ? Number(amount) : 0;
    let computedParcelType = parcelType || 'Box';
    let computedNotes = notes ? notes.trim() : '';

    if (Array.isArray(items) && items.length > 0) {
      processedItems = items.map((itm) => ({
        parcelType: (itm.parcelType || 'Box').trim(),
        quantity: Math.max(1, Number(itm.quantity) || 1),
        weight: Number(itm.weight) || 0,
        charge: Number(itm.charge) || 0,
        notes: (itm.notes || '').trim(),
      }));

      computedQuantity = processedItems.reduce((acc, i) => acc + i.quantity, 0);
      computedWeight = processedItems.reduce((acc, i) => acc + i.weight, 0);
      computedAmount = processedItems.reduce((acc, i) => acc + i.charge, 0);

      if (processedItems.length === 1) {
        computedParcelType = processedItems[0].parcelType;
        if (processedItems[0].notes) computedNotes = processedItems[0].notes;
      } else {
        computedParcelType = processedItems.map((i) => `${i.parcelType} (${i.quantity})`).join(', ');
        const notesStr = processedItems.map((i) => i.notes).filter(Boolean).join('; ');
        if (notesStr) computedNotes = notesStr;
      }
    } else {
      processedItems = [
        {
          parcelType: computedParcelType,
          quantity: computedQuantity,
          weight: computedWeight,
          charge: computedAmount,
          notes: computedNotes,
        },
      ];
    }

    let finalFromCity = (fromCity || req.user?.branch || '').trim();
    if (!finalFromCity && req.tenantId) {
      const tenantSetting = await Setting.findOne({ tenantId: req.tenantId });
      if (tenantSetting?.fromCity) {
        finalFromCity = tenantSetting.fromCity.trim();
      }
    }
    let finalToCity = (toCity ? toCity.trim() : (destination ? destination.replace(/.*→/, '').replace(/.*->/, '').trim() : '')).trim();
    if (!finalToCity && destination) {
      finalToCity = destination.trim();
    }
    const resolvedDestination = finalFromCity && finalToCity
      ? `${finalFromCity} → ${finalToCity}`
      : destination?.trim() || finalToCity || finalFromCity || '';

    if (!customerName || !customerPhone || !deliveryAddress || (!resolvedDestination && !finalToCity) || computedAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, mobile number, delivery address, destination city, and valid parcel items are required',
      });
    }

    // Generate unique 6-digit Order ID
    const orderId = await generateUniqueOrderId();

    // Find or create customer (Scoped to this tenant)
    let customer = await Customer.findOne({
      tenantId: req.tenantId,
      phone: customerPhone.trim(),
    });

    if (!customer) {
      customer = await Customer.create({
        tenantId: req.tenantId,
        name: customerName.trim(),
        phone: customerPhone.trim(),
        whatsapp: customerWhatsapp ? customerWhatsapp.trim() : customerPhone.trim(),
        address: deliveryAddress.trim(),
        totalBookings: 1,
        totalSpent: Number(amount) || 0,
        lastBookingDate: new Date(),
      });
    } else {
      customer.totalBookings += 1;
      customer.totalSpent += Number(amount) || 0;
      customer.lastBookingDate = new Date();
      if (customerWhatsapp) customer.whatsapp = customerWhatsapp.trim();
      await customer.save();
    }

    // Automatically save From City, To City, and Delivery Location for this tenant
    try {
      if (finalFromCity) {
        let fromObj = await City.findOne({
          tenantId: req.tenantId,
          name: new RegExp(`^${escapeRegex(finalFromCity)}$`, 'i'),
        });
        if (!fromObj) {
          await City.create({
            tenantId: req.tenantId,
            name: finalFromCity,
            deliveryAddress: '',
            locations: [],
            active: true,
          });
        }
      }

      if (finalToCity) {
        const trimmedAddr = deliveryAddress ? deliveryAddress.trim() : '';
        let toObj = await City.findOne({
          tenantId: req.tenantId,
          name: new RegExp(`^${escapeRegex(finalToCity)}$`, 'i'),
        });
        if (!toObj) {
          await City.create({
            tenantId: req.tenantId,
            name: finalToCity,
            deliveryAddress: trimmedAddr,
            locations: trimmedAddr ? [trimmedAddr] : [],
            active: true,
          });
        } else if (trimmedAddr && !toObj.locations.includes(trimmedAddr)) {
          toObj.locations.push(trimmedAddr);
          if (!toObj.deliveryAddress) toObj.deliveryAddress = trimmedAddr;
          await toObj.save();
        }
      }
    } catch (persistErr) {
      console.error('Error auto-persisting city to DynamoDB:', persistErr.message);
    }

    const booking = await Booking.create({
      tenantId: req.tenantId,
      orderId,
      customer: customer._id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerWhatsapp: customerWhatsapp ? customerWhatsapp.trim() : customerPhone.trim(),
      receiverName: receiverName ? receiverName.trim() : '',
      receiverPhone: receiverPhone ? receiverPhone.trim() : '',
      fromCity: finalFromCity,
      fromAddress: (req.body.fromAddress ? req.body.fromAddress.trim() : finalFromCity),
      toCity: finalToCity,
      deliveryAddress: deliveryAddress.trim(),
      destination: resolvedDestination,
      parcelType: computedParcelType,
      quantity: computedQuantity,
      weight: computedWeight,
      notes: computedNotes,
      items: processedItems,
      amount: computedAmount,
      paymentStatus: paymentStatus || 'PAID',
      status: 'WAITING_FOR_BUS',
      timeline: [
        {
          status: 'BOOKED',
          timestamp: new Date(),
          description: `Parcel received at ${req.user.branch || 'office counter'} by ${req.user.name}`,
          updatedBy: req.user.name,
        },
        {
          status: 'WAITING_FOR_BUS',
          timestamp: new Date(),
          description: 'Ready for evening bus assignment',
          updatedBy: req.user.name,
        },
      ],
      createdBy: req.user._id,
      bookedByName: req.user.name || req.user.username || 'Staff User',
      bookedByRole: req.user.role || 'staff',
      branch: req.user.branch || 'Main Office',
    });

    // Real-time broadcast to all connected portal windows for this tenant
    liveEmitter.broadcast(req.tenantId, 'BOOKING_CREATED', booking);

    // Auto-send WhatsApp booking confirmation (non-blocking — don't delay response)
    whatsappService.sendBookingConfirmation(booking, req.tenantId).catch((err) => {
      console.warn('[WhatsApp Auto-Send] Booking confirmation failed (non-critical):', err.message);
    });

    res.status(201).json({
      success: true,
      message: `Booking created successfully with Order ID ${orderId}`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/bookings
// @desc    Get all bookings with filtering, search, and pagination (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      status,
      destination,
      parcelType,
      bookedByRole,
      startDate,
      endDate,
      page = 1,
      limit = 15,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { ...req.tenantFilter };

    // Staff access restriction: Staff can ONLY see their own bookings in the bookings list
    if (req.user && req.user.role === 'staff') {
      query.createdBy = req.user._id;
    }
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Filter by destination
    if (destination && destination !== 'ALL') {
      query.destination = new RegExp(escapeRegex(destination), 'i');
    }

    // Filter by parcel type
    if (parcelType && parcelType !== 'ALL') {
      query.parcelType = parcelType;
    }

    // Filter by who booked the order (admin vs staff)
    if (bookedByRole && bookedByRole !== 'ALL') {
      query.bookedByRole = bookedByRole.toLowerCase();
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const cleanStart = String(startDate).split('T')[0].trim();
        const parts = cleanStart.split('-');
        if (parts.length === 3) {
          query.createdAt.$gte = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
        } else {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          query.createdAt.$gte = s;
        }
      }
      if (endDate) {
        const cleanEnd = String(endDate).split('T')[0].trim();
        const parts = cleanEnd.split('-');
        if (parts.length === 3) {
          query.createdAt.$lte = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        } else {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      } else if (startDate && !endDate) {
        // If single date selected without an explicit end date, filter the entire day
        const cleanStart = String(startDate).split('T')[0].trim();
        const parts = cleanStart.split('-');
        if (parts.length === 3) {
          query.createdAt.$lte = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        } else {
          const end = new Date(startDate);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }
    }

    // Optimized search query: direct index path for Order IDs & phone numbers, general text for names
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const upper = cleanSearch.toUpperCase();
      if (/^(LR)?\d{4,6}$/i.test(cleanSearch)) {
        query.orderId = new RegExp(`^${escapeRegex(upper)}`);
      } else if (/^\d{8,12}$/.test(cleanSearch)) {
        query.$or = [
          { customerPhone: cleanSearch },
          { receiverPhone: cleanSearch },
        ];
      } else {
        const searchRegex = new RegExp(escapeRegex(cleanSearch), 'i');
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { orderId: searchRegex },
            { customerName: searchRegex },
            { customerPhone: searchRegex },
            { 'busDetails.busNumber': searchRegex },
            { receiverName: searchRegex },
            { bookedByName: searchRegex },
            { bookedByRole: searchRegex },
            { branch: searchRegex },
          ],
        });
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .select('-timeline')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: bookings,
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

// @route   GET /api/bookings/:id
// @desc    Get single booking by ID or Order ID (LR**** or 6-digit) (Tenant Scoped)
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const rawId = req.params.id.trim().replace(/^#/, '');
    const isOrderId = /^(LR\d{4}|\d{6})$/i.test(rawId);
    const query = isOrderId
      ? { orderId: rawId.toUpperCase(), ...req.tenantFilter }
      : { _id: req.params.id, ...req.tenantFilter };

    const booking = await Booking.findOne(query)
      .populate('customer')
      .populate('createdBy', 'name username role branch')
      .populate('busDetails.dispatchedBy', 'name username');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found in your organization' });
    }

    // Role-based authorization & BOLA/IDOR check: Staff can only view their own bookings
    if (req.user && req.user.role === 'staff' && booking.createdBy) {
      const creatorId = booking.createdBy._id ? booking.createdBy._id.toString() : booking.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN_RECORD',
          message: 'Access denied: Staff are only authorized to access bookings created by their own account.',
        });
      }
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking details (Tenant Scoped)
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found in your organization' });
    }

    // Role-based authorization & BOLA/IDOR check: Staff can only modify their own bookings
    if (req.user && req.user.role === 'staff' && booking.createdBy) {
      const creatorId = booking.createdBy._id ? booking.createdBy._id.toString() : booking.createdBy.toString();
      if (creatorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN_RECORD',
          message: 'Access denied: Staff are only authorized to modify bookings created by their own account.',
        });
      }
    }

    const {
      customerName,
      customerPhone,
      customerWhatsapp,
      receiverName,
      receiverPhone,
      fromCity,
      toCity,
      deliveryAddress,
      destination,
      parcelType,
      quantity,
      weight,
      items,
      notes,
      paymentStatus,
    } = req.body;

    if (customerName) booking.customerName = customerName.trim();
    if (customerPhone) booking.customerPhone = customerPhone.trim();
    if (customerWhatsapp !== undefined) booking.customerWhatsapp = customerWhatsapp.trim();
    if (receiverName !== undefined) booking.receiverName = receiverName.trim();
    if (receiverPhone !== undefined) booking.receiverPhone = receiverPhone.trim();
    if (fromCity !== undefined) booking.fromCity = fromCity.trim();
    if (toCity !== undefined) booking.toCity = toCity.trim();
    if (deliveryAddress) booking.deliveryAddress = deliveryAddress.trim();
    if (destination) booking.destination = destination.trim();
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (notes !== undefined) booking.notes = notes.trim();

    // Handle items manifest update
    if (Array.isArray(items) && items.length > 0) {
      booking.items = items.map((it) => ({
        parcelType: (it.parcelType || it.category || 'Box').trim(),
        quantity: Math.max(1, Number(it.quantity) || 1),
        weight: Math.max(0, Number(it.weight || it.unitWeight) || 0),
        charge: Number(it.charge || it.totalPrice) || 0,
        notes: (it.notes || '').trim(),
      }));

      // Update computed total quantity and weight
      booking.quantity = booking.items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      booking.weight = booking.items.reduce(
        (sum, it) => sum + (Number(it.weight) || 0) * (Number(it.quantity) || 1),
        0
      );
      booking.parcelType =
        booking.items
          .map((it) => `${it.parcelType}${it.quantity > 1 ? ` (${it.quantity})` : ''}`)
          .join(', ') || booking.parcelType;
    } else {
      if (parcelType) booking.parcelType = parcelType;
      if (quantity !== undefined) booking.quantity = Number(quantity);
      if (weight !== undefined) booking.weight = Number(weight);
    }

    // Rate / Amount is locked and preserved per business policy

    await booking.save();

    // Broadcast live update
    liveEmitter.broadcast(req.tenantId, 'BOOKING_UPDATED', booking);

    res.json({
      success: true,
      message: 'Booking details updated successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/bookings/:id/status
// @desc    Quick status update (DELIVERED, CANCELLED, etc.) (Tenant Scoped)
// @access  Private
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, cancellationReason, deliveryNotes } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found in your organization' });
    }

    if (!['BOOKED', 'WAITING_FOR_BUS', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (status === 'CANCELLED') {
      // Role-based authorization & BOLA check: Staff can only cancel their own bookings
      if (req.user && req.user.role === 'staff' && booking.createdBy) {
        const creatorId = booking.createdBy._id ? booking.createdBy._id.toString() : booking.createdBy.toString();
        if (creatorId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_RECORD',
            message: 'Access denied: Staff can only cancel bookings created by their own account.',
          });
        }
      }

      if (booking.status === 'DISPATCHED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a consignment that has already been dispatched on a bus.',
        });
      }
      if (booking.status === 'DELIVERED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a consignment that has already been delivered.',
        });
      }
    }

    booking.status = status;

    if (status === 'DELIVERED') {
      booking.deliveredAt = new Date();
      booking.timeline.push({
        status: 'DELIVERED',
        timestamp: new Date(),
        description: deliveryNotes || 'Parcel handed over to recipient / destination office',
        updatedBy: req.user.name,
      });
    } else if (status === 'CANCELLED') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = cancellationReason || 'Cancelled by staff';
      booking.timeline.push({
        status: 'CANCELLED',
        timestamp: new Date(),
        description: `Cancelled: ${cancellationReason || 'Cancelled by staff'}`,
        updatedBy: req.user.name,
      });
    } else {
      booking.timeline.push({
        status,
        timestamp: new Date(),
        description: `Status updated to ${status}`,
        updatedBy: req.user.name,
      });
    }

    await booking.save();

    // Broadcast live status update (waiting -> dispatched -> delivered -> cancelled)
    liveEmitter.broadcast(req.tenantId, 'BOOKING_UPDATED', booking);

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Cancel/Delete booking (Tenant Scoped, Admin only)
// @access  Private (Admin only)
router.delete('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found in your organization' });
    }

    await Booking.deleteOne({ _id: req.params.id, ...req.tenantFilter });

    // Broadcast live deletion
    liveEmitter.broadcast(req.tenantId, 'BOOKING_DELETED', { _id: req.params.id, orderId: booking.orderId });

    res.json({
      success: true,
      message: `Booking #${booking.orderId} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
