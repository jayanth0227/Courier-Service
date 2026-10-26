const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      unique: true,
      index: true,
    },
    inquiryType: {
      type: String,
      required: true,
      default: 'Commercial Vendor Booking',
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'In Discussion', 'Closed'],
      default: 'New',
      index: true,
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

// Auto-generate reference number if not set
inquirySchema.pre('save', function (next) {
  if (!this.referenceNumber) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.referenceNumber = `INQ-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
