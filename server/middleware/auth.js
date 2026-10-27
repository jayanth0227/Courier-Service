const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware:
 * Validates the JWT Bearer token, fetches the user from the database,
 * confirms the account is active, and attaches `req.user`.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_MISSING',
          message: 'Not authorized, no token provided',
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'courier_dispatch_secret_jwt_key_2025_secure');
      const user = await User.findById(decoded.id).select('-password').populate('tenantId');

      if (!user) {
        return res.status(401).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: 'User associated with session not found',
        });
      }

      if (!user.active) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Account is deactivated. Contact system administrator.',
        });
      }

      if (user.role !== 'superadmin' && user.tenantId && user.tenantId.status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          code: 'TENANT_SUSPENDED',
          message: 'Your organization account is currently suspended. Please contact platform support.',
        });
      }

      // Session revocation / version validation
      if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
        if (decoded.tokenVersion !== user.tokenVersion) {
          return res.status(401).json({
            success: false,
            code: 'TOKEN_REVOKED',
            message: 'Session has been invalidated due to logout or credential change. Please log in again.',
          });
        }
      }

      req.user = user;
      req.tenantId = user.tenantId ? (user.tenantId._id || user.tenantId) : null;
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Session has expired. Please log in again.',
        });
      }

      return res.status(401).json({
        success: false,
        code: 'TOKEN_INVALID',
        message: 'Invalid authorization token. Please log in again.',
      });
    }
  }

  return res.status(401).json({
    success: false,
    code: 'NO_TOKEN',
    message: 'Access denied. Bearer token required.',
  });
};

const { logSecurityEvent } = require('../services/auditService');

/**
 * Role-Based Access Control (RBAC) middleware:
 * Ensures the authenticated user has one of the allowed roles (e.g., 'admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required before accessing this resource',
      });
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent({
        req,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'WARN',
        details: {
          path: req.originalUrl || req.path,
          method: req.method,
          userRole: req.user.role,
          requiredRoles: roles,
        },
      });

      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: `Role '${req.user.role}' is not authorized to perform this action. Required: [${roles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
