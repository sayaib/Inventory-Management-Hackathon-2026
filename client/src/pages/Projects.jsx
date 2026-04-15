import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PlusCircle, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const normalizeDepartment = (department) => {
  const next = typeof department === 'string' ? department.trim() : '';
  return next || 'Unassigned';
};

const formatMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toFixed(2);
};

const isInventoryManagerEdited = (bomItem, field) => {
  const list = bomItem?.inventoryManagerEditedFields;
  return Array.isArray(list) && list.includes(field);
};

const cellClass = (bomItem, field) => (
  `px-2 py-2 ${isInventoryManagerEdited(bomItem, field) ? 'bg-yellow-50' : ''}`
);

const Projects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryMaterials, setSummaryMaterials] = useState([]);
  const [utilizeLoading, setUtilizeLoading] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showBom, setShowBom] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);

  const [createForm, setCreateForm] = useState({ iwoNo: '', name: '', description: '', department: '' });

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError('');
    try {
      const res = await api.get('/projects');
      const list = res.data.projects || [];
      setProjects(list);
      const allowed = selectedProjectId && list.some((p) => p._id === selectedProjectId);
      if (!allowed && list.length > 0) {
        setSelectedProjectId(list[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchProjectSummary = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingSummary(true);
    try {
      const res = await api.get(`/projects/${selectedProjectId}/summary`);
      setSummaryMaterials(res.data?.materials || []);
    } catch {
      setSummaryMaterials([]);
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchProjectSummary();
  }, [fetchProjectSummary, selectedProjectId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/projects', createForm);
      const created = res.data.project;
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created._id);
      setCreateForm({ iwoNo: '', name: '', description: '', department: '' });
      setSuccess('Project created');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };
  const canCreateProject = [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.SALES_HEAD].includes(user?.role);
  const isSalesHead = user?.role === ROLES.SALES_HEAD;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const userDept = normalizeDepartment(user?.profile?.department);
  const lockDepartment = isProjectManager && userDept !== 'Unassigned';

  useEffect(() => {
    if (!lockDepartment) return;
    setDepartmentFilter(userDept);
  }, [lockDepartment, userDept]);

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

  const selectedProject = useMemo(() => projects.find((p) => p._id === selectedProjectId) || null, [projects, selectedProjectId]);

  const selectedProjectDept = normalizeDepartment(selectedProject?.department);
  const selectedProjectMaterials = (selectedProject?.materials || [])
    .slice()
    .sort((a, b) => Number(b.allocatedQuantity || 0) - Number(a.allocatedQuantity || 0));
  const selectedProjectBom = (selectedProject?.bomItems || [])
    .slice()
    .sort((a, b) => Number(a.srNo || 0) - Number(b.srNo || 0));

  const summaryByAssetId = useMemo(() => {
    const map = new Map();
    for (const row of summaryMaterials || []) {
      if (row?.assetId) map.set(row.assetId, row);
    }
    return map;
  }, [summaryMaterials]);

  const canUtilize = [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.PROJECT_MANAGER].includes(user?.role);

  const buildRowKey = useCallback((material) => {
    const parts = [
      String(material?.assetId || ''),
      String(material?.sku || ''),
      String(material?.itemName || '')
    ].filter(Boolean);
    return parts.join('|') || 'row';
  }, []);

  const handleUtilize = useCallback(async (material, quantityOverride) => {
    if (!selectedProject) return;
    const qty = Number(quantityOverride ?? material?.allocatedQuantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const key = buildRowKey(material);
    setUtilizeLoading((prev) => ({ ...prev, [key]: true }));
    setError('');
    setSuccess('');
    try {
      await api.post('/inventory/update-stock', {
        sku: material?.sku || material?.assetId,
        quantityChange: qty,
        type: 'OUT',
        projectId: selectedProject._id,
        reason: 'CONSUMPTION',
        notes: `Utilized from Allocated Materials for ${selectedProject.code}`
      });
      setSuccess('Marked as utilized and reduced from inventory');
      await fetchProjects();
      await fetchProjectSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as utilized');
    } finally {
      setUtilizeLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, [buildRowKey, fetchProjectSummary, fetchProjects, selectedProject]);

  const handleUndoUtilize = useCallback(async (material) => {
    if (!selectedProject) return;
    const summary = summaryByAssetId.get(material?.assetId);
    const used = Number(summary?.usedQuantity ?? 0);
    if (!Number.isFinite(used) || used <= 0) return;

    const key = buildRowKey(material);
    setUtilizeLoading((prev) => ({ ...prev, [key]: true }));
    setError('');
    setSuccess('');
    try {
      await api.post('/inventory/undo-utilization', {
        projectId: selectedProject._id,
        assetIdOrSku: material?.assetId || material?.sku,
        quantity: used
      });
      setSuccess('Undo utilization completed');
      await fetchProjects();
      await fetchProjectSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to undo utilization');
    } finally {
      setUtilizeLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, [buildRowKey, fetchProjectSummary, fetchProjects, selectedProject, summaryByAssetId]);

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
              <span className="text-xl font-bold text-gray-900 tracking-tight">Projects</span>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all duration-200 font-medium text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {canCreateProject && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                Create Project
              </h2>
              <form className="space-y-3" onSubmit={handleCreateProject}>
                <input
                  value={createForm.iwoNo}
                  onChange={(e) => setCreateForm((p) => ({ ...p, iwoNo: e.target.value }))}
                  placeholder="IWO No (e.g. IWO-001)"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <select
                  value={createForm.department}
                  onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  required={isSalesHead}
                >
                  <option value="" disabled>
                    {isSalesHead ? 'Select Department (required)' : 'Select Department'}
                  </option>
                  <option value="IT">IT</option>
                  <option value="IoT">IoT</option>
                  <option value="PES">PES</option>
                  <option value="ATE">ATE</option>
                  <option value="DTMA">DTMA</option>
                </select>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-base font-extrabold text-gray-900">Projects by Department</div>
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
                  disabled={loadingProjects}
                >
                  Refresh
                </button>
              </div>
            </div>
            {loadingProjects ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : grouped.length === 0 ? (
              <div className="text-sm text-gray-500">No projects yet.</div>
            ) : (
              <div className="space-y-2">
                {grouped.map(([dept, list]) => (
                  <div key={dept} className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="text-sm font-extrabold text-gray-900">{dept}</div>
                      <div className="text-xs font-black text-gray-500">{list.length} projects</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {list.map((p) => {
                        const isSelected = selectedProjectId === p._id;
                        const bomCount = p.bomItems?.length || 0;
                        const allocatedCount = (p.materials || []).filter((m) => Number(m.allocatedQuantity || 0) > 0).length;
                        return (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(p._id);
                              setShowBom(true);
                              setShowMaterials(true);
                            }}
                            className={`w-full text-left px-4 py-3 transition-all ${isSelected ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-extrabold text-sm text-gray-900 truncate">{p.name}</div>
                                <div className="text-[11px] text-gray-500 font-bold">{p.code}</div>
                                <div className="text-[11px] text-gray-500 font-bold mt-0.5">
                                  BOM: {bomCount} • Allocated: {allocatedCount}
                                </div>
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{p.status}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            {selectedProject ? (
              <>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-extrabold text-gray-900 truncate">{selectedProject.name}</div>
                    <div className="text-xs text-gray-500 font-bold">
                      {selectedProject.code} • {selectedProjectDept} • {selectedProject.status}
                    </div>
                    {selectedProject.description ? (
                      <div className="text-sm text-gray-700 mt-2">{selectedProject.description}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBom((p) => !p)}
                      className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                        showBom ? 'bg-primary text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      BOM ({selectedProjectBom.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMaterials((p) => !p)}
                      className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                        showMaterials ? 'bg-primary text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      Allocated Materials ({selectedProjectMaterials.length})
                    </button>
                  </div>
                </div>

                {showBom ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="text-sm font-extrabold text-gray-900">BOM</div>
                      {isSalesHead ? (
                        <div className="text-xs text-gray-500 font-bold">
                          Note: highlighted cells were edited by Inventory Manager.
                        </div>
                      ) : null}
                    </div>
                    {selectedProjectBom.length === 0 ? (
                      <div className="text-sm text-gray-500">No BOM items submitted yet.</div>
                    ) : (
                      <div className="overflow-auto border border-gray-200 rounded-xl">
                        {isSalesHead ? (
                          <table className="min-w-[2350px] w-full text-[11px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr className="text-[11px] font-black text-gray-700">
                                <th className="px-2 py-2 text-left">Type of Component</th>
                                <th className="px-2 py-2 text-left">Sr. No.</th>
                                <th className="px-2 py-2 text-left">Supplier Name</th>
                                <th className="px-2 py-2 text-left">Nomenclature / Description</th>
                                <th className="px-2 py-2 text-left">Part No. / Drg.</th>
                                <th className="px-2 py-2 text-left">Make</th>
                                <th className="px-2 py-2 text-left">Qty per Board</th>
                                <th className="px-2 py-2 text-left">Board Req</th>
                                <th className="px-2 py-2 text-left">Spare qty</th>
                                <th className="px-2 py-2 text-left">Board Req with Spare</th>
                                <th className="px-2 py-2 text-left">Total Qty with Spare</th>
                                <th className="px-2 py-2 text-left">Unit cost</th>
                                <th className="px-2 py-2 text-left">Additional cost</th>
                                <th className="px-2 py-2 text-left">Landing/unit</th>
                                <th className="px-2 py-2 text-left">Total price</th>
                                <th className="px-2 py-2 text-left">MOQ</th>
                                <th className="px-2 py-2 text-left">Lead time</th>
                                <th className="px-2 py-2 text-left">Lead time (weeks)</th>
                                <th className="px-2 py-2 text-left">Inventory Asset ID</th>
                                <th className="px-2 py-2 text-left">Inventory SKU</th>
                                <th className="px-2 py-2 text-left">Inventory Item Name</th>
                                <th className="px-2 py-2 text-left">Planned Qty</th>
                                <th className="px-2 py-2 text-left">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {selectedProjectBom.map((b) => (
                                <tr key={String(b._id || b.srNo)} className="align-top">
                                  <td className={cellClass(b, 'typeOfComponent')}>{b.typeOfComponent || '-'}</td>
                                  <td className={cellClass(b, 'srNo')}>{b.srNo}</td>
                                  <td className={cellClass(b, 'supplierName')}>{b.supplierName || '-'}</td>
                                  <td className={cellClass(b, 'nomenclatureDescription')}>{b.nomenclatureDescription || '-'}</td>
                                  <td className={cellClass(b, 'partNoDrg')}>{b.partNoDrg || '-'}</td>
                                  <td className={cellClass(b, 'make')}>{b.make || '-'}</td>
                                  <td className={cellClass(b, 'qtyPerBoard')}>{b.qtyPerBoard ?? 0}</td>
                                  <td className={cellClass(b, 'boardReq')}>{b.boardReq ?? 0}</td>
                                  <td className={cellClass(b, 'spareQty')}>{b.spareQty ?? 0}</td>
                                  <td className={cellClass(b, 'boardReqWithSpare')}>{b.boardReqWithSpare ?? 0}</td>
                                  <td className={cellClass(b, 'totalQtyWithSpare')}>{b.totalQtyWithSpare ?? 0}</td>
                                  <td className={cellClass(b, 'unitCost')}>{formatMoney(b.unitCost)}</td>
                                  <td className={cellClass(b, 'additionalCost')}>{formatMoney(b.additionalCost)}</td>
                                  <td className={cellClass(b, 'landingCostPerUnit')}>{formatMoney(b.landingCostPerUnit)}</td>
                                  <td className={cellClass(b, 'totalPrice')}>{formatMoney(b.totalPrice)}</td>
                                  <td className={cellClass(b, 'moq')}>{b.moq ?? 0}</td>
                                  <td className={cellClass(b, 'leadTime')}>{b.leadTime || '-'}</td>
                                  <td className={cellClass(b, 'leadTimeWeeks')}>{b.leadTimeWeeks ?? 0}</td>
                                  <td className={cellClass(b, 'inventoryAssetId')}>{b.inventoryAssetId || '-'}</td>
                                  <td className={cellClass(b, 'inventorySku')}>{b.inventorySku || '-'}</td>
                                  <td className={cellClass(b, 'inventoryItemName')}>{b.inventoryItemName || '-'}</td>
                                  <td className={cellClass(b, 'plannedQty')}>{b.plannedQty ?? 0}</td>
                                  <td className={cellClass(b, 'remarks')}>{b.remarks || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <table className="min-w-[1200px] w-full text-[11px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr className="text-[11px] font-black text-gray-700">
                                <th className="px-2 py-2 text-left">Sr. No.</th>
                                <th className="px-2 py-2 text-left">Type</th>
                                <th className="px-2 py-2 text-left">Nomenclature / Description</th>
                                <th className="px-2 py-2 text-left">Total Qty+Spare</th>
                                <th className="px-2 py-2 text-left">Unit cost</th>
                                <th className="px-2 py-2 text-left">Landing/unit</th>
                                <th className="px-2 py-2 text-left">Total price</th>
                                <th className="px-2 py-2 text-left">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {selectedProjectBom.map((b) => (
                                <tr key={String(b._id || b.srNo)} className="align-top">
                                  <td className={cellClass(b, 'srNo')}>{b.srNo}</td>
                                  <td className={cellClass(b, 'typeOfComponent')}>{b.typeOfComponent}</td>
                                  <td className={cellClass(b, 'nomenclatureDescription')}>{b.nomenclatureDescription}</td>
                                  <td className={cellClass(b, 'totalQtyWithSpare')}>{b.totalQtyWithSpare}</td>
                                  <td className={cellClass(b, 'unitCost')}>{formatMoney(b.unitCost)}</td>
                                  <td className={cellClass(b, 'landingCostPerUnit')}>{formatMoney(b.landingCostPerUnit)}</td>
                                  <td className={cellClass(b, 'totalPrice')}>{formatMoney(b.totalPrice)}</td>
                                  <td className={cellClass(b, 'remarks')}>{b.remarks || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {showMaterials ? (
                  <div className="space-y-2">
                    <div className="text-sm font-extrabold text-gray-900">Allocated Materials (Inventory Manager)</div>
                    {selectedProjectMaterials.length === 0 ? (
                      <div className="text-sm text-gray-500">No planned/allocated materials yet.</div>
                    ) : (
                      <div className="overflow-auto border border-gray-200 rounded-xl">
                        <table className="min-w-[900px] w-full text-[11px]">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr className="text-[11px] font-black text-gray-700">
                              <th className="px-2 py-2 text-left">Item</th>
                              <th className="px-2 py-2 text-left">Asset ID</th>
                              <th className="px-2 py-2 text-left">SKU</th>
                              <th className="px-2 py-2 text-left">Planned</th>
                              <th className="px-2 py-2 text-left">Allocated</th>
                              <th className="px-2 py-2 text-left">Used</th>
                              <th className="px-2 py-2 text-left">Remaining</th>
                              <th className="px-2 py-2 text-left">Status</th>
                              <th className="px-2 py-2 text-left">Unit</th>
                              {canUtilize ? <th className="px-2 py-2 text-left">Action</th> : null}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedProjectMaterials.map((m) => {
                              const planned = Number(m.plannedQuantity || 0);
                              const allocated = Number(m.allocatedQuantity || 0);
                              const summary = summaryByAssetId.get(m.assetId);
                              const used = Number(summary?.usedQuantity ?? 0);
                              const remainingPlanned = Math.max(0, planned - used);
                              const status = (() => {
                                if (used > 0 && (allocated > 0 || used < planned)) return 'Partially utilized';
                                if (used > 0) return 'Utilized';
                                if (allocated > 0) return 'Allocated';
                                return 'Planned';
                              })();
                              const key = buildRowKey(m);
                              const rowLoading = Boolean(utilizeLoading[key]);
                              const highlight = allocated > 0;
                              const remainingToUtilize = allocated > 0 ? allocated : Math.max(0, planned - used);
                              const action = (() => {
                                if (remainingToUtilize > 0) {
                                  return {
                                    label: rowLoading ? 'Processing…' : 'Utilize',
                                    onClick: () => handleUtilize(m, remainingToUtilize),
                                    className:
                                      'px-3 py-1.5 rounded-lg bg-primary text-white font-extrabold text-[11px] hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                    disabled: rowLoading
                                  };
                                }
                                if (used > 0) {
                                  return {
                                    label: rowLoading ? 'Processing…' : 'Undo',
                                    onClick: () => handleUndoUtilize(m),
                                    className:
                                      'px-3 py-1.5 rounded-lg bg-gray-700 text-white font-extrabold text-[11px] hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                    disabled: rowLoading
                                  };
                                }
                                return {
                                  label: 'Utilize',
                                  onClick: () => handleUtilize(m, 0),
                                  className:
                                    'px-3 py-1.5 rounded-lg bg-primary text-white font-extrabold text-[11px] hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                                  disabled: true
                                };
                              })();
                              return (
                                <tr key={`${m.assetId}-${m.sku}`} className={highlight ? 'bg-primary-50/40' : ''}>
                                  <td className="px-2 py-2">
                                    <div className="font-bold text-gray-900">{m.itemName}</div>
                                  </td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{m.assetId}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{m.sku}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{planned}</td>
                                  <td className="px-2 py-2 font-extrabold text-gray-900">{allocated}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{used}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{remainingPlanned}</td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                        status === 'Utilized'
                                          ? 'bg-primary-100 text-primary-700'
                                          : status === 'Partially utilized'
                                            ? 'bg-accent-100 text-accent-700'
                                            : status === 'Allocated'
                                              ? 'bg-muted-100 text-muted-800'
                                              : 'bg-muted-50 text-muted-800'
                                      }`}
                                    >
                                      {loadingSummary ? 'Loading' : status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{m.unit || 'pcs'}</td>
                                  {canUtilize ? (
                                    <td className="px-2 py-2">
                                      <button
                                        type="button"
                                        onClick={action.onClick}
                                        disabled={action.disabled}
                                        className={action.className}
                                      >
                                        {action.label}
                                      </button>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-gray-500">Select a project to view BOM and allocated materials.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Projects;
