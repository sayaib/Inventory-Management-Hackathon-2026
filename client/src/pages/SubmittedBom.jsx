import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const normalizeDepartment = (department) => {
  const next = typeof department === 'string' ? department.trim() : '';
  return next || 'Unassigned';
};

const toNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-9) return String(rounded);
  return n.toFixed(2);
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
};

const computeDerived = ({ qtyPerBoard, boardReq, spareQty, unitCost, additionalCost }) => {
  const qpb = Math.max(0, toNumberOrZero(qtyPerBoard));
  const br = Math.max(0, toNumberOrZero(boardReq));
  const sq = Math.max(0, toNumberOrZero(spareQty));
  const boardReqWithSpare = Math.max(0, br + sq);
  const totalQtyWithSpare = Math.max(0, qpb * boardReqWithSpare);

  const uc = Math.max(0, toNumberOrZero(unitCost));
  const ac = Math.max(0, toNumberOrZero(additionalCost));
  const landingCostPerUnit = Math.max(0, uc + ac);
  const totalPrice = Math.max(0, landingCostPerUnit * totalQtyWithSpare);

  return {
    boardReqWithSpare,
    totalQtyWithSpare,
    landingCostPerUnit,
    totalPrice
  };
};

const getUtilizationMeta = ({ hasLink, plannedQty, usedQty }) => {
  const planned = Math.max(0, toNumberOrZero(plannedQty));
  const used = Math.max(0, toNumberOrZero(usedQty));

  if (!hasLink) {
    return {
      label: 'Not linked',
      className: 'bg-gray-50 text-gray-700 border-gray-200'
    };
  }

  if (planned <= 0) {
    return {
      label: 'No plan',
      className: 'bg-slate-50 text-slate-700 border-slate-200'
    };
  }

  if (used <= 0) {
    return {
      label: 'Not utilized',
      className: 'bg-gray-50 text-gray-700 border-gray-200'
    };
  }

  if (used < planned) {
    return {
      label: 'Partially utilized',
      className: 'bg-muted-50 text-muted-800 border-muted-200'
    };
  }

  if (used === planned) {
    return {
      label: 'Fully utilized',
      className: 'bg-primary-50 text-primary-700 border-primary-100'
    };
  }

  return {
    label: 'Over utilized',
    className: 'bg-accent-50 text-accent-700 border-accent-100'
  };
};

const SubmittedBom = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [rowPlans, setRowPlans] = useState({});
  const [projectSummaries, setProjectSummaries] = useState({});
  const [activePickerKey, setActivePickerKey] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [assetSuggestions, setAssetSuggestions] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 320 });
  const pickerRef = useRef(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.get('/projects');
      const list = (res.data.projects || []).filter((p) => (p.bomItems || []).length > 0);
      setProjects(list);
      setProjectSummaries({});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const isInventoryManager = user?.role === ROLES.INVENTORY_MANAGER;
  const userDept = normalizeDepartment(user?.profile?.department);
  const lockDepartment = isProjectManager && userDept !== 'Unassigned';

  useEffect(() => {
    if (!lockDepartment) return;
    setDepartmentFilter(userDept);
  }, [lockDepartment, userDept]);

  useEffect(() => {
    if (!activePickerKey) return;
    const term = String(activeSearchTerm || '').trim();
    const handler = setTimeout(async () => {
      setLoadingAssets(true);
      try {
        const res = await api.get('/inventory', {
          params: {
            page: 1,
            limit: 10,
            search: term || undefined
          }
        });
        setAssetSuggestions(res.data?.assets || []);
      } catch {
        setAssetSuggestions([]);
      } finally {
        setLoadingAssets(false);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [activePickerKey, activeSearchTerm]);

  const updatePickerPosition = useCallback((key) => {
    if (!key) return;
    const el = document.querySelector(`[data-picker-key="${key}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPickerPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    });
  }, []);

  const openPicker = useCallback((key, term, targetEl) => {
    if (!key || !targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    setPickerPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    });
    setActivePickerKey(key);
    setActiveSearchTerm(term);
  }, []);

  useEffect(() => {
    if (!activePickerKey) return;
    updatePickerPosition(activePickerKey);
    const handler = () => updatePickerPosition(activePickerKey);
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [activePickerKey, updatePickerPosition]);

  useEffect(() => {
    if (!activePickerKey) return;
    const onMouseDown = (e) => {
      const dropdownEl = pickerRef.current;
      const isInDropdown = dropdownEl ? dropdownEl.contains(e.target) : false;
      const isInInput = e.target.closest?.(`[data-picker-key="${activePickerKey}"]`);
      if (!isInDropdown && !isInInput) {
        setActivePickerKey('');
        setAssetSuggestions([]);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [activePickerKey]);

  const departments = useMemo(() => {
    const set = new Set();
    for (const p of projects) set.add(normalizeDepartment(p.department));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of projects) {
      const dept = normalizeDepartment(p.department);
      if (departmentFilter !== 'all' && dept !== departmentFilter) continue;
      const list = map.get(dept) || [];
      list.push(p);
      map.set(dept, list);
    }
    for (const [dept, list] of map.entries()) {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      map.set(dept, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [projects, departmentFilter]);

  const fetchProjectSummary = useCallback(async (projectId) => {
    if (!projectId) return;
    setProjectSummaries((prev) => {
      const existing = prev[projectId];
      if (existing?.loading) return prev;
      return {
        ...prev,
        [projectId]: {
          ...(existing || {}),
          loaded: Boolean(existing?.loaded),
          loading: true,
          error: ''
        }
      };
    });
    try {
      const res = await api.get(`/projects/${projectId}/summary`);
      setProjectSummaries((prev) => ({
        ...prev,
        [projectId]: {
          loaded: true,
          loading: false,
          error: '',
          materials: res.data?.materials || []
        }
      }));
    } catch (err) {
      setProjectSummaries((prev) => ({
        ...prev,
        [projectId]: {
          loaded: false,
          loading: false,
          error: err.response?.data?.message || 'Failed to fetch utilization',
          materials: []
        }
      }));
    }
  }, []);

  const toggleExpanded = (id) => {
    setExpandedProjects((prev) => {
      const next = !prev[id];
      if (next && !projectSummaries[id]?.loaded && !projectSummaries[id]?.loading) {
        fetchProjectSummary(id);
      }
      return { ...prev, [id]: next };
    });
  };

  const getRowKey = (projectId, bomItemIdOrIndex) => `${projectId}-${bomItemIdOrIndex}`;

  const updateRowPlan = (rowKey, patch) => {
    setRowPlans((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] || {}), ...patch }
    }));
  };

  const handlePickAsset = (rowKey, asset) => {
    updateRowPlan(rowKey, {
      selectedAsset: asset,
      query: asset ? `${asset.itemName} (${asset.sku || asset.assetId || ''})` : ''
    });
    setActivePickerKey('');
    setAssetSuggestions([]);
  };

  const handleSavePlanned = async (projectId, rowIndex, bomItem) => {
    const rowKey = getRowKey(projectId, bomItem?._id || rowIndex);
    const plan = rowPlans[rowKey] || {};
    const selectedAsset = plan.selectedAsset;
    const plannedQty = Math.max(0, toNumberOrZero(plan.plannedQty ?? bomItem?.plannedQty ?? bomItem?.totalQtyWithSpare ?? 0));
    const leadTimeWeeks = Math.max(0, toNumberOrZero(plan.leadTimeWeeks ?? bomItem?.leadTimeWeeks ?? bomItem?.leadTime ?? 0));
    const remarks = String(plan.remarks ?? bomItem?.remarks ?? '');

    const typeOfComponent = String(plan.typeOfComponent ?? bomItem?.typeOfComponent ?? '');
    const srNo = Math.max(0, toNumberOrZero(plan.srNo ?? bomItem?.srNo ?? 0));
    const supplierName = String(plan.supplierName ?? bomItem?.supplierName ?? '');
    const nomenclatureDescription = String(plan.nomenclatureDescription ?? bomItem?.nomenclatureDescription ?? '');
    const partNoDrg = String(plan.partNoDrg ?? bomItem?.partNoDrg ?? '');
    const make = String(plan.make ?? bomItem?.make ?? '');
    const qtyPerBoard = Math.max(0, toNumberOrZero(plan.qtyPerBoard ?? bomItem?.qtyPerBoard ?? 0));
    const boardReq = Math.max(0, toNumberOrZero(plan.boardReq ?? bomItem?.boardReq ?? 0));
    const spareQty = Math.max(0, toNumberOrZero(plan.spareQty ?? bomItem?.spareQty ?? 0));
    const unitCost = Math.max(0, toNumberOrZero(plan.unitCost ?? bomItem?.unitCost ?? 0));
    const additionalCost = Math.max(0, toNumberOrZero(plan.additionalCost ?? bomItem?.additionalCost ?? 0));
    const moq = Math.max(0, toNumberOrZero(plan.moq ?? bomItem?.moq ?? 0));

    const previousAssetIdOrSku = String(bomItem?.inventoryAssetId || bomItem?.inventorySku || '');
    const fallbackAssetId = String(plan.inventoryAssetId ?? bomItem?.inventoryAssetId ?? '');
    const fallbackSku = String(plan.inventorySku ?? bomItem?.inventorySku ?? '');
    const fallbackItemName = String(plan.inventoryItemName ?? bomItem?.inventoryItemName ?? '');

    const inventoryAssetId = String(selectedAsset?.assetId || fallbackAssetId || '');
    const inventorySku = String(selectedAsset?.sku || fallbackSku || '');
    const inventoryItemName = String(selectedAsset?.itemName || fallbackItemName || '');
    const assetIdOrSku = String(inventoryAssetId || inventorySku || '');

    if (!bomItem?._id) {
      setError('BOM item id missing');
      return;
    }
    updateRowPlan(rowKey, { saving: true });
    setError('');
    setSuccess('');
    try {
      const payload = {
        remarks,
        leadTimeWeeks,
        plannedQty,
        inventoryAssetId,
        inventorySku,
        inventoryItemName
      };
      if (isInventoryManager) {
        Object.assign(payload, {
          typeOfComponent,
          srNo,
          supplierName,
          nomenclatureDescription,
          partNoDrg,
          make,
          qtyPerBoard,
          boardReq,
          spareQty,
          unitCost,
          additionalCost,
          moq
        });
      }

      const bomUpdateRes = await api.put(`/projects/${projectId}/bom/${bomItem._id}`, payload);
      try {
        if (assetIdOrSku) {
          await api.post(`/projects/${projectId}/materials/upsert`, { assetIdOrSku, plannedQuantity: plannedQty });
          const sameAsPrev =
            previousAssetIdOrSku
            && (previousAssetIdOrSku === selectedAsset?.assetId || previousAssetIdOrSku === selectedAsset?.sku || previousAssetIdOrSku === assetIdOrSku);
          if (previousAssetIdOrSku && !sameAsPrev) {
            await api.post(`/projects/${projectId}/materials/upsert`, { assetIdOrSku: previousAssetIdOrSku, plannedQuantity: 0 });
          }
        }
      } catch (err) {
        void err;
      }
      const updatedBomItem = bomUpdateRes.data?.bomItem;
      const optimistic = {
        ...(bomItem || {}),
        remarks,
        leadTimeWeeks,
        plannedQty,
        inventoryAssetId,
        inventorySku,
        inventoryItemName,
        ...(isInventoryManager
          ? {
            typeOfComponent,
            srNo,
            supplierName,
            nomenclatureDescription,
            partNoDrg,
            make,
            qtyPerBoard,
            boardReq,
            spareQty,
            unitCost,
            additionalCost,
            moq
          }
          : {})
      };
      const nextBomItem = updatedBomItem || optimistic;
      setProjects((prev) =>
        prev.map((p) => {
          if (p._id !== projectId) return p;
          return {
            ...p,
            bomItems: (p.bomItems || []).map((bi) => (String(bi._id) === String(nextBomItem._id) ? nextBomItem : bi))
          };
        })
      );
      updateRowPlan(rowKey, {
        saving: false,
        savedAt: new Date().toISOString(),
        isEditing: false,
        selectedAsset: null,
        query: '',
        lastSaved: {
          ...(isInventoryManager
            ? {
              typeOfComponent,
              srNo,
              supplierName,
              nomenclatureDescription,
              partNoDrg,
              make,
              qtyPerBoard,
              boardReq,
              spareQty,
              unitCost,
              additionalCost,
              moq
            }
            : {}),
          inventoryAssetId,
          inventorySku,
          inventoryItemName,
          plannedQty,
          leadTimeWeeks,
          remarks
        }
      });
      setSuccess(isInventoryManager ? 'Saved BOM row' : 'Saved planned inventory for BOM row');
    } catch (err) {
      updateRowPlan(rowKey, { saving: false });
      setError(err.response?.data?.message || (isInventoryManager ? 'Failed to save BOM row' : 'Failed to save planned inventory'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <img
                  src={APP_LOGO_URL}
                  alt="Optimized Solutions Ltd"
                  className="h-6 w-6 rounded bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Submitted BOM</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all duration-200 font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <Link
                to="/bom"
                className="text-gray-500 hover:text-primary transition-all duration-200 font-medium text-sm"
              >
                BOM Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {(error || success) && (
          <div className="space-y-2">
            {error && (
              <div className="bg-accent-50 border border-accent-100 text-accent-700 px-4 py-3 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-primary-50 border border-primary-100 text-primary-700 px-4 py-3 rounded-xl text-sm font-bold">
                {success}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-gray-900">Projects by Department</div>
              <div className="text-xs text-gray-500">Shows projects with submitted BOM items.</div>
            </div>
            <div className="flex items-center gap-2">
              {lockDepartment ? (
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-extrabold text-gray-700">
                  {userDept}
                </div>
              ) : (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={fetchProjects}
                className="px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-6">Loading…</div>
          ) : grouped.length === 0 ? (
            <div className="text-sm text-gray-500 py-6">No submitted BOMs found.</div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([dept, list]) => {
                const totalItems = list.reduce((acc, p) => acc + (p.bomItems?.length || 0), 0);
                return (
                  <div key={dept} className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="text-sm font-extrabold text-gray-900">{dept}</div>
                      <div className="text-xs font-black text-gray-500">
                        {list.length} projects • {totalItems} BOM items
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {list.map((p) => {
                        const summary = projectSummaries[p._id] || {};
                        const summaryLoading = Boolean(summary.loading);
                        const summaryError = String(summary.error || '');
                        const materials = Array.isArray(summary.materials) ? summary.materials : [];
                        const byAssetId = new Map();
                        const bySku = new Map();
                        for (const m of materials) {
                          const assetId = String(m?.assetId || '');
                          const sku = String(m?.sku || '');
                          if (assetId) byAssetId.set(assetId, m);
                          if (sku && !bySku.has(sku)) bySku.set(sku, m);
                        }

                        return (
                        <div key={p._id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-extrabold text-gray-900">{p.name}</div>
                              <div className="text-[11px] text-gray-500 font-bold">{p.code}</div>
                              <div className="text-[11px] text-gray-500 font-bold mt-0.5">
                                BOM items: {p.bomItems?.length || 0}
                              </div>
                              {p.description ? (
                                <div className="text-xs text-gray-600 mt-1">{p.description}</div>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(p._id)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-700"
                              >
                                {expandedProjects[p._id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {expandedProjects[p._id] ? 'Hide BOM' : 'View BOM'}
                              </button>
                            </div>
                          </div>

                          {expandedProjects[p._id] && (p.bomItems?.length || 0) > 0 ? (
                            <div className="mt-3 overflow-auto border border-gray-200 rounded-xl">
                              <table className="min-w-[1950px] w-full text-[11px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr className="text-[11px] font-black text-gray-700">
                                    <th className="px-2 py-2 text-left">Type of Component</th>
                                    <th className="px-2 py-2 text-left">Sr. No.</th>
                                    <th className="px-2 py-2 text-left">Supplier</th>
                                    <th className="px-2 py-2 text-left">Nomenclature / Description</th>
                                    <th className="px-2 py-2 text-left">Part No. / Drg.</th>
                                    <th className="px-2 py-2 text-left">Make</th>
                                    <th className="px-2 py-2 text-left">Qty/Board</th>
                                    <th className="px-2 py-2 text-left">Board Req</th>
                                    <th className="px-2 py-2 text-left">Spare qty</th>
                                    <th className="px-2 py-2 text-left">Board Req+Spare</th>
                                    <th className="px-2 py-2 text-left">Total Qty+Spare</th>
                                    <th className="px-2 py-2 text-left">Unit cost</th>
                                    <th className="px-2 py-2 text-left">Addl. cost</th>
                                    <th className="px-2 py-2 text-left">Landing/unit</th>
                                    <th className="px-2 py-2 text-left">Total price</th>
                                    <th className="px-2 py-2 text-left">MOQ</th>
                                    <th className="px-2 py-2 text-left">Lead time (weeks)</th>
                                    <th className="px-2 py-2 text-left">Remarks</th>
                                    <th className="px-2 py-2 text-left">Inventory (search)</th>
                                    <th className="px-2 py-2 text-left">Planned qty</th>
                                    <th className="px-2 py-2 text-left">Utilization</th>
                                    <th className="px-2 py-2 text-left">Save</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(p.bomItems || []).map((b, i) => {
                                    const rowKey = getRowKey(p._id, b?._id || i);
                                    const plan = rowPlans[rowKey] || {};
                                    const queryValue = plan.query ?? '';
                                    const effectivePlannedQty = toNumberOrZero(plan.plannedQty ?? b.plannedQty ?? plan.lastSaved?.plannedQty ?? b.totalQtyWithSpare ?? 0);
                                    const plannedQtyValue = String(plan.plannedQty ?? b.plannedQty ?? plan.lastSaved?.plannedQty ?? b.totalQtyWithSpare ?? '');
                                    const selectedAsset = plan.selectedAsset;
                                    const saving = Boolean(plan.saving);
                                    const leadTimeWeeksValue = String(plan.leadTimeWeeks ?? b.leadTimeWeeks ?? plan.lastSaved?.leadTimeWeeks ?? toNumberOrZero(b.leadTime) ?? '');
                                    const remarksValue = String(plan.remarks ?? b.remarks ?? plan.lastSaved?.remarks ?? '');
                                    const typeOfComponentValue = String(plan.typeOfComponent ?? b.typeOfComponent ?? '');
                                    const srNoValue = String(plan.srNo ?? b.srNo ?? '');
                                    const supplierValue = String(plan.supplierName ?? b.supplierName ?? '');
                                    const descriptionValue = String(plan.nomenclatureDescription ?? b.nomenclatureDescription ?? '');
                                    const partNoValue = String(plan.partNoDrg ?? b.partNoDrg ?? '');
                                    const makeValue = String(plan.make ?? b.make ?? '');
                                    const qtyPerBoardValue = String(plan.qtyPerBoard ?? b.qtyPerBoard ?? '');
                                    const boardReqValue = String(plan.boardReq ?? b.boardReq ?? '');
                                    const spareQtyValue = String(plan.spareQty ?? b.spareQty ?? '');
                                    const unitCostValue = String(plan.unitCost ?? b.unitCost ?? '');
                                    const additionalCostValue = String(plan.additionalCost ?? b.additionalCost ?? '');
                                    const moqValue = String(plan.moq ?? b.moq ?? '');

                                    const derived = computeDerived({
                                      qtyPerBoard: plan.qtyPerBoard ?? b.qtyPerBoard,
                                      boardReq: plan.boardReq ?? b.boardReq,
                                      spareQty: plan.spareQty ?? b.spareQty,
                                      unitCost: plan.unitCost ?? b.unitCost,
                                      additionalCost: plan.additionalCost ?? b.additionalCost
                                    });
                                    const effectiveInventoryLabel =
                                      b.inventoryItemName ||
                                      plan.lastSaved?.inventoryItemName ||
                                      b.inventoryAssetId ||
                                      plan.lastSaved?.inventoryAssetId ||
                                      b.inventorySku ||
                                      plan.lastSaved?.inventorySku ||
                                      '';
                                    const selectedAssetIdOrSku = selectedAsset?.assetId || selectedAsset?.sku || '';
                                    const selectedAssetLabel = selectedAsset
                                      ? `${selectedAsset.itemName || selectedAssetIdOrSku}${selectedAsset.itemName && selectedAssetIdOrSku ? ` (${selectedAssetIdOrSku})` : ''}`
                                      : '';
                                    const displayInventoryLabel =
                                      selectedAssetLabel ||
                                      effectiveInventoryLabel ||
                                      '-';
                                    const displayPlannedQty =
                                      plan.plannedQty ??
                                      b.plannedQty ??
                                      plan.lastSaved?.plannedQty ??
                                      '';
                                    const isSaved = Boolean(b.inventoryAssetId || b.inventorySku || plan.lastSaved?.inventoryAssetId || plan.lastSaved?.inventorySku) && effectivePlannedQty > 0;
                                    const isEditing = isInventoryManager ? Boolean(plan.isEditing) : (Boolean(plan.isEditing) || !isSaved);

                                    const utilizationAssetId = String(selectedAsset?.assetId || b.inventoryAssetId || plan.lastSaved?.inventoryAssetId || '');
                                    const utilizationSku = String(selectedAsset?.sku || b.inventorySku || plan.lastSaved?.inventorySku || '');
                                    const hasLink = Boolean(utilizationAssetId || utilizationSku);
                                    const match = (utilizationAssetId && byAssetId.get(utilizationAssetId)) || (utilizationSku && bySku.get(utilizationSku)) || null;
                                    const usedQty = toNumberOrZero(match?.usedQuantity ?? 0);
                                    const meta = getUtilizationMeta({ hasLink, plannedQty: effectivePlannedQty, usedQty });
                                    return (
                                      <tr key={`${p._id}-${i}`} className="align-top">
                                      <td className="px-2 py-2 min-w-[180px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={typeOfComponentValue}
                                            onChange={(e) => updateRowPlan(rowKey, { typeOfComponent: e.target.value })}
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.typeOfComponent
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={srNoValue}
                                            onChange={(e) => updateRowPlan(rowKey, { srNo: e.target.value })}
                                            inputMode="numeric"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.srNo
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[200px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={supplierValue}
                                            onChange={(e) => updateRowPlan(rowKey, { supplierName: e.target.value })}
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.supplierName
                                        )}
                                      </td>
                                      <td className="px-2 py-2">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={descriptionValue}
                                            onChange={(e) => updateRowPlan(rowKey, { nomenclatureDescription: e.target.value })}
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          <div>{b.nomenclatureDescription}</div>
                                        )}
                                        <div className="mt-0.5 text-[10px] text-gray-500 font-bold">
                                          Inventory: {displayInventoryLabel} • Planned: {String(displayPlannedQty || '-') }
                                        </div>
                                      </td>
                                      <td className="px-2 py-2 min-w-[190px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={partNoValue}
                                            onChange={(e) => updateRowPlan(rowKey, { partNoDrg: e.target.value })}
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.partNoDrg
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[160px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={makeValue}
                                            onChange={(e) => updateRowPlan(rowKey, { make: e.target.value })}
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.make
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={qtyPerBoardValue}
                                            onChange={(e) => updateRowPlan(rowKey, { qtyPerBoard: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.qtyPerBoard
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={boardReqValue}
                                            onChange={(e) => updateRowPlan(rowKey, { boardReq: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.boardReq
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={spareQtyValue}
                                            onChange={(e) => updateRowPlan(rowKey, { spareQty: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.spareQty
                                        )}
                                      </td>
                                      <td className="px-2 py-2">{isEditing && isInventoryManager ? formatQty(derived.boardReqWithSpare) : b.boardReqWithSpare}</td>
                                      <td className="px-2 py-2">{isEditing && isInventoryManager ? formatQty(derived.totalQtyWithSpare) : b.totalQtyWithSpare}</td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={unitCostValue}
                                            onChange={(e) => updateRowPlan(rowKey, { unitCost: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.unitCost
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={additionalCostValue}
                                            onChange={(e) => updateRowPlan(rowKey, { additionalCost: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.additionalCost
                                        )}
                                      </td>
                                      <td className="px-2 py-2">{isEditing && isInventoryManager ? formatMoney(derived.landingCostPerUnit) : b.landingCostPerUnit}</td>
                                      <td className="px-2 py-2">{isEditing && isInventoryManager ? formatMoney(derived.totalPrice) : b.totalPrice}</td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing && isInventoryManager ? (
                                          <input
                                            value={moqValue}
                                            onChange={(e) => updateRowPlan(rowKey, { moq: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          b.moq
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[140px]">
                                        {isEditing ? (
                                          <input
                                            value={leadTimeWeeksValue}
                                            onChange={(e) => updateRowPlan(rowKey, { leadTimeWeeks: e.target.value })}
                                            inputMode="numeric"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          <div className="text-xs font-bold text-gray-800">{b.leadTimeWeeks ?? 0}</div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[220px]">
                                        {isEditing ? (
                                          <input
                                            value={remarksValue}
                                            onChange={(e) => updateRowPlan(rowKey, { remarks: e.target.value })}
                                              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          <div className="text-xs font-bold text-gray-800">{b.remarks || '-'}</div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[320px]">
                                        {isEditing ? (
                                          <div>
                                            <input
                                              data-picker-key={rowKey}
                                              value={queryValue}
                                              onChange={(e) => {
                                                const next = e.target.value;
                                                updateRowPlan(rowKey, { query: next, selectedAsset: null });
                                                openPicker(rowKey, next, e.currentTarget);
                                              }}
                                              onFocus={(e) => {
                                                openPicker(rowKey, queryValue, e.currentTarget);
                                              }}
                                              placeholder="Search inventory by name / assetId / sku"
                                              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                            />
                                            {selectedAsset ? (
                                              <div className="mt-1 text-[11px] text-gray-500 font-bold">
                                                Selected: {selectedAssetLabel} • Avl: {selectedAsset.availableQuantity}
                                              </div>
                                            ) : null}
                                            {!selectedAsset && effectiveInventoryLabel ? (
                                              <div className="mt-1 text-[11px] text-gray-500 font-bold">
                                                Saved: {effectiveInventoryLabel}
                                              </div>
                                            ) : null}
                                          </div>
                                        ) : (
                                          <div className="text-xs font-bold text-gray-800">{effectiveInventoryLabel || '-'}</div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing ? (
                                          <input
                                            value={plannedQtyValue}
                                            onChange={(e) => updateRowPlan(rowKey, { plannedQty: e.target.value })}
                                            inputMode="decimal"
                                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold"
                                          />
                                        ) : (
                                          <div className="text-xs font-bold text-gray-800">{b.plannedQty ?? plan.lastSaved?.plannedQty ?? 0}</div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[170px]">
                                        {summaryLoading ? (
                                          <div className="text-[11px] font-bold text-gray-500">Loading…</div>
                                        ) : summaryError ? (
                                          <div className="text-[11px] font-bold text-red-600">{summaryError}</div>
                                        ) : (
                                          <div className="space-y-1">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-black ${meta.className}`}>
                                              {meta.label}
                                            </span>
                                            {hasLink ? (
                                              <div className="text-[10px] text-gray-500 font-bold">
                                                Used {formatQty(usedQty)} / {formatQty(effectivePlannedQty || 0)}
                                              </div>
                                            ) : (
                                              <div className="text-[10px] text-gray-400 font-bold">—</div>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 min-w-[120px]">
                                        {isEditing ? (
                                          <button
                                            type="button"
                                            onClick={() => handleSavePlanned(p._id, i, b)}
                                            disabled={saving}
                                            className="px-3 py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary-700 transition-all disabled:opacity-50"
                                          >
                                            {saving ? 'Saving…' : (isSaved ? 'Update' : 'Save')}
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => updateRowPlan(rowKey, {
                                              isEditing: true,
                                              ...(isInventoryManager
                                                ? {
                                                  typeOfComponent: b.typeOfComponent ?? '',
                                                  srNo: b.srNo ?? 0,
                                                  supplierName: b.supplierName ?? '',
                                                  nomenclatureDescription: b.nomenclatureDescription ?? '',
                                                  partNoDrg: b.partNoDrg ?? '',
                                                  make: b.make ?? '',
                                                  qtyPerBoard: b.qtyPerBoard ?? 0,
                                                  boardReq: b.boardReq ?? 0,
                                                  spareQty: b.spareQty ?? 0,
                                                  unitCost: b.unitCost ?? 0,
                                                  additionalCost: b.additionalCost ?? 0,
                                                  moq: b.moq ?? 0,
                                                  inventoryAssetId: b.inventoryAssetId ?? '',
                                                  inventorySku: b.inventorySku ?? '',
                                                  inventoryItemName: b.inventoryItemName ?? ''
                                                }
                                                : {}),
                                              leadTimeWeeks: b.leadTimeWeeks ?? plan.lastSaved?.leadTimeWeeks ?? 0,
                                              remarks: b.remarks ?? plan.lastSaved?.remarks ?? '',
                                              plannedQty: b.plannedQty ?? plan.lastSaved?.plannedQty ?? b.totalQtyWithSpare ?? 0,
                                              query: b.inventoryItemName
                                                ? `${b.inventoryItemName}${b.inventorySku || b.inventoryAssetId ? ` (${b.inventorySku || b.inventoryAssetId})` : ''}`
                                                : (b.inventorySku || b.inventoryAssetId || '')
                                            })}
                                            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-all"
                                          >
                                            Edit
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                        </div>
                      );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {activePickerKey ? (
        <div
          ref={pickerRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto"
          style={{ top: pickerPos.top, left: pickerPos.left, width: pickerPos.width }}
        >
          {loadingAssets ? (
            <div className="px-3 py-2 text-xs text-gray-500 font-bold">Searching…</div>
          ) : assetSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500 font-bold">No inventory items</div>
          ) : (
            assetSuggestions.map((a) => (
              <button
                key={a._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePickAsset(activePickerKey, a)}
                className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-all"
              >
                <div className="text-xs font-extrabold text-gray-900">{a.itemName}</div>
                <div className="text-[11px] text-gray-500 font-bold">
                  {a.assetId} • {a.sku} • Avl: {a.availableQuantity}
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SubmittedBom;
