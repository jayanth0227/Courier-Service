const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');
const Setting = require('../models/Setting');
const { initAllTables } = require('../config/dynamoClient');

const seedData = async (clearAllData = false) => {
  try {
    // Ensure DynamoDB tables are provisioned in AWS
    await initAllTables();

    // 1. Ensure Platform Super Admin User (Persisted & Synced in AWS DynamoDB from .env)
    const superUsername = (process.env.SUPERADMIN_USERNAME || 'mrcargo').trim().toLowerCase();
    const superPassword = process.env.SUPERADMIN_PASSWORD || 'mrcargo@123';
    const superEmail = (process.env.SUPERADMIN_EMAIL || 'mrcargo59@gmail.com').trim().toLowerCase();
    const superName = (process.env.SUPERADMIN_NAME || 'Platform Super Admin').trim();

    let superAdmin = (await User.findOne({ role: 'superadmin' })) || (await User.findOne({ username: superUsername }));
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
      console.log(`[Seed] 👑 Platform Super Admin created in AWS DynamoDB: ${superUsername}`);
    } else {
      superAdmin.name = superName;
      superAdmin.username = superUsername;
      superAdmin.email = superEmail;
      superAdmin.role = 'superadmin';
      superAdmin.active = true;
      superAdmin.password = superPassword;
      superAdmin.tenantId = null;
      await superAdmin.save();
      console.log(`[Seed] 👑 Platform Super Admin synchronized with AWS DynamoDB: ${superUsername}`);
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
      console.log('[Seed] Clean platform default settings initialized in AWS DynamoDB');
    }

    if (clearAllData) {
      console.log('[Seed] AWS DynamoDB initialization complete.');
    }
  } catch (error) {
    console.error('[Seed Error in DynamoDB]:', error.message);
  }
};

if (require.main === module) {
  seedData(true).then(() => {
    console.log('[Seed] AWS DynamoDB Clean Initialization Complete.');
    process.exit(0);
  });
}

module.exports = seedData;
