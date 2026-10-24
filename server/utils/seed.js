const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const User = require('../models/User');
const Setting = require('../models/Setting');

const seedData = async (clearAllData = false) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('[Seed] Connected to MongoDB Atlas');
    }

    // 1. Ensure Platform Super Admin User (Persisted & Synced in Database from .env)
    const superUsername = (process.env.SUPERADMIN_USERNAME || 'superadmin').trim().toLowerCase();
    const superPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
    const superEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@couriersaas.com').trim().toLowerCase();
    const superName = (process.env.SUPERADMIN_NAME || 'Platform Super Admin').trim();

    let superAdmin = await User.findOne({ username: superUsername });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: superName,
        username: superUsername,
        email: superEmail,
        password: superPassword,
        role: 'superadmin',
        tenantId: null,
        phone: '+919999999999',
        branch: 'Global Operations Headquarters',
        active: true,
      });
      console.log(`[Seed] 👑 Platform Super Admin created in database: ${superUsername}`);
    } else {
      superAdmin.name = superName;
      superAdmin.email = superEmail;
      superAdmin.role = 'superadmin';
      superAdmin.active = true;
      superAdmin.password = superPassword;
      superAdmin.tenantId = null;
      await superAdmin.save();
      console.log(`[Seed] 👑 Platform Super Admin synchronized with database: ${superUsername}`);
    }

    // 2. Ensure clean platform-default settings exist for public site / Super Admin CMS
    let platformSetting = await Setting.findOne({ isPlatformDefault: true });
    if (!platformSetting) {
      platformSetting = await Setting.create({
        isPlatformDefault: true,
        tenantId: null,
        companyName: 'Parcel & Bus Logistics Network',
        logoUrl: '/logo.png',
        tagline: 'Premier Bus Parcel & Logistics Network',
        companyPhone: '+91 99999 99999',
        companyEmail: superEmail,
        companyAddress: 'Central Operations Headquarters',
        gstin: '',
        receiptFooterNote: 'Thank you for choosing our bus parcel service.',
        whatsappProvider: 'MOCK',
        standardRoutes: [],
        parcelTypes: [],
      });
      console.log('[Seed] Clean platform default settings initialized');
    }

    if (clearAllData) {
      console.log('[Seed] Database initialization complete.');
    }
  } catch (error) {
    console.error('[Seed Error]:', error.message);
  }
};

if (require.main === module) {
  seedData(true).then(() => {
    console.log('[Seed] Clean Database Initialization Complete.');
    process.exit(0);
  });
}

module.exports = seedData;

