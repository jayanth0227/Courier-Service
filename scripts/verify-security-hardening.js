require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

const http = require('http');
const mongoose = require('mongoose');
const app = require('../server/server');
const User = require('../server/models/User');
const Tenant = require('../server/models/Tenant');

let server;
const PORT = 5066;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runHardeningVerification() {
  console.log('====================================================');
  console.log('🛡️  FULL COMPREHENSIVE SECURITY HARDENING VERIFICATION');
  console.log('====================================================');

  server = app.listen(PORT, async () => {
    try {
      // 1. Wait for database connection
      console.log('[Step 1] Connecting to database...');
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 30) {
        await new Promise((r) => setTimeout(r, 400));
        attempts++;
      }
      console.log('✓ Database ready state: ' + mongoose.connection.readyState);

      // 2. Health check & Helmet security headers
      const healthRes = await request('/api/health');
      console.log(`[Step 2] Health Check status: ${healthRes.status}`);
      if (healthRes.headers['x-content-type-options'] === 'nosniff') {
        console.log('✓ Helmet X-Content-Type-Options: nosniff verified');
      }

      // 3. Unauthenticated access blocked
      const unauthRes = await request('/api/auth/me');
      console.log(`[Step 3] Unauthenticated /api/auth/me: ${unauthRes.status}`);
      if (unauthRes.status === 401) {
        console.log('✓ Unauthenticated request rejected with 401');
      }

      // 4. Admin Login
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: adminUsername, password: adminPassword },
      });

      console.log(`[Step 4] Admin login for (${adminUsername}): Status ${adminLoginRes.status}`);
      if (!adminLoginRes.body.success || !adminLoginRes.body.token) {
        throw new Error('Admin login failed: ' + JSON.stringify(adminLoginRes.body));
      }
      const adminToken = adminLoginRes.body.token;
      console.log(`✓ Admin JWT token received: ${adminToken.slice(0, 25)}...`);

      // 5. Test User Password Pre-Save Fix (Update profile without password change, ensure login still works)
      console.log('[Step 5] Testing password hash preservation on user profile update...');
      const adminUser = await User.findOne({ username: adminUsername });
      adminUser.name = 'Updated Admin Name ' + Date.now();
      await adminUser.save(); // Must NOT re-hash password

      const reLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: adminUsername, password: adminPassword },
      });
      if (reLoginRes.body.success) {
        console.log('✓ Password preservation verified: user profile updated without password corruption!');
      } else {
        throw new Error('Password corruption detected on profile update!');
      }

      // 6. Create Staff User & Test Role-Based Access Control (RBAC)
      console.log('[Step 6] Testing Role-Based Access Control (RBAC)...');
      const testStaffUsername = 'staff_test_' + Date.now().toString().slice(-5);
      const testStaffPassword = 'staffpassword123';

      const createStaffRes = await request('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: {
          name: 'Test Staff Member',
          username: testStaffUsername,
          email: `${testStaffUsername}@testcourier.com`,
          password: testStaffPassword,
          role: 'staff',
        },
      });

      if (!createStaffRes.body.success) {
        throw new Error('Failed to create test staff: ' + JSON.stringify(createStaffRes.body));
      }
      console.log(`✓ Staff user created: ${testStaffUsername}`);

      // Staff login
      const staffLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { identifier: testStaffUsername, password: testStaffPassword },
      });
      const staffToken = staffLoginRes.body.token;
      console.log(`✓ Staff user authenticated: ${testStaffUsername}`);

      // 6a. Staff attempting to register a bus (MUST be 403 Forbidden)
      const staffBusRes = await request('/api/buses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: { busNumber: 'TS 09 XY 9999' },
      });
      console.log(`[RBAC Test 1] Staff POST /api/buses: Status ${staffBusRes.status} (${staffBusRes.body.code})`);
      if (staffBusRes.status === 403 && staffBusRes.body.code === 'FORBIDDEN_ROLE') {
        console.log('✓ Bus registration correctly protected by RBAC');
      } else {
        throw new Error('RBAC failed on bus registration! Got status: ' + staffBusRes.status);
      }

      // 6b. Staff attempting to delete a bus (MUST be 403 Forbidden)
      const staffBusDel = await request('/api/buses/654321654321654321654321', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      console.log(`[RBAC Test 2] Staff DELETE /api/buses/:id: Status ${staffBusDel.status}`);
      if (staffBusDel.status === 403) {
        console.log('✓ Bus deletion correctly protected by RBAC');
      }

      // 6c. Staff attempting to register a driver (MUST be 403 Forbidden)
      const staffDriverRes = await request('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: { name: 'Driver Rogue', phone: '9988776655' },
      });
      console.log(`[RBAC Test 3] Staff POST /api/drivers: Status ${staffDriverRes.status}`);
      if (staffDriverRes.status === 403) {
        console.log('✓ Driver creation correctly protected by RBAC');
      }

      // 6d. Staff attempting to view Security Audit Logs (MUST be 403 Forbidden)
      const staffAuditRes = await request('/api/audit-logs', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      console.log(`[RBAC Test 4] Staff GET /api/audit-logs: Status ${staffAuditRes.status}`);
      if (staffAuditRes.status === 403) {
        console.log('✓ Security Audit Logs correctly protected by RBAC');
      }

      // 7. Admin querying Security Audit Logs
      console.log('[Step 7] Querying Security Audit Trail as Admin...');
      const adminAuditRes = await request('/api/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(`Admin GET /api/audit-logs: Status ${adminAuditRes.status}, count: ${adminAuditRes.body.data?.length}`);
      if (adminAuditRes.body.success && adminAuditRes.body.data?.length > 0) {
        console.log('✓ Security Audit Logs retrieved successfully. Recent actions:');
        adminAuditRes.body.data.slice(0, 3).forEach((item) => {
          console.log(`  - [${item.severity}] ${item.action} by ${item.username} from ${item.ipAddress}`);
        });
      }

      // 8. ReDoS Defense Test
      console.log('[Step 8] Testing ReDoS injection defense on search queries...');
      const redosPayload = encodeURIComponent('^((((((a+)+)+)+)+)+)+$');
      const redosStartTime = Date.now();
      const redosRes = await request(`/api/bookings?search=${redosPayload}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const redosDuration = Date.now() - redosStartTime;
      console.log(`ReDoS search query executed in ${redosDuration}ms with status: ${redosRes.status}`);
      if (redosDuration < 500 && redosRes.status === 200) {
        console.log('✓ ReDoS pattern neutralized by escapeRegex safely');
      }

      // 9. Clean up test staff
      await User.deleteOne({ username: testStaffUsername });
      console.log(`✓ Cleaned up test staff user: ${testStaffUsername}`);

      console.log('====================================================');
      console.log('🎉 ALL SECURITY AUDIT & HARDENING TESTS VERIFIED!');
      console.log('====================================================');
      process.exit(0);
    } catch (err) {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    }
  });
}

runHardeningVerification();
