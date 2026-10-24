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
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
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

// @route   GET /api/reports/analytics
// @desc    Get visual data analytics, trends, category distributions, and route analytics (Tenant Scoped)
// @access  Private
router.get('/analytics', async (req, res, next) => {
  try {
    const { timeframe = '7days' } = req.query; // 'today', '7days', '30days', 'all'

    // Determine date range
    let startDate = new Date();
    const now = new Date();
    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '7days') {
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '30days') {
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(0); // all time
    }

    const matchQuery = timeframe === 'all'
      ? { ...req.tenantFilter }
      : { ...req.tenantFilter, createdAt: { $gte: startDate } };

    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);

    const [
      allBookings,
      allDispatches,
      todayStartCount,
      todayRevenueData,
    ] = await Promise.all([
      Booking.find(matchQuery).lean(),
      BusDispatch.find(timeframe === 'all' ? { ...req.tenantFilter } : { ...req.tenantFilter, createdAt: { $gte: startDate } }).lean(),
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

    // Daily trends map
    const dailyMap = {};
    const numDays = timeframe === 'today' ? 1 : timeframe === '30days' ? 30 : 7;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
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
        const dateKey = new Date(b.createdAt).toISOString().split('T')[0];
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
