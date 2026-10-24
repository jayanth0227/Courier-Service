const AuditLog = require('../models/AuditLog');

/**
 * Extracts client IP address safely
 */
const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

/**
 * Asynchronously record a security or administrative audit event.
 * Fire-and-forget so that database logging never delays user response time.
 */
const logSecurityEvent = async ({
  req,
  action,
  severity = 'INFO',
  details = {},
  targetTenantId = null,
  customUser = null,
}) => {
  try {
    const user = customUser || req?.user;
    const ipAddress = getClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    const tenantId =
      targetTenantId ||
      req?.tenantId ||
      user?.tenantId?._id ||
      user?.tenantId ||
      null;

    const payload = {
      tenantId,
      userId: user?._id || null,
      username: user?.username || user?.identifier || 'anonymous',
      role: user?.role || 'anonymous',
      action,
      severity,
      ipAddress,
      userAgent: userAgent.slice(0, 255),
      details,
      timestamp: new Date(),
    };

    // Save asynchronously
    await AuditLog.create(payload);
  } catch (err) {
    console.error('[AuditService Warning]: Failed to record audit log:', err.message);
  }
};

module.exports = {
  logSecurityEvent,
  getClientIp,
};
