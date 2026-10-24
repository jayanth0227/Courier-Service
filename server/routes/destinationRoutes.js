const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');

// All destination routes require authentication & tenant scoping
router.use(protect, tenantScope);

// Helper to sync routes to Setting model for specific tenant
const syncSettingRoutes = async (tenantId) => {
  if (!tenantId) return;
  try {
    const destinations = await Destination.find({ tenantId, active: true }).select('route');
    const routes = destinations.map((d) => d.route);
    let settings = await Setting.findOne({ tenantId });
    if (settings && routes.length > 0) {
      settings.standardRoutes = routes;
      await settings.save();
    }
  } catch (err) {
    console.error('Error syncing standardRoutes to Setting:', err.message);
  }
};

// @route   GET /api/destinations
// @desc    Get all destination routes and delivery details (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const destinations = await Destination.find(req.tenantFilter).sort({ createdAt: 1 });
    res.json({
      success: true,
      data: destinations,
      count: destinations.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/destinations/:id
// @desc    Get single destination by ID or Route Name (Tenant Scoped)
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let destination;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      destination = await Destination.findOne({ _id: id, ...req.tenantFilter });
    } else {
      destination = await Destination.findOne({ route: id, ...req.tenantFilter });
    }

    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found in your organization' });
    }

    res.json({ success: true, data: destination });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/destinations
// @desc    Add new destination route with delivery details (Tenant Scoped)
// @access  Private (Admin only)
router.post('/', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const {
      route,
      fromCity,
      toCity,
      deliveryAddress,
      collectionPoints,
      receiverName,
      receiverPhone,
      standardCharge,
      dispatchSchedule,
      notes,
    } = req.body;

    if (!route || !route.trim()) {
      return res.status(400).json({ success: false, message: 'Destination route name is required' });
    }

    const trimmedRoute = route.trim();

    // Check if route already exists under this tenant
    let existing = await Destination.findOne({
      tenantId: req.tenantId,
      route: trimmedRoute,
    });

    if (existing) {
      if (deliveryAddress !== undefined) existing.deliveryAddress = deliveryAddress.trim();
      if (fromCity !== undefined) existing.fromCity = fromCity.trim();
      if (toCity !== undefined) existing.toCity = toCity.trim();
      if (collectionPoints !== undefined) {
        existing.collectionPoints = Array.isArray(collectionPoints)
          ? collectionPoints.map((c) => c.trim()).filter(Boolean)
          : [collectionPoints.trim()];
      }
      if (receiverName !== undefined) existing.receiverName = receiverName.trim();
      if (receiverPhone !== undefined) existing.receiverPhone = receiverPhone.trim();
      if (standardCharge !== undefined) existing.standardCharge = Number(standardCharge) || 0;
      if (dispatchSchedule !== undefined) existing.dispatchSchedule = dispatchSchedule.trim();
      if (notes !== undefined) existing.notes = notes.trim();
      existing.active = true;

      await existing.save();
      await syncSettingRoutes(req.tenantId);

      return res.json({
        success: true,
        message: `Destination '${trimmedRoute}' updated successfully in database`,
        data: existing,
      });
    }

    let collPoints = [];
    if (Array.isArray(collectionPoints)) {
      collPoints = collectionPoints.map((c) => c.trim()).filter(Boolean);
    } else if (typeof collectionPoints === 'string' && collectionPoints.trim()) {
      collPoints = collectionPoints.split(',').map((c) => c.trim()).filter(Boolean);
    }

    if (deliveryAddress && deliveryAddress.trim() && !collPoints.includes(deliveryAddress.trim())) {
      collPoints.unshift(deliveryAddress.trim());
    }

    let parsedToCity = toCity;
    if (!parsedToCity && trimmedRoute.includes('→')) {
      parsedToCity = trimmedRoute.split('→')[1].trim();
    } else if (!parsedToCity && trimmedRoute.includes('->')) {
      parsedToCity = trimmedRoute.split('->')[1].trim();
    }

    const newDestination = await Destination.create({
      tenantId: req.tenantId,
      route: trimmedRoute,
      fromCity: fromCity ? fromCity.trim() : (req.user?.branch || ''),
      toCity: parsedToCity || trimmedRoute,
      deliveryAddress: deliveryAddress ? deliveryAddress.trim() : '',
      collectionPoints: collPoints,
      receiverName: receiverName ? receiverName.trim() : '',
      receiverPhone: receiverPhone ? receiverPhone.trim() : '',
      standardCharge: Number(standardCharge) || 0,
      dispatchSchedule: dispatchSchedule ? dispatchSchedule.trim() : '',
      notes: notes ? notes.trim() : '',
      active: true,
    });

    await syncSettingRoutes(req.tenantId);

    res.status(201).json({
      success: true,
      message: `New Destination '${trimmedRoute}' saved to database successfully`,
      data: newDestination,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/destinations/:id
// @desc    Update destination & delivery details in database (Tenant Scoped)
// @access  Private (Admin only)
router.put('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const destination = await Destination.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found in your organization' });
    }

    const {
      route,
      fromCity,
      toCity,
      deliveryAddress,
      collectionPoints,
      receiverName,
      receiverPhone,
      standardCharge,
      dispatchSchedule,
      active,
      notes,
    } = req.body;

    if (route) destination.route = route.trim();
    if (fromCity !== undefined) destination.fromCity = fromCity.trim();
    if (toCity !== undefined) destination.toCity = toCity.trim();
    if (deliveryAddress !== undefined) destination.deliveryAddress = deliveryAddress.trim();
    if (collectionPoints !== undefined) {
      destination.collectionPoints = Array.isArray(collectionPoints)
        ? collectionPoints.map((c) => c.trim()).filter(Boolean)
        : collectionPoints.split(',').map((c) => c.trim()).filter(Boolean);
    }
    if (receiverName !== undefined) destination.receiverName = receiverName.trim();
    if (receiverPhone !== undefined) destination.receiverPhone = receiverPhone.trim();
    if (standardCharge !== undefined) destination.standardCharge = Number(standardCharge) || 0;
    if (dispatchSchedule !== undefined) destination.dispatchSchedule = dispatchSchedule.trim();
    if (active !== undefined) destination.active = Boolean(active);
    if (notes !== undefined) destination.notes = notes.trim();

    await destination.save();
    await syncSettingRoutes(req.tenantId);

    res.json({
      success: true,
      message: `Destination '${destination.route}' updated successfully in database`,
      data: destination,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/destinations/:id
// @desc    Delete destination from database (Tenant Scoped)
// @access  Private (Admin)
router.delete('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const destination = await Destination.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Destination not found in your organization' });
    }

    const routeName = destination.route;
    await Destination.deleteOne({ _id: req.params.id, ...req.tenantFilter });
    await syncSettingRoutes(req.tenantId);

    res.json({
      success: true,
      message: `Destination '${routeName}' deleted successfully from database`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
