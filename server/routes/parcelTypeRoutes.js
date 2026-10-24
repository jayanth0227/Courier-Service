const express = require('express');
const router = express.Router();
const ParcelType = require('../models/ParcelType');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');

// All parcel type routes require authentication & tenant scoping
router.use(protect, tenantScope);

// @route   GET /api/parcel-types
// @desc    Get all parcel types stored in MongoDB for this tenant (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const parcelTypes = await ParcelType.find({ ...req.tenantFilter, active: true }).sort({ name: 1 });

    res.json({
      success: true,
      data: parcelTypes,
      count: parcelTypes.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/parcel-types/:id
// @desc    Get single parcel type by ID or name (Tenant Scoped)
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let parcelType;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      parcelType = await ParcelType.findOne({ _id: id, ...req.tenantFilter });
    } else {
      parcelType = await ParcelType.findOne({ name: new RegExp(`^${id}$`, 'i'), ...req.tenantFilter });
    }

    if (!parcelType) {
      return res.status(404).json({ success: false, message: 'Parcel type not found in your organization' });
    }

    res.json({ success: true, data: parcelType });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/parcel-types
// @desc    Create a new parcel type in MongoDB (Tenant Scoped)
// @access  Private (Admin only)
router.post('/', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { name, defaultCharge, defaultWeight, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Parcel type name is required' });
    }

    const trimmedName = name.trim();

    let existing = await ParcelType.findOne({
      tenantId: req.tenantId,
      name: new RegExp(`^${trimmedName}$`, 'i'),
    });

    if (existing) {
      existing.active = true;
      if (defaultCharge !== undefined) existing.defaultCharge = Number(defaultCharge) || 0;
      if (defaultWeight !== undefined) existing.defaultWeight = Number(defaultWeight) || 0;
      if (description !== undefined) existing.description = description.trim();
      await existing.save();

      return res.json({
        success: true,
        message: `Parcel type '${existing.name}' updated in database`,
        data: existing,
      });
    }

    const newParcelType = await ParcelType.create({
      tenantId: req.tenantId,
      name: trimmedName,
      defaultCharge: Number(defaultCharge) || 0,
      defaultWeight: Number(defaultWeight) || 0,
      description: description ? description.trim() : '',
      active: true,
    });

    res.status(201).json({
      success: true,
      message: `Parcel type '${trimmedName}' saved to database successfully`,
      data: newParcelType,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/parcel-types/:id
// @desc    Update parcel type details in MongoDB (Tenant Scoped)
// @access  Private (Admin)
router.put('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const parcelType = await ParcelType.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!parcelType) {
      return res.status(404).json({ success: false, message: 'Parcel type not found in your organization' });
    }

    const { name, defaultCharge, defaultWeight, description, active } = req.body;

    if (name) parcelType.name = name.trim();
    if (defaultCharge !== undefined) parcelType.defaultCharge = Number(defaultCharge) || 0;
    if (defaultWeight !== undefined) parcelType.defaultWeight = Number(defaultWeight) || 0;
    if (description !== undefined) parcelType.description = description.trim();
    if (active !== undefined) parcelType.active = Boolean(active);

    await parcelType.save();

    res.json({
      success: true,
      message: `Parcel type '${parcelType.name}' updated successfully in database`,
      data: parcelType,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/parcel-types/:id
// @desc    Delete parcel type from MongoDB (Tenant Scoped)
// @access  Private (Admin)
router.delete('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const parcelType = await ParcelType.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!parcelType) {
      return res.status(404).json({ success: false, message: 'Parcel type not found in your organization' });
    }

    const typeName = parcelType.name;
    await ParcelType.deleteOne({ _id: req.params.id, ...req.tenantFilter });

    res.json({
      success: true,
      message: `Parcel type '${typeName}' deleted from database`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
