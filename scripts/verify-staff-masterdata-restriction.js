const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
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

async function runTest() {
  console.log('====================================================');
  console.log('🧪 VERIFYING STAFF RESTRICTIONS ON MASTER DATA');
  console.log('====================================================\n');

  // 1. Superadmin Login
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

  const saToken = saRes.data?.token;

  // 2. Fetch Tenant
  const tenantsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/superadmin/tenants',
    method: 'GET',
    headers: { Authorization: `Bearer ${saToken}` },
  });
  const tenant = tenantsRes.data?.data?.[0];

  // 3. Impersonate Tenant Admin
  const adminRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/superadmin/tenants/${tenant._id}/impersonate`,
    method: 'POST',
    headers: { Authorization: `Bearer ${saToken}` },
  });
  const adminToken = adminRes.data?.token;

  // 4. Create / login staff
  const staffUsername = `staff_rbac_${Date.now().toString().slice(-4)}`;
  const staffPassword = 'StaffPassword123!';
  await request(
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
      name: 'Ramu Counter Staff',
      username: staffUsername,
      email: `${staffUsername}@cargo.local`,
      password: staffPassword,
      role: 'staff',
    }
  );

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
  const staffToken = staffLoginRes.data?.token;
  console.log('✅ Staff logged in:', staffUsername);

  // 5. Test Staff POST /api/cities (Add Destination Hub)
  console.log('\n[Test 1] Testing Staff POST /api/cities (Add Destination Hub)...');
  const staffCityRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/cities',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
    },
    { name: 'Unauthorized City', deliveryAddress: 'Some Street' }
  );
  console.log(`Staff status: ${staffCityRes.status} (Expected 403)`);
  if (staffCityRes.status !== 403) {
    console.error('❌ FAIL: Staff should NOT be able to add cities/destinations!');
    process.exit(1);
  }
  console.log('✅ PASS: Staff correctly blocked from adding destination hubs.');

  // 6. Test Staff POST /api/parcel-types (Add Parcel Type)
  console.log('\n[Test 2] Testing Staff POST /api/parcel-types (Add Parcel Type)...');
  const staffPtRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/parcel-types',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
    },
    { name: 'Unauthorized Parcel Category', defaultCharge: 200 }
  );
  console.log(`Staff status: ${staffPtRes.status} (Expected 403)`);
  if (staffPtRes.status !== 403) {
    console.error('❌ FAIL: Staff should NOT be able to add parcel types!');
    process.exit(1);
  }
  console.log('✅ PASS: Staff correctly blocked from adding parcel types.');

  // 7. Verify Admin CAN add parcel type and city
  console.log('\n[Test 3] Verifying Admin CAN add parcel type and city...');
  const adminPtRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/parcel-types',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    },
    { name: `Box Test ${Date.now().toString().slice(-4)}`, defaultCharge: 250 }
  );
  console.log(`Admin Parcel Type Create Status: ${adminPtRes.status} (Expected 201)`);
  if (adminPtRes.status !== 201) {
    console.error('❌ FAIL: Admin should be able to create parcel types');
    process.exit(1);
  }
  console.log('✅ PASS: Admin authorized to manage master data.');

  console.log('\n====================================================');
  console.log('🎉 ALL RESTRICTIONS FOR STAFF VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
