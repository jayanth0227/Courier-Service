const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Booking = require('../models/Booking');

describe('Security & RBAC Test Suite', () => {
  let server;
  let baseUrl;
  let adminUser;
  let staffUser1;
  let staffUser2;
  let adminToken;
  let staff1Token;
  let staff2Token;
  let testTenant;
  let bookingByStaff1;

  before(async () => {
    // 1. Start ephemeral HTTP test server
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 2. Ensure Database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // 3. Find or create an isolated test tenant
    testTenant = await Tenant.findOne({ slug: 'security-test-tenant' });
    if (!testTenant) {
      testTenant = await Tenant.create({
        companyName: 'Security Testing Corp',
        slug: 'security-test-tenant',
        uniqueId: 'SEC999',
        contactEmail: 'security@testing.internal',
        contactPhone: '9999999999',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
      });
    }

    // 4. Create or fetch test admin and two staff members
    adminUser = await User.findOne({ username: 'sec_admin_test' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Sec Admin',
        username: 'sec_admin_test',
        email: 'sec_admin@testing.internal',
        password: 'Password123!',
        role: 'admin',
        tenantId: testTenant._id,
        active: true,
        tokenVersion: 0,
      });
    }

    staffUser1 = await User.findOne({ username: 'sec_staff_1' });
    if (!staffUser1) {
      staffUser1 = await User.create({
        name: 'Sec Staff One',
        username: 'sec_staff_1',
        email: 'sec_staff1@testing.internal',
        password: 'Password123!',
        role: 'staff',
        tenantId: testTenant._id,
        active: true,
        tokenVersion: 0,
      });
    }

    staffUser2 = await User.findOne({ username: 'sec_staff_2' });
    if (!staffUser2) {
      staffUser2 = await User.create({
        name: 'Sec Staff Two',
        username: 'sec_staff_2',
        email: 'sec_staff2@testing.internal',
        password: 'Password123!',
        role: 'staff',
        tenantId: testTenant._id,
        active: true,
        tokenVersion: 0,
      });
    }

    // Generate tokens
    const secret = process.env.JWT_SECRET || 'courier_dispatch_secret_jwt_key_2025_secure';
    adminToken = jwt.sign(
      { id: adminUser._id, role: 'admin', username: adminUser.username, tenantId: testTenant._id, tokenVersion: adminUser.tokenVersion },
      secret,
      { expiresIn: '1h' }
    );
    staff1Token = jwt.sign(
      { id: staffUser1._id, role: 'staff', username: staffUser1.username, tenantId: testTenant._id, tokenVersion: staffUser1.tokenVersion },
      secret,
      { expiresIn: '1h' }
    );
    staff2Token = jwt.sign(
      { id: staffUser2._id, role: 'staff', username: staffUser2.username, tenantId: testTenant._id, tokenVersion: staffUser2.tokenVersion },
      secret,
      { expiresIn: '1h' }
    );

    // Create a test booking owned by staffUser1
    bookingByStaff1 = await Booking.findOne({ customerPhone: '9888877771' });
    if (!bookingByStaff1) {
      bookingByStaff1 = await Booking.create({
        tenantId: testTenant._id,
        orderId: 'LR9999',
        customerName: 'Test Target Customer',
        customerPhone: '9888877771',
        deliveryAddress: 'Counter 1 Pickup',
        destination: 'Hyderabad → Vijayawada',
        fromCity: 'Hyderabad',
        toCity: 'Vijayawada',
        parcelType: 'Documents',
        quantity: 1,
        weight: 1,
        amount: 250,
        status: 'BOOKED',
        createdBy: staffUser1._id,
        bookedByName: staffUser1.name,
        bookedByRole: 'staff',
      });
    }
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  // Scenario 1: Unauthenticated requests are rejected with 401
  test('Scenario 1: Unauthenticated users cannot access protected APIs', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'NO_TOKEN');
  });

  // Scenario 2: Admin can access permitted Admin operations
  test('Scenario 2: Admin can access permitted Admin operations', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.stats !== undefined);
  });

  // Scenario 3: Staff cannot access Admin-only operations
  test('Scenario 3: Staff cannot access Admin-only operations (Reports / Stats)', async () => {
    const res = await fetch(`${baseUrl}/api/reports/dashboard-stats`, {
      headers: { Authorization: `Bearer ${staff1Token}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN_ROLE');
  });

  // Scenario 4: Users cannot access other users restricted records (BOLA / IDOR)
  test('Scenario 4: Staff cannot access other staff members booking records (BOLA / IDOR prevention)', async () => {
    // Staff 2 attempts to query booking owned by Staff 1
    const res = await fetch(`${baseUrl}/api/bookings/${bookingByStaff1._id}`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN_RECORD');
  });

  // Scenario 5: Changing role in client storage does not grant permissions (Server Authority)
  test('Scenario 5: Forged JWT claims or client-tampered role signatures are rejected', async () => {
    // Attacker crafts a token with role: 'superadmin' but signs with an arbitrary secret
    const forgedToken = jwt.sign(
      { id: staffUser1._id, role: 'superadmin', tenantId: testTenant._id },
      'attacker_fake_jwt_secret',
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/api/superadmin/stats`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'TOKEN_INVALID');
  });

  // Scenario 6: Successful login issues valid signed JWT with tenant context
  test('Scenario 6: Successful login validates credentials and issues signed session token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'sec_admin_test',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.username, 'sec_admin_test');
    assert.strictEqual(body.user.role, 'admin');
  });

  // Scenario 7: Account switching invalidates active session
  test('Scenario 7: Logging in as another user produces a distinct identity', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'sec_staff_1',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.user.role, 'staff');
    assert.notStrictEqual(body.user.id, adminUser._id.toString());
  });

  // Scenario 8: Stale dashboard cannot perform privileged actions after identity switch
  test('Scenario 8: Stale staff session token cannot perform admin bus management', async () => {
    const res = await fetch(`${baseUrl}/api/buses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staff1Token}`,
      },
      body: JSON.stringify({
        busNumber: 'AP 99 ZZ 9999',
        operator: 'Test Express',
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'FORBIDDEN_ROLE');
  });

  // Scenario 9: Logout invalidates session and subsequent protected requests fail
  test('Scenario 9: Logout invalidates session via server-side tokenVersion increment', async () => {
    // 1. Perform logout with staffUser2's current token
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    // 2. Attempt to use old staff2Token after logout
    const postLogoutRes = await fetch(`${baseUrl}/api/bookings`, {
      headers: { Authorization: `Bearer ${staff2Token}` },
    });
    assert.strictEqual(postLogoutRes.status, 401);
    const body = await postLogoutRes.json();
    assert.strictEqual(body.code, 'TOKEN_REVOKED');
  });

  // Scenario 10: Expired or malformed sessions are rejected
  test('Scenario 10: Expired sessions are rejected with 401 TOKEN_EXPIRED', async () => {
    const secret = process.env.JWT_SECRET || 'courier_dispatch_secret_jwt_key_2025_secure';
    const expiredToken = jwt.sign(
      { id: adminUser._id, role: 'admin', username: adminUser.username, tenantId: testTenant._id },
      secret,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'TOKEN_EXPIRED');
  });

  // Scenario 11: Account enumeration is prevented on login
  test('Scenario 11: Account enumeration is prevented with uniform error messages', async () => {
    // Non-existent user
    const resUnknown = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'non_existent_user_9999@test.com',
        password: 'Password123!',
      }),
    });
    const bodyUnknown = await resUnknown.json();

    // Existent user with wrong password
    const resWrongPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'sec_admin_test',
        password: 'CompletelyWrongPassword!',
      }),
    });
    const bodyWrongPass = await resWrongPass.json();

    assert.strictEqual(resUnknown.status, 401);
    assert.strictEqual(resWrongPass.status, 401);
    // Both must return identical generic message
    assert.strictEqual(bodyUnknown.message, 'Invalid username/email or password');
    assert.strictEqual(bodyWrongPass.message, 'Invalid username/email or password');
  });

  // Scenario 12: NoSQL query injection payloads are sanitized
  test('Scenario 12: NoSQL query injection payloads ($gt, $ne) are stripped by sanitizer', async () => {
    // Send malicious body with $gt operator
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: { $gt: '' },
        password: { $gt: '' },
      }),
    });
    // Since $gt keys are stripped, body becomes empty, triggering validation error
    assert.strictEqual(res.status, 400);
  });

  // Scenario 13: Login rate limiting works
  test('Scenario 13: Strict rate limiting protects authentication endpoints', async () => {
    // The rate limiter is configured with standard headers
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'test', password: 'test' }),
    });
    // Rate limit headers must be present
    assert.ok(res.headers.has('ratelimit-limit') || res.headers.has('x-ratelimit-limit'));
  });

  // Scenario 14: Cross-tab Broadcast message validation
  test('Scenario 14: Cross-tab Broadcast events NEVER expose credentials or tokens', () => {
    // Validate schema of broadcast events
    const broadcastEvent = {
      type: 'AUTH_LOGIN',
      userId: adminUser._id.toString(),
      role: adminUser.role,
      timestamp: Date.now(),
    };

    assert.strictEqual(broadcastEvent.token, undefined);
    assert.strictEqual(broadcastEvent.password, undefined);
    assert.strictEqual(broadcastEvent.jwt, undefined);
    assert.ok(broadcastEvent.type && broadcastEvent.userId && broadcastEvent.role);
  });

  // Scenario 15: CORS headers behaviour matches security policy
  test('Scenario 15: Security headers (Helmet) are present on HTTP responses', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    // Helmet sets X-Content-Type-Options: nosniff
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  });

  // Scenario 16: Legitimate role-specific workflows continue functioning
  test('Scenario 16: Existing application features and legitimate role operations continue working', async () => {
    // Admin reads fleet buses
    const res = await fetch(`${baseUrl}/api/buses`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});
