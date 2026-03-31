const mongoose = require('mongoose');
const Asset = require('./models/Asset');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';

const dummyAssets = [
  {
    itemName: 'MacBook Pro 16"',
    category: 'hardware',
    department: 'IT',
    subDepartment: 'Development',
    totalQuantity: 10,
    availableQuantity: 8,
    allocatedQuantity: 2,
    unit: 'pcs',
    status: 'active',
    location: 'office',
    purchaseCost: 250000,
    vendorName: 'Apple Inc.',
    invoiceNumber: 'INV-001',
    purchaseDate: new Date('2026-01-10'),
    metadata: {
      serialNumber: 'SN123456789',
      osVersion: 'macOS Sequoia',
      securityStatus: 'Encrypted'
    }
  },
  {
    itemName: 'Dell UltraSharp 27"',
    category: 'hardware',
    department: 'IT',
    subDepartment: 'Design',
    totalQuantity: 15,
    availableQuantity: 12,
    allocatedQuantity: 3,
    unit: 'pcs',
    status: 'active',
    location: 'office',
    purchaseCost: 45000,
    vendorName: 'Dell Technologies',
    invoiceNumber: 'INV-002',
    purchaseDate: new Date('2026-02-15'),
    metadata: {
      serialNumber: 'DELL-987654',
      connectivityType: 'USB-C'
    }
  },
  {
    itemName: 'Industrial IoT Gateway',
    category: 'device',
    department: 'IoT',
    subDepartment: 'Smart Factory',
    totalQuantity: 5,
    availableQuantity: 5,
    allocatedQuantity: 0,
    unit: 'pcs',
    status: 'active',
    location: 'lab',
    purchaseCost: 85000,
    vendorName: 'Siemens',
    invoiceNumber: 'INV-003',
    purchaseDate: new Date('2026-03-05'),
    metadata: {
      deviceId: 'GATEWAY-001',
      firmwareVersion: 'v2.4.1',
      connectivityType: '4G/LTE'
    }
  },
  {
    itemName: 'Oscilloscope TDS2000',
    category: 'hardware',
    department: 'ATE',
    subDepartment: 'Testing',
    totalQuantity: 3,
    availableQuantity: 3,
    allocatedQuantity: 0,
    unit: 'pcs',
    status: 'active',
    location: 'lab',
    purchaseCost: 125000,
    vendorName: 'Tektronix',
    invoiceNumber: 'INV-004',
    purchaseDate: new Date('2026-01-20'),
    metadata: {
      calibrationDate: new Date('2026-01-15'),
      testType: 'Signal Analysis',
      accuracyRange: '+/- 0.01%'
    }
  },
  {
    itemName: 'Sales Demo Tablet',
    category: 'device',
    department: 'Sales',
    subDepartment: 'Field Sales',
    totalQuantity: 8,
    availableQuantity: 6,
    allocatedQuantity: 2,
    unit: 'pcs',
    status: 'in use',
    location: 'office',
    purchaseCost: 35000,
    vendorName: 'Samsung',
    invoiceNumber: 'INV-005',
    purchaseDate: new Date('2026-03-25'),
    metadata: {
      clientAssigned: 'Acme Corp',
      demoUnit: true,
      returnDate: new Date('2026-05-20')
    }
  }
];

const seedAssets = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing assets to replace with INR values
    await Asset.deleteMany({});
    console.log('Cleared existing assets');

    await Asset.insertMany(dummyAssets);
    console.log('Dummy assets seeded successfully with INR values');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding assets:', err);
    process.exit(1);
  }
};

seedAssets();
