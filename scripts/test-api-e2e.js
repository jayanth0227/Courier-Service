const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');
const http = require('http');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const connectDB = require('../server/config/db');
const authRoutes = require('../server/routes/authRoutes');
const bookingRoutes = require('../server/routes/bookingRoutes');
const superadminRoutes = require('../server/routes/superadminRoutes');
const cityRoutes = require('../server/routes/cityRoutes');
const errorHandler = require('../server/middleware/errorHandler');

const Tenant = require('../server/models/Tenant');
const User = require('../server/models/User');
const Booking = require('../server/models/Booking');
const City = require('../server/models/City');

async function runApiE2ETest() {
  console.log('--- 🚀 STARTING FULL HTTP REST API END-TO-END TEST ---');
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/superadmin', superadminRoutes);
  app.use('/api/cities', cityRoutes);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test Express server listening on ${baseUrl}`);

  try {
    // 1. Superadmin Login
    console.log('\n1. Testing Super Admin Login via /api/auth/login...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'superadmin', password: 'superadmin123' }),
    }).then((r) => r.json());

    if (!loginRes.success || !loginRes.token) {
      throw new Error(`Superadmin login failed: ${JSON.stringify(loginRes)}`);
    }
    const superToken = loginRes.token;
    console.log('✓ Superadmin logged in successfully! Role:', loginRes.user.role);

    // 2. Superadmin Stats
    console.log('\n2. Testing /api/superadmin/stats...');
    const statsRes = await fetch(`${baseUrl}/api/superadmin/stats`, {
      headers: { Authorization: `Bearer ${superToken}` },
    }).then((r) => r.json());

    if (!statsRes.success) {
      throw new Error(`Stats fetch failed: ${JSON.stringify(statsRes)}`);
    }
    console.log('✓ Platform stats retrieved: Total Tenants:', statsRes.data.totalTenants, ', Gross Revenue: ₹' + statsRes.data.totalRevenue);

    // 3. Superadmin Onboards New Courier Company
    console.log('\n3. Testing Tenant Onboarding via POST /api/superadmin/tenants...');
    const testSlug = 'api-test-courier-' + Date.now();
    const onboardRes = await fetch(`${baseUrl}/api/superadmin/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superToken}`,
      },
      body: JSON.stringify({
        companyName: 'Apex Express Logistics',
        slug: testSlug,
        contactEmail: `admin@${testSlug}.com`,
        contactPhone: '9988776655',
        address: 'MG Road Counter 5, Guntur',
        plan: 'PRO',
        adminName: 'Apex Manager',
        adminUsername: `admin_${Date.now()}`,
        adminPassword: 'Password@123',
        adminBranch: 'Guntur Main Hub',
      }),
    }).then((r) => r.json());

    if (!onboardRes.success) {
      throw new Error(`Tenant onboarding failed: ${JSON.stringify(onboardRes)}`);
    }
    const tenantId = onboardRes.data.tenant._id;
    const adminUsername = onboardRes.data.adminUser.username;
    console.log('✓ Tenant & Admin successfully onboarded and saved to MongoDB Atlas! Tenant ID:', tenantId);

    // 4. Tenant Admin Login
    console.log('\n4. Testing Tenant Admin Login...');
    const tenantLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: adminUsername, password: 'Password@123' }),
    }).then((r) => r.json());

    if (!tenantLoginRes.success || !tenantLoginRes.token) {
      throw new Error(`Tenant admin login failed: ${JSON.stringify(tenantLoginRes)}`);
    }
    const tenantToken = tenantLoginRes.token;
    console.log('✓ Tenant Admin logged in! Tenant company:', tenantLoginRes.user.tenant.companyName);

    // 5. Tenant Admin Creates Booking
    console.log('\n5. Testing Booking Creation via POST /api/bookings...');
    const bookingRes = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenantToken}`,
      },
      body: JSON.stringify({
        customerName: 'Kalyan Rao',
        customerPhone: '9123450987',
        fromCity: 'Hyderabad',
        toCity: 'Guntur',
        destination: 'Hyderabad → Guntur',
        deliveryAddress: 'Guntur Main Counter, Bus Station',
        parcelType: 'Commercial Carton',
        quantity: 3,
        weight: 15,
        amount: 450,
        paymentStatus: 'PAID',
      }),
    }).then((r) => r.json());

    if (!bookingRes.success) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookingRes)}`);
    }
    const orderId = bookingRes.data.orderId;
    console.log('✓ Booking created and persisted in MongoDB Atlas! 6-digit Order ID:', orderId, ', Amount: ₹' + bookingRes.data.amount);

    // 6. Verify Booking list for this Tenant
    console.log('\n6. Fetching bookings for this tenant via GET /api/bookings...');
    const listRes = await fetch(`${baseUrl}/api/bookings`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    }).then((r) => r.json());

    if (!listRes.success || listRes.data.length !== 1) {
      throw new Error(`Expected 1 booking, got: ${listRes.data?.length}`);
    }
    console.log('✓ Booking successfully retrieved from MongoDB Atlas:', listRes.data[0].orderId);

    // 7. Superadmin 1-Click Impersonation
    console.log('\n7. Testing Superadmin 1-Click Impersonation via POST /api/superadmin/impersonate...');
    const impRes = await fetch(`${baseUrl}/api/superadmin/impersonate/${tenantId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
    }).then((r) => r.json());

    if (!impRes.success || !impRes.token) {
      throw new Error(`Impersonation failed: ${JSON.stringify(impRes)}`);
    }
    console.log('✓ 1-Click Impersonation token generated! Viewing tenant:', impRes.user.tenant.companyName);

    // 8. Clean up created test tenant
    console.log('\n8. Cleaning up test tenant from MongoDB Atlas...');
    await Booking.deleteMany({ tenantId });
    await City.deleteMany({ tenantId });
    await User.deleteMany({ tenantId });
    await Tenant.deleteOne({ _id: tenantId });
    console.log('✓ Cleaned up test tenant documents.');

    console.log('\n========================================================');
    console.log('🎉 ALL REST API ENDPOINTS & LIVE DATABASE WRITES PASSED!');
    console.log('========================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runApiE2ETest().catch((err) => {
  console.error('❌ API E2E test failed:', err);
  process.exit(1);
});
