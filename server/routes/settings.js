const express = require('express');
const AdminSettings = require('../models/AdminSettings');
const { ASSET_CATEGORIES, DEPARTMENTS } = require('../constants/assets');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

const normalizeCompanyDirectory = (value) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();

  const normalized = [];
  for (const raw of list) {
    const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    if (!id || !name) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const locationsRaw = Array.isArray(raw?.locations) ? raw.locations : [];
    const locSeen = new Set();
    const locations = [];
    for (const l of locationsRaw) {
      const loc = typeof l === 'string' ? l.trim() : '';
      if (!loc || locSeen.has(loc)) continue;
      locSeen.add(loc);
      locations.push(loc);
    }
    locations.sort((a, b) => a.localeCompare(b));

    normalized.push({ id, name, locations });
  }

  normalized.sort((a, b) => a.name.localeCompare(b.name));
  return normalized;
};

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeAssetCategories = (value) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];
  for (const raw of list) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(name);
  }
  return normalized.length > 0 ? normalized : ASSET_CATEGORIES;
};

const normalizeDepartments = (value) => {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const normalized = [];
  for (const raw of list) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(name);
  }
  return normalized.length > 0 ? normalized : DEPARTMENTS;
};

router.get('/company-directory', authMiddleware, async (req, res) => {
  try {
    const doc = await AdminSettings.findOne({ key: 'admin' }).lean();
    res.json({
      companyDirectory: Array.isArray(doc?.companyDirectory) ? doc.companyDirectory : [],
      assetCategories: normalizeAssetCategories(doc?.assetCategories),
      departments: normalizeDepartments(doc?.departments),
      selectedCompanyId: normalizeString(doc?.selectedCompanyId),
      selectedCompanyLocation: normalizeString(doc?.selectedCompanyLocation),
      updatedAt: doc?.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch company directory', error: error.message });
  }
});

router.get('/admin', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const doc = await AdminSettings.findOne({ key: 'admin' }).lean();
    if (!doc) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    res.json({
      defaultLowStockThreshold: doc.defaultLowStockThreshold ?? 5,
      companyDirectory: Array.isArray(doc.companyDirectory) ? doc.companyDirectory : [],
      assetCategories: normalizeAssetCategories(doc.assetCategories),
      departments: normalizeDepartments(doc.departments),
      selectedCompanyId: normalizeString(doc.selectedCompanyId),
      selectedCompanyLocation: normalizeString(doc.selectedCompanyLocation),
      updatedAt: doc.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

router.put('/admin', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const update = {};

    if (req.body?.defaultLowStockThreshold !== undefined) {
      const n = Number(req.body.defaultLowStockThreshold);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: 'defaultLowStockThreshold must be a non-negative number' });
      }
      update.defaultLowStockThreshold = n;
    }

    if (req.body?.companyDirectory !== undefined) {
      update.companyDirectory = normalizeCompanyDirectory(req.body.companyDirectory);
    }

    if (req.body?.assetCategories !== undefined) {
      update.assetCategories = normalizeAssetCategories(req.body.assetCategories);
    }

    if (req.body?.departments !== undefined) {
      update.departments = normalizeDepartments(req.body.departments);
    }

    if (req.body?.selectedCompanyId !== undefined) {
      update.selectedCompanyId = normalizeString(req.body.selectedCompanyId);
    }

    if (req.body?.selectedCompanyLocation !== undefined) {
      update.selectedCompanyLocation = normalizeString(req.body.selectedCompanyLocation);
    }

    const doc = await AdminSettings.findOneAndUpdate(
      { key: 'admin' },
      { $set: update, $setOnInsert: { key: 'admin' } },
      { new: true, upsert: true }
    ).lean();

    res.json({
      message: 'Settings saved',
      defaultLowStockThreshold: doc.defaultLowStockThreshold ?? 5,
      companyDirectory: Array.isArray(doc.companyDirectory) ? doc.companyDirectory : [],
      assetCategories: normalizeAssetCategories(doc.assetCategories),
      departments: normalizeDepartments(doc.departments),
      selectedCompanyId: normalizeString(doc.selectedCompanyId),
      selectedCompanyLocation: normalizeString(doc.selectedCompanyLocation),
      updatedAt: doc.updatedAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save settings', error: error.message });
  }
});

module.exports = router;
