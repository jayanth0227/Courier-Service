import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Bus,
  CheckCircle2,
  Clock,
  IndianRupee,
  RefreshCw,
  Plus,
  TrendingUp,
  PieChart,
  BarChart3,
  MapPin,
  Layers,
  CreditCard,
  Truck,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Helper function to aggregate raw bookings into structured analytics dataset
const aggregateAnalyticsData = (bookings = [], tf = '7days', dashboardStats = null) => {
  const now = new Date();
  let startDate = new Date();
  if (tf === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (tf === '7days') {
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (tf === '30days') {
    startDate.setDate(now.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(0); // all time
  }

  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);

  // Filter bookings for the selected timeframe
  const filteredBookings = tf === 'all'
    ? bookings
    : bookings.filter((b) => {
        if (!b.createdAt) return true;
        return new Date(b.createdAt) >= startDate;
      });

  let totalRevenue = 0;
  let todayRevenue = 0;
  let todayBookings = 0;
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
  const busMap = {};

  // Build daily trend dictionary
  const dailyMap = {};
  const numDays = tf === 'today' ? 1 : tf === '30days' ? 30 : 7;
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const shortDay = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    dailyMap[key] = { date: key, label, shortDay, bookings: 0, revenue: 0, delivered: 0, dispatched: 0 };
  }

  // Count overall today's metrics
  bookings.forEach((b) => {
    const bDate = b.createdAt ? new Date(b.createdAt) : new Date();
    if (bDate >= todayZero) {
      todayBookings += 1;
      if (b.status !== 'CANCELLED') {
        todayRevenue += (Number(b.amount) || 0);
      }
    }
  });

  filteredBookings.forEach((b) => {
    const isCancelled = b.status === 'CANCELLED';
    const amt = Number(b.amount) || 0;
    if (!isCancelled) {
      totalRevenue += amt;
    }
    totalWeight += (Number(b.weight) || 0);
    totalQty += (Number(b.quantity) || 1);

    // Status mapping
    const rawStatus = b.status || 'WAITING_FOR_BUS';
    const st = (rawStatus === 'BOOKED' || rawStatus === 'WAITING_FOR_BUS') ? 'WAITING_FOR_BUS' : rawStatus;
    if (statusMap[st] !== undefined) {
      statusMap[st] += 1;
    } else {
      statusMap[st] = 1;
    }

    // Parcel Type
    const pt = b.parcelType || 'Standard Box';
    if (!parcelTypeMap[pt]) parcelTypeMap[pt] = { name: pt, count: 0, revenue: 0 };
    parcelTypeMap[pt].count += 1;
    if (!isCancelled) parcelTypeMap[pt].revenue += amt;

    // Destination Corridor
    const dest = b.destination || (b.toCity ? (b.fromCity ? `${b.fromCity} → ${b.toCity}` : b.toCity) : 'Standard Route');
    if (!destMap[dest]) destMap[dest] = { destination: dest, count: 0, revenue: 0 };
    destMap[dest].count += 1;
    if (!isCancelled) destMap[dest].revenue += amt;

    // Payment Mode
    const pStatus = b.paymentStatus === 'PAID' ? 'PAID' : 'TO_PAY';
    paymentMap[pStatus] += 1;
    if (!isCancelled) {
      if (pStatus === 'PAID') paymentMap.PAID_AMOUNT += amt;
      else paymentMap.TO_PAY_AMOUNT += amt;
    }

    // Hourly slot
    if (b.createdAt) {
      const hour = new Date(b.createdAt).getHours();
      if (hour >= 6 && hour < 12) hourlyMap['Morning (06-12)'] += 1;
      else if (hour >= 12 && hour < 17) hourlyMap['Afternoon (12-17)'] += 1;
      else if (hour >= 17 && hour < 21) hourlyMap['Evening (17-21)'] += 1;
      else hourlyMap['Night (21-06)'] += 1;
    }

    // Daily distribution
    if (b.createdAt) {
      const dateKey = new Date(b.createdAt).toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].bookings += 1;
        if (!isCancelled) dailyMap[dateKey].revenue += amt;
        if (b.status === 'DELIVERED') dailyMap[dateKey].delivered += 1;
        if (b.status === 'DISPATCHED' || b.status === 'DELIVERED') dailyMap[dateKey].dispatched += 1;
      }
    }

    // Bus Fleet Logistics
    if (b.busDetails && b.busDetails.busNumber) {
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
      busMap[busNo].revenue += amt;
    }
  });

  const topDestinations = Object.values(destMap).sort((a, b) => b.count - a.count).slice(0, 6);
  const parcelTypeDistribution = Object.values(parcelTypeMap).sort((a, b) => b.count - a.count);
  const dailyTrend = Object.values(dailyMap);
  const fleetVolume = Object.values(busMap).sort((a, b) => b.packages - a.packages).slice(0, 5);

  const fulfillmentRate = filteredBookings.length > 0
    ? Math.round(((statusMap.DELIVERED + statusMap.DISPATCHED) / filteredBookings.length) * 100)
    : 0;

  return {
    success: true,
    timeframe: tf,
    kpis: {
      totalBookings: filteredBookings.length,
      todayBookings: dashboardStats?.todayBookings !== undefined ? dashboardStats.todayBookings : todayBookings,
      totalRevenue,
      todayRevenue: dashboardStats?.todayRevenue !== undefined ? dashboardStats.todayRevenue : todayRevenue,
      totalWeight,
      totalQty,
      avgOrderValue: filteredBookings.length > 0 ? Math.round(totalRevenue / filteredBookings.length) : 0,
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
    parcelTypeDistribution,
    topDestinations,
    dailyTrend,
    paymentSplit: paymentMap,
    hourlyDistribution: Object.entries(hourlyMap).map(([slot, count]) => ({ slot, count })),
    fleetVolume,
    totalDispatchesCount: fleetVolume.reduce((acc, f) => acc + f.packages, 0),
  };
};

export const DashboardPage = ({
  onNavigateModule,
  onOpenReceipt,
  onOpenWhatsApp,
  onOpenAssignBus,
}) => {
  const { showToast } = useToast();
  const [timeframe, setTimeframe] = useState('7days'); // 'today', '7days', '30days', 'all'
  const [trendMetric, setTrendMetric] = useState('bookings'); // 'bookings' | 'revenue'
  const [loading, setLoading] = useState(true);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);

  const [analytics, setAnalytics] = useState({
    kpis: {
      totalBookings: 0,
      todayBookings: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      totalWeight: 0,
      totalQty: 0,
      avgOrderValue: 0,
      fulfillmentRate: 0,
      pendingDispatch: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    },
    statusDistribution: [],
    parcelTypeDistribution: [],
    topDestinations: [],
    dailyTrend: [],
    paymentSplit: { PAID: 0, TO_PAY: 0, PAID_AMOUNT: 0, TO_PAY_AMOUNT: 0 },
    hourlyDistribution: [],
    fleetVolume: [],
    totalDispatchesCount: 0,
  });

  const fetchAnalytics = useCallback(async (tf = timeframe) => {
    try {
      setLoading(true);

      // Attempt 1: Try dedicated analytics backend endpoint
      let backendSuccess = false;
      try {
        const res = await api.reports.getAnalytics(tf);
        if (res && res.success && res.kpis) {
          setAnalytics(res);
          backendSuccess = true;
        }
      } catch (err) {
        // If 404 or not available yet on running server process, fall through to client aggregator
        backendSuccess = false;
      }

      if (backendSuccess) return;

      // Attempt 2: Resilient fallback to live MongoDB booking dataset
      const [bookingsRes, statsRes] = await Promise.allSettled([
        api.bookings.list({ limit: 1000 }),
        api.reports.getDashboardStats(),
      ]);

      const rawBookings = bookingsRes.status === 'fulfilled' && bookingsRes.value?.data
        ? bookingsRes.value.data
        : [];
      const stats = statsRes.status === 'fulfilled' && statsRes.value?.stats
        ? statsRes.value.stats
        : null;

      const computed = aggregateAnalyticsData(rawBookings, tf, stats);
      setAnalytics(computed);
    } catch (error) {
      showToast(error.message || 'Failed to load real-time analytics data', 'error');
    } finally {
      setLoading(false);
    }
  }, [timeframe, showToast]);

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe, fetchAnalytics]);

  const { kpis, statusDistribution, parcelTypeDistribution, topDestinations, dailyTrend, paymentSplit, hourlyDistribution, fleetVolume } = analytics;

  // Colors for charts
  const CATEGORY_COLORS = ['#0f172a', '#2563eb', '#4f46e5', '#0891b2', '#d97706', '#64748b', '#7c3aed', '#059669'];

  // Total for donut
  const totalStatusCount = statusDistribution.reduce((sum, s) => sum + (s.count || 0), 0) || 1;

  // Donut SVG Calculation
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const donutSlices = statusDistribution.map((item, idx) => {
    const percent = item.count / totalStatusCount;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += percent;
    return {
      ...item,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  // Parcel Type Pie SVG Calculation
  const totalParcelCount = parcelTypeDistribution.reduce((sum, p) => sum + (p.count || 0), 0) || 1;
  let accumulatedPieAngle = 0;
  const pieSlices = parcelTypeDistribution.map((item, idx) => {
    const percent = item.count / totalParcelCount;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPieAngle * circumference;
    accumulatedPieAngle += percent;
    return {
      ...item,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      idx,
    };
  });

  // Daily Trend max values for scaling
  const maxDailyBookings = Math.max(...dailyTrend.map((d) => d.bookings), 5);
  const maxDailyRevenue = Math.max(...dailyTrend.map((d) => d.revenue), 500);

  // Top destination max value
  const maxDestCount = Math.max(...topDestinations.map((d) => d.count), 1);

  // Hourly max value
  const maxHourlyCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);

  return (
    <div className="dashboard-wrapper" style={{ paddingBottom: '2.5rem' }}>
      {/* Top Header & Analytics Controls */}
      <div className="page-header" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} color="#0f172a" />
            <h1 className="page-title" style={{ margin: 0 }}>Operations Dashboard</h1>
          </div>
          <p className="page-subtitle" style={{ margin: '3px 0 0 0' }}>
            Live overview of bookings, dispatch queue, transit corridors, and counter revenue
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Timeframe selector pill buttons */}
          <div className="reports-timeframe-bar" style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '3px', gap: '3px' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: timeframe === t.id ? 600 : 500,
                  fontFamily: 'var(--font-family)',
                  backgroundColor: timeframe === t.id ? '#ffffff' : 'transparent',
                  color: timeframe === t.id ? '#0f172a' : '#64748b',
                  boxShadow: timeframe === t.id ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchAnalytics(timeframe)}
            disabled={loading}
            title="Reload live analytics data"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateModule('create-booking')}
          >
            <Plus size={15} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* 5 Executive KPI Metric Cards */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '1.25rem' }}>
        {/* KPI 1: Total Volume */}
        <div
          className="stat-card"
          onClick={() => onNavigateModule('bookings')}
          style={{ cursor: 'pointer' }}
          title="Click to view all consignments"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Total Consignments</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-card-value">{kpis.totalBookings}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Today: +{kpis.todayBookings} booked</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{kpis.totalQty} items</span>
          </div>
        </div>

        {/* KPI 2: Total Freight Collection */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Freight Revenue</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="stat-card-value">₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Today: ₹{(kpis.todayRevenue || 0).toLocaleString('en-IN')}</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Avg: ₹{kpis.avgOrderValue}</span>
          </div>
        </div>

        {/* KPI 3: In-Transit / Dispatched */}
        <div
          className="stat-card"
          onClick={() => onNavigateModule('dispatch')}
          style={{ cursor: 'pointer' }}
          title="Click to view bus dispatch history"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">In-Transit On Buses</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Bus size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#2563eb' }}>{kpis.dispatched}</div>
          <div className="stat-card-caption">
            En route across scheduled bus routes
          </div>
        </div>

        {/* KPI 4: Successfully Delivered */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Delivered Consignments</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#0f172a' }}>{kpis.delivered}</div>
          <div className="stat-card-caption">
            Collected at destination counters
          </div>
        </div>

        {/* KPI 5: Fulfillment Velocity Rate */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Fulfillment Rate</span>
            <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#0f172a' }}>{kpis.fulfillmentRate}%</div>
          <div className="stat-card-caption">
            Dispatched & Delivered vs intake
          </div>
        </div>
      </div>

      {/* Grid 1: Daily Trend Column Bar Chart & Consignment Status Donut Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Visual Chart 1: Daily Consignments & Revenue Trajectory */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BarChart3 size={16} color="#2563eb" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Consignment & Revenue Trajectory
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Daily operational volume and financial intake over selected timeframe
              </p>
            </div>

            {/* Metric Toggle */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-sm)', padding: '2px', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setTrendMetric('bookings')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.6875rem',
                  fontWeight: trendMetric === 'bookings' ? 600 : 500,
                  backgroundColor: trendMetric === 'bookings' ? '#ffffff' : 'transparent',
                  color: trendMetric === 'bookings' ? '#0f172a' : '#64748b',
                  boxShadow: trendMetric === 'bookings' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Parcels
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric('revenue')}
                style={{
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.6875rem',
                  fontWeight: trendMetric === 'revenue' ? 600 : 500,
                  backgroundColor: trendMetric === 'revenue' ? '#ffffff' : 'transparent',
                  color: trendMetric === 'revenue' ? '#0f172a' : '#64748b',
                  boxShadow: trendMetric === 'revenue' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                }}
              >
                Revenue (₹)
              </button>
            </div>
          </div>

          {/* SVG Bar Chart */}
          {dailyTrend.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No consignment data in this timeframe
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '220px' }}>
              {/* Bars Area */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '170px', padding: '0 0.5rem 0.5rem 0.5rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                {/* Horizontal Gridlines */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderBottom: '1px dashed #f1f5f9' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderBottom: '1px dashed #f1f5f9' }} />

                {dailyTrend.map((d, i) => {
                  const val = trendMetric === 'bookings' ? d.bookings : d.revenue;
                  const maxVal = trendMetric === 'bookings' ? maxDailyBookings : maxDailyRevenue;
                  const heightPercent = Math.max(Math.round((val / (maxVal || 1)) * 100), val > 0 ? 8 : 2);
                  const isHovered = hoveredBarIndex === i;

                  return (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredBarIndex(i)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      {/* Floating tooltip on hover */}
                      {isHovered && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: `${heightPercent + 12}%`,
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{d.label}</div>
                          <div>Parcels: {d.bookings}</div>
                          <div>Revenue: ₹{d.revenue.toLocaleString('en-IN')}</div>
                        </div>
                      )}

                      {/* Bar Pillar */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '36px',
                          height: `${heightPercent}%`,
                          backgroundColor: isHovered ? '#2563eb' : val > 0 ? '#3b82f6' : '#e2e8f0',
                          borderRadius: '4px 4px 0 0',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          paddingTop: '3px',
                        }}
                      >
                        {val > 0 && heightPercent > 20 && (
                          <span style={{ fontSize: '0.625rem', color: '#ffffff', fontWeight: 600 }}>
                            {trendMetric === 'bookings' ? val : `₹${val}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X Axis Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '0.5rem 0.5rem 0 0.5rem' }}>
                {dailyTrend.map((d) => (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: '0.6875rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.shortDay || d.label.split(',')[0]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Summary Pill */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Period Volume: <strong>{kpis.totalBookings} Parcels</strong></span>
            <span>Period Freight: <strong>₹{kpis.totalRevenue.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Visual Chart 2: Consignment Status Donut Chart */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PieChart size={16} color="#0f172a" />
              <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Consignment Status Distribution
              </h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Operational lifecycle breakdown from counter booking to receiver handover
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.25rem', alignItems: 'center', flex: 1, minHeight: '190px' }}>
            {/* SVG Donut Chart */}
            <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto' }}>
              <svg viewBox="0 0 160 160" width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                />

                {/* Slices */}
                {donutSlices.map((slice) => {
                  if (slice.count === 0) return null;
                  const isHovered = hoveredDonutIndex === slice.idx;
                  return (
                    <circle
                      key={slice.label}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={() => setHoveredDonutIndex(slice.idx)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Donut Label */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {hoveredDonutIndex !== null && statusDistribution[hoveredDonutIndex]
                    ? statusDistribution[hoveredDonutIndex].count
                    : kpis.totalBookings}
                </span>
                <span style={{ fontSize: '0.625rem', color: '#64748b', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>
                  {hoveredDonutIndex !== null && statusDistribution[hoveredDonutIndex]
                    ? statusDistribution[hoveredDonutIndex].label.split(' ')[0]
                    : 'Total'}
                </span>
              </div>
            </div>

            {/* Interactive Status Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {statusDistribution.map((item, idx) => {
                const percent = Math.round(((item.count || 0) / totalStatusCount) * 100);
                const isHovered = hoveredDonutIndex === idx;
                return (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: isHovered ? '#f8fafc' : 'transparent',
                      border: isHovered ? '1px solid #cbd5e1' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                    }}
                    onMouseEnter={() => setHoveredDonutIndex(idx)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: item.color }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: isHovered ? 700 : 500, color: '#0f172a' }}>
                        {item.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{item.count}</span>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b', minWidth: '32px', textAlign: 'right' }}>
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Success Rate: <strong style={{ color: '#0f172a' }}>{kpis.fulfillmentRate}%</strong></span>
            <span>Awaiting Bus: <strong style={{ color: '#d97706' }}>{kpis.pendingDispatch}</strong></span>
          </div>
        </div>
      </div>

      {/* Grid 2: Top Destination Corridors (Ranked Horizontal Bar Chart) & Parcel Types Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Visual Chart 3: Top Destination Corridors */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="#2563eb" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Top Freight Delivery Corridors
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Ranked destination terminals by consignment volume and luggage intake
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Top {topDestinations.length} Hubs
            </span>
          </div>

          {topDestinations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No destination data recorded in this period
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topDestinations.map((dest, i) => {
                const widthPercent = Math.max(Math.round((dest.count / maxDestCount) * 100), 10);
                return (
                  <div key={dest.destination}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', width: '16px' }}>
                          #{i + 1}
                        </span>
                        <strong style={{ color: '#0f172a' }}>{dest.destination}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {dest.count} parcel{dest.count > 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#475569', minWidth: '55px', textAlign: 'right' }}>
                          ₹{dest.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Visual Horizontal Progress Bar */}
                    <div style={{ height: '7px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${widthPercent}%`,
                          backgroundColor: i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#64748b',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Chart 4: Parcel Types / Categories Radial Breakdown */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="#0f172a" />
              <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Cargo Category Distribution
              </h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Parcel category volume share and revenue contribution
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '1rem', alignItems: 'center', flex: 1 }}>
            {/* SVG Mini Pie */}
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
              <svg viewBox="0 0 160 160" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                {pieSlices.map((slice) => {
                  if (slice.count === 0) return null;
                  const isHovered = hoveredPieIndex === slice.idx;
                  return (
                    <circle
                      key={slice.name}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={() => setHoveredPieIndex(slice.idx)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                    />
                  );
                })}
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Package size={22} color="#0f172a" />
              </div>
            </div>

            {/* Category Bars & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {parcelTypeDistribution.slice(0, 5).map((pt, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                const percent = Math.round(((pt.count || 0) / totalParcelCount) * 100);
                return (
                  <div key={pt.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: color }} />
                        <strong style={{ color: '#0f172a' }}>{pt.name}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span>{pt.count} pcs ({percent}%)</span>
                        <strong style={{ color: '#0f172a' }}>₹{pt.revenue.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                    <div style={{ height: '5px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, backgroundColor: color, borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid 3: Operational Capacity, Booking Peak Hours & Bus Fleet Volume */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Chart 5: Peak Booking Intake Time Slots */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Clock size={16} color="#2563eb" />
            <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Peak Booking Operational Hours
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
            Intake frequency across standard counter business hours
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {hourlyDistribution.map((slot) => {
              const widthPercent = Math.max(Math.round((slot.count / maxHourlyCount) * 100), slot.count > 0 ? 10 : 2);
              return (
                <div key={slot.slot}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{slot.slot}</span>
                    <strong style={{ color: '#0f172a' }}>{slot.count} bookings</strong>
                  </div>
                  <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${widthPercent}%`, backgroundColor: slot.count > 0 ? '#2563eb' : '#cbd5e1', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 6: Payment Collection Split */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <CreditCard size={16} color="#2563eb" />
            <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Payment Collection Split
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
            Origin Counter Prepaid vs Destination TO-PAY distribution
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prepaid (Paid)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{paymentSplit.PAID}</div>
              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>₹{(paymentSplit.PAID_AMOUNT || 0).toLocaleString('en-IN')}</div>
            </div>

            <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Collect (To Pay)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', marginTop: '2px' }}>{paymentSplit.TO_PAY}</div>
              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>₹{(paymentSplit.TO_PAY_AMOUNT || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Payment Split Bar */}
          <div style={{ height: '8px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(paymentSplit.PAID / (kpis.totalBookings || 1)) * 100}%`, backgroundColor: '#2563eb' }} title={`Paid: ${paymentSplit.PAID}`} />
            <div style={{ width: `${(paymentSplit.TO_PAY / (kpis.totalBookings || 1)) * 100}%`, backgroundColor: '#d97706' }} title={`To Pay: ${paymentSplit.TO_PAY}`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
            <span>Prepaid: {Math.round((paymentSplit.PAID / (kpis.totalBookings || 1)) * 100)}%</span>
            <span>To Pay: {Math.round((paymentSplit.TO_PAY / (kpis.totalBookings || 1)) * 100)}%</span>
          </div>
        </div>

        {/* Chart 7: Bus Fleet Cargo Volume Leaderboard */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Truck size={16} color="#2563eb" />
            <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
              Fleet Cargo Utilization
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
            Buses assigned with the highest luggage volume
          </p>

          {fleetVolume.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.75rem' }}>
              No assigned buses in this timeframe
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {fleetVolume.map((b) => (
                <div
                  key={b.busNumber}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>{b.busNumber}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{b.busName || b.operator || 'Express Line'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>{b.packages} packages</div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>₹{b.revenue.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
