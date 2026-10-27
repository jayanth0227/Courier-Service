/**
 * Tenant Scoping Middleware
 * Ensures strict multi-tenant isolation across all database operations.
 */
const Tenant = require('../models/Tenant');

const tenantScope = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for tenant operations',
      });
    }

    // 1. Super Admin access
    if (req.user.role === 'superadmin') {
      const explicitTenant = req.headers['x-tenant-id'] || req.query.tenantId;
      if (explicitTenant) {
        req.tenantId = explicitTenant;
        req.tenantFilter = { tenantId: explicitTenant };
      } else {
        req.tenantId = null;
        req.tenantFilter = {};
      }
      return next();
    }

    // 2. Tenant Admin or Staff
    if (!req.user.tenantId) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_NOT_ASSIGNED',
        message: 'Your account is not linked to any active courier tenant organization',
      });
    }

    // 3. Verify Tenant exists and is active
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        code: 'TENANT_NOT_FOUND',
        message: 'The courier tenant organization for this account was not found',
      });
    }

    if (tenant.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        code: 'TENANT_SUSPENDED',
        message: `Account for ${tenant.companyName} is currently suspended. Please contact platform support.`,
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant._id;
    req.tenantFilter = { tenantId: tenant._id };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = tenantScope;
