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
    termsAndConditions: {
      type: String,
      default: `1. Goods carried strictly at owner's risk; company is not liable for leakage, breakage, or natural damages.
2. Value of goods must be declared at booking; company liability for undeclared items is strictly limited to ₹500.
3. Hazardous, contraband, inflammable, or prohibited goods are strictly not accepted.
4. Demurrage will be levied if cargo is not claimed within 24 hours of bus arrival at destination.
5. Consignee must verify package condition before counter delivery acknowledgment.
6. Original LR copy or SMS verification must be produced at destination counter to claim consignment.
7. All disputes are subject to local jurisdiction only.`,
    },
    whatsappProvider: {
      enum: ['MOCK', 'TWILIO', 'META', 'WEBHOOK', 'OPENWA'],
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
    openwaSessionId: {
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
