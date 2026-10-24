const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    busNumber: {
      type: String,
      required: [true, 'Bus registration number is required (e.g. AP 39 CN 3580)'],
      trim: true,
      uppercase: true,
    },
    busName: {
      type: String,
      trim: true,
      default: '',
    },
    operator: {
      type: String,
      trim: true,
      default: '',
    },
    fromCity: {
      type: String,
      trim: true,
      default: '',
    },
    toCity: {
      type: String,
      trim: true,
      default: '',
    },
    route: {
      type: String,
      trim: true,
      default: '',
    },
    driverName: {
      type: String,
      trim: true,
      default: '',
    },
    driverPhone: {
      type: String,
      trim: true,
      default: '',
    },
    defaultDepartureTime: {
      type: String,
      trim: true,
      default: '',
    },
    defaultArrivalTime: {
      type: String,
      trim: true,
      default: '',
    },
    platformNumber: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
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
busSchema.index({ tenantId: 1, busNumber: 1 }, { unique: true });

module.exports = mongoose.model('Bus', busSchema);
