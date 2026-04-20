const mongoose = require('mongoose');
const { ASSET_CATEGORIES } = require('../constants/assets');

const companySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    locations: [{ type: String, trim: true }]
  },
  { _id: false }
);

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'admin' },
    defaultLowStockThreshold: { type: Number, default: 5, min: 0 },
    companyDirectory: { type: [companySchema], default: [] },
    assetCategories: { type: [String], default: ASSET_CATEGORIES },
    selectedCompanyId: { type: String, trim: true, default: '' },
    selectedCompanyLocation: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
