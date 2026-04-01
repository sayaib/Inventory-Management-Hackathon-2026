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

const bomItemSchema = new mongoose.Schema({
  typeOfComponent: { type: String, default: '', trim: true },
  srNo: { type: Number, default: 0 },
  supplierName: { type: String, default: '', trim: true },
  nomenclatureDescription: { type: String, default: '', trim: true },
  partNoDrg: { type: String, default: '', trim: true },
  make: { type: String, default: '', trim: true },
  qtyPerBoard: { type: Number, default: 0, min: 0 },
  boardReq: { type: Number, default: 0, min: 0 },
  spareQty: { type: Number, default: 0, min: 0 },
  boardReqWithSpare: { type: Number, default: 0, min: 0 },
  totalQtyWithSpare: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 },
  additionalCost: { type: Number, default: 0, min: 0 },
  landingCostPerUnit: { type: Number, default: 0, min: 0 },
  totalPrice: { type: Number, default: 0, min: 0 },
  moq: { type: Number, default: 0, min: 0 },
  remarks: { type: String, default: '', trim: true },
  leadTime: { type: String, default: '', trim: true },
  leadTimeWeeks: { type: Number, default: 0, min: 0 },
  inventoryAssetId: { type: String, default: '', trim: true },
  inventorySku: { type: String, default: '', trim: true },
  inventoryItemName: { type: String, default: '', trim: true },
  plannedQty: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  department: { type: String, default: '', trim: true },
  status: { type: String, enum: ['active', 'on_hold', 'completed'], default: 'active' },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managerEmail: { type: String, default: '', trim: true, lowercase: true },
  materials: { type: [projectMaterialSchema], default: [] },
  bomItems: { type: [bomItemSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
