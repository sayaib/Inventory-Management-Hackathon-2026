const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectName: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true
  },
  reason: {
    type: String,
    enum: [
      'PURCHASE',
      'RETURN',
      'ADJUSTMENT',
      'CONSUMPTION',
      'WASTAGE',
      'EXPIRED',
      'DAMAGED',
      'SHRINKAGE'
    ]
  },
  quantity: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  performedBy: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
