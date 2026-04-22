const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('./models/User');
const Asset = require('./models/Asset');
const { ROLES } = require('./constants/roles');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_db';
const ADMIN_DEFAULT_DEPARTMENT = 'All Departments';
const normalizeDepartment = (value) => (typeof value === 'string' ? value.trim() : '');

const toBaseUsername = (email) => {
  const localPart = (email || '').split('@')[0] || 'admin';
  const sanitized = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return sanitized || 'admin';
};

const getAvailableUsername = async (baseUsername) => {
  let username = baseUsername;
  let suffix = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername}${suffix}`;
    suffix += 1;
  }

  return username;
};

const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('Skipping admin initialization because ADMIN_EMAIL or ADMIN_PASSWORD is missing');
    return null;
  }

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    const existingDepartment = normalizeDepartment(existingAdmin.profile?.department);
    if (!existingDepartment) {
      existingAdmin.profile = {
        ...(existingAdmin.profile?.toObject?.() || existingAdmin.profile || {}),
        department: ADMIN_DEFAULT_DEPARTMENT
      };
      await existingAdmin.save();
    }
    console.log(`Admin user already exists for ${adminEmail}`);
    return existingAdmin;
  }

  const baseUsername = process.env.ADMIN_USERNAME || toBaseUsername(adminEmail);
  const username = await getAvailableUsername(baseUsername);

  const admin = new User({
    username,
    email: adminEmail,
    password: adminPassword,
    role: ROLES.ADMIN,
    profile: { department: ADMIN_DEFAULT_DEPARTMENT }
  });

  await admin.save();
  console.log(`Admin user created successfully for ${adminEmail}`);
  return admin;
};

const ensureDummyInventory = async () => {
  const dummyAssets = [
    {
      assetId: 'ASSET-DUMMY-001',
      sku: 'SKU-DUMMY-001',
      itemName: 'Arduino Uno R3',
      category: 'hardware',
      department: 'IoT',
      totalQuantity: 50,
      allocatedQuantity: 10,
      unit: 'pcs',
      purchaseCost: 22.5,
      location: 'lab',
      lowStockThreshold: 8,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-001',
      purchaseDate: new Date('2026-01-10T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-002',
      sku: 'SKU-DUMMY-002',
      itemName: 'Raspberry Pi 4 Model B (4GB)',
      category: 'hardware',
      department: 'IT',
      totalQuantity: 20,
      allocatedQuantity: 5,
      unit: 'pcs',
      purchaseCost: 65,
      location: 'lab',
      lowStockThreshold: 4,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-002',
      purchaseDate: new Date('2026-02-05T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-003',
      sku: 'SKU-DUMMY-003',
      itemName: 'CAT6 Ethernet Cable (2m)',
      category: 'consumable',
      department: 'IT',
      totalQuantity: 200,
      allocatedQuantity: 0,
      unit: 'pcs',
      purchaseCost: 2.5,
      location: 'warehouse',
      lowStockThreshold: 50,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-003',
      purchaseDate: new Date('2026-02-20T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-004',
      sku: 'SKU-DUMMY-004',
      itemName: 'Solder Wire 0.8mm (500g)',
      category: 'consumable',
      department: 'DTMA',
      totalQuantity: 15,
      allocatedQuantity: 2,
      unit: 'rolls',
      purchaseCost: 18,
      location: 'lab',
      lowStockThreshold: 3,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-004',
      purchaseDate: new Date('2026-03-01T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-005',
      sku: 'SKU-DUMMY-005',
      itemName: 'Windows 11 Pro License',
      category: 'license',
      department: 'IT',
      totalQuantity: 30,
      allocatedQuantity: 12,
      unit: 'licenses',
      purchaseCost: 145,
      location: 'office',
      lowStockThreshold: 5,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-005',
      purchaseDate: new Date('2026-01-25T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-006',
      sku: 'SKU-DUMMY-006',
      itemName: 'ESP32 DevKit V1',
      category: 'device',
      department: 'IoT',
      totalQuantity: 80,
      allocatedQuantity: 20,
      unit: 'pcs',
      purchaseCost: 6,
      location: 'warehouse',
      lowStockThreshold: 15,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-006',
      purchaseDate: new Date('2026-03-15T00:00:00.000Z')
    },
    {
      assetId: 'ASSET-DUMMY-007',
      sku: 'SKU-DUMMY-007',
      itemName: 'Digital Multimeter (True RMS)',
      category: 'device',
      department: 'ATE',
      totalQuantity: 10,
      allocatedQuantity: 3,
      unit: 'pcs',
      purchaseCost: 45,
      location: 'lab',
      lowStockThreshold: 2,
      vendorName: 'Dummy Vendor',
      invoiceNumber: 'DUMMY-INV-007',
      purchaseDate: new Date('2026-02-12T00:00:00.000Z')
    }
  ];

  let created = 0;
  for (const assetData of dummyAssets) {
    const exists = await Asset.exists({
      $or: [{ sku: assetData.sku }, { assetId: assetData.assetId }]
    });
    if (exists) continue;

    const totalQuantity = Number(assetData.totalQuantity || 0);
    const allocatedQuantity = Number(assetData.allocatedQuantity || 0);
    const availableQuantity = totalQuantity - allocatedQuantity;
    const unitCost = Number(assetData.purchaseCost || 0);

    const newAsset = new Asset({
      ...assetData,
      availableQuantity,
      costLots: [
        {
          quantity: totalQuantity,
          unitCost,
          receivedAt: assetData.purchaseDate || new Date(),
          source: 'PURCHASE',
          reference: 'DUMMY-SEED'
        }
      ]
    });

    await newAsset.save();
    created += 1;
  }

  if (created > 0) {
    console.log(`Dummy inventory added: ${created} asset(s)`);
  }

  return created;
};

const run = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    await ensureAdminUser();
    await ensureDummyInventory();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing admin:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = { ensureAdminUser, ensureDummyInventory };
