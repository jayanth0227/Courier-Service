const mongoose = require('mongoose');

const parcelTypeSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Parcel type name is required'],
      trim: true,
    },
    defaultCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaultWeight: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index per tenant
parcelTypeSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ParcelType', parcelTypeSchema);
