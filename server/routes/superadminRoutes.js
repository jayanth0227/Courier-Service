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

    res.status(201).json({
      success: true,
      message: `Tenant '${tenant.companyName}' and Admin account created successfully`,
      data: {
        tenant,
        credentials: {
          companyName: tenant.companyName,
          uniqueId: tenant.uniqueId || finalUniqueId,
          username: adminUser.username,
          email: adminUser.email,
          temporaryPassword: finalPassword,
          plan: tenant.plan,
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
// @desc    Get tenant details
router.get('/tenants/:id', async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('adminUser', '-password');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const settings = await Setting.findOne({ tenantId: tenant._id });
    const [bookingsCount, staffCount, busesCount] = await Promise.all([
      Booking.countDocuments({ tenantId: tenant._id }),
      User.countDocuments({ tenantId: tenant._id }),
      Bus.countDocuments({ tenantId: tenant._id }),
    ]);

    res.json({
      success: true,
      data: {
        tenant,
        settings,
        metrics: {
          bookingsCount,
          staffCount,
          busesCount,
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

    const adminUser = await User.findById(tenant.adminUser);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Tenant Admin user not found' });
    }

    adminUser.password = newPassword;
    adminUser.active = true;
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

    const adminUser = await User.findById(tenant.adminUser);
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

    if (companyName !== undefined) settings.companyName = companyName.trim();
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (tagline !== undefined) settings.tagline = tagline.trim();
    if (companyPhone !== undefined) settings.companyPhone = companyPhone.trim();
    if (companyEmail !== undefined) settings.companyEmail = companyEmail.trim();
    if (companyAddress !== undefined) settings.companyAddress = companyAddress.trim();
    if (gstin !== undefined) settings.gstin = gstin.trim();
    if (receiptFooterNote !== undefined) settings.receiptFooterNote = receiptFooterNote.trim();
    if (whatsappProvider !== undefined) settings.whatsappProvider = whatsappProvider;
    if (whatsappSenderNumber !== undefined) settings.whatsappSenderNumber = whatsappSenderNumber.trim();
    if (whatsappApiKey !== undefined) settings.whatsappApiKey = whatsappApiKey.trim();
    if (whatsappApiUrl !== undefined) settings.whatsappApiUrl = whatsappApiUrl.trim();

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



module.exports = router;

