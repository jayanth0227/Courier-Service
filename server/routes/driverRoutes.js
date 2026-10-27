const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');

// All driver routes require authentication & tenant scoping
router.use(protect, tenantScope);

// @route   GET /api/drivers
// @desc    Get all active drivers for this tenant (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { search, all } = req.query;
    const filter = { ...req.tenantFilter };

    if (!all) {
      filter.active = true;
    }

    if (search && search.trim()) {
      const q = escapeRegex(search.trim());
      const regex = new RegExp(q, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: regex },
          { phone: regex },
          { alternatePhone: regex },
          { licenseNumber: regex },
          { notes: regex },
        ],
      });
    }

    const drivers = await Driver.find(filter).sort({ name: 1 });

    res.json({
      success: true,
      data: drivers,
      count: drivers.length,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/drivers/:id
// @desc    Get single driver by ID or Phone (Tenant Scoped)
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let driver;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      driver = await Driver.findOne({ _id: id, ...req.tenantFilter });
    } else {
      const cleanPhone = id.replace(/\D/g, '').slice(-10);
      driver = await Driver.findOne({ phone: cleanPhone, ...req.tenantFilter });
    }

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found in your organization' });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/drivers
// @desc    Create or update driver profile in AWS DynamoDB (Tenant Scoped)
// @access  Private (Admin only)
router.post('/', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { name, phone, alternatePhone, licenseNumber, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Driver name is required' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Driver primary mobile number is required' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanAlt = alternatePhone ? alternatePhone.replace(/\D/g, '').slice(-10) : '';

    let existingDriver = await Driver.findOne({
      tenantId: req.tenantId,
      phone: cleanPhone,
    });

    if (existingDriver) {
      existingDriver.name = name.trim();
      existingDriver.alternatePhone = cleanAlt;
      existingDriver.licenseNumber = licenseNumber ? licenseNumber.trim() : existingDriver.licenseNumber;
      existingDriver.notes = notes ? notes.trim() : existingDriver.notes;
      existingDriver.active = true;

      await existingDriver.save();

      return res.json({
        success: true,
        message: `Driver '${existingDriver.name}' (${cleanPhone}) updated successfully`,
        data: existingDriver,
      });
    }

    const newDriver = await Driver.create({
      tenantId: req.tenantId,
      name: name.trim(),
      phone: cleanPhone,
      alternatePhone: cleanAlt,
      licenseNumber: licenseNumber ? licenseNumber.trim() : '',
      notes: notes ? notes.trim() : '',
      active: true,
    });

    res.status(201).json({
      success: true,
      message: `Driver '${newDriver.name}' added successfully`,
      data: newDriver,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/drivers/:id
// @desc    Update driver details in AWS DynamoDB (Tenant Scoped)
// @access  Private (Admin only)
router.put('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found in your organization' });
    }

    const { name, phone, alternatePhone, licenseNumber, notes, active } = req.body;

    if (name) driver.name = name.trim();

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const existing = await Driver.findOne({
        tenantId: req.tenantId,
        phone: cleanPhone,
        _id: { $ne: driver._id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Another driver with phone number ${cleanPhone} already exists` });
      }
      driver.phone = cleanPhone;
    }

    if (alternatePhone !== undefined) {
      driver.alternatePhone = alternatePhone ? alternatePhone.replace(/\D/g, '').slice(-10) : '';
    }

    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber.trim();
    if (notes !== undefined) driver.notes = notes.trim();
    if (active !== undefined) driver.active = Boolean(active);

    await driver.save();

    res.json({
      success: true,
      message: `Driver '${driver.name}' updated successfully`,
      data: driver,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/drivers/:id
// @desc    Delete driver from AWS DynamoDB (Tenant Scoped)
// @access  Private (Admin only)
router.delete('/:id', authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found in your organization' });
    }

    const driverName = driver.name;
    await Driver.deleteOne({ _id: req.params.id, ...req.tenantFilter });

    res.json({
      success: true,
      message: `Driver '${driverName}' deleted from database`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
