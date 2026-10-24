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
          standardRoutes: [],
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
        standardRoutes: settings.standardRoutes || [],
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
      whatsappProvider,
      whatsappSenderNumber,
      whatsappApiKey,
      whatsappApiUrl,
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

    if (whatsappProvider !== undefined) settings.whatsappProvider = whatsappProvider;
    if (whatsappSenderNumber !== undefined) settings.whatsappSenderNumber = whatsappSenderNumber.trim();
    if (whatsappApiKey !== undefined) settings.whatsappApiKey = whatsappApiKey.trim();
    if (whatsappApiUrl !== undefined) settings.whatsappApiUrl = whatsappApiUrl.trim();
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
