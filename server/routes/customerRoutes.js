const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');

// All customer routes require authentication & tenant scoping
router.use(protect, tenantScope);

// @route   GET /api/customers
// @desc    Get customer list with search & pagination (Tenant Scoped)
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 15, nameOnly, type } = req.query;
    const query = { ...req.tenantFilter };

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$and = query.$and || [];
      if (nameOnly === 'true' || type === 'name') {
        query.$and.push({
          $or: [{ name: searchRegex }, { phone: searchRegex }],
        });
      } else {
        query.$and.push({
          $or: [
            { name: searchRegex },
            { phone: searchRegex },
            { whatsapp: searchRegex },
            { address: searchRegex },
          ],
        });
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Customer.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: customers,
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

// @route   GET /api/customers/:id
// @desc    Get single customer profile with full booking history (Tenant Scoped)
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found in your organization' });
    }

    // Get all bookings for this customer within this tenant
    const bookings = await Booking.find({
      ...req.tenantFilter,
      $or: [{ customer: customer._id }, { customerPhone: customer.phone }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        customer,
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
