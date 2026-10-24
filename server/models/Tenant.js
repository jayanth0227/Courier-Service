const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    uniqueId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Unique company slug / code is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    plan: {
      type: String,
      enum: ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'],
      default: 'PRO',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    maxStaff: {
      type: Number,
      default: 25,
    },
    maxBuses: {
      type: Number,
      default: 100,
    },
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Tenant', tenantSchema);
