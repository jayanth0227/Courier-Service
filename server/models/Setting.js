const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
      sparse: true,
      index: true,
    },
    isPlatformDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    companyName: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '/logo.png',
    },
    tagline: {
      type: String,
      default: 'Parcel & Bus Dispatch Network',
    },
    companyPhone: {
      type: String,
      default: '',
    },
    companyEmail: {
      type: String,
      default: '',
    },
    companyAddress: {
      type: String,
      default: '',
    },
    fromCity: {
      type: String,
      default: '',
    },
    gstin: {
      type: String,
      default: '',
    },
    receiptFooterNote: {
      type: String,
      default: 'Thank you for choosing our bus parcel service. Please keep this receipt safe. Claims subject to local office terms.',
    },
    whatsappProvider: {
      enum: ['MOCK', 'TWILIO', 'META', 'WEBHOOK'],
      type: String,
      default: 'MOCK',
    },
    whatsappSenderNumber: {
      type: String,
      default: '',
    },
    whatsappApiKey: {
      type: String,
      default: '',
    },
    whatsappApiUrl: {
      type: String,
      default: '',
    },
    standardRoutes: {
      type: [String],
      default: [],
    },
    parcelTypes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Setting', settingSchema);
