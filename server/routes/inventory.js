const express = require('express');
const Asset = require('../models/Asset');
const InventoryLog = require('../models/InventoryLog');
const Project = require('../models/Project');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
const { recordAuditLog } = require('../utils/recordAuditLog');

const router = express.Router();

const normalizeDepartmentForCompare = (value) => String(value || '').trim().toLowerCase();

router.get('/logs/trend', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, department, projectId } = req.query || {};

    let from = startDate ? new Date(startDate) : new Date();
    let to = endDate ? new Date(endDate) : new Date();

    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) {
      to = new Date();
      from = new Date(to);
      from.setDate(from.getDate() - 29);
    }

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const match = { timestamp: { $gte: from, $lte: to } };
    if (department && department !== 'All') match.department = department;
    if (projectId) match.projectId = projectId;

    const trend = await InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            type: '$type'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          inCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'IN'] }, '$count', 0]
            }
          },
          outCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'OUT'] }, '$count', 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      trend: trend.map((t) => ({
        date: t._id,
        inCount: Number(t.inCount || 0),
        outCount: Number(t.outCount || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs trend', error: error.message });
  }
});

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

    await recordAuditLog({
      req,
      action: 'INVENTORY_ASSET_CREATE',
      entityType: 'Asset',
      entityId: newAsset._id,
      details: {
        assetId: newAsset.assetId,
        sku: newAsset.sku,
        itemName: newAsset.itemName,
        department: newAsset.department,
        totalQuantity: newAsset.totalQuantity,
        availableQuantity: newAsset.availableQuantity
      }
    });
    
    res.status(201).json({ message: 'Asset created successfully', asset: newAsset });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create asset', error: error.message });
  }
});

// Update stock by SKU (Convenience for QR/Barcode scanning)
router.post('/update-stock', authMiddleware, roleMiddleware([ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PROJECT_MANAGER]), async (req, res) => {
  try {
    const { sku, quantityChange, type, projectId, reason, unitCost, notes, reference } = req.body;
    
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

    const resolvedReason = (() => {
      if (reason) return reason;
      if (type === 'IN') return 'PURCHASE';
      if (type === 'OUT') return projectId ? 'CONSUMPTION' : 'ADJUSTMENT';
      return 'ADJUSTMENT';
    })();

    if (req.user?.role === ROLES.PROJECT_MANAGER) {
      if (type !== 'OUT' || !projectId || resolvedReason !== 'CONSUMPTION') {
        return res.status(403).json({ message: 'Access denied. Project Manager can only perform consumption stock out for a project.' });
      }

      const requesterEmail = String(req.user.email || '').toLowerCase();
      const managerEmail = String(project?.managerEmail || '').toLowerCase();
      const ownsProject = (
        (requesterEmail && managerEmail && requesterEmail === managerEmail) ||
        String(project?.managerUserId || '') === String(req.user.id || '')
      );

      let canAccess = ownsProject;

      if (!canAccess) {
        if (req.user.profileDepartment === undefined) {
          try {
            const userDoc = await User.findById(req.user.id).select('profile.department');
            req.user.profileDepartment = userDoc?.profile?.department || '';
          } catch (error) {
            req.user.profileDepartment = '';
          }
        }

        const userDept = normalizeDepartmentForCompare(req.user.profileDepartment);
        const projectDept = normalizeDepartmentForCompare(project?.department);
        if (userDept && projectDept && userDept === projectDept) canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ message: 'Access denied. You do not have permission for this project.' });
      }
    }

    const coerceUnitCost = (v) => {
      const n = Number(v);
      if (Number.isNaN(n) || n < 0) return null;
      return n;
    };

    const ensureLegacyCostLots = (legacyQty) => {
      if (Array.isArray(asset.costLots) && asset.costLots.length > 0) return;
      const legacyUnitCost = asset.purchaseCost || 0;
      if (legacyQty > 0) {
        asset.costLots = [
          {
            quantity: legacyQty,
            unitCost: legacyUnitCost,
            receivedAt: asset.purchaseDate || asset.createdAt || new Date(),
            source: 'legacy',
            reference: asset.invoiceNumber || ''
          }
        ];
      } else {
        asset.costLots = [];
      }
    };

    const fifoConsumeLots = (consumeQty) => {
      ensureLegacyCostLots(previousQuantity);
      let remaining = consumeQty;
      let totalCostValue = 0;

      for (let i = 0; i < asset.costLots.length && remaining > 0; i += 1) {
        const lot = asset.costLots[i];
        const available = Math.max(0, Number(lot.quantity) || 0);
        if (available <= 0) continue;

        const take = Math.min(available, remaining);
        totalCostValue += take * (Number(lot.unitCost) || 0);
        lot.quantity = available - take;
        remaining -= take;
      }

      if (remaining > 0) {
        const fallbackUnitCost = asset.purchaseCost || 0;
        totalCostValue += remaining * fallbackUnitCost;
        remaining = 0;
      }

      asset.costLots = asset.costLots.filter((l) => (Number(l.quantity) || 0) > 0);
      return totalCostValue;
    };

    let movementUnitCost = 0;
    let movementTotalCost = 0;

    if (type === 'IN') {
      asset.totalQuantity += qty;
      const providedUnitCost = coerceUnitCost(unitCost);
      movementUnitCost = providedUnitCost ?? asset.purchaseCost ?? 0;
      movementTotalCost = qty * movementUnitCost;
      if (!Array.isArray(asset.costLots)) asset.costLots = [];
      asset.costLots.push({
        quantity: qty,
        unitCost: movementUnitCost,
        receivedAt: new Date(),
        source: resolvedReason,
        reference: reference || ''
      });
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

      movementTotalCost = fifoConsumeLots(qty);
      movementUnitCost = qty > 0 ? movementTotalCost / qty : 0;
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
      reason: resolvedReason,
      quantity: qty,
      unitCost: movementUnitCost,
      totalCost: movementTotalCost,
      notes: notes || '',
      performedBy: req.user.username || req.user.id,
      department: asset.department,
      previousQuantity: previousQuantity,
      newQuantity: asset.totalQuantity
    });
    await log.save();

    await recordAuditLog({
      req,
      action: type === 'IN' ? 'INVENTORY_STOCK_IN' : 'INVENTORY_STOCK_OUT',
      entityType: 'Asset',
      entityId: asset._id,
      details: {
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        quantity: qty,
        type,
        reason: resolvedReason,
        unitCost: movementUnitCost,
        totalCost: movementTotalCost,
        projectId: project?._id,
        projectName: project?.name || '',
        previousQuantity,
        newQuantity: asset.totalQuantity
      }
    });

    res.json({ message: `Stock ${type === 'IN' ? 'added' : 'removed'} successfully`, asset, log });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update stock', error: error.message });
  }
});

router.post('/undo-utilization', authMiddleware, roleMiddleware([ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PROJECT_MANAGER]), async (req, res) => {
  try {
    const { projectId, assetIdOrSku, quantity } = req.body || {};
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });
    if (!assetIdOrSku) return res.status(400).json({ message: 'assetIdOrSku is required' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user?.role === ROLES.PROJECT_MANAGER) {
      const requesterEmail = String(req.user.email || '').toLowerCase();
      const managerEmail = String(project?.managerEmail || '').toLowerCase();
      const ownsProject = (
        (requesterEmail && managerEmail && requesterEmail === managerEmail) ||
        String(project?.managerUserId || '') === String(req.user.id || '')
      );

      if (!ownsProject) {
        return res.status(403).json({ message: 'Access denied. You do not have permission for this project.' });
      }
    }

    const asset = await Asset.findOne({
      $or: [{ assetId: assetIdOrSku }, { sku: assetIdOrSku }]
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const netAgg = await InventoryLog.aggregate([
      { $match: { projectId: project._id, assetId: asset.assetId, type: { $in: ['IN', 'OUT'] } } },
      {
        $group: {
          _id: '$assetId',
          netUsed: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', { $multiply: ['$quantity', -1] }]
            }
          }
        }
      }
    ]);
    const netUsed = Math.max(0, Number(netAgg?.[0]?.netUsed || 0));
    if (netUsed <= 0) return res.status(400).json({ message: 'Nothing to undo for this item in this project' });

    const latestOutLog = await InventoryLog.findOne({
      projectId: project._id,
      assetId: asset.assetId,
      type: 'OUT',
      reason: 'CONSUMPTION'
    }).sort({ timestamp: -1, createdAt: -1 });

    const requested = quantity === undefined ? null : Number(quantity);
    if (requested !== null && (!Number.isFinite(requested) || requested <= 0)) {
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    const defaultUndoQty = Math.max(0, Number(latestOutLog?.quantity || 0));
    const rawUndoQty = requested ?? defaultUndoQty;
    const undoQty = Math.min(netUsed, Math.max(0, rawUndoQty));

    if (!Number.isFinite(undoQty) || undoQty <= 0) {
      return res.status(400).json({ message: 'Unable to determine undo quantity' });
    }

    const previousQuantity = asset.totalQuantity;
    asset.totalQuantity += undoQty;
    asset.allocatedQuantity += undoQty;
    asset.availableQuantity = asset.totalQuantity - asset.allocatedQuantity;

    const movementUnitCost = Number(latestOutLog?.unitCost ?? asset.purchaseCost ?? 0) || 0;
    const movementTotalCost = undoQty * movementUnitCost;

    if (!Array.isArray(asset.costLots)) asset.costLots = [];
    asset.costLots.push({
      quantity: undoQty,
      unitCost: movementUnitCost,
      receivedAt: new Date(),
      source: 'RETURN',
      reference: String(latestOutLog?._id || '')
    });

    const idx = (project.materials || []).findIndex((m) => m.assetId === asset.assetId);
    if (idx >= 0) {
      project.materials[idx].allocatedQuantity = Number(project.materials[idx].allocatedQuantity || 0) + undoQty;
      project.materials[idx].sku = asset.sku;
      project.materials[idx].itemName = asset.itemName;
      project.materials[idx].unit = asset.unit || project.materials[idx].unit;
    } else {
      project.materials = project.materials || [];
      project.materials.push({
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        unit: asset.unit || 'pcs',
        plannedQuantity: 0,
        allocatedQuantity: undoQty
      });
    }

    await asset.save();
    await project.save();

    const log = new InventoryLog({
      assetId: asset.assetId,
      itemName: asset.itemName,
      sku: asset.sku,
      projectId: project._id,
      projectName: project.name || '',
      type: 'IN',
      reason: 'RETURN',
      quantity: undoQty,
      unitCost: movementUnitCost,
      totalCost: movementTotalCost,
      notes: `Undo utilization for ${project.code}`,
      performedBy: req.user.username || req.user.id,
      department: asset.department,
      previousQuantity,
      newQuantity: asset.totalQuantity
    });
    await log.save();

    await recordAuditLog({
      req,
      action: 'INVENTORY_UTILIZATION_UNDO',
      entityType: 'Asset',
      entityId: asset._id,
      details: {
        projectId: project._id,
        projectCode: project.code,
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        quantity: undoQty,
        previousQuantity,
        newQuantity: asset.totalQuantity,
        referenceOutLogId: String(latestOutLog?._id || '')
      }
    });

    res.json({ message: 'Utilization undone successfully', asset, project, log });
  } catch (error) {
    res.status(500).json({ message: 'Failed to undo utilization', error: error.message });
  }
});

router.get('/finance/valuation', authMiddleware, roleMiddleware([ROLES.FINANCE, ROLES.ADMIN]), async (req, res) => {
  try {
    const { department, search, limit = 200, page = 1 } = req.query;
    const query = {};

    if (department && department !== 'All') query.department = department;
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const assets = await Asset.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const items = assets.map((a) => {
      const lots = Array.isArray(a.costLots) ? a.costLots : [];
      const hasLots = lots.length > 0;
      const valueFromLots = lots.reduce((sum, l) => sum + (Math.max(0, Number(l.quantity) || 0) * (Number(l.unitCost) || 0)), 0);
      const fallbackUnitCost = a.purchaseCost || 0;
      const totalValue = hasLots ? valueFromLots : (a.totalQuantity || 0) * fallbackUnitCost;
      const avgUnitCost = (a.totalQuantity || 0) > 0 ? totalValue / a.totalQuantity : 0;
      return {
        assetId: a.assetId,
        sku: a.sku,
        itemName: a.itemName,
        department: a.department,
        totalQuantity: a.totalQuantity,
        unit: a.unit,
        avgUnitCost,
        totalValue
      };
    });

    const totalAssets = await Asset.countDocuments(query);
    const totalInventoryValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);

    res.json({
      items,
      totalInventoryValue,
      totalPages: Math.ceil(totalAssets / limit),
      currentPage: parseInt(page),
      totalAssets
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch valuation', error: error.message });
  }
});

router.get('/finance/cost-history', authMiddleware, roleMiddleware([ROLES.FINANCE, ROLES.ADMIN]), async (req, res) => {
  try {
    const { assetIdOrSku, from, to, limit = 100, page = 1 } = req.query;
    if (!assetIdOrSku) {
      return res.status(400).json({ message: 'assetIdOrSku is required' });
    }

    const asset = await Asset.findOne({
      $or: [{ assetId: assetIdOrSku }, { sku: assetIdOrSku }]
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const query = { assetId: asset.assetId };
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await InventoryLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalLogs = await InventoryLog.countDocuments(query);
    res.json({
      asset: {
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        department: asset.department,
        unit: asset.unit
      },
      logs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: parseInt(page),
      totalLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cost history', error: error.message });
  }
});

router.get('/finance/wastage-analytics', authMiddleware, roleMiddleware([ROLES.FINANCE, ROLES.ADMIN]), async (req, res) => {
  try {
    const { department, from, to } = req.query;

    const match = {
      type: 'OUT',
      reason: { $in: ['WASTAGE', 'EXPIRED', 'DAMAGED', 'SHRINKAGE'] }
    };
    if (department && department !== 'All') match.department = department;
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        match.timestamp.$lte = end;
      }
    }

    const totalsAgg = await InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalWastageQty: { $sum: '$quantity' },
          totalWastageValue: { $sum: '$totalCost' }
        }
      }
    ]);

    const byReason = await InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$reason',
          qty: { $sum: '$quantity' },
          value: { $sum: '$totalCost' }
        }
      },
      { $sort: { value: -1 } }
    ]);

    const topItems = await InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { assetId: '$assetId', sku: '$sku', itemName: '$itemName' },
          qty: { $sum: '$quantity' },
          value: { $sum: '$totalCost' }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 10 }
    ]);

    const trend = await InventoryLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          qty: { $sum: '$quantity' },
          value: { $sum: '$totalCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totals = totalsAgg[0] || { totalWastageQty: 0, totalWastageValue: 0 };
    res.json({
      totals,
      byReason,
      topItems,
      trend
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wastage analytics', error: error.message });
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

    await recordAuditLog({
      req,
      action: 'INVENTORY_ASSET_UPDATE',
      entityType: 'Asset',
      entityId: updatedAsset._id,
      details: {
        assetId: updatedAsset.assetId,
        sku: updatedAsset.sku,
        itemName: updatedAsset.itemName,
        changes: updateData
      }
    });
    
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

    await recordAuditLog({
      req,
      action: 'INVENTORY_ASSET_DELETE',
      entityType: 'Asset',
      entityId: deletedAsset._id,
      details: {
        assetId: deletedAsset.assetId,
        sku: deletedAsset.sku,
        itemName: deletedAsset.itemName,
        department: deletedAsset.department
      }
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete asset', error: error.message });
  }
});

module.exports = router;
