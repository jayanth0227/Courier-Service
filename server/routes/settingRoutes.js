const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const Destination = require('../models/Destination');
const Tenant = require('../models/Tenant');
const { protect, authorize } = require('../middleware/auth');
const tenantScope = require('../middleware/tenantScope');

// @route   GET /api/settings/public
// @desc    Get public company profile information (no auth required)
// @access  Public
router.get('/public', async (req, res, next) => {
  try {
    const { tenantId, slug } = req.query;
    let query = {};

    if (tenantId) {
      query.tenantId = tenantId;
    } else if (slug) {
      const tenant = await Tenant.findOne({ slug: slug.trim().toLowerCase() });
      if (tenant) query.tenantId = tenant._id;
    }

    let settings = null;
    if (query.tenantId) {
      settings = await Setting.findOne(query);
    } else {
      // 1. Check for explicit platform default CMS setting
      settings = await Setting.findOne({ isPlatformDefault: true });
      // 2. Check for null tenantId setting
      if (!settings) {
        settings = await Setting.findOne({ tenantId: null });
      }
      // 3. Fallback to default fasttrack tenant setting
      if (!settings) {
        const defaultTenant = await Tenant.findOne({ slug: 'fasttrack' });
        if (defaultTenant) {
          settings = await Setting.findOne({ tenantId: defaultTenant._id });
        }
      }
      // 4. Fallback to most recently updated setting
      if (!settings) {
        settings = await Setting.findOne().sort({ updatedAt: -1 });
      }
    }

    const defaultHeroStats = [
      { label: 'Active Hubs', value: '8+', subtext: 'Connected Destination Cities' },
      { label: 'Daily Fleet', value: '180+', subtext: 'Scheduled Bus Dispatches' },
      { label: 'All Cargo', value: '100%', subtext: 'Standard Freight Categories' },
      { label: 'Verified SLA', value: '99.8%', subtext: 'Handover & Timely Delivery' },
    ];

    const defaultServices = [
      {
        id: 'whatsapp-service',
        title: 'Automated WhatsApp Notifications',
        description: 'The moment a parcel is booked, an automated WhatsApp alert is dispatched to both sender and consignee with the 6-digit LR tracking number and live status link.',
        badge: 'Instant Delivery Alert',
        icon: 'MessageSquare',
        highlight: true,
      },
      {
        id: 'tracking-service',
        title: 'Zero-Friction Parcel Tracking',
        description: 'Customers and vendors easily track consignments in real-time using their 6-digit Order ID, displaying assigned bus number, driver dispatch contact, and destination counter.',
        badge: 'Real-Time Telemetry',
        icon: 'Search',
        highlight: true,
      },
      {
        id: 'batch-assign-service',
        title: 'Assign Multiple Parcels to Bus at a Time',
        description: 'Counter dispatchers can batch-select dozens of waiting parcels for any destination city and allocate them to a scheduled passenger bus luggage bay in one click.',
        badge: 'Bulk Bay Dispatch',
        icon: 'Bus',
        highlight: true,
      },
      {
        id: 'counter-booking-service',
        title: 'Counter Booking Engine for Vendors',
        description: 'High-speed counter interface for commercial merchants: auto-generates 6-digit Order IDs, calculates weight-based or category pricing, and prints receipts instantly.',
        badge: 'High Speed Booking',
        icon: 'Package',
        highlight: false,
      },
      {
        id: 'staff-minimal-access',
        title: 'Staff Login with Minimal Scoped Access',
        description: 'Counter clerks, loading supervisors, and delivery operators log in with strictly scoped permissions to create bookings and load buses without accessing corporate financials.',
        badge: 'Role Security',
        icon: 'ShieldCheck',
        highlight: false,
      },
      {
        id: 'scheduled-bus-network',
        title: 'Daily Scheduled Passenger Bus Connectivity',
        description: 'Leveraging existing high-frequency intercity passenger bus timetables, providing faster turnaround and lower demurrage than conventional slow trucking networks.',
        badge: 'Express Transit',
        icon: 'Truck',
        highlight: false,
      },
    ];

    const defaultSteps = [
      {
        stepNumber: 1,
        title: 'Book Parcel & Generate 6-Digit Order ID',
        description: 'The vendor presents goods at the origin hub counter. The counter staff records destination, weight, and parties, instantly generating an official 6-digit LR tracking ID.',
        tag: '1. Booking',
      },
      {
        stepNumber: 2,
        title: 'Automated WhatsApp Message Delivered',
        description: 'System automatically sends a structured WhatsApp message to the consignor and consignee containing consignment details and a single-click live tracking link.',
        tag: '2. WhatsApp Alert',
      },
      {
        stepNumber: 3,
        title: 'Assign Multiple Parcels to Bus Bay',
        description: 'Hub staff groups queued parcels by destination route and batch-assigns them to a scheduled passenger bus with a generated driver dispatch manifest.',
        tag: '3. Fleet Assignment',
      },
      {
        stepNumber: 4,
        title: 'Intercity Bus Transit & Live Monitoring',
        description: 'The parcel travels inside the secure luggage bay of the scheduled bus. Both vendor and customer monitor transit progress and arrival ETA online.',
        tag: '4. Transit',
      },
      {
        stepNumber: 5,
        title: 'Destination Counter Verification & Handover',
        description: 'Upon bus arrival at the destination terminal, counter staff unloads cargo. Consignee presents the 6-digit Order ID or WhatsApp receipt for verified handover.',
        tag: '5. Handover',
      },
    ];

    const defaultVendorBenefits = [
      {
        title: 'Same-Day & Overnight Passenger Bus Timings',
        description: 'Eliminates regional warehouse consolidation delays. Your parcels travel directly on express passenger bus schedules.',
      },
      {
        title: 'Zero WhatsApp Overhead for Merchants',
        description: 'No manual photo-sharing or texting waybills. Customers receive automated WhatsApp confirmation and tracking links instantly.',
      },
      {
        title: 'Bulk Dispatch Tools for High-Volume Shippers',
        description: 'Assign dozens of cartons and sacks across multiple departure routes within seconds with complete digital manifests.',
      },
      {
        title: 'Minimal Operator Training Required',
        description: 'Staff portals are intuitive and role-restricted, allowing counter clerks to execute bookings and dispatches with zero friction.',
      },
    ];

    if (!settings) {
      return res.json({
        success: true,
        data: {
          companyName: '',
          logoUrl: '/logo.png',
          tagline: 'Parcel & Bus Dispatch Network',
          companyPhone: '',
          companyEmail: '',
          companyAddress: '',
          gstin: '',
          receiptFooterNote: 'Thank you for choosing our bus parcel service.',
          termsAndConditions: `1. Goods carried strictly at owner's risk; company is not liable for leakage, breakage, or natural damages.
2. Value of goods must be declared at booking; company liability for undeclared items is strictly limited to ₹500.
3. Hazardous, contraband, inflammable, or prohibited goods are strictly not accepted.
4. Demurrage will be levied if cargo is not claimed within 24 hours of bus arrival at destination.
5. Consignee must verify package condition before counter delivery acknowledgment.
6. Original LR copy or SMS verification must be produced at destination counter to claim consignment.
7. All disputes are subject to local jurisdiction only.`,
          standardRoutes: [],
          announcementText: 'Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts.',
          announcementLink: '#services',
          showAnnouncement: true,
          heroBadge: 'Verified Counter-to-Counter Parcel Network',
          heroTitle: 'Premier Bus Parcel & Logistics Network',
          heroSubtitle: 'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.',
          heroPrimaryCtaText: 'Operations Portal',
          heroPrimaryCtaLink: '#login',
          heroSecondaryCtaText: 'Track Consignment',
          heroSecondaryCtaLink: '#track',
          heroStats: defaultHeroStats,
          servicesTitle: 'Enterprise Bus Parcel Services for Commercial Vendors',
          servicesSubtitle: 'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.',
          services: defaultServices,
          howItWorksTitle: 'How It Works: Step-by-Step Logistics Workflow',
          howItWorksSubtitle: 'From counter parcel booking to verified destination counter handover across our scheduled bus network.',
          howItWorksSteps: defaultSteps,
          vendorBenefitsTitle: 'Why Leading Commercial Vendors Choose Us',
          vendorBenefits: defaultVendorBenefits,
        },
      });
    }

    res.json({
      success: true,
      data: {
        companyName: settings.companyName,
        logoUrl: settings.logoUrl || '/logo.png',
        tagline: settings.tagline || 'Parcel & Bus Dispatch Network',
        companyPhone: settings.companyPhone,
        companyEmail: settings.companyEmail,
        companyAddress: settings.companyAddress,
        fromCity: settings.fromCity || '',
        gstin: settings.gstin || '',
        receiptFooterNote: settings.receiptFooterNote,
        termsAndConditions: settings.termsAndConditions,
        standardRoutes: settings.standardRoutes || [],
        announcementText: settings.announcementText || 'Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts.',
        announcementLink: settings.announcementLink || '#services',
        showAnnouncement: settings.showAnnouncement !== false,
        heroBadge: settings.heroBadge || 'Verified Counter-to-Counter Parcel Network',
        heroTitle: settings.heroTitle || 'Premier Bus Parcel & Logistics Network',
        heroSubtitle: settings.heroSubtitle || 'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.',
        heroPrimaryCtaText: settings.heroPrimaryCtaText || 'Operations Portal',
        heroPrimaryCtaLink: settings.heroPrimaryCtaLink || '#login',
        heroSecondaryCtaText: settings.heroSecondaryCtaText || 'Track Consignment',
        heroSecondaryCtaLink: settings.heroSecondaryCtaLink || '#track',
        heroStats: (settings.heroStats && settings.heroStats.length > 0) ? settings.heroStats : defaultHeroStats,
        servicesTitle: settings.servicesTitle || 'Enterprise Bus Parcel Services for Commercial Vendors',
        servicesSubtitle: settings.servicesSubtitle || 'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.',
        services: (settings.services && settings.services.length > 0) ? settings.services : defaultServices,
        howItWorksTitle: settings.howItWorksTitle || 'How It Works: Step-by-Step Logistics Workflow',
        howItWorksSubtitle: settings.howItWorksSubtitle || 'From counter parcel booking to verified destination counter handover across our scheduled bus network.',
        howItWorksSteps: (settings.howItWorksSteps && settings.howItWorksSteps.length > 0) ? settings.howItWorksSteps : defaultSteps,
        vendorBenefitsTitle: settings.vendorBenefitsTitle || 'Why Leading Commercial Vendors Choose Us',
        vendorBenefits: (settings.vendorBenefits && settings.vendorBenefits.length > 0) ? settings.vendorBenefits : defaultVendorBenefits,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/settings
// @desc    Get current tenant's system settings & WhatsApp configuration
// @access  Private (Tenant Scoped)
router.get('/', protect, tenantScope, async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ tenantId: req.tenantId });
    if (!settings && req.tenantId) {
      const tenant = await Tenant.findById(req.tenantId);
      settings = await Setting.create({
        tenantId: req.tenantId,
        companyName: tenant ? tenant.companyName : 'FastTrack Bus Parcel & Courier Services',
        logoUrl: '/logo.png',
        tagline: 'Parcel & Bus Dispatch Network',
        companyPhone: tenant ? tenant.contactPhone : '+91 98765 43210',
        companyEmail: tenant ? tenant.contactEmail : 'dispatch@fasttrackcourier.com',
        companyAddress: tenant ? tenant.address : 'Main Bus Terminal Road, Complex #4',
        gstin: '',
        receiptFooterNote: `Thank you for choosing ${tenant ? tenant.companyName : 'our service'}. Present this receipt or 6-digit Order ID at destination counter.`,
        whatsappProvider: 'MOCK',
        whatsappSenderNumber: tenant ? tenant.contactPhone.replace(/\D/g, '') : '+919876543210',
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/settings
// @desc    Update current tenant's system settings (Tenant Scoped)
// @access  Private (Admin only)
router.put('/', protect, tenantScope, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ tenantId: req.tenantId });
    if (!settings) {
      settings = new Setting({ tenantId: req.tenantId });
    }

    const {
      companyName,
      logoUrl,
      tagline,
      companyPhone,
      companyEmail,
      companyAddress,
      fromCity,
      gstin,
      receiptFooterNote,
      termsAndConditions,
      whatsappProvider,
      whatsappSenderNumber,
      whatsappApiKey,
      whatsappApiUrl,
      openwaSessionId,
      standardRoutes,
      parcelTypes,
    } = req.body;

    // Both Tenant Admin and SuperAdmin can update tenant-scoped settings
    if (companyName !== undefined) settings.companyName = companyName.trim();
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (companyPhone !== undefined) settings.companyPhone = companyPhone.trim();
    if (companyEmail !== undefined) settings.companyEmail = companyEmail.trim();
    if (companyAddress !== undefined) settings.companyAddress = companyAddress.trim();
    if (fromCity !== undefined) settings.fromCity = fromCity.trim();
    if (gstin !== undefined) settings.gstin = gstin.trim();
    if (receiptFooterNote !== undefined) settings.receiptFooterNote = receiptFooterNote.trim();
    if (termsAndConditions !== undefined) settings.termsAndConditions = termsAndConditions.trim();

    // WhatsApp configuration is centrally managed by Super Admin per tenant
    if (req.user && req.user.role === 'superadmin') {
      if (whatsappProvider !== undefined) settings.whatsappProvider = whatsappProvider;
      if (whatsappSenderNumber !== undefined) settings.whatsappSenderNumber = whatsappSenderNumber.trim();
      if (whatsappApiKey !== undefined) settings.whatsappApiKey = whatsappApiKey.trim();
      if (whatsappApiUrl !== undefined) settings.whatsappApiUrl = whatsappApiUrl.trim();
      if (openwaSessionId !== undefined) settings.openwaSessionId = openwaSessionId.trim();
    }
    if (standardRoutes && Array.isArray(standardRoutes)) {
      settings.standardRoutes = standardRoutes;
      // Sync with Destination collection for this tenant
      for (const r of standardRoutes) {
        if (r && r.trim()) {
          const exists = await Destination.findOne({ tenantId: req.tenantId, route: r.trim() });
          if (!exists) {
            await Destination.create({
              tenantId: req.tenantId,
              route: r.trim(),
              deliveryAddress: '',
              collectionPoints: [],
              active: true,
            });
          }
        }
      }
    }
    if (parcelTypes && Array.isArray(parcelTypes)) settings.parcelTypes = parcelTypes;

    await settings.save();

    // If company name was updated, sync to Tenant model as well
    if (companyName && req.tenantId) {
      await Tenant.updateOne({ _id: req.tenantId }, { $set: { companyName: companyName.trim() } });
    }

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
