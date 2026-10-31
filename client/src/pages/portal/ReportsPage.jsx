import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  IndianRupee,
  Package,
  Bus,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpDown,
  TrendingUp,
  MapPin,
  Clock,
  Layers,
  Phone,
  FileText,
  PieChart,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Percent,
  X,
  Share2,
  Truck,
  CreditCard,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCompanySettings } from '../../context/CompanyContext';

// Existing standard application colors for data visualizations
const CORPORATE_COLORS = [
  '#0f172a', // Primary Navy
  '#2563eb', // Royal Blue
  '#4f46e5', // Indigo
  '#0891b2', // Cyan / Teal
  '#d97706', // Amber
  '#64748b', // Slate
  '#7c3aed', // Purple
  '#059669', // Emerald
];

const formatLocalYMD = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ReportsPage = ({
  standardRoutes = [],
  parcelTypes = [],
  companySettings: propCompanySettings,
  onOpenReceipt,
  onOpenWhatsApp,
}) => {
  const { showToast } = useToast();
  const { companySettings: contextCompanySettings } = useCompanySettings();
  const company = propCompanySettings || contextCompanySettings || {};

  // Active Sub-Tab: 'analytics' | 'commission' | 'records' | 'routes'
  const [activeTab, setActiveTab] = useState('analytics');

  // Commission Engine States
  const [commissionRate, setCommissionRate] = useState(() => {
    try {
      const saved = localStorage.getItem('jayanth_cargo_commission_rate');
      const parsed = Number(saved);
      return !isNaN(parsed) && parsed >= 0 && parsed <= 100 ? parsed : 30;
    } catch {
      return 30;
    }
  });
  const [commissionOperatorFilter, setCommissionOperatorFilter] = useState('ALL');
  const [commissionSortBy, setCommissionSortBy] = useState('createdAt');
  const [commissionSortOrder, setCommissionSortOrder] = useState('desc');
  const [commissionCurrentPage, setCommissionCurrentPage] = useState(1);
  const [commissionPageSize, setCommissionPageSize] = useState(15);

  const handleCommissionRateChange = (newRate) => {
    const val = Math.max(0, Math.min(100, Number(newRate) || 0));
    setCommissionRate(val);
    try {
      localStorage.setItem('jayanth_cargo_commission_rate', String(val));
    } catch {
      // ignore
    }
  };

  // Timeframe & Filter States
  const [timeframe, setTimeframe] = useState('7days'); // 'today', '7days', '30days', 'month', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [parcelType, setParcelType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Table Sorting & Pagination
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Visual Interactive States
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [trendMetric, setTrendMetric] = useState('revenue'); // 'revenue' | 'bookings'
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch Report & Analytics Data
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (timeframe === 'today') {
        const today = formatLocalYMD(new Date());
        params.startDate = today;
        params.endDate = today;
      } else if (timeframe === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        params.startDate = formatLocalYMD(d);
        params.endDate = formatLocalYMD(new Date());
      } else if (timeframe === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        params.startDate = formatLocalYMD(d);
        params.endDate = formatLocalYMD(new Date());
      } else if (timeframe === 'month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = formatLocalYMD(firstDay);
        params.endDate = formatLocalYMD(new Date());
      } else if (timeframe === 'all') {
        const d = new Date();
        d.setDate(d.getDate() - 89);
        params.startDate = formatLocalYMD(d);
        params.endDate = formatLocalYMD(new Date());
      } else if (timeframe === 'custom') {
        const minDate = formatLocalYMD(new Date(Date.now() - 90 * 86400000));
        if (startDate) params.startDate = startDate < minDate ? minDate : startDate;
        if (endDate) params.endDate = endDate;
      }

      if (destination !== 'ALL') params.destination = destination;
      if (status !== 'ALL') params.status = status;
      if (parcelType !== 'ALL') params.parcelType = parcelType;

      const analyticsParams = {
        timeframe,
        ...params,
      };

      const [detailedRes, analyticsRes] = await Promise.allSettled([
        api.reports.getDetailed(params),
        api.reports.getAnalytics(analyticsParams),
      ]);

      if (detailedRes.status === 'fulfilled' && detailedRes.value?.success) {
        setReportData(detailedRes.value);
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.success) {
        setAnalyticsData(analyticsRes.value);
      }
    } catch (error) {
      showToast(error.message || 'Failed to generate operations report', 'error');
    } finally {
      setLoading(false);
    }
  }, [timeframe, startDate, endDate, destination, status, parcelType, showToast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    setCurrentPage(1);
    setCommissionCurrentPage(1);

    const now = new Date();
    if (tf === 'today') {
      const today = formatLocalYMD(now);
      setStartDate(today);
      setEndDate(today);
    } else if (tf === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(formatLocalYMD(d));
      setEndDate(formatLocalYMD(now));
    } else if (tf === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      setStartDate(formatLocalYMD(d));
      setEndDate(formatLocalYMD(now));
    } else if (tf === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatLocalYMD(firstDay));
      setEndDate(formatLocalYMD(now));
    } else if (tf === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered and Sorted Bookings for Audit Table
  const filteredBookings = useMemo(() => {
    if (!reportData?.data) return [];
    let items = [...reportData.data];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((b) => {
        const orderIdMatch = b.orderId && b.orderId.toLowerCase().includes(q);
        const nameMatch = b.customerName && b.customerName.toLowerCase().includes(q);
        const phoneMatch = b.customerPhone && b.customerPhone.includes(q);
        const destMatch = b.destination && b.destination.toLowerCase().includes(q);
        const busMatch = b.busDetails?.busNumber && b.busDetails.busNumber.toLowerCase().includes(q);
        const receiverMatch = b.receiverName && b.receiverName.toLowerCase().includes(q);
        return orderIdMatch || nameMatch || phoneMatch || destMatch || busMatch || receiverMatch;
      });
    }

    items.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === 'amount' || sortBy === 'weight' || sortBy === 'quantity') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [reportData, searchQuery, sortBy, sortOrder]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Route Summary Aggregations
  const routeSummaries = useMemo(() => {
    if (!reportData?.data) return [];
    const map = {};

    reportData.data.forEach((b) => {
      const dest = b.destination || 'Standard Route';
      if (!map[dest]) {
        map[dest] = {
          route: dest,
          bookingsCount: 0,
          totalRevenue: 0,
          totalWeight: 0,
          totalQty: 0,
          deliveredCount: 0,
          inTransitCount: 0,
          waitingCount: 0,
          busCounts: {},
        };
      }

      map[dest].bookingsCount += 1;
      if (b.status !== 'CANCELLED') {
        map[dest].totalRevenue += Number(b.amount || 0);
      }
      map[dest].totalWeight += Number(b.weight || 0);
      map[dest].totalQty += Number(b.quantity || 1);

      if (b.status === 'DELIVERED') map[dest].deliveredCount += 1;
      else if (b.status === 'DISPATCHED') map[dest].inTransitCount += 1;
      else if (b.status === 'WAITING_FOR_BUS' || b.status === 'BOOKED') map[dest].waitingCount += 1;

      if (b.busDetails?.busNumber) {
        const bn = b.busDetails.busNumber.toUpperCase();
        map[dest].busCounts[bn] = (map[dest].busCounts[bn] || 0) + 1;
      }
    });

    const totalRevAll = reportData.summary?.totalRevenue || 1;

    return Object.values(map)
      .map((r) => {
        let topBus = 'Unassigned';
        let maxBusCount = 0;
        Object.entries(r.busCounts).forEach(([bNum, cnt]) => {
          if (cnt > maxBusCount) {
            maxBusCount = cnt;
            topBus = bNum;
          }
        });

        const avgTicket = r.bookingsCount > 0 ? Math.round(r.totalRevenue / r.bookingsCount) : 0;
        const sharePercent = totalRevAll > 0 ? Math.round((r.totalRevenue / totalRevAll) * 100) : 0;

        return {
          ...r,
          topBus,
          avgTicket,
          sharePercent,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [reportData]);

  // Commission Calculations, Operator List, Summaries & Sorting
  const commissionCalculations = useMemo(() => {
    if (!reportData?.data) {
      return {
        allCalculated: [],
        filteredList: [],
        operatorList: [],
        operatorSummaries: [],
        stats: {
          totalOrders: 0,
          totalFreight: 0,
          totalOurCommission: 0,
          totalTravelsPayable: 0,
          paidCounterTotal: 0,
          paidOurShare: 0,
          paidTravelsShare: 0,
          toPayDeliveryTotal: 0,
          toPayOurShare: 0,
          toPayTravelsShare: 0,
        },
      };
    }

    // 1. Calculate order-wise split for all filtered records
    const allCalculated = filteredBookings.map((b) => {
      const isCancelled = b.status === 'CANCELLED';
      const orderAmount = isCancelled ? 0 : Number(b.amount || 0);
      const ourCut = isCancelled ? 0 : Math.round((orderAmount * commissionRate) / 100);
      const travelsCut = isCancelled ? 0 : orderAmount - ourCut;
      const operatorName =
        b.busDetails?.operator?.trim() ||
        b.busDetails?.busName?.trim() ||
        (b.busDetails?.busNumber?.trim() ? `Bus ${b.busDetails.busNumber.trim()}` : 'Unassigned Travels');
      const isPaid = (b.paymentStatus || 'PAID') === 'PAID';

      return {
        ...b,
        orderAmount,
        ourCut,
        travelsCut,
        operatorName,
        isCancelled,
        isPaid,
      };
    });

    // 2. Extract unique travels operators
    const operatorSet = new Set();
    allCalculated.forEach((item) => {
      if (item.operatorName) operatorSet.add(item.operatorName);
    });
    const operatorList = Array.from(operatorSet).sort();

    // 3. Filter by selected travels operator if active
    let filteredList = allCalculated;
    if (commissionOperatorFilter !== 'ALL') {
      filteredList = allCalculated.filter((item) => item.operatorName === commissionOperatorFilter);
    }

    // 4. Sort filteredList based on commissionSortBy
    filteredList.sort((a, b) => {
      let valA = a[commissionSortBy];
      let valB = b[commissionSortBy];

      if (commissionSortBy === 'createdAt') {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (commissionSortBy === 'amount' || commissionSortBy === 'orderAmount') {
        valA = a.orderAmount;
        valB = b.orderAmount;
      } else if (commissionSortBy === 'ourCut') {
        valA = a.ourCut;
        valB = b.ourCut;
      } else if (commissionSortBy === 'travelsCut') {
        valA = a.travelsCut;
        valB = b.travelsCut;
      } else if (commissionSortBy === 'operatorName') {
        valA = String(a.operatorName || '').toLowerCase();
        valB = String(b.operatorName || '').toLowerCase();
      } else {
        valA = String(a[commissionSortBy] || '').toLowerCase();
        valB = String(b[commissionSortBy] || '').toLowerCase();
      }

      if (valA < valB) return commissionSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return commissionSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 5. Aggregate KPI statistics & operator summaries
    const stats = {
      totalOrders: filteredList.length,
      totalFreight: 0,
      totalOurCommission: 0,
      totalTravelsPayable: 0,
      paidCounterTotal: 0,
      paidOurShare: 0,
      paidTravelsShare: 0,
      toPayDeliveryTotal: 0,
      toPayOurShare: 0,
      toPayTravelsShare: 0,
    };

    const opMap = {};

    filteredList.forEach((c) => {
      stats.totalFreight += c.orderAmount;
      stats.totalOurCommission += c.ourCut;
      stats.totalTravelsPayable += c.travelsCut;

      if (c.isPaid) {
        stats.paidCounterTotal += c.orderAmount;
        stats.paidOurShare += c.ourCut;
        stats.paidTravelsShare += c.travelsCut;
      } else {
        stats.toPayDeliveryTotal += c.orderAmount;
        stats.toPayOurShare += c.ourCut;
        stats.toPayTravelsShare += c.travelsCut;
      }

      const op = c.operatorName;
      if (!opMap[op]) {
        opMap[op] = {
          name: op,
          orders: 0,
          totalFreight: 0,
          ourCommission: 0,
          travelsPayable: 0,
          buses: new Set(),
        };
      }
      opMap[op].orders += 1;
      opMap[op].totalFreight += c.orderAmount;
      opMap[op].ourCommission += c.ourCut;
      opMap[op].travelsPayable += c.travelsCut;
      if (c.busDetails?.busNumber) {
        opMap[op].buses.add(c.busDetails.busNumber);
      }
    });

    const operatorSummaries = Object.values(opMap)
      .map((item) => ({
        ...item,
        busesCount: item.buses.size,
      }))
      .sort((a, b) => b.totalFreight - a.totalFreight);

    return {
      allCalculated,
      filteredList,
      operatorList,
      operatorSummaries,
      stats,
    };
  }, [reportData, filteredBookings, commissionRate, commissionOperatorFilter, commissionSortBy, commissionSortOrder]);

  const commissionStats = commissionCalculations.stats;
  const commissionList = commissionCalculations.filteredList;
  const commissionTotalPages = Math.ceil(commissionList.length / commissionPageSize) || 1;
  const paginatedCommissionBookings = useMemo(() => {
    const start = (commissionCurrentPage - 1) * commissionPageSize;
    return commissionList.slice(start, start + commissionPageSize);
  }, [commissionList, commissionCurrentPage, commissionPageSize]);

  // Dynamic Daily Trends for Charts
  const dailyTrends = useMemo(() => {
    if (analyticsData?.dailyTrend && analyticsData.dailyTrend.length > 0) {
      return analyticsData.dailyTrend;
    }

    if (!reportData?.data) return [];
    const map = {};
    const now = new Date();
    let days = 7;
    if (timeframe === 'today') days = 1;
    else if (timeframe === '30days') days = 30;
    else if (timeframe === 'month') days = now.getDate();
    else if (timeframe === 'all') days = 14;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = formatLocalYMD(d);
      const shortDay = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      map[key] = { date: key, shortDay, label, bookings: 0, revenue: 0, delivered: 0, dispatched: 0 };
    }

    reportData.data.forEach((b) => {
      const dateKey = formatLocalYMD(b.createdAt);
      if (map[dateKey]) {
        map[dateKey].bookings += 1;
        if (b.status !== 'CANCELLED') map[dateKey].revenue += (b.amount || 0);
        if (b.status === 'DELIVERED') map[dateKey].delivered += 1;
        if (b.status === 'DISPATCHED') map[dateKey].dispatched += 1;
      }
    });

    return Object.values(map);
  }, [analyticsData, reportData, timeframe]);

  const maxTrendBookings = Math.max(...dailyTrends.map((d) => d.bookings), 5);
  const maxTrendRevenue = Math.max(...dailyTrends.map((d) => d.revenue), 500);

  // Status Distribution for Donut Chart
  const statusDist = useMemo(() => {
    if (analyticsData?.statusDistribution && analyticsData.statusDistribution.length > 0) {
      return analyticsData.statusDistribution;
    }
    const counts = reportData?.summary?.statusCounts || {};
    return [
      { label: 'Delivered', count: counts.DELIVERED || 0, color: '#0f172a' },
      { label: 'Dispatched / In-Transit', count: counts.DISPATCHED || 0, color: '#2563eb' },
      { label: 'Waiting for Bus', count: counts.WAITING_FOR_BUS || 0, color: '#d97706' },
      { label: 'Cancelled', count: counts.CANCELLED || 0, color: '#dc2626' },
    ];
  }, [analyticsData, reportData]);

  const totalStatusCount = statusDist.reduce((acc, s) => acc + (s.count || 0), 0) || 1;
  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const donutSlices = statusDist.map((item, idx) => {
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

  // Parcel Type Distribution for Pie / Bar
  const parcelTypeDist = useMemo(() => {
    if (analyticsData?.parcelTypeDistribution && analyticsData.parcelTypeDistribution.length > 0) {
      return analyticsData.parcelTypeDistribution;
    }
    if (!reportData?.data) return [];
    const map = {};
    reportData.data.forEach((b) => {
      const pt = b.parcelType || 'Standard Box';
      if (!map[pt]) map[pt] = { name: pt, count: 0, revenue: 0 };
      map[pt].count += 1;
      if (b.status !== 'CANCELLED') map[pt].revenue += (b.amount || 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [analyticsData, reportData]);

  const totalParcelCount = parcelTypeDist.reduce((sum, p) => sum + (p.count || 0), 0) || 1;
  let accumulatedPieAngle = 0;
  const pieSlices = parcelTypeDist.map((item, idx) => {
    const percent = item.count / totalParcelCount;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPieAngle * circumference;
    accumulatedPieAngle += percent;
    return {
      ...item,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color: CORPORATE_COLORS[idx % CORPORATE_COLORS.length],
      idx,
    };
  });

  // Hourly Peak Operational Intake
  const hourlyDist = useMemo(() => {
    if (analyticsData?.hourlyDistribution && analyticsData.hourlyDistribution.length > 0) {
      return analyticsData.hourlyDistribution;
    }
    const map = {
      'Morning (06-12)': 0,
      'Afternoon (12-17)': 0,
      'Evening (17-21)': 0,
      'Night (21-06)': 0,
    };
    if (reportData?.data) {
      reportData.data.forEach((b) => {
        if (b.createdAt) {
          const hour = new Date(b.createdAt).getHours();
          if (hour >= 6 && hour < 12) map['Morning (06-12)'] += 1;
          else if (hour >= 12 && hour < 17) map['Afternoon (12-17)'] += 1;
          else if (hour >= 17 && hour < 21) map['Evening (17-21)'] += 1;
          else map['Night (21-06)'] += 1;
        }
      });
    }
    return Object.entries(map).map(([slot, count]) => ({ slot, count }));
  }, [analyticsData, reportData]);

  const maxHourlyCount = Math.max(...hourlyDist.map((h) => h.count), 1);

  // Bus Fleet Dispatches Volume
  const busFleetVolume = useMemo(() => {
    if (analyticsData?.fleetVolume && analyticsData.fleetVolume.length > 0) {
      return analyticsData.fleetVolume;
    }
    if (!reportData?.data) return [];
    const map = {};
    reportData.data.forEach((b) => {
      if (b.busDetails?.busNumber) {
        const busNo = b.busDetails.busNumber.toUpperCase();
        if (!map[busNo]) {
          map[busNo] = {
            busNumber: busNo,
            busName: b.busDetails.busName || '',
            operator: b.busDetails.operator || '',
            departureTime: b.busDetails.departureTime || '',
            packages: 0,
            revenue: 0,
          };
        }
        map[busNo].packages += 1;
        if (b.status !== 'CANCELLED') map[busNo].revenue += (b.amount || 0);
      }
    });
    return Object.values(map).sort((a, b) => b.packages - a.packages).slice(0, 5);
  }, [analyticsData, reportData]);

  // Payment Settlement Split
  const paymentSplit = useMemo(() => {
    if (analyticsData?.paymentSplit) {
      return analyticsData.paymentSplit;
    }
    let paidAmt = 0;
    let toPayAmt = 0;
    let paidCount = 0;
    let toPayCount = 0;
    if (reportData?.data) {
      reportData.data.forEach((b) => {
        const amt = Number(b.amount) || 0;
        if (b.paymentStatus === 'PAID') {
          paidCount += 1;
          if (b.status !== 'CANCELLED') paidAmt += amt;
        } else {
          toPayCount += 1;
          if (b.status !== 'CANCELLED') toPayAmt += amt;
        }
      });
    }
    return {
      PAID: paidCount,
      TO_PAY: toPayCount,
      PAID_AMOUNT: paidAmt,
      TO_PAY_AMOUNT: toPayAmt,
    };
  }, [analyticsData, reportData]);

  // Operational KPIs Summary
  const summaryMetrics = useMemo(() => {
    const totalBookings = reportData?.summary?.totalBookings || 0;
    const totalRevenue = reportData?.summary?.totalRevenue || 0;
    const totalQty = reportData?.summary?.totalQuantity || 0;
    const totalWeight = reportData?.summary?.totalWeight || 0;
    const statusCounts = reportData?.summary?.statusCounts || {};
    const delivered = statusCounts.DELIVERED || 0;
    const dispatched = statusCounts.DISPATCHED || 0;
    const pendingDispatch = statusCounts.WAITING_FOR_BUS || 0;
    const cancelled = statusCounts.CANCELLED || 0;

    const avgTicket = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
    const avgPerKg = totalWeight > 0 ? Math.round(totalRevenue / totalWeight) : 0;
    const fulfillmentRate = totalBookings > 0 ? Math.round(((delivered + dispatched) / totalBookings) * 100) : 0;

    return {
      totalBookings,
      totalRevenue,
      totalQty,
      totalWeight,
      delivered,
      dispatched,
      pendingDispatch,
      cancelled,
      avgTicket,
      avgPerKg,
      fulfillmentRate,
    };
  }, [reportData]);

  // Active Tenure label & human-readable date range
  const tenureInfo = useMemo(() => {
    const labels = {
      today: 'Today',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time (90 Days)',
      custom: 'Custom Range',
    };
    const activeLabel = labels[timeframe] || 'Selected Tenure';

    let rangeText = '';
    const now = new Date();
    if (timeframe === 'today') {
      rangeText = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } else if (timeframe === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      rangeText = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (timeframe === '30days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      rangeText = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (timeframe === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeText = `${first.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else if (timeframe === 'all') {
      const d = new Date(now);
      d.setDate(d.getDate() - 89);
      rangeText = `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Active 90-Day Retention Window)`;
    } else if (timeframe === 'custom') {
      rangeText = startDate && endDate ? `${startDate} to ${endDate}` : 'Select dates (Last 90 Days)';
    }

    return { activeLabel, rangeText };
  }, [timeframe, startDate, endDate]);

  // EXPORT 1: Full Filtered Consignments CSV
  const handleExportFilteredCSV = () => {
    if (filteredBookings.length === 0) {
      showToast('No consignment records found to export', 'error');
      return;
    }

    const headers = [
      'Order ID',
      'Sender Name',
      'Sender Mobile',
      'Receiver Name',
      'Receiver Phone',
      'From City',
      'Destination Route',
      'Delivery Address',
      'Parcel Type',
      'Quantity',
      'Weight (kg)',
      'Delivery Charge (INR)',
      'Payment Status',
      'Status',
      'Bus Number',
      'Bus Operator',
      'Departure Time',
      'Booking Date',
      'Dispatched Date',
      'Delivered Date',
    ];

    const rows = filteredBookings.map((b) => [
      b.orderId,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      b.customerPhone || '',
      `"${(b.receiverName || '').replace(/"/g, '""')}"`,
      b.receiverPhone || '',
      `"${(b.fromCity || '').replace(/"/g, '""')}"`,
      `"${(b.destination || '').replace(/"/g, '""')}"`,
      `"${(b.deliveryAddress || '').replace(/"/g, '""')}"`,
      `"${(b.parcelType || 'Parcel').replace(/"/g, '""')}"`,
      b.quantity || 1,
      b.weight || 0,
      b.amount || 0,
      b.paymentStatus || 'PAID',
      b.status,
      b.busDetails?.busNumber || '',
      `"${(b.busDetails?.busName || b.busDetails?.operator || '').replace(/"/g, '""')}"`,
      b.busDetails?.departureTime || '',
      new Date(b.createdAt).toISOString().split('T')[0],
      b.busDetails?.dispatchedAt ? new Date(b.busDetails.dispatchedAt).toISOString().split('T')[0] : '',
      b.deliveredAt ? new Date(b.deliveredAt).toISOString().split('T')[0] : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Courier_Consignment_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
    showToast(`Exported ${filteredBookings.length} consignment records to CSV!`, 'success');
  };

  // EXPORT 2: Route Breakdown Summary CSV
  const handleExportRouteSummaryCSV = () => {
    if (routeSummaries.length === 0) {
      showToast('No route summary data available to export', 'error');
      return;
    }

    const headers = [
      'Destination Route',
      'Total Consignments',
      'Total Quantity (pcs)',
      'Total Weight (kg)',
      'Freight Revenue (INR)',
      'Avg Yield per Consignment (INR)',
      'Revenue Share (%)',
      'Successfully Delivered',
      'Active In-Transit',
      'Primary Bus Fleet',
    ];

    const rows = routeSummaries.map((r) => [
      `"${r.route.replace(/"/g, '""')}"`,
      r.bookingsCount,
      r.totalQty,
      r.totalWeight,
      r.totalRevenue,
      r.avgTicket,
      `${r.sharePercent}%`,
      r.deliveredCount,
      r.inTransitCount,
      `"${r.topBus.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Route_Revenue_Yield_Summary_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
    showToast(`Exported ${routeSummaries.length} route summaries to CSV!`, 'success');
  };

  // EXPORT 3: Commission & Travels Settlement CSV
  const handleExportCommissionCSV = () => {
    if (commissionList.length === 0) {
      showToast('No commission records available to export', 'error');
      return;
    }

    const headers = [
      'Order ID',
      'Booking Date',
      'Customer / Sender',
      'Sender Mobile',
      'Receiver Name',
      'Destination Route',
      'Travels / Bus Carrier',
      'Bus Number',
      'Payment Status',
      'Consignment Status',
      'Total Freight (INR)',
      'Commission Rate (%)',
      'Our Commission Share (INR)',
      'Travels Payout Share (INR)',
      'Cash Flow Settlement Directive',
    ];

    const rows = commissionList.map((c) => [
      c.orderId,
      new Date(c.createdAt).toISOString().split('T')[0],
      `"${(c.customerName || '').replace(/"/g, '""')}"`,
      c.customerPhone || '',
      `"${(c.receiverName || '').replace(/"/g, '""')}"`,
      `"${(c.destination || '').replace(/"/g, '""')}"`,
      `"${(c.operatorName || 'Unassigned').replace(/"/g, '""')}"`,
      c.busDetails?.busNumber || '',
      c.paymentStatus || 'PAID',
      c.status,
      c.orderAmount,
      `${commissionRate}%`,
      c.ourCut,
      c.travelsCut,
      c.isPaid
        ? `"Jayanth Cargo collected counter cash. We remit INR ${c.travelsCut} to Travels."`
        : `"Travels collects at delivery. Travels remits INR ${c.ourCut} commission to Jayanth Cargo."`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Commission_Settlement_${commissionRate}pct_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
    showToast(`Exported ${commissionList.length} commission settlement records to CSV!`, 'success');
  };

  // EXPORT 4: Structured JSON Backup
  const handleExportJSON = () => {
    if (filteredBookings.length === 0) {
      showToast('No records to export', 'error');
      return;
    }

    const exportPayload = {
      company: company.companyName || 'Sri Vinayaka Logistics',
      exportedAt: new Date().toISOString(),
      timeframe,
      filters: { destination, status, parcelType, startDate, endDate },
      summary: summaryMetrics,
      totalRecords: filteredBookings.length,
      consignments: filteredBookings,
      routeSummaries,
      parcelTypeBreakdown: parcelTypeDist,
      paymentSplit,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Courier_Operations_Analytics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
    showToast('Exported structured report JSON file!', 'success');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ paddingBottom: '2.5rem' }}>
      {/* 1. TOP HEADER & EXPORT ACTIONS */}
      <div className="page-header no-print" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} color="#0f172a" />
            <h1 className="page-title" style={{ margin: 0 }}>Revenue & Performance Reports</h1>
          </div>
          <p className="page-subtitle" style={{ margin: '3px 0 0 0' }}>
            Financial summaries, payment settlements, and exportable ledger manifests
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchReportData}
            disabled={loading}
            title="Refresh analytics & report data"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePrintReport}
            title="Print printable official ledger"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportFilteredCSV}
            title="Export Excel-compatible CSV data directly"
          >
            <Download size={14} />
            <span>Export Data</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowExportModal(true)}
            title="More Export Options (Route summaries, Commission splits, JSON)"
            style={{ padding: '4px 8px' }}
          >
            •••
          </button>
        </div>
      </div>

      {/* 2. UNIFIED CORPORATE FILTER BAR & SUB-TAB SWITCHER */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Preset Timeframe Buttons */}
          <div className="reports-timeframe-bar">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time (90 Days)' },
              { id: 'custom', label: 'Custom Range' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: timeframe === t.id ? 700 : 500,
                  backgroundColor: timeframe === t.id ? '#0f172a' : 'transparent',
                  color: timeframe === t.id ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab Navigation Switcher */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'analytics' ? 700 : 500,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === 'analytics' ? '#0f172a' : 'transparent',
                color: activeTab === 'analytics' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={13} />
              <span>Visual Analytics & Insights</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('commission')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'commission' ? 700 : 500,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === 'commission' ? '#0f172a' : 'transparent',
                color: activeTab === 'commission' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Percent size={13} />
              <span>Commission ({commissionStats.totalOrders})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('records')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'records' ? 700 : 500,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === 'records' ? '#0f172a' : 'transparent',
                color: activeTab === 'records' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FileText size={13} />
              <span>Consignment Audit Ledger ({filteredBookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('routes')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: activeTab === 'routes' ? 700 : 500,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeTab === 'routes' ? '#0f172a' : 'transparent',
                color: activeTab === 'routes' ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <MapPin size={13} />
              <span>Route Yields ({routeSummaries.length})</span>
            </button>
          </div>
        </div>

        {/* Active Tenure Status Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.65rem',
            padding: '6px 12px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
            <Calendar size={13} color="#2563eb" />
            <span style={{ fontWeight: 600 }}>Active Period:</span>
            <span style={{ color: '#0f172a', fontWeight: 700, backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '3px' }}>
              {tenureInfo.activeLabel}
            </span>
            <span style={{ color: '#64748b' }}>({tenureInfo.rangeText})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '0.75rem' }}>
            <span>
              Orders in Period: <strong style={{ color: '#0f172a' }}>{filteredBookings.length}</strong>
            </span>
            <span>•</span>
            <span>
              Freight Total: <strong style={{ color: '#0f172a' }}>₹{(summaryMetrics.totalRevenue || 0).toLocaleString('en-IN')}</strong>
            </span>
          </div>
        </div>

        {/* Dropdown Filters & Search Input */}
        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center' }}>
          {timeframe === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>From:</span>
              <input
                type="date"
                className="form-control"
                min={formatLocalYMD(new Date(Date.now() - 90 * 86400000))}
                max={formatLocalYMD(new Date())}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '130px', padding: '2px 4px', fontSize: '0.75rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>To:</span>
              <input
                type="date"
                className="form-control"
                min={formatLocalYMD(new Date(Date.now() - 90 * 86400000))}
                max={formatLocalYMD(new Date())}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '130px', padding: '2px 4px', fontSize: '0.75rem' }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchReportData} style={{ padding: '2px 6px', fontSize: '0.6875rem' }}>
                Apply
              </button>
            </div>
          )}

          <select
            className="form-control"
            style={{ width: '150px', fontSize: '0.8125rem' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="WAITING_FOR_BUS">Waiting for Bus</option>
            <option value="DISPATCHED">Dispatched on Bus</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            className="form-control"
            style={{ width: '180px', fontSize: '0.8125rem' }}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="ALL">All Destinations</option>
            {standardRoutes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ width: '150px', fontSize: '0.8125rem' }}
            value={parcelType}
            onChange={(e) => setParcelType(e.target.value)}
          >
            <option value="ALL">All Cargo Types</option>
            {parcelTypes.map((pt) => (
              <option key={pt._id || pt.name} value={pt.name}>
                {pt.name}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search Order ID, sender, receiver, phone, bus..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '32px', fontSize: '0.8125rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 5 EXECUTIVE KPI SCORECARD (HIDDEN ON COMMISSION TAB FOR CLEAN UI) */}
      {activeTab !== 'commission' && (
        <div className="dashboard-stats-grid" style={{ marginBottom: '1.25rem' }}>
          {/* Card 1: Freight Revenue */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Freight Revenue</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <IndianRupee size={18} />
              </div>
            </div>
            <div className="stat-card-value">₹{(summaryMetrics.totalRevenue || 0).toLocaleString('en-IN')}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Avg Yield: ₹{summaryMetrics.avgTicket} / order</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{summaryMetrics.avgPerKg}/kg rate</span>
            </div>
          </div>

          {/* Card 2: Total Volume */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Total Consignments</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <Package size={18} />
              </div>
            </div>
            <div className="stat-card-value">{summaryMetrics.totalBookings}</div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{summaryMetrics.totalQty} items total</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{summaryMetrics.totalWeight} kg gross</span>
            </div>
          </div>

          {/* Card 3: Dispatched & In-Transit */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">In-Transit on Fleet</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <Bus size={18} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: '#2563eb' }}>
              {summaryMetrics.dispatched}
            </div>
            <div className="stat-card-caption">
              Waiting in terminal bay: {summaryMetrics.pendingDispatch}
            </div>
          </div>

          {/* Card 4: Successfully Delivered */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Delivered & Handed Over</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: '#0f172a' }}>
              {summaryMetrics.delivered}
            </div>
            <div className="stat-card-caption">
              Fulfillment: {summaryMetrics.fulfillmentRate}% completed
            </div>
          </div>

          {/* Card 5: Payment Settlement Ratio */}
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-label">Settlement Collection</span>
              <div className="stat-card-icon" style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div className="stat-card-value" style={{ color: '#0f172a' }}>
              ₹{(paymentSplit.PAID_AMOUNT || 0).toLocaleString('en-IN')}
            </div>
            <div className="stat-card-caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Paid: {paymentSplit.PAID}</span>
              <span style={{ fontWeight: 600, color: '#d97706' }}>To-Pay: ₹{(paymentSplit.TO_PAY_AMOUNT || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 1: VISUAL ANALYTICS & DEEP OPERATIONAL INSIGHTS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Row 1: Daily Revenue Trajectory (Interactive Bar Chart) + Status Donut */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {/* Visual Chart 1: Daily Trend */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BarChart3 size={16} color="#0f172a" />
                    <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                      Operational Volume & Financial Trajectory
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Daily intake velocity and revenue collections across the timeline
                  </p>
                </div>

                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '4px', padding: '2px', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('bookings')}
                    style={{
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      fontSize: '0.6875rem',
                      fontWeight: trendMetric === 'bookings' ? 700 : 500,
                      backgroundColor: trendMetric === 'bookings' ? '#0f172a' : 'transparent',
                      color: trendMetric === 'bookings' ? '#ffffff' : '#475569',
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
                      borderRadius: '3px',
                      fontSize: '0.6875rem',
                      fontWeight: trendMetric === 'revenue' ? 700 : 500,
                      backgroundColor: trendMetric === 'revenue' ? '#0f172a' : 'transparent',
                      color: trendMetric === 'revenue' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Revenue (₹)
                  </button>
                </div>
              </div>

              {dailyTrends.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  No consignment data in this timeframe
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px', padding: '0 0.5rem 0.5rem 0.5rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderBottom: '1px dashed #f1f5f9' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderBottom: '1px dashed #f1f5f9' }} />

                    {dailyTrends.map((d, i) => {
                      const val = trendMetric === 'bookings' ? d.bookings : d.revenue;
                      const maxVal = trendMetric === 'bookings' ? maxTrendBookings : maxTrendRevenue;
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
                                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                pointerEvents: 'none',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 700 }}>{d.label || d.date}</div>
                              <div>{trendMetric === 'revenue' ? `₹${d.revenue.toLocaleString('en-IN')}` : `${d.bookings} parcels`}</div>
                            </div>
                          )}

                          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: isHovered ? '#0f172a' : '#64748b', marginBottom: '3px' }}>
                            {trendMetric === 'revenue' ? (val > 0 ? `₹${val}` : '0') : val}
                          </div>

                          <div
                            style={{
                              width: '100%',
                              maxWidth: '36px',
                              height: `${heightPercent}%`,
                              backgroundColor: isHovered ? '#2563eb' : '#0f172a',
                              borderRadius: '4px 4px 0 0',
                              transition: 'all 0.15s ease',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', padding: '0 0.5rem' }}>
                    {dailyTrends.map((d) => (
                      <span key={d.date} style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                        {d.shortDay || d.date.slice(5)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Visual Chart 2: Delivery Fulfillment Status Donut */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <PieChart size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Consignment Status Pipeline
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                Operational fulfillment pipeline from terminal booking to destination handover
              </p>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="150" height="150" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                    {donutSlices.map((slice) => {
                      if (slice.count === 0) return null;
                      const isHovered = hoveredDonutIndex === slice.idx;
                      return (
                        <circle
                          key={slice.label}
                          cx="80"
                          cy="80"
                          r={radius}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                          strokeDasharray={slice.strokeDasharray}
                          strokeDashoffset={slice.strokeDashoffset}
                          style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredDonutIndex(slice.idx)}
                          onMouseLeave={() => setHoveredDonutIndex(null)}
                        />
                      );
                    })}
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                      {hoveredDonutIndex !== null && statusDist[hoveredDonutIndex]
                        ? statusDist[hoveredDonutIndex].count
                        : summaryMetrics.totalBookings}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                      {hoveredDonutIndex !== null && statusDist[hoveredDonutIndex]
                        ? statusDist[hoveredDonutIndex].label.split(' ')[0]
                        : 'Consignments'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px' }}>
                  {donutSlices.map((slice) => (
                    <div
                      key={slice.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: hoveredDonutIndex === slice.idx ? '#f8fafc' : 'transparent',
                        border: hoveredDonutIndex === slice.idx ? '1px solid #e2e8f0' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                      onMouseEnter={() => setHoveredDonutIndex(slice.idx)}
                      onMouseLeave={() => setHoveredDonutIndex(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }} />
                        <span style={{ color: '#334155', fontWeight: hoveredDonutIndex === slice.idx ? 700 : 500 }}>{slice.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {slice.count} ({slice.percent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Route Corridors + Cargo Types + Payment Mix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Top Revenue Route Corridors */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} color="#0f172a" />
                  <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                    Top Destination Route Yields
                  </h3>
                </div>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>By Gross Income</span>
              </div>

              {routeSummaries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.8125rem' }}>
                  No route records found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {routeSummaries.slice(0, 5).map((r, idx) => (
                    <div key={r.route}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', marginBottom: '3px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          <span style={{ color: '#64748b', marginRight: '6px' }}>#{idx + 1}</span>
                          {r.route}
                        </div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          ₹{r.totalRevenue.toLocaleString('en-IN')} <span style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 400 }}>({r.bookingsCount} orders)</span>
                        </div>
                      </div>

                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(5, r.sharePercent)}%`,
                            backgroundColor: idx === 0 ? '#0f172a' : '#2563eb',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cargo Category Distribution */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                <Layers size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Cargo Category Volume & Value
                </h3>
              </div>

              {parcelTypeDist.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {parcelTypeDist.slice(0, 5).map((pt, pIdx) => (
                    <div
                      key={pt.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                        backgroundColor: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: CORPORATE_COLORS[pIdx % CORPORATE_COLORS.length] }} />
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{pt.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {pt.count} pcs • ₹{pt.revenue?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
                  No cargo category records found
                </div>
              )}
            </div>

            {/* Payment & Cash Settlement Mix */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                <CreditCard size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Payment Settlement Mix
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Paid at Booking Counter
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    ₹{(paymentSplit.PAID_AMOUNT || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                    Instant Counter Settlement ({paymentSplit.PAID || 0} orders)
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    To-Pay on Delivery / Handover
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    ₹{(paymentSplit.TO_PAY_AMOUNT || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
                    Collected at destination counter ({paymentSplit.TO_PAY || 0} orders)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Deep Operational Insights (Bus Fleet Carriers, Peak Counter Hours, Operational Health Metrics) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Operational Insight 1: Bus Carrier Fleet Distribution */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Bus size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Bus Carrier Luggage Distribution
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
                Consignments dispatched via scheduled carrier runs
              </p>

              {busFleetVolume.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {busFleetVolume.map((bus) => (
                    <div
                      key={bus.busNumber}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8125rem',
                        backgroundColor: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>{bus.busNumber}</strong>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {bus.operator || bus.busName || 'Scheduled Run'} {bus.departureTime ? `• ${bus.departureTime}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{bus.packages} pkgs</span>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>₹{bus.revenue.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
                  No bus assignments in this period
                </div>
              )}
            </div>

            {/* Operational Insight 2: Peak Counter Booking Operational Hours */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Clock size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Peak Booking Operational Hours
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
                Counter intake frequency across business hours
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {hourlyDist.map((slot) => {
                  const widthPercent = Math.max(Math.round((slot.count / maxHourlyCount) * 100), slot.count > 0 ? 10 : 2);
                  return (
                    <div key={slot.slot}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{slot.slot}</span>
                        <strong>{slot.count} bookings</strong>
                      </div>
                      <div style={{ height: '6px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${widthPercent}%`, backgroundColor: slot.count > 0 ? '#0f172a' : '#cbd5e1', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Insight 3: Operations & SLA Health Scorecard */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={16} color="#0f172a" />
                <h3 style={{ fontSize: '0.9375rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Operational Health & SLA Metrics
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
                Logistics quality and reliability benchmarks
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Fulfillment Velocity Index:</span>
                  <strong style={{ color: '#0f172a' }}>{summaryMetrics.fulfillmentRate}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Avg Weight / Consignment:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {summaryMetrics.totalBookings > 0 ? (summaryMetrics.totalWeight / summaryMetrics.totalBookings).toFixed(1) : 0} kg
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Cancellation Rate:</span>
                  <strong style={{ color: summaryMetrics.cancelled > 0 ? '#dc2626' : '#16a34a' }}>
                    {summaryMetrics.totalBookings > 0 ? ((summaryMetrics.cancelled / summaryMetrics.totalBookings) * 100).toFixed(1) : '0.0'}%
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Terminal Bay Dispatch SLA:</span>
                  <strong style={{ color: '#16a34a' }}>Same-Day Run</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: COMMISSION & TRAVELS SETTLEMENT */}
      {activeTab === 'commission' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* A. Sleek Commission Configurator & Inline Metric Strip */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            {/* Top Toolbar: Dynamic Percentage Field + Carrier Filter + Export */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Percent size={15} />
                  </div>
                  <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>Commission Rate:</strong>
                </div>

                {/* Dynamic Percentage Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => handleCommissionRateChange(e.target.value)}
                      className="form-control"
                      style={{
                        width: '70px',
                        padding: '4px 22px 4px 8px',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#0f172a',
                        borderColor: '#2563eb',
                      }}
                    />
                    <span style={{ position: 'absolute', right: '8px', fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', pointerEvents: 'none' }}>
                      %
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '3px', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '5px' }}>
                    {[15, 20, 25, 30, 40, 50].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleCommissionRateChange(rate)}
                        style={{
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: commissionRate === rate ? 700 : 500,
                          backgroundColor: commissionRate === rate ? '#0f172a' : 'transparent',
                          color: commissionRate === rate ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    (Travels receives: <strong style={{ color: '#2563eb' }}>{100 - commissionRate}%</strong>)
                  </span>
                </div>
              </div>

              {/* Right Side: Carrier Filter and Export */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  className="form-control"
                  style={{ width: '190px', fontSize: '0.75rem', padding: '4px 8px' }}
                  value={commissionOperatorFilter}
                  onChange={(e) => {
                    setCommissionOperatorFilter(e.target.value);
                    setCommissionCurrentPage(1);
                  }}
                >
                  <option value="ALL">All Travels & Carriers ({commissionCalculations.operatorList.length})</option>
                  {commissionCalculations.operatorList.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportCommissionCSV}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Inline Metric Summary Strip (Replaces Bulky KPI Cards) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.6rem',
                backgroundColor: '#f8fafc',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748b' }}>Total Consignments:</span>
                <strong style={{ color: '#0f172a' }}>{commissionStats.totalOrders} orders</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748b' }}>Total Freight Revenue:</span>
                <strong style={{ color: '#0f172a' }}>₹{commissionStats.totalFreight.toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748b' }}>Our Share ({commissionRate}%):</span>
                <strong style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                  +₹{commissionStats.totalOurCommission.toLocaleString('en-IN')}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748b' }}>Travels Share ({100 - commissionRate}%):</span>
                <strong style={{ color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                  ₹{commissionStats.totalTravelsPayable.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          {/* D. Order-by-Order Commission Ledger Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {/* Table Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
                Showing {paginatedCommissionBookings.length} of {commissionList.length} orders
                {commissionOperatorFilter !== 'ALL' && (
                  <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 700 }}>
                    (Filtered by {commissionOperatorFilter})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span>Page size:</span>
                <select
                  className="form-control"
                  style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={commissionPageSize}
                  onChange={(e) => {
                    setCommissionPageSize(Number(e.target.value));
                    setCommissionCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Table Data - Streamlined Wanted Columns */}
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th
                      onClick={() => {
                        setCommissionSortBy('orderId');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer', width: '110px' }}
                    >
                      Order ID <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th
                      onClick={() => {
                        setCommissionSortBy('createdAt');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer', width: '110px' }}
                    >
                      Date <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th>Destination Route</th>
                    <th
                      onClick={() => {
                        setCommissionSortBy('operatorName');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      Travels / Bus <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th style={{ width: '90px' }}>Payment</th>
                    <th
                      onClick={() => {
                        setCommissionSortBy('orderAmount');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer', textAlign: 'right', width: '120px' }}
                    >
                      Order Total (₹) <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th
                      onClick={() => {
                        setCommissionSortBy('ourCut');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer', textAlign: 'right', width: '135px' }}
                    >
                      Our Share ({commissionRate}%) <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th
                      onClick={() => {
                        setCommissionSortBy('travelsCut');
                        setCommissionSortOrder(commissionSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      style={{ cursor: 'pointer', textAlign: 'right', width: '135px' }}
                    >
                      Travels Share ({100 - commissionRate}%) <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </th>
                    <th className="no-print" style={{ width: '50px', textAlign: 'center' }}>
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCommissionBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                        <Package size={24} style={{ margin: '0 auto 0.4rem auto', color: '#cbd5e1' }} />
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>No consignment records match your filters</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCommissionBookings.map((c) => (
                      <tr key={c._id || c.orderId}>
                        <td>
                          <strong
                            style={{
                              fontFamily: 'monospace',
                              color: '#0f172a',
                              fontSize: '0.875rem',
                              cursor: onOpenReceipt ? 'pointer' : 'default',
                              textDecoration: onOpenReceipt ? 'underline' : 'none',
                            }}
                            onClick={() => onOpenReceipt && onOpenReceipt(c)}
                            title="Click to view official receipt"
                          >
                            #{c.orderId}
                          </strong>
                        </td>

                        <td style={{ color: '#475569' }}>
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td>
                          {(() => {
                            const cleanTo = (c.toCity || (c.destination?.includes('→') ? c.destination.split('→').slice(1).join('→').trim() : (c.destination?.includes('->') ? c.destination.split('->').slice(1).join('->').trim() : c.destination)) || '').trim();
                            const cleanFrom = (c.fromCity || (c.destination?.includes('→') ? c.destination.split('→')[0].trim() : (c.destination?.includes('->') ? c.destination.split('->')[0].trim() : '')) || 'Origin').trim();
                            const cleanRoute = cleanTo && cleanFrom ? `${cleanFrom} → ${cleanTo}` : (c.destination || cleanTo || 'Standard Route');
                            const stop = (c.deliveryAddress || '').trim();
                            const fullTo = stop && cleanTo && !stop.toLowerCase().includes(cleanTo.toLowerCase())
                              ? `${cleanTo} - ${stop}`
                              : (stop || cleanTo);

                            return (
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{cleanRoute}</span>
                                {fullTo && (
                                  <div style={{ fontSize: '0.7rem', color: '#2563eb', marginTop: '2px', fontWeight: 500 }} title={fullTo}>
                                    📍 {fullTo}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Bus size={12} color="#2563eb" />
                            <strong style={{ color: '#0f172a' }}>{c.operatorName}</strong>
                          </div>
                          {c.busDetails?.busNumber && (
                            <div style={{ fontSize: '0.6875rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {c.busDetails.busNumber}
                            </div>
                          )}
                        </td>

                        <td>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: c.isPaid ? '#ecfdf5' : '#fffbeb',
                              color: c.isPaid ? '#047857' : '#b45309',
                              border: c.isPaid ? '1px solid #a7f3d0' : '1px solid #fde68a',
                              display: 'inline-block',
                            }}
                          >
                            {c.isPaid ? 'PAID' : 'TO-PAY'}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>
                            ₹{c.orderAmount.toLocaleString('en-IN')}
                          </strong>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#059669',
                              backgroundColor: '#ecfdf5',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.8125rem',
                              display: 'inline-block',
                            }}
                          >
                            +₹{c.ourCut.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#2563eb',
                              backgroundColor: '#eff6ff',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.8125rem',
                              display: 'inline-block',
                            }}
                          >
                            ₹{c.travelsCut.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="no-print" style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.6875rem' }}
                            onClick={() => onOpenReceipt && onOpenReceipt(c)}
                            title="Print / View Official LR Receipt"
                          >
                            <Printer size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Clean Table Summary Footer */}
                {paginatedCommissionBookings.length > 0 && (
                  <tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                    <tr>
                      <td colSpan={5} style={{ padding: '8px 12px', color: '#0f172a' }}>
                        Total for Filtered Orders ({commissionList.length} orders)
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 12px', color: '#0f172a', fontSize: '0.875rem' }}>
                        ₹{commissionStats.totalFreight.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 12px', color: '#059669', fontSize: '0.875rem' }}>
                        +₹{commissionStats.totalOurCommission.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 12px', color: '#2563eb', fontSize: '0.875rem' }}>
                        ₹{commissionStats.totalTravelsPayable.toLocaleString('en-IN')}
                      </td>
                      <td className="no-print" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            {commissionTotalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Page {commissionCurrentPage} of {commissionTotalPages}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={commissionCurrentPage === 1}
                    onClick={() => setCommissionCurrentPage((prev) => Math.max(1, prev - 1))}
                    style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={commissionCurrentPage === commissionTotalPages}
                    onClick={() => setCommissionCurrentPage((prev) => Math.min(commissionTotalPages, prev + 1))}
                    style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: DETAILED CONSIGNMENT AUDIT RECORDS TABLE */}
      {activeTab === 'records' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>
              Showing {paginatedBookings.length} of {filteredBookings.length} filtered audit records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
              <span>Page size:</span>
              <select
                className="form-control"
                style={{ width: '65px', padding: '2px 4px', fontSize: '0.75rem' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th onClick={() => { setSortBy('orderId'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    Order ID <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </th>
                  <th>Customer / Sender</th>
                  <th>Receiver & Route</th>
                  <th>Cargo Spec</th>
                  <th onClick={() => { setSortBy('amount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    Amount (₹) <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </th>
                  <th>Status</th>
                  <th>Bus Fleet</th>
                  <th onClick={() => { setSortBy('createdAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    Date <ArrowUpDown size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      <Package size={24} style={{ margin: '0 auto 0.4rem auto', color: '#cbd5e1' }} />
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>No consignment audit records match your filters</div>
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => (
                    <tr key={b._id || b.orderId}>
                      <td>
                        <strong
                          style={{
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            fontSize: '0.875rem',
                            cursor: onOpenReceipt ? 'pointer' : 'default',
                            textDecoration: onOpenReceipt ? 'underline' : 'none',
                          }}
                          onClick={() => onOpenReceipt && onOpenReceipt(b)}
                          title="Click to view official receipt"
                        >
                          #{b.orderId}
                        </strong>
                        <div style={{ marginTop: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: (b.bookedByRole || b.createdBy?.role || '').toLowerCase() === 'staff' ? '#065f46' : '#1e40af',
                              backgroundColor: (b.bookedByRole || b.createdBy?.role || '').toLowerCase() === 'staff' ? '#ecfdf5' : '#eff6ff',
                              border: (b.bookedByRole || b.createdBy?.role || '').toLowerCase() === 'staff' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              display: 'inline-block',
                            }}
                            title={`Booked by ${b.bookedByName || b.createdBy?.name || 'Admin'}`}
                          >
                            {(b.bookedByRole || b.createdBy?.role || '').toLowerCase() === 'staff' ? 'Staff' : 'Admin'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.customerName}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{b.customerPhone}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.destination}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          To: {b.receiverName || 'Recipient'} ({b.receiverPhone || ''})
                        </div>
                      </td>

                      <td>
                        <div>{b.parcelType || 'Standard Box'}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          {b.quantity || 1} pcs ({b.weight || 0} kg)
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{b.amount}</div>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: b.paymentStatus === 'PAID' ? '#16a34a' : '#d97706' }}>
                          {b.paymentStatus || 'PAID'}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge status-${b.status.toLowerCase()}`}>
                          {b.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        {b.busDetails?.busNumber ? (
                          <div>
                            <strong>{b.busDetails.busNumber}</strong>
                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{b.busDetails.departureTime || 'Evening Run'}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {onOpenReceipt && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenReceipt(b)}
                              title="Print Official Receipt"
                              style={{ padding: '2px 6px', fontSize: '0.6875rem' }}
                            >
                              <Printer size={12} />
                            </button>
                          )}
                          {onOpenWhatsApp && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenWhatsApp(b)}
                              title="Send WhatsApp Alert"
                              style={{ padding: '2px 6px', fontSize: '0.6875rem' }}
                            >
                              <Share2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Page {currentPage} of {totalPages}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. SUB-TAB 3: ROUTE YIELD & PERFORMANCE SUMMARY */}
      {activeTab === 'routes' && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Destination Route Yield & Freight Aggregations
            </h3>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '0.8125rem' }}>
              <thead>
                <tr>
                  <th>Destination Route</th>
                  <th>Orders</th>
                  <th>Freight (kg / pcs)</th>
                  <th>Revenue (₹)</th>
                  <th>Avg Yield</th>
                  <th>Share (%)</th>
                  <th>Status Ratio</th>
                  <th>Primary Bus Carrier</th>
                </tr>
              </thead>
              <tbody>
                {routeSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 0', color: '#94a3b8' }}>
                      No route summaries available.
                    </td>
                  </tr>
                ) : (
                  routeSummaries.map((r) => (
                    <tr key={r.route}>
                      <td>
                        <strong>{r.route}</strong>
                      </td>
                      <td>{r.bookingsCount} orders</td>
                      <td>{r.totalWeight} kg ({r.totalQty} pcs)</td>
                      <td>
                        <strong>₹{r.totalRevenue.toLocaleString('en-IN')}</strong>
                      </td>
                      <td>₹{r.avgTicket}</td>
                      <td>{r.sharePercent}%</td>
                      <td>
                        <span style={{ color: '#16a34a' }}>{r.deliveredCount} Delivered</span> •{' '}
                        <span style={{ color: '#2563eb' }}>{r.inTransitCount} In-Transit</span>
                      </td>
                      <td>{r.topBus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. EXPORT DATA IN-PAGE PANEL */}
      {showExportModal && (
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '8px', padding: '1.25rem 1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Export Operations & Revenue Data</h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowExportModal(false)}>
              <X size={15} />
              Close
            </button>
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Download structured records matching your active filters (<strong>{timeframe}</strong>).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {/* Option 1 */}
            <div
              onClick={handleExportFilteredCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={18} color="#0f172a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                    Export Consignments Audit CSV
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Row-by-row list with Order IDs, customer contacts, addresses & fees ({filteredBookings.length} rows)
                  </div>
                </div>
              </div>
              <Download size={16} color="#0f172a" />
            </div>

            {/* Option 2 */}
            <div
              onClick={handleExportRouteSummaryCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <BarChart3 size={18} color="#0f172a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                    Export Route Yield Summary CSV
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Route aggregations, revenue shares, and assigned bus volumes ({routeSummaries.length} routes)
                  </div>
                </div>
              </div>
              <Download size={16} color="#0f172a" />
            </div>

            {/* Option 3 */}
            <div
              onClick={handleExportJSON}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Layers size={18} color="#0f172a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                    Export Structured JSON
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Complete operational dataset with summary metrics
                  </div>
                </div>
              </div>
              <Download size={16} color="#0f172a" />
            </div>

            {/* Option 4: Commission & Travels Settlement CSV */}
            <div
              onClick={handleExportCommissionCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Percent size={18} color="#0f172a" />
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                    Export Commission & Travels Settlement CSV
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                    Calculated agency commission ({commissionRate}%) and travels net payable breakdown ({commissionList.length} rows)
                  </div>
                </div>
              </div>
              <Download size={16} color="#0f172a" />
            </div>
          </div>
        </div>
      )}

      {/* 8. PRINTABLE OFFICIAL AUDIT REPORT */}
      <div className="reports-printable-area">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 900 }}>
            {(company.companyName || 'Sri Vinayaka Logistics').toUpperCase()}
          </h2>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
            Consolidated Operations & Financial Revenue Audit Report
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Period: {timeframe.toUpperCase()} • Generated on: {new Date().toLocaleString()}
          </div>
          {company.gstin && <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>GSTIN: {company.gstin}</div>}
        </div>

        <table style={{ width: '100%', marginBottom: '1.5rem', borderCollapse: 'collapse', border: '1px solid #0f172a' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '6px 10px', border: '1px solid #0f172a', textAlign: 'left' }}>Total Consignments</th>
              <th style={{ padding: '6px 10px', border: '1px solid #0f172a', textAlign: 'left' }}>Total Freight Revenue</th>
              <th style={{ padding: '6px 10px', border: '1px solid #0f172a', textAlign: 'left' }}>Delivered Packages</th>
              <th style={{ padding: '6px 10px', border: '1px solid #0f172a', textAlign: 'left' }}>Active In-Transit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px 10px', border: '1px solid #0f172a' }}>{summaryMetrics.totalBookings}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #0f172a', fontWeight: 'bold' }}>₹{summaryMetrics.totalRevenue.toLocaleString('en-IN')}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #0f172a' }}>{summaryMetrics.delivered}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #0f172a' }}>{summaryMetrics.dispatched}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', border: '1px solid #0f172a' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Order ID</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Customer</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Route</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Type</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Qty/Wt</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Amount</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Status</th>
              <th style={{ padding: '5px', border: '1px solid #0f172a' }}>Bus Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b.orderId}>
                <td style={{ padding: '5px', border: '1px solid #0f172a', fontFamily: 'monospace' }}>#{b.orderId}</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.customerName} ({b.customerPhone})</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.destination}</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.parcelType}</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.quantity} pcs ({b.weight} kg)</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>₹{b.amount}</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.status}</td>
                <td style={{ padding: '5px', border: '1px solid #0f172a' }}>{b.busDetails?.busNumber || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
