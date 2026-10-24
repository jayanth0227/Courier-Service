const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING STAFF RESTRICTIONS & "BOOKED BY" FEATURE');
  console.log('====================================================\n');

  // 1. Login as Super Admin first to obtain or create a tenant admin
  console.log('1. Logging in as Super Admin...');
  const saRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: 'superadmin', password: 'superadmin123' }
  );

  if (!saRes.data || !saRes.data.token) {
    console.error('Superadmin login failed:', saRes.data);
    process.exit(1);
  }
  const saToken = saRes.data.token;
  console.log('✅ Superadmin login successful.');

  // Find or use existing tenant admin
  console.log('2. Fetching tenant admin or tenant list...');
  const tenantsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/superadmin/tenants',
    method: 'GET',
    headers: { Authorization: `Bearer ${saToken}` },
  });

  const tenant = tenantsRes.data?.data?.[0];
  if (!tenant) {
    console.error('No tenant found:', tenantsRes.data);
    process.exit(1);
  }
  console.log(`✅ Using Tenant: "${tenant.companyName}" (ID: ${tenant._id})`);

  // Impersonate or login as the Tenant Admin
  console.log('3. Impersonating / logging in as Tenant Admin...');
  const adminRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/superadmin/tenants/${tenant._id}/impersonate`,
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken}` },
    }
  );

  const adminToken = adminRes.data?.token;
  const adminUser = adminRes.data?.user;
  console.log(`✅ Tenant Admin active: ${adminUser.name} (${adminUser.role})`);

  // Create or obtain a Staff user for this tenant
  console.log('4. Creating or fetching a Staff user under tenant...');
  const staffUsername = `staff_test_${Date.now().toString().slice(-4)}`;
  const staffEmail = `${staffUsername}@fasttrack.local`;
  const staffPassword = 'StaffPassword123!';

  const createStaffRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      name: 'Ramesh Staff',
      username: staffUsername,
      email: staffEmail,
      password: staffPassword,
      role: 'staff',
      phone: '9876501234',
      branch: 'Ameerpet Counter',
    }
  );

  if (!createStaffRes.data?.success) {
    console.error('Failed to create staff:', createStaffRes.data);
    process.exit(1);
  }
  console.log(`✅ Staff created: "${createStaffRes.data.data.name}" (${staffUsername})`);

  // Login as Staff
  console.log('5. Logging in as Staff...');
  const staffLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: staffUsername, password: staffPassword }
  );

  if (!staffLoginRes.data?.token) {
    console.error('Staff login failed:', staffLoginRes.data);
    process.exit(1);
  }
  const staffToken = staffLoginRes.data.token;
  console.log('✅ Staff logged in successfully.');

  // Create an Order by Admin
  console.log('\n6. Creating Order A by ADMIN...');
  const orderARes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    {
      customerName: 'Admin Client',
      customerPhone: '9848011111',
      receiverName: 'Vijayawada Hub',
      receiverPhone: '9848022222',
      fromCity: 'Hyderabad',
      toCity: 'Vijayawada',
      deliveryAddress: 'Governorpet Bus Stop, Vijayawada',
      destination: 'Hyderabad → Vijayawada',
      parcelType: 'Documents / Electronics',
      quantity: 1,
      weight: 3.5,
      amount: 450,
      paymentStatus: 'PAID',
    }
  );

  const orderA = orderARes.data?.data;
  console.log(`✅ Order A created: #${orderA?.orderId} | Booked By: ${orderA?.bookedByName} (${orderA?.bookedByRole})`);

  // Create an Order by Staff
  console.log('\n7. Creating Order B by STAFF...');
  const orderBRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
    },
    {
      customerName: 'Staff Customer',
      customerPhone: '9848033333',
      receiverName: 'Guntur Counter',
      receiverPhone: '9848044444',
      fromCity: 'Hyderabad',
      toCity: 'Guntur',
      deliveryAddress: 'Old Bus Stand, Guntur',
      destination: 'Hyderabad → Guntur',
      parcelType: 'Fabric Box',
      quantity: 2,
      weight: 7.0,
      amount: 600,
      paymentStatus: 'PAID',
    }
  );

  const orderB = orderBRes.data?.data;
  console.log(`✅ Order B created: #${orderB?.orderId} | Booked By: ${orderB?.bookedByName} (${orderB?.bookedByRole})`);

  // Verify Staff Bookings List Scoping
  console.log('\n8. Checking GET /api/bookings as STAFF...');
  const staffBookingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bookings',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });

  const staffBookings = staffBookingsRes.data?.data || [];
  const staffHasOrderA = staffBookings.some((b) => b.orderId === orderA.orderId);
  const staffHasOrderB = staffBookings.some((b) => b.orderId === orderB.orderId);

  console.log(`   Staff Bookings count: ${staffBookings.length}`);
  console.log(`   Does staff see Order A (Admin's order)? -> ${staffHasOrderA ? '❌ YES (FAIL)' : '✅ NO (PASS)'}`);
  console.log(`   Does staff see Order B (Their own order)? -> ${staffHasOrderB ? '✅ YES (PASS)' : '❌ NO (FAIL)'}`);

  if (staffHasOrderA || !staffHasOrderB) {
    console.error('❌ Scoping failed: staff should ONLY see their own bookings in the list!');
    process.exit(1);
  }

  // Verify Admin Bookings List Scoping
  console.log('\n9. Checking GET /api/bookings as ADMIN...');
  const adminBookingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bookings',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const adminBookings = adminBookingsRes.data?.data || [];
  const adminHasOrderA = adminBookings.find((b) => b.orderId === orderA.orderId);
  const adminHasOrderB = adminBookings.find((b) => b.orderId === orderB.orderId);

  console.log(`   Admin Bookings count: ${adminBookings.length}`);
  console.log(`   Does admin see Order A? -> ${adminHasOrderA ? '✅ YES' : '❌ NO'}`);
  console.log(`   Does admin see Order B? -> ${adminHasOrderB ? '✅ YES' : '❌ NO'}`);
  console.log(`   Order A Booked By label -> "${adminHasOrderA?.bookedByName}" (Role: ${adminHasOrderA?.bookedByRole || adminHasOrderA?.createdBy?.role})`);
  console.log(`   Order B Booked By label -> "${adminHasOrderB?.bookedByName}" (Role: ${adminHasOrderB?.bookedByRole || adminHasOrderB?.createdBy?.role})`);

  if (!adminHasOrderA || !adminHasOrderB) {
    console.error('❌ Admin failed to see all organization bookings!');
    process.exit(1);
  }

  // Verify Parcel Tracking for Order A (booked by admin) and Order B (booked by staff)
  console.log('\n10. Testing Parcel Tracking for Order A (booked by admin)...');
  const trackARes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tracking/${orderA.orderId}`,
    method: 'GET',
  });
  console.log(`   Status: ${trackARes.status} | Order: #${trackARes.data?.data?.orderId} | Status: ${trackARes.data?.data?.status}`);
  if (trackARes.status !== 200) {
    console.error('❌ Tracking for admin order failed');
    process.exit(1);
  }

  console.log('\n11. Testing Parcel Tracking for Order B (booked by staff)...');
  const trackBRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/tracking/${orderB.orderId}`,
    method: 'GET',
  });
  console.log(`   Status: ${trackBRes.status} | Order: #${trackBRes.data?.data?.orderId} | Status: ${trackBRes.data?.data?.status}`);
  if (trackBRes.status !== 200) {
    console.error('❌ Tracking for staff order failed');
    process.exit(1);
  }

  // 12. Test Staff Forbidden Endpoints
  console.log('\n12. Testing Staff RBAC restriction on /api/reports/dashboard-stats...');
  const reportRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/reports/dashboard-stats',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log(`   Staff accessing reports status: ${reportRes.status} (Expected 403 Forbidden)`);
  if (reportRes.status !== 403) {
    console.error('❌ Staff should NOT have access to reports!');
    process.exit(1);
  }

  console.log('\n13. Testing Staff RBAC restriction on /api/auth/users...');
  const staffManageRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/users',
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  console.log(`   Staff accessing staff management status: ${staffManageRes.status} (Expected 403 Forbidden)`);
  if (staffManageRes.status !== 403) {
    console.error('❌ Staff should NOT have access to manage users!');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL REQUIREMENTS FULLY TESTED & VERIFIED PASSING!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
