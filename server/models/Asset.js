const mongoose = require('mongoose');
const { ASSET_CATEGORIES, ASSET_STATUSES, ASSET_LOCATIONS, DEPARTMENTS } = require('../constants/assets');

const assetSchema = new mongoose.Schema({
  // Basic Fields
  assetId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'ASSET-' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    default: () => 'SKU-' + Math.random().toString(36).substr(2, 6).toUpperCase()
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ASSET_CATEGORIES,
    required: true
  },
  department: {
    type: String,
    enum: DEPARTMENTS,
    required: true
  },
  subDepartment: {
    type: String,
    trim: true
  },

  // Quantity Fields
  totalQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  availableQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  allocatedQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  unit: {
    type: String,
    default: 'pcs'
  },

  // Status Fields
  status: {
    type: String,
    enum: ASSET_STATUSES,
    default: 'active'
  },

  // Location Fields
  location: {
    type: String,
    enum: ASSET_LOCATIONS,
    default: 'warehouse'
  },
  assignedTo: {
    type: String, // Can be user name or employee ID
    trim: true
  },

  // Financial Fields
  purchaseCost: {
    type: Number,
    default: 0
  },
  vendorName: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  warrantyExpiry: {
    type: Date
  },

  // Lifecycle Fields
  lastServiceDate: {
    type: Date
  },
  maintenanceSchedule: {
    type: String,
    trim: true
  },

  // Department-Specific Dynamic Fields (Metadata)
  metadata: {
    // Sales Fields
    clientAssigned: String,
    demoUnit: Boolean,
    returnDate: Date,
    dealId: String,

    // Accounts Fields
    depreciationValue: Number,
    taxCategory: String,
    budgetCode: String,
    costCenter: String,

    // IT Fields
    serialNumber: String,
    macAddress: String,
    ipAddress: String,
    osVersion: String,
    installedSoftware: [String],
    securityStatus: String,

    // IoT Fields
    deviceId: String,
    firmwareVersion: String,
    connectivityType: String,
    sensorType: String,
    apiEndpoint: String,
    batteryStatus: String,

    // DTMA / PES / ATE Fields
    calibrationDate: Date,
    testType: String,
    accuracyRange: String,
    certificationStatus: String,
    usageLogs: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
