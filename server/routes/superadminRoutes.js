const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Setting = require('../models/Setting');
const Booking = require('../models/Booking');
const BusDispatch = require('../models/BusDispatch');
const City = require('../models/City');
const Destination = require('../models/Destination');
const ParcelType = require('../models/ParcelType');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');
const { protect, authorize } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/auditService');

// All routes in this file require superadmin role
router.use(protect, authorize('superadmin'));

// Helper to generate token for impersonation
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      tenantId: user.tenantId,
      tokenVersion: typeof user.tokenVersion === 'number' ? user.tokenVersion : 0,
    },
    process.env.JWT_SECRET || 'courier_dispatch_secret_jwt_key_2025_secure',
    { expiresIn: '7d' }
  );
};

// @route   GET /api/superadmin/stats
// @desc    Platform-wide SaaS analytics & KPI metrics
router.get('/stats', async (req, res, next) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'ACTIVE' });
    const suspendedTenants = await Tenant.countDocuments({ status: 'SUSPENDED' });

    const totalBookings = await Booking.countDocuments();
    const totalDispatches = await BusDispatch.countDocuments();

    // Calculate platform gross revenue
    const revenueAgg = await Booking.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // Recent 5 tenants
    const recentTenants = await Tenant.find()
      .populate('adminUser', 'name email username phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalBookings,
        totalDispatches,
        totalRevenue,
        recentTenants,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/superadmin/tenants
// @desc    List all courier business tenants with operational metrics
router.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await Tenant.find()
      .populate('adminUser', 'name email username phone active createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Attach counts for each tenant
    const tenantsWithMetrics = await Promise.all(
      tenants.map(async (t) => {
        const [bookingsCount, staffCount, busesCount] = await Promise.all([
          Booking.countDocuments({ tenantId: t._id }),
          User.countDocuments({ tenantId: t._id }),
          Bus.countDocuments({ tenantId: t._id }),
        ]);

        return {
          ...t,
          metrics: {
            bookingsCount,
            staffCount,
            busesCount,
          },
        };
      })
    );

    res.json({
      success: true,
      count: tenantsWithMetrics.length,
      data: tenantsWithMetrics,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/tenants
// @desc    Create a new Tenant with automated unique ID, assign Admin user with temp password, and initialize master data
router.post('/tenants', async (req, res, next) => {
  try {
    const {
      companyName,
      uniqueId,
      slug,
      contactEmail,
      contactPhone,
      email,
      phone,
      address,
      plan = 'PRO',
      maxStaff = 25,
      maxBuses = 100,
      adminName,
      adminUsername,
      username,
      adminPassword,
      temporaryPassword,
      adminEmail,
      adminPhone,
      adminBranch,
      notes,
    } = req.body;

    const finalEmail = (contactEmail || email || adminEmail || '').trim().toLowerCase();
    const finalPhone = (contactPhone || phone || adminPhone || '').trim();
    const finalUsername = (adminUsername || username || '').trim().toLowerCase();
    const finalPassword = (adminPassword || temporaryPassword || '').trim();

    if (!companyName || !finalEmail || !finalPhone || !finalUsername || !finalPassword) {
      return res.status(400).json({
        success: false,
        message: 'Organization name, official email, phone number, admin username, and temporary password are required',
      });
    }

    // Generate or clean 4-6 alphanumeric Unique ID
    let finalUniqueId = (uniqueId || slug || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!finalUniqueId || finalUniqueId.length < 4) {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const l1 = letters[Math.floor(Math.random() * letters.length)];
      const l2 = letters[Math.floor(Math.random() * letters.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      finalUniqueId = `${l1}${l2}${num}`;
    }

    const cleanSlug = (slug || finalUniqueId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // 1. Check uniqueness of slug and uniqueId
    const existingTenant = await Tenant.findOne({
      $or: [{ slug: cleanSlug }, { uniqueId: finalUniqueId }],
    });
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: `Organization with Unique ID '${finalUniqueId}' or slug '${cleanSlug}' already exists. Please choose or regenerate another unique ID.`,
      });
    }

    // 2. Check uniqueness of admin username & email
    const existingUser = await User.findOne({
      $or: [{ username: finalUsername }, { email: finalEmail }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'The admin username or official email is already registered by another account.',
      });
    }

    // 3. Create Tenant document
    const tenant = await Tenant.create({
      companyName: companyName.trim(),
      uniqueId: finalUniqueId,
      slug: cleanSlug,
      contactEmail: finalEmail,
      contactPhone: finalPhone,
      address: address ? address.trim() : 'Central Office',
      plan,
      status: 'ACTIVE',
      maxStaff: Number(maxStaff) || 25,
      maxBuses: Number(maxBuses) || 100,
      notes: notes || '',
    });

    // 4. Create Tenant Admin user
    const adminUser = await User.create({
      name: adminName ? adminName.trim() : `${companyName.trim()} Admin`,
      username: finalUsername,
      email: finalEmail,
      password: finalPassword,
      role: 'admin',
      tenantId: tenant._id,
      phone: finalPhone,
      branch: adminBranch ? adminBranch.trim() : 'Central Office Hub',
      active: true,
    });

    // Link admin user to tenant
    tenant.adminUser = adminUser._id;
    await tenant.save();

    // 5. Initialize Tenant Settings
    await Setting.create({
      tenantId: tenant._id,
      companyName: companyName.trim(),
      logoUrl: '/logo.png',
      tagline: 'Parcel & Bus Dispatch Network',
      companyPhone: finalPhone,
      companyEmail: finalEmail,
      companyAddress: address ? address.trim() : 'Central Bus Terminal Office',
      gstin: '',
      receiptFooterNote: `Thank you for choosing ${companyName.trim()}. Please keep this receipt safe. Claims subject to local office terms.`,
      whatsappProvider: 'MOCK',
      whatsappSenderNumber: finalPhone.replace(/\D/g, ''),
      standardRoutes: [],
    });

    // 6. Send Onboarding Welcome Email with Banner & Client Credentials
    let emailDispatch = { success: false };
    try {
      emailDispatch = await emailService.sendOnboardingWelcomeEmail({
        to: finalEmail,
        companyName: tenant.companyName,
        uniqueId: tenant.uniqueId || finalUniqueId,
        slug: tenant.slug,
        plan: tenant.plan,
        adminName: adminUser.name,
        username: adminUser.username,
        password: finalPassword,
        contactPhone: finalPhone,
        contactEmail: finalEmail,
        address: tenant.address,
        adminBranch: adminUser.branch,
        loginUrl: process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/#login',
      });
    } catch (emailErr) {
      console.error('[superadminRoutes] Onboarding email dispatch failed:', emailErr.message);
      emailDispatch = { success: false, error: emailErr.message };
    }

    const emailNotice = emailDispatch.success
      ? (emailDispatch.simulated ? ' (Credentials logged to console; configure SMTP in .env to deliver real emails)' : ` and credentials email dispatched to ${finalEmail}`)
      : '';

    res.status(201).json({
      success: true,
      message: `Tenant '${tenant.companyName}' and Admin account created successfully${emailNotice}`,
      emailDispatch,
      data: {
        tenant,
        credentials: {
          companyName: tenant.companyName,
          uniqueId: tenant.uniqueId || finalUniqueId,
          username: adminUser.username,
          email: adminUser.email,
          temporaryPassword: finalPassword,
          plan: tenant.plan,
          emailSent: emailDispatch.success,
        },
        adminUser: {
          id: adminUser._id,
          name: adminUser.name,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/superadmin/tenants/:id
// @desc    Get comprehensive tenant details, analytics, staff, and recent consignments
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('adminUser', '-password');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      settings,
      staffList,
      recentBookings,
      bookingsCount,
      busesCount,
      driversCount,
      pendingCount,
      deliveredCount,
      todayBookingsCount,
      revenueAgg,
    ] = await Promise.all([
      Setting.findOne({ tenantId: tenant._id }),
      User.find({ tenantId: tenant._id }).select('-password').sort({ role: 1, createdAt: -1 }),
      Booking.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Booking.countDocuments({ tenantId: tenant._id }),
      Bus.countDocuments({ tenantId: tenant._id }),
      Driver.countDocuments({ tenantId: tenant._id }),
      Booking.countDocuments({ tenantId: tenant._id, status: { $in: ['BOOKED', 'WAITING_FOR_BUS'] } }),
      Booking.countDocuments({ tenantId: tenant._id, status: 'DELIVERED' }),
      Booking.countDocuments({ tenantId: tenant._id, createdAt: { $gte: todayStart } }),
      Booking.aggregate([
        { $match: { tenantId: tenant._id, status: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      success: true,
      data: {
        tenant,
        settings,
        staff: staffList,
        recentBookings,
        metrics: {
          bookingsCount,
          staffCount: staffList.length,
          busesCount,
          driversCount,
          pendingCount,
          deliveredCount,
          todayBookingsCount,
          totalRevenue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/superadmin/tenants/:id
// @desc    Update tenant details & active/suspended status
router.put('/tenants/:id', async (req, res, next) => {
  try {
    const { companyName, contactEmail, contactPhone, address, plan, status, maxStaff, maxBuses, notes } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (companyName) tenant.companyName = companyName.trim();
    if (contactEmail) tenant.contactEmail = contactEmail.trim().toLowerCase();
    if (contactPhone) tenant.contactPhone = contactPhone.trim();
    if (address !== undefined) tenant.address = address.trim();
    if (plan) tenant.plan = plan;
    if (status) tenant.status = status;
    if (maxStaff !== undefined) tenant.maxStaff = Number(maxStaff);
    if (maxBuses !== undefined) tenant.maxBuses = Number(maxBuses);
    if (notes !== undefined) tenant.notes = notes;

    await tenant.save();

    // Sync to Setting if companyName or contact changed
    await Setting.updateOne(
      { tenantId: tenant._id },
      {
        $set: {
          companyName: tenant.companyName,
          companyPhone: tenant.contactPhone,
          companyEmail: tenant.contactEmail,
        },
      }
    );

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/superadmin/tenants/:id
// @desc    Permanently delete a registered courier organization and cascade purge tenant data
router.delete('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant organization not found' });
    }

    const tenantId = tenant._id;
    const companyName = tenant.companyName;

    // Cascade purge all tenant-scoped data
    await Promise.all([
      User.deleteMany({ tenantId }),
      Setting.deleteMany({ tenantId }),
      Booking.deleteMany({ tenantId }),
      BusDispatch.deleteMany({ tenantId }),
      City.deleteMany({ tenantId }),
      Destination.deleteMany({ tenantId }),
      ParcelType.deleteMany({ tenantId }),
      Bus.deleteMany({ tenantId }),
      Driver.deleteMany({ tenantId }),
      Customer.deleteMany({ tenantId }),
      Notification.deleteMany({ tenantId }),
      AuditLog.deleteMany({ tenantId }),
      Tenant.findByIdAndDelete(tenantId),
    ]);

    await logSecurityEvent({
      req,
      action: 'TENANT_DELETED',
      severity: 'CRITICAL',
      details: { tenantId, companyName },
    });

    res.json({
      success: true,
      message: `Organization '${companyName}' and all associated records have been permanently deleted`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/tenants/:id/reset-password
// @desc    Reset password for tenant admin
router.post('/tenants/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 6 characters',
      });
    }

    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let adminUser = tenant.adminUser ? await User.findById(tenant.adminUser) : null;
    if (!adminUser) {
      adminUser = (await User.findOne({ tenantId: tenant._id, role: 'admin' })) ||
                  (await User.findOne({ tenantId: tenant._id })) ||
                  (await User.findOne({ username: 'admin' }));
      if (adminUser) {
        tenant.adminUser = adminUser._id;
        adminUser.tenantId = tenant._id;
        await Promise.all([tenant.save(), adminUser.save()]);
      }
    }

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Tenant Admin user not found' });
    }

    adminUser.password = newPassword;
    adminUser.active = true;
    adminUser.tenantId = tenant._id;
    await adminUser.save();

    res.json({
      success: true,
      message: `Password reset successfully for admin user: ${adminUser.username}`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/tenants/:id/impersonate (or /api/superadmin/impersonate/:id)
// @desc    Generate impersonation JWT token to access tenant portal with 1 click
router.post(['/tenants/:id/impersonate', '/impersonate/:id'], async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let adminUser = tenant.adminUser ? await User.findById(tenant.adminUser) : null;
    if (!adminUser) {
      adminUser = (await User.findOne({ tenantId: tenant._id, role: 'admin' })) ||
                  (await User.findOne({ tenantId: tenant._id })) ||
                  (await User.findOne({ username: 'admin' }));
      if (adminUser) {
        tenant.adminUser = adminUser._id;
        adminUser.tenantId = tenant._id;
        await Promise.all([tenant.save(), adminUser.save()]);
      }
    }

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Tenant Admin user not found' });
    }

    const token = generateToken(adminUser);

    res.json({
      success: true,
      message: `Now impersonating ${tenant.companyName}`,
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        username: adminUser.username,
        email: adminUser.email,
        phone: adminUser.phone || tenant.contactPhone,
        branch: adminUser.branch || 'Central Office Hub',
        role: adminUser.role,
        tenantId: tenant._id,
        tenantName: tenant.companyName,
        tenant: {
          id: tenant._id,
          companyName: tenant.companyName,
          uniqueId: tenant.uniqueId,
          slug: tenant.slug,
          contactEmail: tenant.contactEmail,
          contactPhone: tenant.contactPhone,
          address: tenant.address,
          plan: tenant.plan,
          status: tenant.status,
        },
        isImpersonated: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/superadmin/tenants/:id/whatsapp
// @desc    Get WhatsApp configuration for a specific tenant organization
router.get('/tenants/:id/whatsapp', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    let settings = await Setting.findOne({ tenantId: tenant._id });
    if (!settings) {
      settings = await Setting.create({
        tenantId: tenant._id,
        companyName: tenant.companyName,
        whatsappProvider: 'MOCK',
      });
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant._id,
        companyName: tenant.companyName,
        whatsappProvider: settings.whatsappProvider || 'MOCK',
        whatsappApiUrl: settings.whatsappApiUrl || '',
        whatsappApiKey: settings.whatsappApiKey || '',
        openwaSessionId: settings.openwaSessionId || '',
        whatsappSenderNumber: settings.whatsappSenderNumber || '',
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/superadmin/tenants/:id/whatsapp
// @desc    Update WhatsApp configuration for a specific tenant organization
router.put('/tenants/:id/whatsapp', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const {
      whatsappProvider,
      whatsappApiUrl,
      whatsappApiKey,
      openwaSessionId,
      whatsappSenderNumber,
    } = req.body;

    let settings = await Setting.findOne({ tenantId: tenant._id });
    if (!settings) {
      settings = new Setting({ tenantId: tenant._id, companyName: tenant.companyName });
    }

    if (whatsappProvider !== undefined) settings.whatsappProvider = whatsappProvider;
    if (whatsappApiUrl !== undefined) settings.whatsappApiUrl = (whatsappApiUrl || '').trim();
    if (whatsappApiKey !== undefined) settings.whatsappApiKey = (whatsappApiKey || '').trim();
    if (openwaSessionId !== undefined) settings.openwaSessionId = (openwaSessionId || '').trim();
    if (whatsappSenderNumber !== undefined) settings.whatsappSenderNumber = (whatsappSenderNumber || '').trim();

    await settings.save();

    await logSecurityEvent({
      req,
      action: 'TENANT_WHATSAPP_CONFIG_UPDATED',
      severity: 'INFO',
      details: {
        tenantId: tenant._id,
        companyName: tenant.companyName,
        whatsappProvider: settings.whatsappProvider,
      },
    });

    res.json({
      success: true,
      message: `WhatsApp configuration updated for ${tenant.companyName}`,
      data: {
        tenantId: tenant._id,
        companyName: tenant.companyName,
        whatsappProvider: settings.whatsappProvider,
        whatsappApiUrl: settings.whatsappApiUrl,
        whatsappApiKey: settings.whatsappApiKey,
        openwaSessionId: settings.openwaSessionId,
        whatsappSenderNumber: settings.whatsappSenderNumber,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/tenants/:id/test-whatsapp
// @desc    Send live test message via tenant's configured WhatsApp gateway
router.post('/tenants/:id/test-whatsapp', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const { phone, message } = req.body;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required for test' });
    }

    const settings = (await Setting.findOne({ tenantId: tenant._id })) || {};
    const brand = tenant.companyName || settings.companyName || 'Courier & Logistics';
    const testMsg =
      message && message.trim()
        ? message.trim()
        : `*${brand}* - Test notification from Super Admin.\nWhatsApp gateway connection verified successfully!`;

    const result = await whatsappService.sendTextMessage(phone.trim(), testMsg, settings);
    const directLink = whatsappService.generateWhatsAppLink(phone.trim(), testMsg);

    res.json({
      success: result.success,
      provider: result.provider || settings.whatsappProvider || 'MOCK',
      message: result.success
        ? `Test message sent successfully via ${result.provider || 'gateway'}!`
        : `Gateway test error: ${result.error || 'Failed to send'}`,
      directLink,
      details: result,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/superadmin/settings
// @desc    Get system settings & company profile for CMS management (Superadmin only)
router.get('/settings', async (req, res, next) => {
  try {
    const targetTenantId = req.query.tenantId;
    let settings = null;
    if (targetTenantId) {
      settings = await Setting.findOne({ tenantId: targetTenantId });
    } else {
      // 1. Look for explicit platform default setting
      settings = await Setting.findOne({ isPlatformDefault: true });
      if (!settings) {
        settings = await Setting.findOne({ tenantId: null });
      }
      if (!settings) {
        const defaultTenant = await Tenant.findOne({ slug: 'fasttrack' });
        if (defaultTenant) {
          settings = await Setting.findOne({ tenantId: defaultTenant._id });
        }
      }
      if (!settings) {
        settings = await Setting.findOne().sort({ updatedAt: -1 });
      }
    }

    if (!settings) {
      settings = await Setting.create({
        isPlatformDefault: true,
        tenantId: null,
        companyName: 'Parcel & Bus Logistics Network',
        logoUrl: '/logo.png',
        tagline: 'Premier Bus Parcel & Logistics Network',
        companyPhone: '+91 99999 99999',
        companyEmail: 'admin@couriersaas.com',
        companyAddress: 'Central Operations Headquarters',
        gstin: '',
        receiptFooterNote: 'Thank you for choosing our bus parcel service.',
        whatsappProvider: 'MOCK',
        standardRoutes: [],
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/superadmin/settings
// @desc    Update system settings, company profile & CMS (Superadmin only)
router.put('/settings', async (req, res, next) => {
  try {
    const {
      tenantId,
      companyName,
      logoUrl,
      tagline,
      companyPhone,
      companyEmail,
      companyAddress,
      gstin,
      receiptFooterNote,
      whatsappProvider,
      whatsappSenderNumber,
      whatsappApiKey,
      whatsappApiUrl,
      openwaSessionId,
      // Dynamic CMS fields
      announcementText,
      announcementLink,
      showAnnouncement,
      heroBadge,
      heroTitle,
      heroSubtitle,
      heroPrimaryCtaText,
      heroPrimaryCtaLink,
      heroSecondaryCtaText,
      heroSecondaryCtaLink,
      heroStats,
      servicesTitle,
      servicesSubtitle,
      services,
      howItWorksTitle,
      howItWorksSubtitle,
      howItWorksSteps,
      vendorBenefitsTitle,
      vendorBenefits,
    } = req.body;

    let settings = null;
    if (tenantId) {
      settings = await Setting.findOne({ tenantId });
      if (!settings) {
        settings = new Setting({ tenantId });
      }
    } else {
      settings = await Setting.findOne({ isPlatformDefault: true });
      if (!settings) {
        settings = await Setting.findOne({ tenantId: null });
      }
      if (!settings) {
        const defaultTenant = await Tenant.findOne({ slug: 'fasttrack' });
        if (defaultTenant) {
          settings = await Setting.findOne({ tenantId: defaultTenant._id });
        }
      }
      if (!settings) {
        settings = await Setting.findOne().sort({ updatedAt: -1 });
      }
      if (!settings) {
        settings = new Setting({ isPlatformDefault: true, tenantId: null });
      } else {
        settings.isPlatformDefault = true;
      }
    }

    if (companyName !== undefined) settings.companyName = (companyName || '').trim();
    if (logoUrl !== undefined) settings.logoUrl = logoUrl || '';
    if (tagline !== undefined) settings.tagline = (tagline || '').trim();
    if (companyPhone !== undefined) settings.companyPhone = (companyPhone || '').trim();
    if (companyEmail !== undefined) settings.companyEmail = (companyEmail || '').trim();
    if (companyAddress !== undefined) settings.companyAddress = (companyAddress || '').trim();
    if (gstin !== undefined) settings.gstin = (gstin || '').trim();
    if (receiptFooterNote !== undefined) settings.receiptFooterNote = (receiptFooterNote || '').trim();
    if (whatsappProvider !== undefined) settings.whatsappProvider = whatsappProvider;
    if (whatsappSenderNumber !== undefined) settings.whatsappSenderNumber = (whatsappSenderNumber || '').trim();
    if (whatsappApiKey !== undefined) settings.whatsappApiKey = (whatsappApiKey || '').trim();
    if (whatsappApiUrl !== undefined) settings.whatsappApiUrl = (whatsappApiUrl || '').trim();
    if (openwaSessionId !== undefined) settings.openwaSessionId = (openwaSessionId || '').trim();

    // CMS Fields
    if (announcementText !== undefined) settings.announcementText = (announcementText || '').trim();
    if (announcementLink !== undefined) settings.announcementLink = (announcementLink || '').trim();
    if (showAnnouncement !== undefined) settings.showAnnouncement = Boolean(showAnnouncement);
    if (heroBadge !== undefined) settings.heroBadge = (heroBadge || '').trim();
    if (heroTitle !== undefined) settings.heroTitle = (heroTitle || '').trim();
    if (heroSubtitle !== undefined) settings.heroSubtitle = (heroSubtitle || '').trim();
    if (heroPrimaryCtaText !== undefined) settings.heroPrimaryCtaText = (heroPrimaryCtaText || '').trim();
    if (heroPrimaryCtaLink !== undefined) settings.heroPrimaryCtaLink = (heroPrimaryCtaLink || '').trim();
    if (heroSecondaryCtaText !== undefined) settings.heroSecondaryCtaText = (heroSecondaryCtaText || '').trim();
    if (heroSecondaryCtaLink !== undefined) settings.heroSecondaryCtaLink = (heroSecondaryCtaLink || '').trim();
    if (Array.isArray(heroStats)) settings.heroStats = heroStats;
    if (servicesTitle !== undefined) settings.servicesTitle = (servicesTitle || '').trim();
    if (servicesSubtitle !== undefined) settings.servicesSubtitle = (servicesSubtitle || '').trim();
    if (Array.isArray(services)) settings.services = services;
    if (howItWorksTitle !== undefined) settings.howItWorksTitle = (howItWorksTitle || '').trim();
    if (howItWorksSubtitle !== undefined) settings.howItWorksSubtitle = (howItWorksSubtitle || '').trim();
    if (Array.isArray(howItWorksSteps)) settings.howItWorksSteps = howItWorksSteps;
    if (vendorBenefitsTitle !== undefined) settings.vendorBenefitsTitle = (vendorBenefitsTitle || '').trim();
    if (Array.isArray(vendorBenefits)) settings.vendorBenefits = vendorBenefits;

    await settings.save();

    // Also sync companyName to default/first tenant if exists
    if (companyName && settings.tenantId) {
      await Tenant.updateOne({ _id: settings.tenantId }, { $set: { companyName: companyName.trim() } });
    }

    await logSecurityEvent({
      req,
      action: 'SETTINGS_UPDATED',
      severity: 'INFO',
      details: { companyName: settings.companyName, tenantId: settings.tenantId },
    });

    res.json({
      success: true,
      message: 'Company Profile & Website CMS updated successfully by Super Admin',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/settings/reset-defaults
// @desc    Reset CMS configuration to standard Enterprise SaaS defaults (Superadmin only)
router.post('/settings/reset-defaults', async (req, res, next) => {
  try {
    let settings = await Setting.findOne({ isPlatformDefault: true });
    if (!settings) {
      settings = await Setting.findOne({ tenantId: null });
    }
    if (!settings) {
      settings = new Setting({ isPlatformDefault: true, tenantId: null });
    }

    settings.announcementText = 'Scheduled passenger bus parcel dispatch active across all hub counters with instant WhatsApp alerts.';
    settings.announcementLink = '#services';
    settings.showAnnouncement = true;
    settings.heroBadge = 'Verified Counter-to-Counter Parcel Network';
    settings.heroTitle = 'Premier Bus Parcel & Logistics Network';
    settings.heroSubtitle = 'Ship commercial cartons, grain sacks, industrial parts, documents, and merchandise across state routes via daily scheduled passenger buses. Real-time 6-digit Order ID tracking and instant WhatsApp dispatch alerts.';
    settings.heroPrimaryCtaText = 'Operations Portal';
    settings.heroPrimaryCtaLink = '#login';
    settings.heroSecondaryCtaText = 'Track Consignment';
    settings.heroSecondaryCtaLink = '#track';
    settings.heroStats = [
      { label: 'Active Hubs', value: '8+', subtext: 'Connected Destination Cities' },
      { label: 'Daily Fleet', value: '180+', subtext: 'Scheduled Bus Dispatches' },
      { label: 'All Cargo', value: '100%', subtext: 'Standard Freight Categories' },
      { label: 'Verified SLA', value: '99.8%', subtext: 'Handover & Timely Delivery' },
    ];
    settings.servicesTitle = 'Enterprise Bus Parcel Services for Commercial Vendors';
    settings.servicesSubtitle = 'Engineered for high-volume traders, wholesalers, retail vendors, and transport counter operators needing scheduled dispatch with zero communication friction.';
    settings.services = [
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
    settings.howItWorksTitle = 'How It Works: Step-by-Step Logistics Workflow';
    settings.howItWorksSubtitle = 'From counter parcel booking to verified destination counter handover across our scheduled bus network.';
    settings.howItWorksSteps = [
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
    settings.vendorBenefitsTitle = 'Why Leading Commercial Vendors Choose Us';
    settings.vendorBenefits = [
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

    await settings.save();

    await logSecurityEvent({
      req,
      action: 'SETTINGS_RESET_DEFAULTS',
      severity: 'WARNING',
      details: { isPlatformDefault: true },
    });

    res.json({
      success: true,
      message: 'Website CMS has been reset to Enterprise SaaS standard presets',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/superadmin/tenants/:id/send-credentials
// @desc    Resend onboarding email with credentials and branded banner to the client organization
router.post('/tenants/:id/send-credentials', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('adminUser');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    let adminUser = tenant.adminUser && typeof tenant.adminUser === 'object' ? tenant.adminUser : null;
    if (!adminUser) {
      adminUser = (await User.findById(tenant.adminUser)) || (await User.findOne({ tenantId: tenant._id, role: 'admin' }));
    }
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Tenant admin user not found' });
    }
    const { customPassword, recipientEmail } = req.body || {};
    const targetEmail = (recipientEmail || adminUser.email || tenant.contactEmail || '').trim();
    const tempPassword = customPassword || 'Check with Platform Super Admin';

    const result = await emailService.sendOnboardingWelcomeEmail({
      to: targetEmail,
      companyName: tenant.companyName,
      uniqueId: tenant.uniqueId,
      slug: tenant.slug,
      plan: tenant.plan,
      adminName: adminUser.name,
      username: adminUser.username,
      password: tempPassword,
      contactPhone: tenant.contactPhone,
      contactEmail: targetEmail,
      address: tenant.address,
      adminBranch: adminUser.branch,
      loginUrl: process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/#login',
    });

    res.json({
      success: result.success,
      message: result.message || (result.success ? `Credentials email dispatched to ${targetEmail}` : 'Failed to send credentials email'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/superadmin/test-smtp
// @desc    Test SMTP email transporter configuration
router.post('/test-smtp', async (req, res, next) => {
  try {
    const result = await emailService.verifyConnection();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

