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
  quantity: {
    type: Number,
    required: true
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
