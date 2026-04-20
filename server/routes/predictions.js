const express = require('express');
const Asset = require('../models/Asset');
const InventoryLog = require('../models/InventoryLog');
const Project = require('../models/Project');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

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

const normalizeHeader = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compactHeader = (value) => normalizeHeader(value).replace(/\s+/g, '');

const findHeaderKey = (headers, aliases) => {
  const normalized = headers.map((header) => ({
    header,
    normalized: normalizeHeader(header),
    compact: compactHeader(header)
  }));

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const compactAlias = compactHeader(alias);
    const exact =
      normalized.find((entry) => entry.normalized === normalizedAlias) ||
      normalized.find((entry) => entry.compact === compactAlias);
    if (exact) return exact.header;
  }

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const compactAlias = compactHeader(alias);
    const partial =
      normalized.find((entry) => entry.normalized.includes(normalizedAlias)) ||
      normalized.find((entry) => entry.compact.includes(compactAlias));
    if (partial) return partial.header;
  }

  return '';
};

const normalizeTextKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) => {
  const base = normalizeTextKey(value);
  if (!base) return [];
  return base.split(' ').filter((t) => t.length >= 2);
};

const isClearlyJunkName = (name) => {
  const n = normalizeTextKey(name);
  if (!n) return true;
  if (n === 'na' || n === 'n a' || n === 'n a a' || n === 'n a n a') return true;
  if (n === 'n a' || n === 'n a.' || n === 'none' || n === 'nil') return true;
  if (n === 'dummy' || n.includes('dummy')) return true;
  if (n.includes('test') || n.includes('sample')) return true;
  if (n === 'sr no' || n === 'sr no.' || n === 'serial no') return true;
  if (n === 'nomenclature description' || n === 'nomenclature') return true;
  return false;
};

const mapIncomingRowToBomItem = (row) => {
  const source = row && typeof row === 'object' ? row : {};
  const alreadyLooksMapped =
    Object.prototype.hasOwnProperty.call(source, 'nomenclatureDescription') ||
    Object.prototype.hasOwnProperty.call(source, 'totalQtyWithSpare') ||
    Object.prototype.hasOwnProperty.call(source, 'qtyPerBoard') ||
    Object.prototype.hasOwnProperty.call(source, 'boardReq');

  if (alreadyLooksMapped) {
    return {
      typeOfComponent: String(source.typeOfComponent || '').trim(),
      nomenclatureDescription: String(source.nomenclatureDescription || '').trim(),
      partNoDrg: String(source.partNoDrg || '').trim(),
      make: String(source.make || '').trim(),
      qtyPerBoard: toNumberOrZero(source.qtyPerBoard),
      boardReq: toNumberOrZero(source.boardReq),
      spareQty: toNumberOrZero(source.spareQty),
      totalQtyWithSpare: toNumberOrZero(source.totalQtyWithSpare),
      plannedQty: toNumberOrZero(source.plannedQty),
      leadTimeWeeks: toNumberOrZero(source.leadTimeWeeks || source.leadTime),
      moq: toNumberOrZero(source.moq),
      unitCost: toNumberOrZero(source.unitCost),
      inventoryAssetId: String(source.inventoryAssetId || source.assetId || '').trim(),
      inventorySku: String(source.inventorySku || source.sku || '').trim(),
      inventoryItemName: String(source.inventoryItemName || source.itemName || '').trim()
    };
  }

  const headers = Object.keys(source);
  const keys = {
    typeOfComponent: findHeaderKey(headers, ['Type of Component', 'Component Type', 'Type']),
    nomenclatureDescription: findHeaderKey(headers, [
      'Nomenclature/Description',
      'Nomenclature / Description',
      'Nomenclature',
      'Description',
      'Item',
      'Item Name',
      'Name'
    ]),
    partNoDrg: findHeaderKey(headers, ['Part No./Drg.', 'Part No / Drg', 'Part No', 'Part Number', 'Drg', 'Drawing']),
    make: findHeaderKey(headers, ['Make', 'Manufacturer']),
    qtyPerBoard: findHeaderKey(headers, ['Qty per Board', 'Quantity per Board', 'Qty/Board']),
    boardReq: findHeaderKey(headers, ['Board Req', 'Board Required', 'Boards Req']),
    spareQty: findHeaderKey(headers, ['Spare qty', 'Spare Qty', 'Spare Quantity']),
    totalQtyWithSpare: findHeaderKey(headers, ['Total Qty with Spare', 'Total Qty+Spare', 'TotalQtyWithSpare', 'Total Qty', 'Qty', 'Quantity']),
    plannedQty: findHeaderKey(headers, ['Planned Qty', 'Planned qty', 'PlannedQuantity']),
    leadTimeWeeks: findHeaderKey(headers, ['Lead time (weeks)', 'Lead Time (Weeks)', 'Lead time', 'Lead Time', 'Lead Weeks']),
    moq: findHeaderKey(headers, ['MOQ', 'Minimum Order Quantity']),
    unitCost: findHeaderKey(headers, ['Unit cost', 'Unit Cost', 'Unit Price', 'Price']),
    inventoryAssetId: findHeaderKey(headers, ['Inventory Asset ID', 'AssetId', 'Asset ID', 'InventoryAssetId']),
    inventorySku: findHeaderKey(headers, ['Inventory SKU', 'SKU', 'InventorySku']),
    inventoryItemName: findHeaderKey(headers, ['Inventory Item Name', 'InventoryItemName'])
  };

  return {
    typeOfComponent: String(source?.[keys.typeOfComponent] ?? '').trim(),
    nomenclatureDescription: String(source?.[keys.nomenclatureDescription] ?? '').trim(),
    partNoDrg: String(source?.[keys.partNoDrg] ?? '').trim(),
    make: String(source?.[keys.make] ?? '').trim(),
    qtyPerBoard: toNumberOrZero(source?.[keys.qtyPerBoard]),
    boardReq: toNumberOrZero(source?.[keys.boardReq]),
    spareQty: toNumberOrZero(source?.[keys.spareQty]),
    totalQtyWithSpare: toNumberOrZero(source?.[keys.totalQtyWithSpare]),
    plannedQty: toNumberOrZero(source?.[keys.plannedQty]),
    leadTimeWeeks: toNumberOrZero(source?.[keys.leadTimeWeeks]),
    moq: toNumberOrZero(source?.[keys.moq]),
    unitCost: toNumberOrZero(source?.[keys.unitCost]),
    inventoryAssetId: String(source?.[keys.inventoryAssetId] ?? '').trim(),
    inventorySku: String(source?.[keys.inventorySku] ?? '').trim(),
    inventoryItemName: String(source?.[keys.inventoryItemName] ?? '').trim()
  };
};

const computeRequiredQty = (item) => {
  const planned = toNumberOrZero(item?.plannedQty);
  if (planned > 0) return planned;
  const total = toNumberOrZero(item?.totalQtyWithSpare);
  if (total > 0) return total;
  const qtyPerBoard = toNumberOrZero(item?.qtyPerBoard);
  const boardReq = toNumberOrZero(item?.boardReq);
  const spare = toNumberOrZero(item?.spareQty);
  const computed = Math.max(0, qtyPerBoard) * Math.max(0, boardReq) + Math.max(0, spare);
  if (computed > 0) return computed;
  return 0;
};

const groupAndCleanBom = (incoming) => {
  const list = Array.isArray(incoming) ? incoming : [];
  const grouped = new Map();
  let dropped = 0;

  for (const raw of list) {
    const mapped = mapIncomingRowToBomItem(raw);
    const itemName =
      String(mapped?.inventoryItemName || mapped?.nomenclatureDescription || mapped?.partNoDrg || mapped?.inventorySku || mapped?.inventoryAssetId || '')
        .trim() || '';
    const requiredRaw = computeRequiredQty(mapped);

    if (!itemName || isClearlyJunkName(itemName) || requiredRaw <= 0) {
      dropped += 1;
      continue;
    }

    const key =
      mapped.inventorySku
        ? `sku:${mapped.inventorySku}`
        : mapped.inventoryAssetId
          ? `asset:${mapped.inventoryAssetId}`
          : `name:${normalizeTextKey(itemName)}|part:${normalizeTextKey(mapped.partNoDrg)}`;

    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, {
        key,
        itemName,
        partNoDrg: String(mapped.partNoDrg || '').trim(),
        make: String(mapped.make || '').trim(),
        inventorySku: String(mapped.inventorySku || '').trim(),
        inventoryAssetId: String(mapped.inventoryAssetId || '').trim(),
        inventoryItemName: String(mapped.inventoryItemName || '').trim(),
        requiredBomQty: requiredRaw,
        leadTimeWeeks: Math.max(0, toNumberOrZero(mapped.leadTimeWeeks)),
        moq: Math.max(0, toNumberOrZero(mapped.moq)),
        unitCost: Math.max(0, toNumberOrZero(mapped.unitCost)),
        rows: 1
      });
      continue;
    }

    prev.requiredBomQty += requiredRaw;
    prev.leadTimeWeeks = Math.max(prev.leadTimeWeeks, Math.max(0, toNumberOrZero(mapped.leadTimeWeeks)));
    prev.moq = Math.max(prev.moq, Math.max(0, toNumberOrZero(mapped.moq)));
    prev.unitCost = Math.max(prev.unitCost, Math.max(0, toNumberOrZero(mapped.unitCost)));
    prev.rows += 1;
    grouped.set(key, prev);
  }

  const cleaned = Array.from(grouped.values()).map((it) => ({
    ...it,
    requiredBomQty: Math.round((Number(it.requiredBomQty || 0) + Number.EPSILON) * 100) / 100
  }));

  cleaned.sort((a, b) => b.requiredBomQty - a.requiredBomQty);

  return { cleaned, dropped };
};

const buildAssetIndexes = (assets) => {
  const bySku = new Map();
  const byAssetId = new Map();
  const byName = new Map();
  const normalizedNames = [];

  for (const a of assets || []) {
    const sku = String(a?.sku || '').trim();
    const assetId = String(a?.assetId || '').trim();
    const name = String(a?.itemName || '').trim();
    if (sku) bySku.set(sku, a);
    if (assetId) byAssetId.set(assetId, a);
    const nk = normalizeTextKey(name);
    if (nk) byName.set(nk, a);
    if (nk) normalizedNames.push({ nk, asset: a });
  }

  return { bySku, byAssetId, byName, normalizedNames };
};

const matchAssetForBom = (bom, indexes) => {
  const sku = String(bom?.inventorySku || '').trim();
  const assetId = String(bom?.inventoryAssetId || '').trim();
  const invName = String(bom?.inventoryItemName || '').trim();
  const name = String(bom?.itemName || '').trim();
  const part = String(bom?.partNoDrg || '').trim();

  if (sku && indexes.bySku.has(sku)) return { asset: indexes.bySku.get(sku), match: { type: 'sku', value: sku, score: 1 } };
  if (assetId && indexes.byAssetId.has(assetId)) {
    return { asset: indexes.byAssetId.get(assetId), match: { type: 'assetId', value: assetId, score: 1 } };
  }

  const exactNameKey = normalizeTextKey(invName || name);
  if (exactNameKey && indexes.byName.has(exactNameKey)) {
    return { asset: indexes.byName.get(exactNameKey), match: { type: 'name', value: exactNameKey, score: 0.9 } };
  }

  const query = `${invName || name} ${part}`.trim();
  const tokens = tokenize(query);
  if (tokens.length === 0) return { asset: null, match: { type: 'none', value: '', score: 0 } };

  let best = null;
  let bestScore = 0;
  for (const entry of indexes.normalizedNames) {
    const hay = entry.nk;
    let score = 0;
    for (const t of tokens) if (hay.includes(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = entry.asset;
    }
  }

  const minHit = tokens.length >= 5 ? 3 : tokens.length >= 3 ? 2 : 1;
  if (best && bestScore >= minHit) {
    return {
      asset: best,
      match: {
        type: 'fuzzy',
        value: String(best?.itemName || ''),
        score: Math.round(((bestScore / Math.max(1, tokens.length)) + Number.EPSILON) * 100) / 100
      }
    };
  }

  return { asset: null, match: { type: 'none', value: '', score: 0 } };
};

const buildUsageMap = async ({ assetKeys, since }) => {
  const skus = [];
  const assetIds = [];
  for (const k of assetKeys || []) {
    if (!k) continue;
    if (k.kind === 'sku') skus.push(k.value);
    if (k.kind === 'assetId') assetIds.push(k.value);
  }

  if (skus.length === 0 && assetIds.length === 0) return new Map();

  const match = {
    timestamp: { $gte: since },
    type: 'OUT'
  };

  const or = [];
  if (skus.length > 0) or.push({ sku: { $in: skus } });
  if (assetIds.length > 0) or.push({ assetId: { $in: assetIds } });
  if (or.length > 0) match.$or = or;

  const rows = await InventoryLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          sku: '$sku',
          assetId: '$assetId'
        },
        qty: { $sum: '$quantity' }
      }
    }
  ]);

  const map = new Map();
  for (const r of rows || []) {
    const sku = String(r?._id?.sku || '').trim();
    const assetId = String(r?._id?.assetId || '').trim();
    const qty = Math.max(0, toNumberOrZero(r?.qty));
    if (sku) map.set(`sku:${sku}`, qty);
    if (assetId) map.set(`assetId:${assetId}`, qty);
  }
  return map;
};

const buildPredictions = async ({ bomItems, horizonDays = 30, lookbackDays = 90, source }) => {
  const horizon = Math.max(1, Math.min(365, Math.floor(toNumberOrZero(horizonDays) || 30)));
  const lookback = Math.max(7, Math.min(365, Math.floor(toNumberOrZero(lookbackDays) || 90)));

  const { cleaned, dropped } = groupAndCleanBom(bomItems);

  const assets = await Asset.find(
    {},
    {
      assetId: 1,
      sku: 1,
      itemName: 1,
      unit: 1,
      availableQuantity: 1,
      allocatedQuantity: 1,
      totalQuantity: 1,
      lowStockThreshold: 1,
      department: 1,
      purchaseCost: 1
    }
  ).lean();

  const indexes = buildAssetIndexes(assets);
  const matches = cleaned.map((b) => {
    const { asset, match } = matchAssetForBom(b, indexes);
    return { bom: b, asset: asset || null, match };
  });

  const keys = [];
  for (const m of matches) {
    const sku = String(m?.asset?.sku || '').trim();
    const assetId = String(m?.asset?.assetId || '').trim();
    if (sku) keys.push({ kind: 'sku', value: sku });
    if (assetId) keys.push({ kind: 'assetId', value: assetId });
  }

  const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000);
  const usageMap = await buildUsageMap({ assetKeys: keys, since });

  const rows = matches.map((m) => {
    const b = m.bom;
    const a = m.asset;

    const available = Math.max(0, toNumberOrZero(a?.availableQuantity ?? a?.totalQuantity ?? 0));
    const threshold =
      a && (a.lowStockThreshold === null || a.lowStockThreshold === undefined)
        ? 5
        : Math.max(0, toNumberOrZero(a?.lowStockThreshold ?? 0));
    const leadTimeWeeks = Math.max(0, toNumberOrZero(b?.leadTimeWeeks));
    const leadTimeDays = leadTimeWeeks > 0 ? leadTimeWeeks * 7 : 14;

    let outQty = 0;
    if (a?.sku) outQty = Math.max(outQty, toNumberOrZero(usageMap.get(`sku:${String(a.sku).trim()}`)));
    if (a?.assetId) outQty = Math.max(outQty, toNumberOrZero(usageMap.get(`assetId:${String(a.assetId).trim()}`)));
    const dailyRate = outQty > 0 ? outQty / lookback : 0;

    const requiredBomQty = Math.max(0, toNumberOrZero(b?.requiredBomQty));
    const predictedFromUsage = dailyRate * horizon;
    const predictedDemand = Math.max(0, predictedFromUsage + requiredBomQty);

    const safetyStock = Math.max(
      threshold,
      Math.ceil(dailyRate * leadTimeDays * 0.25 + Number.EPSILON)
    );

    const reorderPoint = dailyRate * leadTimeDays + safetyStock;
    const recommendedRaw = Math.ceil(predictedDemand + safetyStock - available + Number.EPSILON);
    let recommendedPurchase = Math.max(0, recommendedRaw);
    const moq = Math.max(0, toNumberOrZero(b?.moq));
    if (recommendedPurchase > 0 && moq > 0) recommendedPurchase = Math.max(moq, recommendedPurchase);

    const shortageToBom = Math.max(0, Math.ceil(requiredBomQty - available + Number.EPSILON));
    const shortageToForecast = Math.max(0, Math.ceil(predictedDemand - available + Number.EPSILON));
    const isLowStock = Boolean(a) && available <= threshold;
    const needsPurchase = Boolean(a) ? recommendedPurchase > 0 : true;

    const status =
      !a
        ? 'Unmatched'
        : available >= predictedDemand
          ? 'OK'
          : available + recommendedPurchase >= predictedDemand
            ? available <= reorderPoint
              ? 'Reorder'
              : 'Monitor'
            : 'Critical';

    const daysToStockout = dailyRate > 0 ? Math.max(0, Math.floor(available / dailyRate)) : null;

    const unitCost = Math.max(0, toNumberOrZero(b?.unitCost));
    const estimatedSpend = recommendedPurchase > 0 && unitCost > 0 ? recommendedPurchase * unitCost : 0;

    let action = '';
    if (!a) {
      action = 'Link this BOM line to an inventory asset (SKU/AssetId) or create the missing inventory item.';
    } else if (recommendedPurchase > 0) {
      action = `Raise purchase for ${recommendedPurchase}${a?.unit ? ` ${a.unit}` : ''}. Lead time ~${Math.round(leadTimeDays)} days.`;
    } else if (isLowStock) {
      action = 'Low stock: consider replenishment or rebalancing even if no immediate purchase is required for this horizon.';
    } else if (available <= reorderPoint && predictedDemand > 0) {
      action = 'Monitor closely: stock is near reorder point for the current demand rate.';
    } else {
      action = 'No purchase needed for current horizon.';
    }

    return {
      itemName: b.itemName,
      required: true,
      requiredBomQty: Math.round((requiredBomQty + Number.EPSILON) * 100) / 100,
      predictedDemandHorizon: Math.round((predictedDemand + Number.EPSILON) * 100) / 100,
      horizonDays: horizon,
      currentStock: Math.round((available + Number.EPSILON) * 100) / 100,
      safetyStock,
      reorderPoint: Math.round((reorderPoint + Number.EPSILON) * 100) / 100,
      recommendedPurchase,
      shortageToBom,
      shortageToForecast,
      isLowStock,
      needsPurchase,
      moq,
      leadTimeWeeks,
      daysToStockout,
      inventory: a
        ? {
          assetId: a.assetId,
          sku: a.sku,
          itemName: a.itemName,
          department: a.department,
          availableQuantity: a.availableQuantity,
          lowStockThreshold: a.lowStockThreshold
        }
        : null,
      match: m.match,
      estimatedSpend: Math.round((estimatedSpend + Number.EPSILON) * 100) / 100,
      status,
      action
    };
  });

  const severity = (s) => {
    if (s === 'Critical') return 4;
    if (s === 'Reorder') return 3;
    if (s === 'Monitor') return 2;
    if (s === 'Unmatched') return 1;
    return 0;
  };

  rows.sort((a, b) => {
    const ds = severity(b.status) - severity(a.status);
    if (ds !== 0) return ds;
    const dp = (b.recommendedPurchase || 0) - (a.recommendedPurchase || 0);
    if (dp !== 0) return dp;
    return String(a.itemName || '').localeCompare(String(b.itemName || ''));
  });

  const summary = {
    source: source || { type: 'unknown' },
    generatedAt: new Date().toISOString(),
    horizonDays: horizon,
    lookbackDays: lookback,
    inputRows: Array.isArray(bomItems) ? bomItems.length : 0,
    cleanedRows: cleaned.length,
    droppedRows: dropped,
    requiredItems: rows.length,
    unmatchedItems: rows.filter((r) => r.status === 'Unmatched').length,
    lowStockItems: rows.filter((r) => r.isLowStock).length,
    criticalItems: rows.filter((r) => r.status === 'Critical').length,
    reorderItems: rows.filter((r) => r.status === 'Reorder').length,
    purchaseItems: rows.filter((r) => r.recommendedPurchase > 0 || r.status === 'Unmatched').length,
    estimatedSpend: Math.round((rows.reduce((sum, r) => sum + (toNumberOrZero(r.estimatedSpend) || 0), 0) + Number.EPSILON) * 100) / 100
  };

  return { rows, summary };
};

router.get('/bom', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { projectId, horizonDays, lookbackDays } = req.query || {};
    if (!projectId) return res.status(400).json({ message: 'projectId is required' });

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { rows, summary } = await buildPredictions({
      bomItems: project.bomItems || [],
      horizonDays,
      lookbackDays,
      source: { type: 'project', projectId: String(project._id), projectCode: project.code || '' }
    });

    res.json({ rows, summary });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build BOM predictions', error: error.message });
  }
});

router.post('/bom/rows', authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  try {
    const { rows: incomingRows, horizonDays, lookbackDays, fileName } = req.body || {};
    if (!Array.isArray(incomingRows)) return res.status(400).json({ message: 'rows must be an array' });

    const { rows, summary } = await buildPredictions({
      bomItems: incomingRows,
      horizonDays,
      lookbackDays,
      source: { type: 'upload', fileName: String(fileName || '').trim() }
    });

    res.json({ rows, summary });
  } catch (error) {
    res.status(500).json({ message: 'Failed to build BOM predictions from rows', error: error.message });
  }
});

module.exports = router;
