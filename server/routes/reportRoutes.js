const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const BusDispatch = require('../models/BusDispatch');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');

// All report routes require authentication, tenant scoping, and admin role
router.use(protect, tenantScope, authorize('admin', 'superadmin'));

// @route   GET /api/reports/dashboard-stats
// @desc    Get operational summary metrics for today and total (Tenant Scoped)
// @access  Private
router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const baseFilter = { ...req.tenantFilter };

    // Run parallel queries scoped to tenant
    const [
      todayBookingsCount,
      pendingDispatchCount,
      dispatchedTodayCount,
      deliveredTodayCount,
      todayRevenueAgg,
      totalBookingsCount,
      totalRevenueAgg,
      recentBookings,
    ] = await Promise.all([
      // 1. Today's Bookings
      Booking.countDocuments({ ...baseFilter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      // 2. Pending Dispatch
      Booking.countDocuments({ ...baseFilter, status: { $in: ['BOOKED', 'WAITING_FOR_BUS'] } }),
      // 3. Dispatched Today
      Booking.countDocuments({
        ...baseFilter,
        'busDetails.dispatchedAt': { $gte: todayStart, $lte: todayEnd },
      }),
      // 4. Delivered Today
      Booking.countDocuments({
        ...baseFilter,
        deliveredAt: { $gte: todayStart, $lte: todayEnd },
      }),
      // 5. Today Revenue
      Booking.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: todayStart, $lte: todayEnd }, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // 6. Total Bookings
      Booking.countDocuments(baseFilter),
      // 7. Total Revenue
      Booking.aggregate([
        { $match: { ...baseFilter, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // 8. Recent 8 bookings
      Booking.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('createdBy', 'name')
        .lean(),
    ]);

    const todayRevenue = todayRevenueAgg.length > 0 ? todayRevenueAgg[0].total : 0;
    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    res.json({
      success: true,
      stats: {
        todayBookings: todayBookingsCount,
        pendingDispatch: pendingDispatchCount,
        dispatchedToday: dispatchedTodayCount,
        deliveredToday: deliveredTodayCount,
        todayRevenue,
        totalBookings: totalBookingsCount,
        totalRevenue,
      },
      recentBookings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/reports/detailed
// @desc    Get customizable operational and revenue report (Tenant Scoped)
// @access  Private
router.get('/detailed', async (req, res, next) => {
  try {
    const { startDate, endDate, destination, status, parcelType } = req.query;
    const query = { ...req.tenantFilter };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (destination && destination !== 'ALL') {
      query.destination = new RegExp(destination, 'i');
    }

    if (parcelType && parcelType !== 'ALL') {
      query.parcelType = parcelType;
    }

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
        let endDt;
        if (parts.length === 3) {
          endDt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        } else {
          endDt = new Date(endDate);
          endDt.setHours(23, 59, 59, 999);
        }
        // Protect against server/client clock skew by allowing up to Date.now() + 60s if querying current day
        query.createdAt.$lte = new Date(Math.max(endDt.getTime(), Date.now() + 60000));
      }
    }

    const bookings = await Booking.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Summary calculations
    let totalRevenue = 0;
    let totalQuantity = 0;
    let totalWeight = 0;
    const statusCounts = {
      WAITING_FOR_BUS: 0,
      DISPATCHED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    const destinationStats = {};

    bookings.forEach((b) => {
      if (b.status !== 'CANCELLED') {
        totalRevenue += b.amount || 0;
      }
      totalQuantity += b.quantity || 1;
      totalWeight += b.weight || 0;

      const st = b.status === 'BOOKED' ? 'WAITING_FOR_BUS' : b.status;
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      const dest = b.destination || 'Other';
      destinationStats[dest] = (destinationStats[dest] || 0) + 1;
    });

    res.json({
      success: true,
      summary: {
        totalBookings: bookings.length,
        totalRevenue,
        totalQuantity,
        totalWeight,
        statusCounts,
        destinationStats,
      },
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
});

// Helper for local YYYY-MM-DD
function toLocalYMD(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// @route   GET /api/reports/analytics
// @desc    Get visual data analytics, trends, category distributions, and route analytics (Tenant Scoped)
// @access  Private
router.get('/analytics', async (req, res, next) => {
  try {
    const {
      timeframe = '7days',
      startDate: qStart,
      endDate: qEnd,
      destination,
      status,
      parcelType,
    } = req.query;

    const now = new Date();
    let startDate = null;
    let endDate = null;

    if (qStart || qEnd) {
      if (qStart) {
        const parts = String(qStart).split('T')[0].trim().split('-');
        if (parts.length === 3) {
          startDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
        } else {
          startDate = new Date(qStart);
          startDate.setHours(0, 0, 0, 0);
        }
      }
      if (qEnd) {
        const parts = String(qEnd).split('T')[0].trim().split('-');
        let endDt;
        if (parts.length === 3) {
          endDt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        } else {
          endDt = new Date(qEnd);
          endDt.setHours(23, 59, 59, 999);
        }
        endDate = new Date(Math.max(endDt.getTime(), Date.now() + 60000));
      }
    } else if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(Math.max(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime(), Date.now() + 60000));
    } else if (timeframe === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      endDate = new Date(Math.max(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime(), Date.now() + 60000));
    } else if (timeframe === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      endDate = new Date(Math.max(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime(), Date.now() + 60000));
    } else if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(Math.max(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime(), Date.now() + 60000));
    } else if (timeframe === 'all') {
      startDate = null;
      endDate = null;
    }

    const matchQuery = { ...req.tenantFilter };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = startDate;
      if (endDate) matchQuery.createdAt.$lte = endDate;
    }
    if (status && status !== 'ALL') {
      matchQuery.status = status;
    }
    if (destination && destination !== 'ALL') {
      matchQuery.destination = new RegExp(destination, 'i');
    }
    if (parcelType && parcelType !== 'ALL') {
      matchQuery.parcelType = parcelType;
    }

    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const dispatchQuery = { ...req.tenantFilter };
    if (startDate || endDate) {
      dispatchQuery.createdAt = {};
      if (startDate) dispatchQuery.createdAt.$gte = startDate;
      if (endDate) dispatchQuery.createdAt.$lte = endDate;
    }

    const [
      allBookings,
      allDispatches,
      todayStartCount,
      todayRevenueData,
    ] = await Promise.all([
      Booking.find(matchQuery).lean(),
      BusDispatch.find(dispatchQuery).lean(),
      Booking.countDocuments({ ...req.tenantFilter, createdAt: { $gte: todayZero } }),
      Booking.aggregate([
        { $match: { ...req.tenantFilter, createdAt: { $gte: todayZero }, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // Compute metrics
    let totalRevenue = 0;
    let totalWeight = 0;
    let totalQty = 0;
    const statusMap = {
      DELIVERED: 0,
      DISPATCHED: 0,
      WAITING_FOR_BUS: 0,
      CANCELLED: 0,
    };
    const parcelTypeMap = {};
    const destMap = {};
    const paymentMap = { PAID: 0, TO_PAY: 0, PAID_AMOUNT: 0, TO_PAY_AMOUNT: 0 };
    const hourlyMap = {
      'Morning (06-12)': 0,
      'Afternoon (12-17)': 0,
      'Evening (17-21)': 0,
      'Night (21-06)': 0,
    };

    // Determine daily trends range
    let daysToGenerate = 7;
    if (timeframe === 'today') {
      daysToGenerate = 1;
    } else if (timeframe === '30days') {
      daysToGenerate = 30;
    } else if (timeframe === 'month') {
      daysToGenerate = now.getDate();
    } else if (timeframe === 'custom' && startDate && endDate) {
      daysToGenerate = Math.max(1, Math.min(60, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))));
    } else if (timeframe === 'all') {
      daysToGenerate = 14;
    }

    const dailyMap = {};
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = toLocalYMD(d);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const shortDay = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      dailyMap[key] = { date: key, label, shortDay, bookings: 0, revenue: 0, delivered: 0, dispatched: 0 };
    }

    allBookings.forEach((b) => {
      const isCancelled = b.status === 'CANCELLED';
      if (!isCancelled) {
        totalRevenue += (b.amount || 0);
      }
      totalWeight += (b.weight || 0);
      totalQty += (b.quantity || 1);

      // Status
      const st = (b.status === 'BOOKED' || b.status === 'WAITING_FOR_BUS') ? 'WAITING_FOR_BUS' : b.status;
      statusMap[st] = (statusMap[st] || 0) + 1;

      // Parcel type
      const pt = b.parcelType || 'Standard';
      if (!parcelTypeMap[pt]) parcelTypeMap[pt] = { name: pt, count: 0, revenue: 0 };
      parcelTypeMap[pt].count += 1;
      if (!isCancelled) parcelTypeMap[pt].revenue += (b.amount || 0);

      // Destination
      const dest = b.destination || 'Other';
      if (!destMap[dest]) destMap[dest] = { destination: dest, count: 0, revenue: 0 };
      destMap[dest].count += 1;
      if (!isCancelled) destMap[dest].revenue += (b.amount || 0);

      // Payment
      const pStatus = b.paymentStatus === 'PAID' ? 'PAID' : 'TO_PAY';
      paymentMap[pStatus] += 1;
      if (!isCancelled) {
        if (pStatus === 'PAID') paymentMap.PAID_AMOUNT += (b.amount || 0);
        else paymentMap.TO_PAY_AMOUNT += (b.amount || 0);
      }

      // Hourly
      if (b.createdAt) {
        const hour = new Date(b.createdAt).getHours();
        if (hour >= 6 && hour < 12) hourlyMap['Morning (06-12)'] += 1;
        else if (hour >= 12 && hour < 17) hourlyMap['Afternoon (12-17)'] += 1;
        else if (hour >= 17 && hour < 21) hourlyMap['Evening (17-21)'] += 1;
        else hourlyMap['Night (21-06)'] += 1;
      }

      // Daily
      if (b.createdAt) {
        const dateKey = toLocalYMD(b.createdAt);
        if (dailyMap[dateKey]) {
          dailyMap[dateKey].bookings += 1;
          if (!isCancelled) dailyMap[dateKey].revenue += (b.amount || 0);
          if (b.status === 'DELIVERED') dailyMap[dateKey].delivered += 1;
          if (b.status === 'DISPATCHED' || b.status === 'DELIVERED') dailyMap[dateKey].dispatched += 1;
        }
      }
    });

    // Bus Fleet volume
    const busMap = {};
    allBookings.forEach((b) => {
      if (b.busDetails?.busNumber) {
        const busNo = b.busDetails.busNumber.toUpperCase();
        if (!busMap[busNo]) {
          busMap[busNo] = {
            busNumber: busNo,
            busName: b.busDetails.busName || '',
            operator: b.busDetails.operator || '',
            packages: 0,
            revenue: 0,
          };
        }
        busMap[busNo].packages += 1;
        busMap[busNo].revenue += (b.amount || 0);
      }
    });

    const topDestinations = Object.values(destMap).sort((a, b) => b.count - a.count).slice(0, 6);
    const parcelTypesList = Object.values(parcelTypeMap).sort((a, b) => b.count - a.count);
    const dailyTrendList = Object.values(dailyMap);
    const fleetVolumeList = Object.values(busMap).sort((a, b) => b.packages - a.packages).slice(0, 5);

    const fulfillmentRate = allBookings.length > 0
      ? Math.round(((statusMap.DELIVERED + statusMap.DISPATCHED) / allBookings.length) * 100)
      : 0;

    res.json({
      success: true,
      timeframe,
      kpis: {
        totalBookings: allBookings.length,
        todayBookings: todayStartCount,
        totalRevenue,
        todayRevenue: todayRevenueData.length > 0 ? todayRevenueData[0].total : 0,
        totalWeight,
        totalQty,
        avgOrderValue: allBookings.length > 0 ? Math.round(totalRevenue / allBookings.length) : 0,
        fulfillmentRate,
        pendingDispatch: statusMap.WAITING_FOR_BUS,
        dispatched: statusMap.DISPATCHED,
        delivered: statusMap.DELIVERED,
        cancelled: statusMap.CANCELLED,
      },
      statusDistribution: [
        { label: 'Delivered', count: statusMap.DELIVERED, color: '#0f172a' },
        { label: 'Dispatched / In-Transit', count: statusMap.DISPATCHED, color: '#2563eb' },
        { label: 'Waiting for Bus', count: statusMap.WAITING_FOR_BUS, color: '#d97706' },
        { label: 'Cancelled', count: statusMap.CANCELLED, color: '#dc2626' },
      ],
      parcelTypeDistribution: parcelTypesList,
      topDestinations,
      dailyTrend: dailyTrendList,
      paymentSplit: paymentMap,
      hourlyDistribution: Object.entries(hourlyMap).map(([slot, count]) => ({ slot, count })),
      fleetVolume: fleetVolumeList,
      totalDispatchesCount: allDispatches.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
