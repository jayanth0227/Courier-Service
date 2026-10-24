const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Tenant = require('../server/models/Tenant');
const User = require('../server/models/User');
const Booking = require('../server/models/Booking');
const Customer = require('../server/models/Customer');
const City = require('../server/models/City');
const Destination = require('../server/models/Destination');
const ParcelType = require('../server/models/ParcelType');
const Setting = require('../server/models/Setting');

async function runPersistenceTest() {
  console.log('--- 🧪 STARTING LIVE MONGODB PERSISTENCE & DATA ISOLATION VERIFICATION ---');
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Successfully connected to MongoDB Atlas:', mongoose.connection.name);

  try {
    // 1. Verify Superadmin
    const superadmin = await User.findOne({ username: 'superadmin', role: 'superadmin' });
    if (!superadmin) {
      throw new Error('Superadmin account not found! Run seed.js');
    }
    console.log('✓ Superadmin account verified in MongoDB Atlas:', superadmin.username, `(${superadmin.email})`);

    // 2. Clean previous test artifacts if any
    const testSlug1 = 'test-express-cargo';
    const testSlug2 = 'test-sunrise-parcel';
    await Tenant.deleteMany({ slug: { $in: [testSlug1, testSlug2] } });
    await User.deleteMany({ username: { $in: ['test_exp_admin', 'test_sun_admin', 'test_exp_staff'] } });

    // 3. Create Tenant A in MongoDB Atlas
    console.log('\n--- 1. Testing Tenant A Onboarding & Database Persistence ---');
    const tenantA = await Tenant.create({
      companyName: 'Test Express Cargo',
      slug: testSlug1,
      contactEmail: 'contact@testexpress.com',
      contactPhone: '9848011223',
      address: 'Shop 12, Terminal A, Hyderabad',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      maxStaff: 30,
      maxBuses: 50,
    });
    console.log('✓ Tenant A created in MongoDB Atlas with _id:', tenantA._id.toString());

    const adminA = await User.create({
      name: 'Express Manager',
      username: 'test_exp_admin',
      email: 'admin@testexpress.com',
      password: 'password123',
      role: 'admin',
      tenantId: tenantA._id,
      phone: '9848011223',
      branch: 'MGBS Hub',
    });
    tenantA.adminUser = adminA._id;
    await tenantA.save();
    console.log('✓ Admin A created in MongoDB Atlas with tenantId:', adminA.tenantId.toString());

    // Initialize Tenant A settings
    await Setting.create({
      tenantId: tenantA._id,
      companyName: tenantA.companyName,
      logoUrl: '/logo.png',
      companyPhone: tenantA.contactPhone,
      companyEmail: tenantA.contactEmail,
      companyAddress: tenantA.address,
      receiptFooterNote: 'Express Cargo Receipt Note',
    });

    // Create Tenant A City & Parcel Type
    const cityA = await City.create({
      tenantId: tenantA._id,
      name: 'Kurnool',
      deliveryAddress: 'Bellary Chowk Hub #1',
      locations: ['Bellary Chowk Hub #1'],
      active: true,
    });
    console.log('✓ Tenant A City "Kurnool" persisted in MongoDB Atlas:', cityA._id.toString());

    // Create Tenant A Customer & Booking
    const customerA = await Customer.create({
      tenantId: tenantA._id,
      name: 'Suresh Raina',
      phone: '9876543210',
      whatsapp: '9876543210',
      address: 'Bellary Chowk, Kurnool',
      totalBookings: 1,
      totalSpent: 350,
    });

    const bookingA = await Booking.create({
      tenantId: tenantA._id,
      orderId: '981245',
      customer: customerA._id,
      customerName: customerA.name,
      customerPhone: customerA.phone,
      fromCity: 'Hyderabad',
      toCity: 'Kurnool',
      destination: 'Hyderabad → Kurnool',
      deliveryAddress: 'Bellary Chowk Hub #1',
      parcelType: 'Rice Bag (25kg)',
      quantity: 2,
      weight: 50,
      amount: 350,
      paymentStatus: 'PAID',
      status: 'WAITING_FOR_BUS',
      createdBy: adminA._id,
    });
    console.log('✓ Tenant A Booking (Order ID:', bookingA.orderId, ') persisted in MongoDB Atlas:', bookingA._id.toString());

    // 4. Create Tenant B in MongoDB Atlas
    console.log('\n--- 2. Testing Tenant B Onboarding & Database Persistence ---');
    const tenantB = await Tenant.create({
      companyName: 'Test Sunrise Parcel',
      slug: testSlug2,
      contactEmail: 'info@testsunrise.com',
      contactPhone: '9848099887',
      address: 'Plot 44, Industrial Area, Vijayawada',
      plan: 'PRO',
      status: 'ACTIVE',
    });
    const adminB = await User.create({
      name: 'Sunrise Manager',
      username: 'test_sun_admin',
      email: 'admin@testsunrise.com',
      password: 'password123',
      role: 'admin',
      tenantId: tenantB._id,
      phone: '9848099887',
      branch: 'Vijayawada Counter',
    });
    tenantB.adminUser = adminB._id;
    await tenantB.save();
    console.log('✓ Tenant B created in MongoDB Atlas with _id:', tenantB._id.toString());

    // 5. Test Compound Unique Indexes (Both Tenant A and Tenant B can create "Kurnool" without collision)
    console.log('\n--- 3. Testing Per-Tenant Master Data Isolation & Compound Indexing ---');
    const cityB = await City.create({
      tenantId: tenantB._id,
      name: 'Kurnool',
      deliveryAddress: 'Old Bus Stand Counter #9',
      locations: ['Old Bus Stand Counter #9'],
      active: true,
    });
    console.log('✓ Tenant B successfully created its own "Kurnool" city with different counter address:', cityB.deliveryAddress);

    // 6. Test Data Isolation Queries
    console.log('\n--- 4. Testing Strict Data Isolation ---');
    const tenantBBookings = await Booking.find({ tenantId: tenantB._id });
    console.log('✓ Tenant B Booking count:', tenantBBookings.length, '(MUST BE 0)');
    if (tenantBBookings.length !== 0) {
      throw new Error('Data Isolation Failure: Tenant B saw Tenant A bookings!');
    }

    const tenantBCustomers = await Customer.find({ tenantId: tenantB._id });
    console.log('✓ Tenant B Customer count:', tenantBCustomers.length, '(MUST BE 0)');
    if (tenantBCustomers.length !== 0) {
      throw new Error('Data Isolation Failure: Tenant B saw Tenant A customers!');
    }

    // 7. Test Staff Creation Scoped to Tenant A
    console.log('\n--- 5. Testing Tenant Admin Staff Management ---');
    const staffA = await User.create({
      name: 'Express Counter Staff',
      username: 'test_exp_staff',
      email: 'staff@testexpress.com',
      password: 'password123',
      role: 'staff',
      tenantId: tenantA._id,
      phone: '9123456789',
      branch: 'MGBS Hub Counter 2',
    });
    console.log('✓ Tenant A created staff member:', staffA.name, 'with tenantId:', staffA.tenantId.toString());

    const tenantAStaffList = await User.find({ tenantId: tenantA._id });
    const tenantBStaffList = await User.find({ tenantId: tenantB._id });
    console.log('✓ Tenant A User count:', tenantAStaffList.length, '(1 Admin + 1 Staff = 2)');
    console.log('✓ Tenant B User count:', tenantBStaffList.length, '(1 Admin = 1)');
    if (tenantAStaffList.length !== 2 || tenantBStaffList.length !== 1) {
      throw new Error('User isolation check failed!');
    }

    // 8. Clean up test records
    console.log('\n--- 6. Cleaning Up Temporary Test Records ---');
    await Booking.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await Customer.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await City.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await Setting.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await User.deleteMany({ tenantId: { $in: [tenantA._id, tenantB._id] } });
    await Tenant.deleteMany({ _id: { $in: [tenantA._id, tenantB._id] } });
    console.log('✓ Cleaned up all temporary test documents from MongoDB Atlas.');

    console.log('\n======================================================');
    console.log('🎉 ALL DATABASE PERSISTENCE & DATA ISOLATION TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runPersistenceTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
