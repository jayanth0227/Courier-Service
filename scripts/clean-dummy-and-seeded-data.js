const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const Tenant = require('../server/models/Tenant');
const User = require('../server/models/User');
const Customer = require('../server/models/Customer');
const Booking = require('../server/models/Booking');
const BusDispatch = require('../server/models/BusDispatch');
const Notification = require('../server/models/Notification');
const Setting = require('../server/models/Setting');
const City = require('../server/models/City');
const Destination = require('../server/models/Destination');
const Bus = require('../server/models/Bus');
const Driver = require('../server/models/Driver');
const ParcelType = require('../server/models/ParcelType');
const AuditLog = require('../server/models/AuditLog');

async function cleanData() {
  console.log('========================================================');
  console.log('🧹 CLEANING ALL DUMMY AND SEEDED DATA EXCEPT SUPER ADMIN');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  // 1. Ensure Super Admin exists & is preserved/updated from .env
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
    console.log(`👑 Created Super Admin: ${superUsername}`);
  } else {
    superAdmin.name = superName;
    superAdmin.email = superEmail;
    superAdmin.role = 'superadmin';
    superAdmin.active = true;
    superAdmin.password = superPassword;
    superAdmin.tenantId = null;
    await superAdmin.save();
    console.log(`👑 Preserved & Synced Super Admin: ${superUsername} (${superAdmin._id})`);
  }

  // 2. Remove all users except Super Admin
  const deletedUsers = await User.deleteMany({ _id: { $ne: superAdmin._id } });
  console.log(`🗑️  Deleted dummy/seeded users: ${deletedUsers.deletedCount}`);

  // 3. Remove all Bookings
  const deletedBookings = await Booking.deleteMany({});
  console.log(`🗑️  Deleted dummy bookings: ${deletedBookings.deletedCount}`);

  // 4. Remove all Customers
  const deletedCustomers = await Customer.deleteMany({});
  console.log(`🗑️  Deleted dummy customers: ${deletedCustomers.deletedCount}`);

  // 5. Remove all Bus Dispatches
  const deletedDispatches = await BusDispatch.deleteMany({});
  console.log(`🗑️  Deleted dummy bus dispatches: ${deletedDispatches.deletedCount}`);

  // 6. Remove all Buses
  const deletedBuses = await Bus.deleteMany({});
  console.log(`🗑️  Deleted dummy buses: ${deletedBuses.deletedCount}`);

  // 7. Remove all Drivers
  const deletedDrivers = await Driver.deleteMany({});
  console.log(`🗑️  Deleted dummy drivers: ${deletedDrivers.deletedCount}`);

  // 8. Remove all Cities
  const deletedCities = await City.deleteMany({});
  console.log(`🗑️  Deleted dummy cities: ${deletedCities.deletedCount}`);

  // 9. Remove all Destinations
  const deletedDestinations = await Destination.deleteMany({});
  console.log(`🗑️  Deleted dummy destinations: ${deletedDestinations.deletedCount}`);

  // 10. Remove all Parcel Types
  const deletedParcelTypes = await ParcelType.deleteMany({});
  console.log(`🗑️  Deleted dummy parcel types: ${deletedParcelTypes.deletedCount}`);

  // 11. Remove all Notifications
  const deletedNotifications = await Notification.deleteMany({});
  console.log(`🗑️  Deleted dummy notifications: ${deletedNotifications.deletedCount}`);

  // 12. Remove all Audit Logs
  const deletedAuditLogs = await AuditLog.deleteMany({});
  console.log(`🗑️  Deleted dummy audit logs: ${deletedAuditLogs.deletedCount}`);

  // 13. Remove all Tenants
  const deletedTenants = await Tenant.deleteMany({});
  console.log(`🗑️  Deleted dummy/seeded tenants: ${deletedTenants.deletedCount}`);

  // 14. Reset Settings to a single clean Platform Default CMS setting for Super Admin
  await Setting.deleteMany({});
  const platformSetting = await Setting.create({
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
  console.log(`⚙️  Created clean platform default setting for Super Admin (${platformSetting._id})`);

  console.log('\n========================================================');
  console.log('✨ CLEANUP COMPLETED: Only Super Admin details remain in database');
  console.log('========================================================');

  await mongoose.disconnect();
}

cleanData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  });
