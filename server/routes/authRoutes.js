const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { protect, authorize } = require('../middleware/auth');
const { logSecurityEvent } = require('../services/auditService');
const { passwordResetLimiter } = require('../middleware/security');

// Generate JWT with tenant information in payload
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      tenantId: user.tenantId?._id || user.tenantId || null,
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
    const user = await User.findOne({
      $or: [
        { username: loginKey },
        { email: loginKey },
        { phone: loginKey },
      ],
    }).populate('tenantId');

    if (!user) {
      await logSecurityEvent({
        req,
        action: 'LOGIN_FAILED',
        severity: 'WARN',
        details: { reason: 'User not found', identifier: loginKey },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
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
        message: 'Invalid credentials. Incorrect password.',
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
    if (active !== undefined) user.active = Boolean(active);
    if (password) user.password = password;

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
router.put('/change-password', protect, async (req, res, next) => {
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
    await user.save();

    await logSecurityEvent({
      req,
      action: 'PASSWORD_CHANGE_SUCCESS',
      severity: 'INFO',
      details: { role: user.role, username: user.username },
    });

    res.json({
      success: true,
      message: 'Password has been updated successfully',
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

// @route   POST /api/auth/forgot-password
// @desc    Reset password via username and registered email verification
// @access  Public (Rate Limited)
router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const { identifier, email, newPassword } = req.body || {};

    if (!identifier || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username, registered email, and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    });

    if (!user || user.email.toLowerCase() !== cleanEmail) {
      await logSecurityEvent({
        req,
        action: 'FORGOT_PASSWORD_FAILED',
        severity: 'WARN',
        details: { identifier: cleanIdentifier, email: cleanEmail, reason: 'Credentials mismatch' },
      });
      return res.status(404).json({
        success: false,
        message: 'No account found matching this username and registered email address',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your manager or platform administrator.',
      });
    }

    user.password = newPassword;
    await user.save();

    await logSecurityEvent({
      req,
      action: 'FORGOT_PASSWORD_RESET',
      severity: 'INFO',
      customUser: user,
      details: { role: user.role, username: user.username },
    });

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
