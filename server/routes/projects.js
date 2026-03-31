const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
const Project = require('../models/Project');
const Asset = require('../models/Asset');
const InventoryLog = require('../models/InventoryLog');

const router = express.Router();

const canViewProjects = roleMiddleware([ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.WAREHOUSE]);
const canEditProjects = roleMiddleware([ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]);

const findAssetByIdOrSku = async (assetIdOrSku) => {
  return await Asset.findOne({ $or: [{ assetId: assetIdOrSku }, { sku: assetIdOrSku }] });
};

const canAccessProject = (req, project) => {
  if (!req.user) return false;
  if ([ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.WAREHOUSE].includes(req.user.role)) return true;
  const requesterEmail = (req.user.email || '').toLowerCase();
  const managerEmail = (project.managerEmail || '').toLowerCase();
  if (requesterEmail && managerEmail && requesterEmail === managerEmail) return true;
  return String(project.managerUserId) === String(req.user.id);
};

router.get('/', authMiddleware, canViewProjects, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === ROLES.PROJECT_MANAGER) {
      const requesterEmail = (req.user.email || '').toLowerCase();
      if (requesterEmail) {
        query.$or = [{ managerEmail: requesterEmail }, { managerUserId: req.user.id }];
      } else {
        query.managerUserId = req.user.id;
      }
    }
    const projects = await Project.find(query).sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});

router.post('/', authMiddleware, canEditProjects, async (req, res) => {
  try {
    const { code, name, status } = req.body || {};
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });

    const existing = await Project.findOne({ code });
    if (existing) return res.status(400).json({ message: 'Project code already exists' });

    const project = new Project({
      code,
      name,
      status: status || 'active',
      managerUserId: req.user.id,
      managerEmail: req.user.email || ''
    });
    await project.save();

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

router.get('/:projectId', authMiddleware, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

router.post('/:projectId/materials/upsert', authMiddleware, canEditProjects, async (req, res) => {
  try {
    const { assetIdOrSku, plannedQuantity } = req.body || {};
    if (!assetIdOrSku) return res.status(400).json({ message: 'assetIdOrSku is required' });
    if (plannedQuantity === undefined || Number.isNaN(Number(plannedQuantity))) {
      return res.status(400).json({ message: 'plannedQuantity must be a number' });
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const asset = await findAssetByIdOrSku(assetIdOrSku);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const nextPlanned = Math.max(0, Number(plannedQuantity));
    const idx = project.materials.findIndex((m) => m.assetId === asset.assetId);
    const nextMaterial = {
      assetId: asset.assetId,
      sku: asset.sku,
      itemName: asset.itemName,
      unit: asset.unit || 'pcs',
      plannedQuantity: nextPlanned
    };

    if (idx >= 0) {
      project.materials[idx] = { ...project.materials[idx].toObject?.() || project.materials[idx], ...nextMaterial };
    } else {
      project.materials.push({ ...nextMaterial, allocatedQuantity: 0 });
    }

    await project.save();
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update planned materials', error: error.message });
  }
});

router.post('/:projectId/materials/allocate', authMiddleware, canEditProjects, async (req, res) => {
  try {
    const { assetIdOrSku, quantity } = req.body || {};
    if (!assetIdOrSku) return res.status(400).json({ message: 'assetIdOrSku is required' });
    if (quantity === undefined || Number.isNaN(Number(quantity))) {
      return res.status(400).json({ message: 'quantity must be a number' });
    }
    const qty = Math.max(0, Number(quantity));
    if (qty <= 0) return res.status(400).json({ message: 'quantity must be greater than 0' });

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const asset = await findAssetByIdOrSku(assetIdOrSku);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const assetDoc = await Asset.findById(asset._id);
    if (!assetDoc) return res.status(404).json({ message: 'Asset not found' });
    if (assetDoc.availableQuantity < qty) {
      return res.status(400).json({ message: 'Insufficient stock available to allocate' });
    }

    const idx = project.materials.findIndex((m) => m.assetId === assetDoc.assetId);
    if (idx === -1) {
      project.materials.push({
        assetId: assetDoc.assetId,
        sku: assetDoc.sku,
        itemName: assetDoc.itemName,
        unit: assetDoc.unit || 'pcs',
        plannedQuantity: 0,
        allocatedQuantity: qty
      });
    } else {
      project.materials[idx].allocatedQuantity = (project.materials[idx].allocatedQuantity || 0) + qty;
    }

    assetDoc.allocatedQuantity += qty;
    assetDoc.availableQuantity = assetDoc.totalQuantity - assetDoc.allocatedQuantity;
    await assetDoc.save();
    await project.save();

    res.json({ project, asset: assetDoc });
  } catch (error) {
    res.status(500).json({ message: 'Failed to allocate materials', error: error.message });
  }
});

router.post('/:projectId/materials/used', authMiddleware, canEditProjects, async (req, res) => {
  try {
    const { assetIdOrSku, usedQuantity } = req.body || {};
    if (!assetIdOrSku) return res.status(400).json({ message: 'assetIdOrSku is required' });
    if (usedQuantity === undefined || Number.isNaN(Number(usedQuantity))) {
      return res.status(400).json({ message: 'usedQuantity must be a number' });
    }
    const nextUsed = Math.max(0, Number(usedQuantity));

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const asset = await findAssetByIdOrSku(assetIdOrSku);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const idx = project.materials.findIndex((m) => m.assetId === asset.assetId);
    if (idx === -1) {
      project.materials.push({
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        unit: asset.unit || 'pcs',
        plannedQuantity: 0,
        allocatedQuantity: 0,
        usedQuantityOverride: nextUsed
      });
    } else {
      project.materials[idx].usedQuantityOverride = nextUsed;
    }

    await project.save();
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update used materials', error: error.message });
  }
});

router.get('/:projectId/summary', authMiddleware, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const usageBySku = await InventoryLog.aggregate([
      { $match: { projectId: project._id, type: 'OUT' } },
      { $group: { _id: '$sku', usedQuantity: { $sum: '$quantity' } } }
    ]);

    const usedMap = new Map(usageBySku.map((u) => [u._id, u.usedQuantity]));
    const materials = (project.materials || []).map((m) => {
      const logUsedQuantity = usedMap.get(m.sku) || 0;
      const hasOverride = m.usedQuantityOverride !== null && m.usedQuantityOverride !== undefined;
      const usedQuantity = hasOverride ? Number(m.usedQuantityOverride) : logUsedQuantity;
      const plannedQuantity = m.plannedQuantity || 0;
      const allocatedQuantity = m.allocatedQuantity || 0;
      const overConsumed = usedQuantity > plannedQuantity;
      return {
        ...m.toObject?.() || m,
        usedQuantity,
        usedQuantitySource: hasOverride ? 'manual' : 'logs',
        remainingPlanned: Math.max(0, plannedQuantity - usedQuantity),
        remainingAllocated: Math.max(0, allocatedQuantity - usedQuantity),
        overConsumed,
        overConsumedBy: Math.max(0, usedQuantity - plannedQuantity)
      };
    });

    res.json({
      project: {
        id: project._id,
        code: project.code,
        name: project.name,
        status: project.status,
        managerUserId: project.managerUserId
      },
      materials
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project summary', error: error.message });
  }
});

module.exports = router;
