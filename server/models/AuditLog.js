const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    username: {
      type: String,
      default: 'system',
      trim: true,
    },
    role: {
      type: String,
      default: 'anonymous',
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'PASSWORD_CHANGE_SUCCESS',
        'PASSWORD_CHANGE_FAILED',
        'FORGOT_PASSWORD_RESET',
        'STAFF_PASSWORD_RESET',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DELETED',
        'TENANT_CREATED',
        'TENANT_UPDATED',
        'TENANT_SUSPENDED',
        'TENANT_ACTIVATED',
        'TENANT_DELETED',
        'IMPERSONATION_STARTED',
        'BUS_CREATED',
        'BUS_UPDATED',
        'BUS_DELETED',
        'DRIVER_CREATED',
        'DRIVER_UPDATED',
        'DRIVER_DELETED',
        'CITY_MUTATED',
        'DESTINATION_MUTATED',
        'SETTINGS_UPDATED',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'SECURITY_POLICY_VIOLATION',
      ],
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARN', 'CRITICAL'],
      default: 'INFO',
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: 'unknown',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
