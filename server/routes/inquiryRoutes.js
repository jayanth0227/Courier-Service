const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/inquiries
// @desc    Submit a commercial vendor onboarding or operations inquiry (Public)
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { inquiryType, name, phone, city, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name or business name is required' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Contact phone number is required' });
    }

    // Clean phone number (strip whitespace)
    const cleanPhone = phone.trim();

    const inquiry = await Inquiry.create({
      inquiryType: (inquiryType || 'Commercial Vendor Booking').trim(),
      name: name.trim(),
      phone: cleanPhone,
      city: (city || '').trim(),
      message: (message || '').trim(),
      status: 'New',
    });

    return res.status(201).json({
      success: true,
      message: 'Inquiry received successfully! Our operations desk has been notified.',
      data: {
        id: inquiry._id,
        referenceNumber: inquiry.referenceNumber,
        inquiryType: inquiry.inquiryType,
        name: inquiry.name,
        phone: inquiry.phone,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/inquiries
// @desc    Retrieve all vendor inquiries for Super Admin & Admin management
// @access  Private (Superadmin, Admin)
router.get('/', protect, authorize('superadmin', 'admin'), async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(100);
    const countNew = await Inquiry.countDocuments({ status: 'New' });
    return res.json({
      success: true,
      count: inquiries.length,
      newCount: countNew,
      data: inquiries,
    });
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/inquiries/:id
// @desc    Update inquiry status or notes
// @access  Private (Superadmin, Admin)
router.patch('/:id', protect, authorize('superadmin', 'admin'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (typeof notes === 'string') updateData.notes = notes.trim();

    const updated = await Inquiry.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    return res.json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
