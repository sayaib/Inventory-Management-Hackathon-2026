const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');
const Project = require('../models/Project');
const Asset = require('../models/Asset');
const InventoryLog = require('../models/InventoryLog');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/recordAuditLog');

const router = express.Router();

const canViewProjects = roleMiddleware([ROLES.PROJECT_MANAGER, ROLES.SALES_HEAD, ROLES.PRESALE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]);
const canCreateProjects = roleMiddleware([ROLES.SALES_HEAD, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]);
const canEditProjects = roleMiddleware([ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]);
const canManageBom = roleMiddleware([ROLES.PRESALE, ROLES.ADMIN]);
const canUpdateBom = roleMiddleware([ROLES.PRESALE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PROJECT_MANAGER]);
const canCreateBomChangeRequest = roleMiddleware([ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]);

const normalizeDepartmentForCompare = (value) => String(value || '').trim().toLowerCase();

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ALL_DEPARTMENTS_LABEL = 'All Departments';

const isAllDepartments = (value) => normalizeDepartmentForCompare(value) === normalizeDepartmentForCompare(ALL_DEPARTMENTS_LABEL);

const attachUserProfileDepartment = async (req, res, next) => {
  if (!req.user) return next();
  if (req.user.profileDepartment !== undefined) return next();

  try {
    const user = await User.findById(req.user.id).select('profile.department');
    req.user.profileDepartment = user?.profile?.department || '';
  } catch (error) {
    req.user.profileDepartment = '';
  }
  next();
};

const getScopedDepartment = (req) => {
  const raw = String(req.user?.profileDepartment || '').trim();
  if (!raw) return '';
  if (isAllDepartments(raw)) return '';
  return raw;
};

const findAssetByIdOrSku = async (assetIdOrSku) => {
  return await Asset.findOne({ $or: [{ assetId: assetIdOrSku }, { sku: assetIdOrSku }] });
};

const canAccessProject = (req, project) => {
  if (!req.user) return false;
  if (req.user.role === ROLES.ADMIN) return true;

  const scopedDepartment = getScopedDepartment(req);
  const rawDepartment = String(req.user.profileDepartment || '').trim();
  const projectDept = normalizeDepartmentForCompare(project?.department);

  if (req.user.role === ROLES.INVENTORY_MANAGER) {
    if (scopedDepartment) {
      const scopedKey = normalizeDepartmentForCompare(scopedDepartment);
      if (!projectDept || projectDept !== scopedKey) return false;
      return true;
    }
    return true;
  }

  if (scopedDepartment) {
    const scopedKey = normalizeDepartmentForCompare(scopedDepartment);
    if (!projectDept || projectDept !== scopedKey) return false;
    if ([ROLES.INVENTORY_MANAGER, ROLES.PRESALE, ROLES.PROJECT_MANAGER].includes(req.user.role)) return true;
  }

  if (req.user.role === ROLES.PROJECT_MANAGER && isAllDepartments(rawDepartment)) return true;

  if (req.user.role === ROLES.PROJECT_MANAGER) {
    const userDept = normalizeDepartmentForCompare(req.user.profileDepartment);
    if (userDept && projectDept && userDept === projectDept) return true;
  }

  const requesterEmail = (req.user.email || '').toLowerCase();
  const managerEmail = (project.managerEmail || '').toLowerCase();
  if (requesterEmail && managerEmail && requesterEmail === managerEmail) return true;
  return String(project.managerUserId) === String(req.user.id);
};

router.get('/', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const query = {};
    const scopedDepartment = getScopedDepartment(req);
    const rawDepartment = String(req.user.profileDepartment || '').trim();
    if (scopedDepartment) {
      query.department = new RegExp(`^${escapeRegExp(scopedDepartment)}$`, 'i');
    }

    if (req.user.role === ROLES.PROJECT_MANAGER) {
      if (!scopedDepartment && !isAllDepartments(rawDepartment)) {
        const requesterEmail = (req.user.email || '').toLowerCase();
        if (requesterEmail) {
          query.$or = [{ managerEmail: requesterEmail }, { managerUserId: req.user.id }];
        } else {
          query.managerUserId = req.user.id;
        }
      }
    } else if (req.user.role === ROLES.SALES_HEAD) {
      const requesterEmail = (req.user.email || '').toLowerCase();
      if (requesterEmail) query.$or = [{ managerEmail: requesterEmail }, { managerUserId: req.user.id }];
      else query.managerUserId = req.user.id;
    }
    const projects = await Project.find(query).sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});

router.post('/', authMiddleware, canCreateProjects, async (req, res) => {
  try {
    const { code, iwoNo, name, description, department } = req.body || {};

    const parsedIwoNo = typeof iwoNo === 'string' ? iwoNo.trim() : '';
    const parsedCode = typeof code === 'string' ? code.trim() : '';
    const parsedName = typeof name === 'string' ? name.trim() : '';
    const parsedDescription = typeof description === 'string' ? description.trim() : '';
    const parsedDepartment = typeof department === 'string' ? department.trim() : '';

    const isSalesHead = req.user?.role === ROLES.SALES_HEAD;
    const nextCode = isSalesHead ? parsedIwoNo : (parsedCode || parsedIwoNo);

    if (!nextCode || !parsedName) {
      return res.status(400).json({ message: 'IWO No and name are required' });
    }
    if (isSalesHead && !parsedDepartment) {
      return res.status(400).json({ message: 'Department is required' });
    }

    const existing = await Project.findOne({ code: nextCode });
    if (existing) return res.status(400).json({ message: 'IWO No already exists' });

    const project = new Project({
      code: nextCode,
      name: parsedName,
      description: parsedDescription,
      department: parsedDepartment,
      status: 'active',
      managerUserId: req.user.id,
      managerEmail: req.user.email || ''
    });
    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_CREATE',
      entityType: 'Project',
      entityId: project._id,
      details: {
        code: project.code,
        name: project.name,
        status: project.status,
        description: project.description,
        department: project.department
      }
    });

    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

router.get('/status/overview', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const projects = await Project.find({}).sort({ updatedAt: -1 });
    const projectIds = projects.map((p) => p._id);
    const projectIdStrings = projectIds.map((id) => String(id));

    const [usageAgg, allocationAgg] = await Promise.all([
      InventoryLog.aggregate([
        { $match: { projectId: { $in: projectIds }, type: { $in: ['IN', 'OUT'] } } },
        {
          $group: {
            _id: { projectId: '$projectId', assetId: '$assetId' },
            usedQuantity: {
              $sum: {
                $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', { $multiply: ['$quantity', -1] }]
              }
            },
            lastAt: { $max: '$timestamp' }
          }
        },
        {
          $group: {
            _id: '$_id.projectId',
            byAsset: { $push: { assetId: '$_id.assetId', usedQuantity: '$usedQuantity', lastAt: '$lastAt' } },
            lastAt: { $max: '$lastAt' }
          }
        }
      ]),
      AuditLog.aggregate([
        {
          $match: {
            action: { $in: ['PROJECT_MATERIALS_ALLOCATE', 'PROJECT_MATERIALS_PLAN_UPSERT'] },
            'entity.type': 'Project',
            'entity.id': { $in: projectIdStrings }
          }
        },
        {
          $group: {
            _id: { projectId: '$entity.id', action: '$action' },
            lastAt: { $max: '$occurredAt' }
          }
        }
      ])
    ]);

    const usageByProjectId = new Map();
    for (const row of usageAgg || []) {
      const assetMap = new Map();
      for (const item of row.byAsset || []) {
        if (!item?.assetId) continue;
        assetMap.set(String(item.assetId), {
          usedQuantity: Number(item.usedQuantity || 0),
          lastAt: item.lastAt || null
        });
      }
      usageByProjectId.set(String(row._id), { assetMap, lastAt: row.lastAt || null });
    }

    const allocationByProjectId = new Map();
    for (const row of allocationAgg || []) {
      const key = String(row._id?.projectId || '');
      if (!key) continue;
      const action = String(row._id?.action || '');
      const current = allocationByProjectId.get(key) || {};
      allocationByProjectId.set(key, { ...current, [action]: row.lastAt || null });
    }

    const toIsoOrNull = (value) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    };

    const output = projects.map((project) => {
      const pId = String(project._id);
      const materials = Array.isArray(project.materials) ? project.materials : [];
      const bomItems = Array.isArray(project.bomItems) ? project.bomItems : [];

      const allocatedTotal = materials.reduce((sum, m) => sum + Math.max(0, Number(m?.allocatedQuantity || 0)), 0);
      const plannedTotal = materials.reduce((sum, m) => sum + Math.max(0, Number(m?.plannedQuantity || 0)), 0);
      const hasAllocation = allocatedTotal > 0;
      const hasPlanning = plannedTotal > 0;

      const usage = usageByProjectId.get(pId);
      const usedFromLogsByAssetId = usage?.assetMap || new Map();

      let usedTotal = 0;
      let latestManualAt = null;
      const inventoryItems = [];
      for (const m of materials) {
        const assetId = String(m?.assetId || '');
        const usageRow = assetId ? usedFromLogsByAssetId.get(assetId) : null;
        const usedFromLogs = Number(usageRow?.usedQuantity || 0);
        const hasOverride = m?.usedQuantityOverride !== null && m?.usedQuantityOverride !== undefined;
        const usedOverride = hasOverride ? Number(m.usedQuantityOverride) : null;
        const used = Math.max(0, hasOverride ? Math.max(usedFromLogs, usedOverride) : usedFromLogs);
        usedTotal += used;

        for (const ev of m?.usageEvents || []) {
          const ts = ev?.timestamp ? new Date(ev.timestamp) : null;
          if (!ts || Number.isNaN(ts.getTime())) continue;
          if (!latestManualAt || ts > latestManualAt) latestManualAt = ts;
        }

        const plannedQuantity = Math.max(0, Number(m?.plannedQuantity || 0));
        const allocatedQuantity = Math.max(0, Number(m?.allocatedQuantity || 0));
        const basisType = allocatedQuantity > 0 ? 'allocated' : plannedQuantity > 0 ? 'planned' : 'none';
        const basisQuantity = basisType === 'allocated' ? allocatedQuantity : basisType === 'planned' ? plannedQuantity : 0;
        const remainingQuantity = Math.max(0, basisQuantity - used);
        const status = (() => {
          if (used > 0 && (allocatedQuantity > 0 || used < plannedQuantity)) return 'Partially utilized';
          if (used > 0) return 'Utilized';
          if (allocatedQuantity > 0) return 'Allocated';
          return 'Planned';
        })();

        if (plannedQuantity > 0 || allocatedQuantity > 0 || used > 0) {
          inventoryItems.push({
            assetId: m?.assetId || '',
            sku: m?.sku || '',
            itemName: m?.itemName || '',
            unit: m?.unit || 'pcs',
            plannedQuantity,
            allocatedQuantity,
            usedQuantity: Math.round((used + Number.EPSILON) * 100) / 100,
            basisType,
            basisQuantity: Math.round((basisQuantity + Number.EPSILON) * 100) / 100,
            remainingQuantity: Math.round((remainingQuantity + Number.EPSILON) * 100) / 100,
            status,
            lastUsedAt: usageRow?.lastAt ? new Date(usageRow.lastAt).toISOString() : null
          });
        }
      }

      const utilizationDenom = allocatedTotal > 0 ? allocatedTotal : plannedTotal;
      const utilizationPercent =
        utilizationDenom > 0 ? Math.round(((usedTotal / utilizationDenom) * 100 + Number.EPSILON) * 10) / 10 : 0;

      let bomAt = null;
      for (const item of bomItems) {
        const candidate = item?.updatedAt || item?.createdAt;
        if (!candidate) continue;
        const d = new Date(candidate);
        if (Number.isNaN(d.getTime())) continue;
        if (!bomAt || d > bomAt) bomAt = d;
      }

      const logAt = usage?.lastAt ? new Date(usage.lastAt) : null;
      const latestUtilAt = (() => {
        const manual = latestManualAt;
        const log = logAt && !Number.isNaN(logAt.getTime()) ? logAt : null;
        if (manual && log) return manual > log ? manual : log;
        return manual || log || null;
      })();

      const allocationMeta = allocationByProjectId.get(pId) || {};
      const hasEverAllocated = Boolean(toIsoOrNull(allocationMeta.PROJECT_MATERIALS_ALLOCATE)) || hasAllocation || usedTotal > 0;
      const inventoryAllocatedAt =
        toIsoOrNull(allocationMeta.PROJECT_MATERIALS_ALLOCATE) ||
        (hasAllocation ? toIsoOrNull(project.updatedAt) : usedTotal > 0 ? (latestUtilAt ? latestUtilAt.toISOString() : toIsoOrNull(project.updatedAt)) : null);
      const materialsPlannedAt =
        toIsoOrNull(allocationMeta.PROJECT_MATERIALS_PLAN_UPSERT) || (hasPlanning ? toIsoOrNull(project.updatedAt) : null);

      const lastActivityAt = (() => {
        const dates = [project.updatedAt, inventoryAllocatedAt, materialsPlannedAt, bomAt, latestUtilAt]
          .map((v) => (v ? new Date(v) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()));
        if (dates.length === 0) return null;
        return new Date(Math.max(...dates.map((d) => d.getTime())));
      })();

      return {
        id: project._id,
        code: project.code,
        name: project.name,
        department: project.department,
        status: project.status,
        updatedAt: toIsoOrNull(project.updatedAt),
        inventoryItems,
        bomItems: bomItems.map((it) => {
          const hasLink = Boolean(String(it?.inventoryAssetId || '').trim() || String(it?.inventorySku || '').trim());
          const incoming = String(it?.inventoryStatus || '').trim();
          let currentStatus = 'Pending';
          if (hasLink) {
            currentStatus = (incoming === 'Utilized' || incoming === 'Non Utilized') ? incoming : 'Assigned';
          } else {
            currentStatus = incoming || 'Pending';
          }
          return {
            id: it?._id,
            srNo: Math.max(0, Number(it?.srNo || 0)),
            typeOfComponent: it?.typeOfComponent || '',
            nomenclatureDescription: it?.nomenclatureDescription || '',
            partNoDrg: it?.partNoDrg || '',
            make: it?.make || '',
            plannedQty: Math.max(0, Number(it?.plannedQty || 0)),
            inventoryAssetId: it?.inventoryAssetId || '',
            inventorySku: it?.inventorySku || '',
            inventoryItemName: it?.inventoryItemName || '',
            inventoryStatus: incoming || 'Pending',
            currentStatus,
            updatedAt: toIsoOrNull(it?.updatedAt || it?.createdAt)
          };
        }),
        statuses: {
          inventoryAllocated: { value: hasEverAllocated, at: inventoryAllocatedAt },
          materialsPlanned: { value: hasPlanning, at: materialsPlannedAt },
          bomCreated: { value: bomItems.length > 0, at: bomAt ? bomAt.toISOString() : null },
          utilization: {
            percent: utilizationPercent,
            usedTotal: Math.round((usedTotal + Number.EPSILON) * 100) / 100,
            denominator: Math.round((utilizationDenom + Number.EPSILON) * 100) / 100,
            basis: allocatedTotal > 0 ? 'allocated' : plannedTotal > 0 ? 'planned' : 'none',
            at: latestUtilAt ? latestUtilAt.toISOString() : null
          }
        },
        lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null
      };
    });

    res.json({ projects: output });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project status overview', error: error.message });
  }
});

router.get('/:projectId', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

router.post('/:projectId/materials/upsert', authMiddleware, attachUserProfileDepartment, canEditProjects, async (req, res) => {
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
    if (idx === -1 && nextPlanned === 0) {
      return res.json({ project });
    }
    const nextMaterial = {
      assetId: asset.assetId,
      sku: asset.sku,
      itemName: asset.itemName,
      unit: asset.unit || 'pcs',
      plannedQuantity: nextPlanned
    };

    if (idx >= 0) {
      project.materials[idx] = { ...project.materials[idx].toObject?.() || project.materials[idx], ...nextMaterial };
      if (nextPlanned === 0) {
        const row = project.materials[idx];
        const allocated = Number(row?.allocatedQuantity || 0);
        const hasUsedOverride = row?.usedQuantityOverride !== null && row?.usedQuantityOverride !== undefined;
        const hasUsageEvents = Array.isArray(row?.usageEvents) && row.usageEvents.length > 0;
        if (allocated <= 0 && !hasUsedOverride && !hasUsageEvents) {
          project.materials.splice(idx, 1);
        }
      }
    } else {
      project.materials.push({ ...nextMaterial, allocatedQuantity: 0 });
    }

    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_MATERIALS_PLAN_UPSERT',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        plannedQuantity: nextPlanned
      }
    });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update planned materials', error: error.message });
  }
});

router.post('/:projectId/materials/allocate', authMiddleware, attachUserProfileDepartment, canEditProjects, async (req, res) => {
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

    await recordAuditLog({
      req,
      action: 'PROJECT_MATERIALS_ALLOCATE',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        assetId: assetDoc.assetId,
        sku: assetDoc.sku,
        itemName: assetDoc.itemName,
        quantity: qty,
        assetAvailableQuantity: assetDoc.availableQuantity,
        assetAllocatedQuantity: assetDoc.allocatedQuantity
      }
    });

    res.json({ project, asset: assetDoc });
  } catch (error) {
    res.status(500).json({ message: 'Failed to allocate materials', error: error.message });
  }
});

router.post('/:projectId/materials/used', authMiddleware, attachUserProfileDepartment, canEditProjects, async (req, res) => {
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
    let delta = nextUsed;
    if (idx === -1) {
      project.materials.push({
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        unit: asset.unit || 'pcs',
        plannedQuantity: 0,
        allocatedQuantity: 0,
        usedQuantityOverride: nextUsed,
        usageEvents: [
          {
            source: 'manual',
            delta: nextUsed,
            usedTotal: nextUsed,
            performedBy: req.user.email || req.user.username || req.user.id
          }
        ]
      });
    } else {
      const prevTotal = project.materials[idx].usedQuantityOverride ?? 0;
      delta = nextUsed - Number(prevTotal);
      project.materials[idx].usedQuantityOverride = nextUsed;
      project.materials[idx].usageEvents = project.materials[idx].usageEvents || [];
      project.materials[idx].usageEvents.push({
        source: 'manual',
        delta,
        usedTotal: nextUsed,
        performedBy: req.user.email || req.user.username || req.user.id
      });
    }

    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_MATERIALS_USED_OVERRIDE',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        assetId: asset.assetId,
        sku: asset.sku,
        itemName: asset.itemName,
        usedTotal: nextUsed,
        delta
      }
    });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update used materials', error: error.message });
  }
});

router.get('/:projectId/consumption', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const { limit = 20, page = 1, search } = req.query;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const parsedLimit = Math.min(100, Math.max(1, Number(limit)));
    const parsedPage = Math.max(1, Number(page));

    const logQuery = { projectId: project._id, type: 'OUT' };
    if (search) {
      logQuery.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await InventoryLog.find(logQuery).sort({ timestamp: -1, createdAt: -1 }).limit(500);

    const manualEvents = [];
    for (const m of project.materials || []) {
      for (const ev of m.usageEvents || []) {
        const row = {
          source: 'manual',
          type: 'USED_UPDATE',
          assetId: m.assetId,
          sku: m.sku,
          itemName: m.itemName,
          unit: m.unit || 'pcs',
          quantity: ev.delta,
          usedTotal: ev.usedTotal,
          performedBy: ev.performedBy || '',
          timestamp: ev.timestamp || new Date()
        };
        manualEvents.push(row);
      }
    }

    let combined = [
      ...logs.map((l) => ({
        source: 'stock_out',
        type: 'OUT',
        assetId: l.assetId,
        sku: l.sku,
        itemName: l.itemName,
        unit: '',
        quantity: l.quantity,
        usedTotal: null,
        performedBy: l.performedBy || '',
        timestamp: l.timestamp || l.createdAt
      })),
      ...manualEvents
    ];

    if (search) {
      const s = String(search).toLowerCase();
      combined = combined.filter((e) => {
        return (
          String(e.itemName || '').toLowerCase().includes(s) ||
          String(e.sku || '').toLowerCase().includes(s) ||
          String(e.assetId || '').toLowerCase().includes(s)
        );
      });
    }

    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const start = (parsedPage - 1) * parsedLimit;
    const paged = combined.slice(start, start + parsedLimit);

    res.json({
      project: { id: project._id, code: project.code, name: project.name },
      events: paged,
      totalEvents: combined.length,
      totalPages: Math.ceil(combined.length / parsedLimit),
      currentPage: parsedPage
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch consumption history', error: error.message });
  }
});

router.get('/:projectId/summary', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const usageByAssetId = await InventoryLog.aggregate([
      { $match: { projectId: project._id, type: { $in: ['IN', 'OUT'] } } },
      {
        $group: {
          _id: '$assetId',
          usedQuantity: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', { $multiply: ['$quantity', -1] }]
            }
          }
        }
      }
    ]);

    const usedMap = new Map(usageByAssetId.map((u) => [u._id, u.usedQuantity]));
    const materials = (project.materials || []).map((m) => {
      const logUsedQuantity = usedMap.get(m.assetId) || 0;
      const hasOverride = m.usedQuantityOverride !== null && m.usedQuantityOverride !== undefined;
      const usedQuantity = hasOverride ? Number(m.usedQuantityOverride) : Math.max(0, logUsedQuantity);
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

const toNumberOrZero = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const sanitized = String(value ?? '')
    .replace(/,/g, '')
    .replace(/[^\d.+-]/g, '')
    .trim();
  if (!sanitized || sanitized === '+' || sanitized === '-' || sanitized === '.') return 0;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const buildBomItem = (payload) => {
  const qtyPerBoard = Math.max(0, toNumberOrZero(payload.qtyPerBoard));
  const boardReq = Math.max(0, toNumberOrZero(payload.boardReq));
  const spareQty = Math.max(0, toNumberOrZero(payload.spareQty));
  const boardReqWithSpare = Math.max(0, boardReq + spareQty);
  const totalQtyWithSpare = Math.max(0, qtyPerBoard * boardReqWithSpare);

  const unitCost = Math.max(0, toNumberOrZero(payload.unitCost));
  const additionalCostRaw = payload.additionalCost;
  const additionalCost =
    additionalCostRaw === undefined || additionalCostRaw === null || String(additionalCostRaw).trim() === ''
      ? 1
      : Math.max(0, toNumberOrZero(additionalCostRaw));
  const landingCostPerUnit = Math.max(0, unitCost * additionalCost);
  const totalPrice = Math.max(0, landingCostPerUnit * totalQtyWithSpare);
  const leadTimeWeeks = Math.max(0, toNumberOrZero(payload.leadTimeWeeks ?? payload.leadTime));
  const plannedQty = Math.max(0, toNumberOrZero(payload.plannedQty));

  const inventoryAssetId = typeof payload.inventoryAssetId === 'string' ? payload.inventoryAssetId.trim() : '';
  const inventorySku = typeof payload.inventorySku === 'string' ? payload.inventorySku.trim() : '';
  const inventoryItemName = typeof payload.inventoryItemName === 'string' ? payload.inventoryItemName.trim() : '';

  const incomingStatusRaw = String(payload.inventoryStatus || '').trim();
  const incomingStatus =
    ['Pending', 'Need to Purchase', 'Assigned', 'Utilized', 'Non Utilized'].includes(incomingStatusRaw)
      ? incomingStatusRaw
      : '';
  
  let inventoryStatus = 'Pending';
  if (inventoryAssetId || inventorySku) {
    inventoryStatus = (incomingStatus === 'Utilized' || incomingStatus === 'Non Utilized') ? incomingStatus : 'Assigned';
  } else {
    inventoryStatus = (incomingStatus === 'Need to Purchase') ? 'Need to Purchase' : 'Pending';
  }

  return {
    typeOfComponent: typeof payload.typeOfComponent === 'string' ? payload.typeOfComponent.trim() : '',
    srNo: Math.max(0, toNumberOrZero(payload.srNo)),
    supplierName: typeof payload.supplierName === 'string' ? payload.supplierName.trim() : '',
    nomenclatureDescription: typeof payload.nomenclatureDescription === 'string' ? payload.nomenclatureDescription.trim() : '',
    partNoDrg: typeof payload.partNoDrg === 'string' ? payload.partNoDrg.trim() : '',
    make: typeof payload.make === 'string' ? payload.make.trim() : '',
    qtyPerBoard,
    boardReq,
    spareQty,
    boardReqWithSpare,
    totalQtyWithSpare,
    unitCost: roundMoney(unitCost),
    additionalCost: roundMoney(additionalCost),
    landingCostPerUnit: roundMoney(landingCostPerUnit),
    totalPrice: roundMoney(totalPrice),
    moq: Math.max(0, toNumberOrZero(payload.moq)),
    remarks: typeof payload.remarks === 'string' ? payload.remarks.trim() : '',
    leadTime: typeof payload.leadTime === 'string' ? payload.leadTime.trim() : '',
    leadTimeWeeks,
    inventoryAssetId,
    inventorySku,
    inventoryItemName,
    plannedQty,
    inventoryStatus
  };
};

const hasMeaningfulBomContent = (item) => {
  if (!item) return false;
  return Boolean(
    item.typeOfComponent ||
    item.nomenclatureDescription ||
    item.partNoDrg ||
    item.make ||
    item.supplierName ||
    item.qtyPerBoard > 0 ||
    item.boardReq > 0 ||
    item.spareQty > 0 ||
    item.unitCost > 0 ||
    item.moq > 0
  );
};

router.get('/:projectId/bom', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });
    res.json({ projectId: project._id, bomItems: project.bomItems || [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch BOM items', error: error.message });
  }
});

router.post('/:projectId/bom', authMiddleware, attachUserProfileDepartment, canManageBom, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const payload = req.body || {};
    const bomItem = buildBomItem(payload);

    project.bomItems = project.bomItems || [];
    project.bomItems.push(bomItem);
    await project.save();

    const savedItem = project.bomItems[project.bomItems.length - 1];

    await recordAuditLog({
      req,
      action: 'PROJECT_BOM_ADD',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        projectName: project.name,
        srNo: bomItem.srNo,
        typeOfComponent: bomItem.typeOfComponent,
        supplierName: bomItem.supplierName,
        nomenclatureDescription: bomItem.nomenclatureDescription,
        totalQtyWithSpare: bomItem.totalQtyWithSpare,
        totalPrice: bomItem.totalPrice
      }
    });

    res.status(201).json({ projectId: project._id, bomItem: savedItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add BOM item', error: error.message });
  }
});

router.post('/:projectId/bom/bulk', authMiddleware, attachUserProfileDepartment, canManageBom, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return res.status(400).json({ message: 'items must be a non-empty array' });

    project.bomItems = project.bomItems || [];
    const startIndex = project.bomItems.length;

    const added = [];
    for (const raw of items) {
      const next = buildBomItem(raw || {});
      if (!hasMeaningfulBomContent(next)) continue;
      project.bomItems.push(next);
      added.push(next);
    }

    if (added.length === 0) return res.status(400).json({ message: 'No valid BOM items to add' });

    await project.save();
    const saved = project.bomItems.slice(startIndex, startIndex + added.length);

    await recordAuditLog({
      req,
      action: 'PROJECT_BOM_BULK_ADD',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        projectName: project.name,
        count: saved.length
      }
    });

    res.status(201).json({ projectId: project._id, bomItems: saved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add BOM items', error: error.message });
  }
});

router.put('/:projectId/bom/:bomItemId', authMiddleware, attachUserProfileDepartment, canUpdateBom, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const bomItem = project.bomItems?.id?.(req.params.bomItemId);
    if (!bomItem) return res.status(404).json({ message: 'BOM item not found' });

    const rawPayload = req.body || {};
    const allowedKeys = new Set([
      'typeOfComponent',
      'srNo',
      'supplierName',
      'nomenclatureDescription',
      'partNoDrg',
      'make',
      'qtyPerBoard',
      'boardReq',
      'spareQty',
      'unitCost',
      'additionalCost',
      'moq',
      'remarks',
      'leadTime',
      'leadTimeWeeks',
      'inventoryAssetId',
      'inventorySku',
      'inventoryItemName',
      'plannedQty',
      'inventoryStatus'
    ]);
    const payload = {};
    const isProjectManager = req.user?.role === ROLES.PROJECT_MANAGER;
    const projectManagerAllowedKeys = new Set([
      'inventoryStatus',
      'inventoryAssetId',
      'inventorySku',
      'inventoryItemName',
      'plannedQty',
      'leadTimeWeeks',
      'remarks'
    ]);
    for (const [k, v] of Object.entries(rawPayload)) {
      if (isProjectManager) {
        if (projectManagerAllowedKeys.has(k)) payload[k] = v;
      } else if (allowedKeys.has(k)) {
        payload[k] = v;
      }
    }

    if (isProjectManager) {
      const savedAssetId = String(bomItem.inventoryAssetId || '').trim();
      const savedSku = String(bomItem.inventorySku || '').trim();
      const isStatusUtilized = String(bomItem.inventoryStatus || '') === 'Utilized';

      let usedQuantity = 0;
      if (savedAssetId || savedSku) {
        const matchOr = [];
        if (savedAssetId) matchOr.push({ assetId: savedAssetId });
        if (savedSku) matchOr.push({ sku: savedSku });
        const agg = await InventoryLog.aggregate([
          { $match: { projectId: project._id, type: { $in: ['IN', 'OUT'] }, $or: matchOr } },
          {
            $group: {
              _id: null,
              usedQuantity: {
                $sum: {
                  $cond: [{ $eq: ['$type', 'OUT'] }, '$quantity', { $multiply: ['$quantity', -1] }]
                }
              }
            }
          }
        ]);
        usedQuantity = Math.max(0, Number(agg?.[0]?.usedQuantity || 0));
      }

      const isLocked = isStatusUtilized || usedQuantity > 0;

      const nextAssetId = payload.inventoryAssetId !== undefined ? String(payload.inventoryAssetId || '').trim() : savedAssetId;
      const nextSku = payload.inventorySku !== undefined ? String(payload.inventorySku || '').trim() : savedSku;
      const nextItemName =
        payload.inventoryItemName !== undefined
          ? String(payload.inventoryItemName || '').trim()
          : String(bomItem.inventoryItemName || '').trim();
      const nextPlannedQty = payload.plannedQty !== undefined ? Number(payload.plannedQty || 0) : Number(bomItem.plannedQty || 0);

      const beforeItemName = String(bomItem.inventoryItemName || '').trim();
      const beforePlannedQty = Number(bomItem.plannedQty || 0);

      const assignmentChanged =
        savedAssetId !== nextAssetId
        || savedSku !== nextSku
        || beforeItemName !== nextItemName
        || beforePlannedQty !== nextPlannedQty;

      if (isLocked && assignmentChanged) {
        return res.status(400).json({ message: 'Utilized BOM item assignment cannot be changed' });
      }
    }

    const current = bomItem.toObject ? bomItem.toObject() : { ...bomItem };
    const currentNormalized = buildBomItem(current);
    const normalized = buildBomItem({ ...current, ...payload });

    const isInventoryManager = req.user?.role === ROLES.INVENTORY_MANAGER;
    if (isInventoryManager) {
      const trackedKeys = [
        'typeOfComponent',
        'srNo',
        'supplierName',
        'nomenclatureDescription',
        'partNoDrg',
        'make',
        'qtyPerBoard',
        'boardReq',
        'spareQty',
        'boardReqWithSpare',
        'totalQtyWithSpare',
        'unitCost',
        'additionalCost',
        'landingCostPerUnit',
        'totalPrice',
        'moq',
        'remarks',
        'leadTime',
        'leadTimeWeeks',
        'inventoryAssetId',
        'inventorySku',
        'inventoryItemName',
        'plannedQty',
        'inventoryStatus'
      ];

      const changedFields = [];
      for (const key of trackedKeys) {
        const before = currentNormalized?.[key];
        const after = normalized?.[key];
        const isNumber = typeof before === 'number' || typeof after === 'number';
        const same = isNumber ? Number(before || 0) === Number(after || 0) : String(before || '') === String(after || '');
        if (!same) changedFields.push(key);
      }

      if (changedFields.length > 0) {
        const existing = Array.isArray(bomItem.inventoryManagerEditedFields) ? bomItem.inventoryManagerEditedFields : [];
        bomItem.inventoryManagerEditedFields = Array.from(new Set([...existing.map((v) => String(v)), ...changedFields]));
        bomItem.inventoryManagerEditedAt = new Date();
        bomItem.inventoryManagerEditedBy = String(req.user?.email || req.user?.id || '');
      }
    }

    bomItem.typeOfComponent = normalized.typeOfComponent;
    bomItem.srNo = normalized.srNo;
    bomItem.supplierName = normalized.supplierName;
    bomItem.nomenclatureDescription = normalized.nomenclatureDescription;
    bomItem.partNoDrg = normalized.partNoDrg;
    bomItem.make = normalized.make;
    bomItem.qtyPerBoard = normalized.qtyPerBoard;
    bomItem.boardReq = normalized.boardReq;
    bomItem.spareQty = normalized.spareQty;
    bomItem.boardReqWithSpare = normalized.boardReqWithSpare;
    bomItem.totalQtyWithSpare = normalized.totalQtyWithSpare;
    bomItem.unitCost = normalized.unitCost;
    bomItem.additionalCost = normalized.additionalCost;
    bomItem.landingCostPerUnit = normalized.landingCostPerUnit;
    bomItem.totalPrice = normalized.totalPrice;
    bomItem.moq = normalized.moq;
    bomItem.remarks = normalized.remarks;
    bomItem.leadTime = normalized.leadTime;
    bomItem.leadTimeWeeks = normalized.leadTimeWeeks;
    bomItem.inventoryAssetId = normalized.inventoryAssetId;
    bomItem.inventorySku = normalized.inventorySku;
    bomItem.inventoryItemName = normalized.inventoryItemName;
    bomItem.plannedQty = normalized.plannedQty;
    bomItem.inventoryStatus = normalized.inventoryStatus;

    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_BOM_UPDATE',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        bomItemId: String(bomItem._id),
        srNo: bomItem.srNo,
        typeOfComponent: bomItem.typeOfComponent,
        supplierName: bomItem.supplierName,
        nomenclatureDescription: bomItem.nomenclatureDescription,
        partNoDrg: bomItem.partNoDrg,
        make: bomItem.make,
        qtyPerBoard: bomItem.qtyPerBoard,
        boardReq: bomItem.boardReq,
        spareQty: bomItem.spareQty,
        totalQtyWithSpare: bomItem.totalQtyWithSpare,
        unitCost: bomItem.unitCost,
        additionalCost: bomItem.additionalCost,
        landingCostPerUnit: bomItem.landingCostPerUnit,
        totalPrice: bomItem.totalPrice,
        moq: bomItem.moq,
        remarks: bomItem.remarks,
        leadTimeWeeks: bomItem.leadTimeWeeks,
        plannedQty: bomItem.plannedQty,
        inventoryAssetId: bomItem.inventoryAssetId,
        inventorySku: bomItem.inventorySku,
        inventoryItemName: bomItem.inventoryItemName,
        inventoryStatus: bomItem.inventoryStatus
      }
    });

    res.json({ projectId: project._id, bomItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update BOM item', error: error.message });
  }
});

router.delete('/:projectId/bom/:bomItemId', authMiddleware, attachUserProfileDepartment, canManageBom, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const bomItem = project.bomItems?.id?.(req.params.bomItemId);
    if (!bomItem) return res.status(404).json({ message: 'BOM item not found' });

    const details = {
      projectCode: project.code,
      projectName: project.name,
      bomItemId: String(bomItem._id),
      srNo: bomItem.srNo,
      typeOfComponent: bomItem.typeOfComponent,
      supplierName: bomItem.supplierName,
      nomenclatureDescription: bomItem.nomenclatureDescription,
      totalQtyWithSpare: bomItem.totalQtyWithSpare,
      totalPrice: bomItem.totalPrice
    };

    bomItem.deleteOne();
    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_BOM_DELETE',
      entityType: 'Project',
      entityId: project._id,
      details
    });

    res.json({ projectId: project._id, bomItemId: req.params.bomItemId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete BOM item', error: error.message });
  }
});

const normalizeTextOrUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const normalizeNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const normalizeEffectiveDateOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

router.get('/:projectId/bom-change-requests', authMiddleware, attachUserProfileDepartment, canViewProjects, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });
    res.json({ projectId: project._id, requests: project.bomChangeRequests || [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch BOM change requests', error: error.message });
  }
});

router.post('/:projectId/bom-change-requests', authMiddleware, attachUserProfileDepartment, canCreateBomChangeRequest, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(req, project)) return res.status(403).json({ message: 'Access denied. You do not have permission.' });

    const body = req.body || {};
    const title = normalizeTextOrUndefined(body.title);
    const reason = normalizeTextOrUndefined(body.reason);
    const notes = normalizeTextOrUndefined(body.notes) || '';
    const priority = ['low', 'medium', 'high'].includes(String(body.priority)) ? String(body.priority) : 'medium';
    const effectiveDate = normalizeEffectiveDateOrNull(body.effectiveDate);
    const bomItemIdRaw = normalizeTextOrUndefined(body.bomItemId || body.bomItem || body.bomItemID);

    if (!title || !reason) {
      return res.status(400).json({ message: 'title and reason are required' });
    }

    const bomItem = bomItemIdRaw ? project.bomItems?.id?.(bomItemIdRaw) : null;
    const currentBomItem = bomItem ? (bomItem.toObject ? bomItem.toObject() : { ...bomItem }) : null;

    const incomingProposed = body.proposedChanges && typeof body.proposedChanges === 'object' ? body.proposedChanges : {};
    const proposedChanges = {};

    const stringFields = [
      'typeOfComponent',
      'supplierName',
      'nomenclatureDescription',
      'partNoDrg',
      'make',
      'remarks',
      'leadTime',
      'inventoryAssetId',
      'inventorySku',
      'inventoryItemName'
    ];
    for (const key of stringFields) {
      const val = normalizeTextOrUndefined(incomingProposed[key]);
      if (val !== undefined) proposedChanges[key] = val;
    }

    const numberFields = [
      'srNo',
      'qtyPerBoard',
      'boardReq',
      'spareQty',
      'unitCost',
      'additionalCost',
      'moq',
      'leadTimeWeeks',
      'plannedQty'
    ];
    for (const key of numberFields) {
      const val = normalizeNumberOrUndefined(incomingProposed[key]);
      if (val !== undefined) proposedChanges[key] = val;
    }

    const requestDoc = {
      title,
      priority,
      status: 'submitted',
      reason,
      effectiveDate,
      bomItemId: bomItem ? bomItem._id : null,
      currentBomItem,
      proposedChanges,
      notes,
      requestedBy: {
        userId: req.user.id,
        username: req.user.username || '',
        email: req.user.email || ''
      }
    };

    project.bomChangeRequests = project.bomChangeRequests || [];
    project.bomChangeRequests.push(requestDoc);
    await project.save();

    const saved = project.bomChangeRequests[project.bomChangeRequests.length - 1];

    await recordAuditLog({
      req,
      action: 'PROJECT_BOM_CHANGE_REQUEST_CREATE',
      entityType: 'Project',
      entityId: project._id,
      details: {
        projectCode: project.code,
        projectName: project.name,
        requestId: String(saved?._id || ''),
        title,
        priority,
        bomItemId: bomItem ? String(bomItem._id) : null
      }
    });

    res.status(201).json({ projectId: project._id, request: saved });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create BOM change request', error: error.message });
  }
});

module.exports = router;
