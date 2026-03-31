const mongoose = require('mongoose');

const projectMaterialSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  sku: { type: String, required: true },
  itemName: { type: String, required: true },
  unit: { type: String, default: 'pcs' },
  plannedQuantity: { type: Number, default: 0, min: 0 },
  allocatedQuantity: { type: Number, default: 0, min: 0 },
  usedQuantityOverride: { type: Number, default: null },
  usageEvents: {
    type: [
      {
        source: { type: String, enum: ['manual'], required: true },
        delta: { type: Number, required: true },
        usedTotal: { type: Number, required: true },
        performedBy: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    default: []
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'on_hold', 'completed'], default: 'active' },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managerEmail: { type: String, default: '', trim: true, lowercase: true },
  materials: { type: [projectMaterialSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
