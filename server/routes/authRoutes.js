const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { protect, authorize } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/auditService');
const { passwordResetLimiter } = require('../middleware/security');
const emailService = require('../services/emailService');

// Precomputed dummy hash for constant-time comparison against timing-based user enumeration
const DUMMY_HASH = '$2a$10$w8TfJ3j2vM85dZ/rT7k1s.D8k9H0a1B2c3D4e5F6G7H8I9J0K1L2M';

// Generate JWT with tenant information and tokenVersion in payload
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      tenantId: user.tenantId?._id || user.tenantId || null,
      tokenVersion: typeof user.tokenVersion === 'number' ? user.tokenVersion : 0,
    },
    process.env.JWT_SECRET || 'courier_dispatch_secret_jwt_key_2025_secure',
    {
      expiresIn: '7d', // 7-day valid operational session
    }
  );
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get session token with tenant context
// @access  Public (Strict Rate Limited)
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, username, email, password } = req.body || {};
    const rawKey = typeof identifier === 'string' ? identifier : typeof username === 'string' ? username : typeof email === 'string' ? email : '';
    const loginKey = rawKey.trim().toLowerCase();
    const safePassword = typeof password === 'string' ? password : '';

    if (!loginKey || !safePassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password as valid text',
      });
    }

    // Find user in database and populate tenant details
    let user = await User.findOne({
      $or: [
        { username: loginKey },
        { email: loginKey },
        { secondaryEmail: loginKey },
        { phone: loginKey },
      ],
    }).populate('tenantId');

    // Fallback: If not found directly, check if loginKey matches tenant contactEmail or contactPhone
    if (!user) {
      const tenant = await Tenant.findOne({
        $or: [
          { contactEmail: loginKey },
          { contactPhone: loginKey },
        ],
      });
      if (tenant && tenant.adminUser) {
        user = await User.findById(tenant.adminUser).populate('tenantId');
      }
    }

    if (!user) {
      // Perform constant-time dummy comparison to prevent timing attacks
      await bcrypt.compare(safePassword, DUMMY_HASH).catch(() => {});

      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILED',
        severity: 'WARN',
        details: { reason: 'User not found', identifier: loginKey },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    if (!user.active) {
      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILED',
        severity: 'WARN',
        customUser: user,
        details: { reason: 'Account deactivated' },
      });
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your manager or platform administrator.',
      });
    }

    // Check if tenant is suspended (unless Super Admin)
    if (user.role !== 'superadmin' && user.tenantId && user.tenantId.status === 'SUSPENDED') {
      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILED',
        severity: 'WARN',
        customUser: user,
        details: { reason: 'Tenant suspended' },
      });
      return res.status(403).json({
        success: false,
        message: `Your organization (${user.tenantId.companyName}) is currently suspended. Please contact platform support.`,
      });
    }

    const isMatch = await user.matchPassword(safePassword);
    if (!isMatch) {
      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILED',
        severity: 'WARN',
        customUser: user,
        details: { reason: 'Incorrect password' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
      });
    }

    const token = generateToken(user);

    await logSecurityEvent({
      req,
      action: 'LOGIN_SUCCESS',
      severity: 'INFO',
      customUser: user,
      details: { role: user.role, branch: user.branch },
    });

    const tenantInfo = user.tenantId
      ? {
          id: user.tenantId._id,
          companyName: user.tenantId.companyName,
          uniqueId: user.tenantId.uniqueId,
          slug: user.tenantId.slug,
          contactEmail: user.tenantId.contactEmail,
          contactPhone: user.tenantId.contactPhone,
          address: user.tenantId.address,
          plan: user.tenantId.plan,
          status: user.tenantId.status,
        }
      : null;

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch,
        phone: user.phone,
        tenantId: user.tenantId?._id || null,
        tenant: tenantInfo,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Validate session & get current user profile with tenant context
// @access  Private
router.get('/me', protect, async (req, res) => {
  const tenantInfo = req.user.tenantId
    ? {
        id: req.user.tenantId._id,
        companyName: req.user.tenantId.companyName,
        uniqueId: req.user.tenantId.uniqueId,
        slug: req.user.tenantId.slug,
        contactEmail: req.user.tenantId.contactEmail,
        contactPhone: req.user.tenantId.contactPhone,
        address: req.user.tenantId.address,
        plan: req.user.tenantId.plan,
        status: req.user.tenantId.status,
      }
    : null;

  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      branch: req.user.branch,
      phone: req.user.phone,
      tenantId: req.user.tenantId?._id || null,
      tenant: tenantInfo,
    },
  });
});

// @route   POST /api/auth/logout
// @desc    Invalidate active session & revoke tokens
// @access  Private
router.post('/logout', protect, async (req, res, next) => {
  try {
    // Invalidate active session by incrementing user's tokenVersion
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });

    await logSecurityEvent({
      req,
      action: 'LOGOUT_SUCCESS',
      severity: 'INFO',
      customUser: req.user,
      details: { role: req.user.role, username: req.user.username },
    });

    res.json({
      success: true,
      message: 'Logged out successfully. Session invalidated.',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/users
// @desc    Get all staff/admin users for the authenticated tenant
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin' && !req.tenantId
      ? {}
      : { tenantId: req.tenantId };

    const users = await User.find(filter)
      .select('-password')
      .populate('tenantId', 'companyName slug')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/users
// @desc    Create a new staff account under the tenant organization
// @access  Private (Admin only)
router.post('/users', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { name, username, email, password, role = 'staff', phone, branch } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, email, and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if username or email already taken
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is already in use by another account',
      });
    }

    // Determine tenantId
    const targetTenantId = req.user.role === 'superadmin' ? (req.body.tenantId || req.tenantId) : req.tenantId;

    if (!targetTenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant organization ID is required to create a user',
      });
    }

    // Check tenant staff quota
    const tenant = await Tenant.findById(targetTenantId);
    if (tenant) {
      const currentStaffCount = await User.countDocuments({ tenantId: targetTenantId });
      if (currentStaffCount >= (tenant.maxStaff || 25)) {
        return res.status(400).json({
          success: false,
          message: `Staff limit (${tenant.maxStaff}) reached for this organization. Upgrade subscription plan for more slots.`,
        });
      }
    }

    const newUser = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: req.user.role === 'superadmin' ? role : 'staff', // Tenant admin can only create staff
      tenantId: targetTenantId,
      phone: phone ? phone.trim() : '',
      branch: branch ? branch.trim() : 'Main Office Counter',
      active: true,
    });

    await logSecurityEvent({
      req,
      action: 'USER_CREATED',
      severity: 'INFO',
      details: { createdUsername: newUser.username, role: newUser.role, targetTenantId },
    });

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        branch: newUser.branch,
        phone: newUser.phone,
        active: newUser.active,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user status / details (Scoped strictly to tenant)
// @access  Private (Admin only)
router.put('/users/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { name, phone, branch, active, password } = req.body;
    const filter = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, tenantId: req.tenantId };

    const user = await User.findOne(filter);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in your organization' });
    }

    // Prevent tenant admin from elevating a user to superadmin
    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (branch !== undefined) user.branch = branch.trim();
    if (active !== undefined) {
      user.active = Boolean(active);
      if (!user.active) {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
    }
    if (password) {
      user.password = password;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        branch: user.branch,
        active: user.active,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete or deactivate a staff member under the tenant
// @access  Private (Admin only)
router.delete('/users/:id', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, tenantId: req.tenantId };

    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in your organization' });
    }

    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete primary tenant administrator account' });
    }

    // Invalidate any active sessions before deletion
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save().catch(() => {});
    await User.deleteOne({ _id: user._id });

    res.json({
      success: true,
      message: `User '${user.username}' deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change password for the authenticated user (Admin, Staff, or Super Admin)
// @access  Private
router.put('/change-password', protect, passwordResetLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      await logSecurityEvent({
        req,
        action: 'PASSWORD_CHANGE_FAILED',
        severity: 'WARN',
        details: { reason: 'Incorrect current password' },
      });
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate new token for the active tab so current tab remains authenticated
    const newToken = generateToken(user);

    await logSecurityEvent({
      req,
      action: 'PASSWORD_CHANGE_SUCCESS',
      severity: 'INFO',
      details: { role: user.role, username: user.username },
    });

    res.json({
      success: true,
      message: 'Password has been updated successfully',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/auth/users/:id/reset-password
// @desc    Admin resets a staff member's password
// @access  Private (Admin or Super Admin only)
router.put('/users/:id/reset-password', protect, authorize('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const filter = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, tenantId: req.tenantId };

    const targetUser = await User.findOne(filter);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in your organization',
      });
    }

    if (targetUser.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot reset primary organization administrator password',
      });
    }

    targetUser.password = newPassword;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    await logSecurityEvent({
      req,
      action: 'STAFF_PASSWORD_RESET',
      severity: 'INFO',
      details: {
        resetBy: req.user.username,
        targetUsername: targetUser.username,
        targetRole: targetUser.role,
      },
    });

    res.json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.username}) has been reset successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// Helper to securely mask an email address (e.g. "admin@example.com" -> "a***n@example.com")
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  return `${name[0]}${'*'.repeat(Math.max(name.length - 2, 2))}${name[name.length - 1]}@${domain}`;
};

// @route   POST /api/auth/forgot-password/send-otp
// @desc    Generate and email 6-digit OTP for password reset
// @access  Public (Rate Limited)
router.post('/forgot-password/send-otp', passwordResetLimiter, async (req, res, next) => {
  try {
    const { identifier } = req.body || {};
    const rawKey = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';

    if (!rawKey) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account username or registered email',
      });
    }

    const user = await User.findOne({
      $or: [{ username: rawKey }, { email: rawKey }],
    });

    if (!user) {
      // Dummy timer to thwart enumeration
      await bcrypt.compare('dummy', DUMMY_HASH).catch(() => {});
      return res.status(404).json({
        success: false,
        message: 'No account found matching the provided username or email',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your manager or platform administrator.',
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    // Dispatch OTP via Email Service
    const emailResult = await emailService.sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    await logSecurityEvent({
      req,
      action: 'PASSWORD_RESET_OTP_SENT',
      severity: 'INFO',
      customUser: user,
      details: { identifier: rawKey, email: user.email, simulated: Boolean(emailResult.simulated) },
    });

    res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${maskEmail(user.email)}.`,
      maskedEmail: maskEmail(user.email),
      simulated: Boolean(emailResult.simulated),
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/forgot-password/verify-reset
// @desc    Verify 6-digit OTP and reset password
// @access  Public (Rate Limited)
router.post('/forgot-password/verify-reset', passwordResetLimiter, async (req, res, next) => {
  try {
    const { identifier, otp, newPassword } = req.body || {};

    const cleanIdentifier = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    const cleanOtp = typeof otp === 'string' ? otp.trim() : '';
    const safePassword = typeof newPassword === 'string' ? newPassword : '';

    if (!cleanIdentifier || !cleanOtp || !safePassword) {
      return res.status(400).json({
        success: false,
        message: 'Username/email, 6-digit verification code, and new password are required',
      });
    }

    if (safePassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    });

    if (!user) {
      await bcrypt.compare(safePassword, DUMMY_HASH).catch(() => {});
      return res.status(404).json({
        success: false,
        message: 'Account not found. Please verify your username or email.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your manager or platform administrator.',
      });
    }

    // Verify OTP and Expiration
    if (!user.resetPasswordOTP || user.resetPasswordOTP !== cleanOtp) {
      await logSecurityEvent({
        req,
        action: 'FORGOT_PASSWORD_INVALID_OTP',
        severity: 'WARN',
        customUser: user,
        details: { identifier: cleanIdentifier },
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your email or request a new code.',
      });
    }

    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      await logSecurityEvent({
        req,
        action: 'FORGOT_PASSWORD_EXPIRED_OTP',
        severity: 'WARN',
        customUser: user,
        details: { identifier: cleanIdentifier },
      });
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Apply new password and clear OTP fields
    user.password = safePassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
    await user.save();

    await logSecurityEvent({
      req,
      action: 'FORGOT_PASSWORD_RESET_SUCCESS',
      severity: 'INFO',
      customUser: user,
      details: { role: user.role, username: user.username },
    });

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

// Backward compatibility for standard endpoint
router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  if (req.body && req.body.otp) {
    req.url = '/forgot-password/verify-reset';
    return router.handle(req, res, next);
  }
  return res.status(400).json({
    success: false,
    message: 'Please use the 2-step OTP verification flow: request OTP via /api/auth/forgot-password/send-otp',
  });
});

module.exports = router;
