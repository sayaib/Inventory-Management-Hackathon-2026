const express = require('express');
const Asset = require('../models/Asset');
const InventoryLog = require('../models/InventoryLog');
const Project = require('../models/Project');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Get consumption logs (OUT movements)
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const { type, department, projectId, search, limit = 10, page = 1 } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (department && department !== 'All') query.department = department;
    if (projectId) query.projectId = projectId;
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await InventoryLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalLogs = await InventoryLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: parseInt(page),
      totalLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
  }
});

// Get all inventory assets (With Filtering and Pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 6, 
      department, 
      search, 
      startDate, 
      endDate,
      lowStock
    } = req.query;

    const query = {};

    // Low Stock Filter
    if (lowStock === 'true') {
      query.$expr = { $lte: ["$availableQuantity", { $ifNull: ["$lowStockThreshold", 5] }] };
    }

    // Department Filter
    if (department && department !== 'All') {
      query.department = department;
    }

    // Search (Item Name, AssetId, or SKU)
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Date Range Filter (Purchase Date)
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) {
        query.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set endDate to end of day to include all items on that day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = endOfDay;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const assets = await Asset.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalAssets = await Asset.countDocuments(query);

    // Calculate total value and counts for all assets matching the query
    const allMatchingAssets = await Asset.find(query, { purchaseCost: 1, status: 1 });
    const totalValue = allMatchingAssets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
    const activeCount = allMatchingAssets.filter(a => a.status === 'active').length;
    const damagedCount = allMatchingAssets.filter(a => a.status === 'damaged').length;

    // Get low stock count for all assets (ignoring pagination and filters for a global alert if needed)
    // Or just for matching assets? Let's do for matching assets to keep it consistent with the view
    const lowStockCount = await Asset.countDocuments({
      ...query,
      $expr: { $lte: ["$availableQuantity", { $ifNull: ["$lowStockThreshold", 5] }] }
    });

    res.json({
      assets,
      totalPages: Math.ceil(totalAssets / limit),
      currentPage: parseInt(page),
      totalAssets,
      totalValue,
      activeCount,
      damagedCount,
      lowStockCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch assets', error: error.message });
  }
});

// Search asset by AssetId or SKU
router.get('/id/:id', authMiddleware, async (req, res) => {
  try {
    const asset = await Asset.findOne({ 
      $or: [ { assetId: req.params.id }, { sku: req.params.id } ] 
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch asset', error: error.message });
  }
});

// Create new asset (Admin, Warehouse Staff, and Inventory Manager)
router.post('/add', authMiddleware, roleMiddleware([ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]), async (req, res) => {
  try {
    const assetData = req.body;
    
    // Auto-calculate available quantity if not provided
    if (assetData.totalQuantity && !assetData.availableQuantity) {
      assetData.availableQuantity = assetData.totalQuantity - (assetData.allocatedQuantity || 0);
    }

    const newAsset = new Asset(assetData);
    await newAsset.save();
    
    res.status(201).json({ message: 'Asset created successfully', asset: newAsset });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create asset', error: error.message });
  }
});

// Update stock by SKU (Convenience for QR/Barcode scanning)
router.post('/update-stock', authMiddleware, roleMiddleware([ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]), async (req, res) => {
  try {
    const { sku, quantityChange, type, projectId } = req.body;
    
    // Find asset by sku OR assetId
    const asset = await Asset.findOne({ 
      $or: [ { sku: sku }, { assetId: sku } ] 
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const previousQuantity = asset.totalQuantity;
    const qty = Number(quantityChange);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'quantityChange must be a positive number' });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });
    }

    if (type === 'IN') {
      asset.totalQuantity += qty;
    } else if (type === 'OUT') {
      if (projectId) {
        if (asset.totalQuantity < qty) {
          return res.status(400).json({ message: 'Insufficient stock' });
        }

        const idx = project.materials.findIndex((m) => m.assetId === asset.assetId);
        if (idx >= 0) {
          const takeFromAllocated = Math.min(project.materials[idx].allocatedQuantity || 0, qty);
          if (takeFromAllocated > 0) {
            project.materials[idx].allocatedQuantity -= takeFromAllocated;
            asset.allocatedQuantity = Math.max(0, asset.allocatedQuantity - takeFromAllocated);
          }
        }

        asset.totalQuantity -= qty;
        await project.save();
      } else {
        if (asset.availableQuantity < qty) {
          return res.status(400).json({ message: 'Insufficient stock available' });
        }
        asset.totalQuantity -= qty;
      }
    }

    // Recalculate available quantity
    asset.availableQuantity = asset.totalQuantity - asset.allocatedQuantity;
    
    await asset.save();

    // Log the movement
    const log = new InventoryLog({
      assetId: asset.assetId,
      itemName: asset.itemName,
      sku: asset.sku,
      projectId: project?._id,
      projectName: project?.name || '',
      type: type,
      quantity: qty,
      performedBy: req.user.username || req.user.id,
      department: asset.department,
      previousQuantity: previousQuantity,
      newQuantity: asset.totalQuantity
    });
    await log.save();

    res.json({ message: `Stock ${type === 'IN' ? 'added' : 'removed'} successfully`, asset, log });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update stock', error: error.message });
  }
});

// Update stock/asset details
router.put('/update/:id', authMiddleware, roleMiddleware([ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]), async (req, res) => {
  try {
    const updateData = req.body;
    
    // Auto-calculate available quantity if quantity fields are updated
    if (updateData.totalQuantity !== undefined || updateData.allocatedQuantity !== undefined) {
      const currentAsset = await Asset.findById(req.params.id);
      const total = updateData.totalQuantity !== undefined ? updateData.totalQuantity : currentAsset.totalQuantity;
      const allocated = updateData.allocatedQuantity !== undefined ? updateData.allocatedQuantity : currentAsset.allocatedQuantity;
      updateData.availableQuantity = total - allocated;
    }

    const updatedAsset = await Asset.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedAsset) return res.status(404).json({ message: 'Asset not found' });
    
    res.json({ message: 'Asset updated successfully', asset: updatedAsset });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update asset', error: error.message });
  }
});

// Delete asset
router.delete('/delete/:id', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const deletedAsset = await Asset.findByIdAndDelete(req.params.id);
    if (!deletedAsset) return res.status(404).json({ message: 'Asset not found' });
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete asset', error: error.message });
  }
});

module.exports = router;
