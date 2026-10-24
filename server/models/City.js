const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      trim: true,
      default: '',
    },
    locations: {
      type: [String],
      default: [],
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

// Pre-save to ensure deliveryAddress and locations array stay synced
citySchema.pre('save', function (next) {
  if (this.deliveryAddress && !this.locations.includes(this.deliveryAddress)) {
    this.locations.push(this.deliveryAddress);
  }
  this.locations = Array.from(new Set(this.locations.map((l) => (l || '').trim()).filter(Boolean)));
  if (!this.deliveryAddress && this.locations.length > 0) {
    this.deliveryAddress = this.locations[0];
  }
  next();
});

// Compound unique index per tenant
citySchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('City', citySchema);

