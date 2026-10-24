require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: '../.env' });

const API_BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('=======================================================');
  console.log('🧪 VERIFYING CMS SYNCHRONIZATION & TENANT ADMIN DATA FETCH');
  console.log('=======================================================');

  // Test 1: Verify GET /api/settings/public returns platform CMS settings (not Test Express Cargo)
  console.log('\n[Test 1] Testing GET /api/settings/public...');
  const publicRes = await req(`${API_BASE}/settings/public`);
  console.log('Public Settings Result:', {
    success: publicRes.success,
    companyName: publicRes.data.companyName,
    companyPhone: publicRes.data.companyPhone,
    companyEmail: publicRes.data.companyEmail,
  });
  if (publicRes.data.companyName === 'Test Express Cargo') {
    throw new Error('FAILED: Public settings still returning obsolete "Test Express Cargo"!');
  }
  console.log('✅ PASS: Public settings returns active CMS branding.');

  // Test 2: Login as Super Admin
  console.log('\n[Test 2] Logging in as Super Admin...');
  const superadminLogin = await req(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: {
      username: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD,
    },
  });
  const superToken = superadminLogin.token;
  console.log('✅ Super Admin authenticated successfully.');

  // Test 3: Update CMS Settings via PUT /api/superadmin/settings
  console.log('\n[Test 3] Updating CMS Settings via PUT /api/superadmin/settings...');
  const testCmsData = {
    companyName: 'Sri Vinayaka Bus Cargo & Parcel Express',
    tagline: 'Premier Bus Parcel & Logistics Network',
    companyPhone: '+91 90102 53076',
    companyEmail: 'contact@srivinayakacargo.com',
    companyAddress: 'Complex Platform #2, Central Bus Stand, Hyderabad',
    receiptFooterNote: 'Thank you for choosing Sri Vinayaka Cargo. Keep receipt safe.',
  };
  const updateCmsRes = await req(`${API_BASE}/superadmin/settings`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${superToken}` },
    body: testCmsData,
  });
  console.log('CMS Update Result:', updateCmsRes.message);

  // Verify GET /api/settings/public immediately reflects updated CMS
  const refreshedPublic = await req(`${API_BASE}/settings/public`);
  console.log('Refreshed Public Settings:', {
    name: refreshedPublic.data.companyName,
    phone: refreshedPublic.data.companyPhone,
    email: refreshedPublic.data.companyEmail,
  });
  if (refreshedPublic.data.companyName !== testCmsData.companyName) {
    throw new Error('FAILED: Updated CMS settings did not propagate to public website!');
  }
  console.log('✅ PASS: CMS updates propagate throughout public website & settings endpoint.');

  // Test 4: Onboard New Tenant & Admin via POST /api/superadmin/tenants
  console.log('\n[Test 4] Onboarding New Courier Organization & Admin...');
  const testTenantPayload = {
    companyName: 'Omega Express Cargo',
    uniqueId: 'OM' + Math.floor(1000 + Math.random() * 9000),
    slug: 'omega_' + Date.now(),
    contactEmail: 'dispatch@omegaexpress.com',
    contactPhone: '+91 99887 76655',
    plan: 'PRO',
    adminUsername: 'omega_admin_' + Math.floor(100 + Math.random() * 900),
    adminPassword: 'TempPassword#2026',
    address: 'Counter 5, RTC Complex, Vijayawada',
    adminBranch: 'Vijayawada Central Hub',
  };

  const createTenantRes = await req(`${API_BASE}/superadmin/tenants`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: testTenantPayload,
  });
  const createdTenant = createTenantRes.data.tenant;
  console.log('Created Tenant:', {
    id: createdTenant._id,
    name: createdTenant.companyName,
    uniqueId: createdTenant.uniqueId,
    email: createdTenant.contactEmail,
    phone: createdTenant.contactPhone,
    address: createdTenant.address,
  });
  console.log('✅ PASS: Tenant onboarded with all required operational details.');

  // Test 5: Impersonate new tenant admin via POST /api/superadmin/tenants/:id/impersonate
  console.log('\n[Test 5] Opening admin via 1-Click Impersonation...');
  const impersonateRes = await req(
    `${API_BASE}/superadmin/tenants/${createdTenant._id}/impersonate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${superToken}` },
    }
  );
  const tenantAdminToken = impersonateRes.token;
  const impersonatedUser = impersonateRes.user;
  console.log('Impersonated User:', {
    username: impersonatedUser.username,
    email: impersonatedUser.email,
    branch: impersonatedUser.branch,
    tenantName: impersonatedUser.tenantName,
    tenantDetails: impersonatedUser.tenant,
  });

  if (!impersonatedUser.tenant || impersonatedUser.tenant.companyName !== testTenantPayload.companyName) {
    throw new Error('FAILED: Impersonated user does not have full tenant details!');
  }
  if (impersonatedUser.branch !== testTenantPayload.adminBranch) {
    throw new Error('FAILED: Admin branch did not match provided value!');
  }
  console.log('✅ PASS: Opening admin fetches full user profile & tenant details.');

  // Test 6: Fetch tenant settings as tenant admin via GET /api/settings
  console.log('\n[Test 6] Fetching tenant settings as tenant admin via GET /api/settings...');
  const tenantSettingsRes = await req(`${API_BASE}/settings`, {
    headers: { Authorization: `Bearer ${tenantAdminToken}` },
  });
  const tenantSettings = tenantSettingsRes.data;
  console.log('Tenant Admin Settings Loaded:', {
    companyName: tenantSettings.companyName,
    companyPhone: tenantSettings.companyPhone,
    companyEmail: tenantSettings.companyEmail,
    companyAddress: tenantSettings.companyAddress,
  });

  if (tenantSettings.companyName !== testTenantPayload.companyName) {
    throw new Error('FAILED: Tenant settings companyName does not match onboarded tenant!');
  }
  if (tenantSettings.companyEmail !== testTenantPayload.contactEmail) {
    throw new Error('FAILED: Tenant settings email was not fetched correctly!');
  }
  if (tenantSettings.companyAddress !== testTenantPayload.address) {
    throw new Error('FAILED: Tenant settings address was not fetched correctly!');
  }
  console.log('✅ PASS: All details provided while adding admin fetch correctly upon opening that admin.');

  // Test 7: Update settings as tenant admin via PUT /api/settings
  console.log('\n[Test 7] Updating settings as tenant admin via PUT /api/settings...');
  const updatedAddress = 'Platform 8, New City Terminal, Vijayawada';
  const updateTenantSettingsRes = await req(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tenantAdminToken}` },
    body: {
      companyAddress: updatedAddress,
      receiptFooterNote: 'Updated footer note for Omega Express.',
    },
  });
  console.log('Tenant Settings Update Result:', updateTenantSettingsRes.message);
  if (updateTenantSettingsRes.data.companyAddress !== updatedAddress) {
    throw new Error('FAILED: Tenant admin was unable to update settings!');
  }
  console.log('✅ PASS: Tenant admin can update and manage their tenant settings.');

  // Test 8: Clean up test tenant
  console.log('\n[Test 8] Cleaning up test tenant...');
  await req(`${API_BASE}/superadmin/tenants/${createdTenant._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superToken}` },
  });
  console.log('✅ PASS: Test tenant cleaned up.');

  console.log('\n=======================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err.data || err.message);
  process.exit(1);
});
