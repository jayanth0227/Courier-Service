const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');
const { escapeRegex } = require('../middleware/security');

// All audit log endpoints require authentication, tenant scoping, and admin role
router.use(protect, tenantScope, authorize('admin', 'superadmin'));

// @route   GET /api/audit-logs
// @desc    Retrieve security audit trail with filtering and pagination
// @access  Private (Admin, SuperAdmin)
router.get('/', async (req, res, next) => {
  try {
    const {
      action,
      severity,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25,
    } = req.query;

    const query = { ...req.tenantFilter };

    if (action && action !== 'ALL') {
      query.action = action;
    }

    if (severity && severity !== 'ALL') {
      query.severity = severity;
    }

    if (search && search.trim()) {
      const safe = escapeRegex(search.trim());
      const regex = new RegExp(safe, 'i');
      query.$or = [
        { username: regex },
        { action: regex },
        { ipAddress: regex },
        { 'details.message': regex },
      ];
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total, severityCounts] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: { ...req.tenantFilter } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    const metrics = {
      INFO: 0,
      WARN: 0,
      CRITICAL: 0,
    };
    severityCounts.forEach((item) => {
      if (item._id && metrics[item._id] !== undefined) {
        metrics[item._id] = item.count;
      }
    });

    res.json({
      success: true,
      data: logs,
      metrics,
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

// @route   GET /api/audit-logs/actions
// @desc    Get distinct list of available action types for filter dropdown
// @access  Private (Admin, SuperAdmin)
router.get('/actions', async (req, res, next) => {
  try {
    const actions = await AuditLog.distinct('action', req.tenantFilter);
    res.json({ success: true, data: actions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
