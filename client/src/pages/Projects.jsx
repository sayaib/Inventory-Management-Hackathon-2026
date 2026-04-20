import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, ChevronDown, ChevronUp, ClipboardList, Eye, Pencil, PlusCircle, RefreshCw, Search, X } from 'lucide-react';
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

const getInventoryStatusMeta = (bomItem) => {
  const hasLink = Boolean(bomItem?.inventoryAssetId || bomItem?.inventorySku);
  const incoming = hasLink ? 'Assigned' : String(bomItem?.inventoryStatus || '').trim();
  const status = incoming || 'Pending';
  if (status === 'Assigned') {
    return {
      label: 'Assigned',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (status === 'Pending') {
    return {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }
  if (status === 'Need to Purchase') {
    return {
      label: 'Need to Purchase',
      className: 'bg-accent-50 text-accent-700 border-accent-100'
    };
  }
  return {
    label: '—',
    className: 'bg-gray-50 text-gray-700 border-gray-200'
  };
};

const projectStatusPillClass = (status) => {
  const next = String(status || '').trim().toLowerCase();
  if (next.includes('complete') || next.includes('closed') || next.includes('done')) return 'bg-primary-100 text-primary-700';
  if (next.includes('active') || next.includes('ongoing') || next.includes('in progress')) return 'bg-muted-100 text-muted-800';
  if (next.includes('hold') || next.includes('pause') || next.includes('blocked')) return 'bg-accent-100 text-accent-700';
  if (next.includes('pending') || next.includes('new') || next.includes('draft')) return 'bg-muted-50 text-muted-800';
  return 'bg-gray-100 text-gray-700';
};

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
  const [projectQuery, setProjectQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsedDepts, setCollapsedDepts] = useState({});
  const [activeTab, setActiveTab] = useState('materials');
  const [bomQuery, setBomQuery] = useState('');
  const [materialsQuery, setMaterialsQuery] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

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
    setSummaryMaterials([]);
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

  useEffect(() => {
    setBomQuery('');
    setMaterialsQuery('');
    setActiveTab('materials');
  }, [selectedProjectId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreatingProject(true);
    try {
      const res = await api.post('/projects', createForm);
      const created = res.data.project;
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created._id);
      setCreateForm({ iwoNo: '', name: '', description: '', department: '' });
      setSuccess('Project created');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };
  const canCreateProject = [ROLES.ADMIN, ROLES.INVENTORY_MANAGER, ROLES.SALES_HEAD].includes(user?.role);
  const isSalesHead = user?.role === ROLES.SALES_HEAD;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const canEditBom = user?.role === ROLES.PRESALE;
  const canRaiseBomChangeRequest = [ROLES.PROJECT_MANAGER, ROLES.SALES_HEAD, ROLES.ADMIN, ROLES.INVENTORY_MANAGER].includes(user?.role);
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

  const statuses = useMemo(() => {
    const set = new Set();
    for (const p of projects) {
      const next = String(p?.status || '').trim();
      if (next) set.add(next);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const grouped = useMemo(() => {
    const map = new Map();
    const q = projectQuery.trim().toLowerCase();
    const statusQ = String(statusFilter || 'all').trim().toLowerCase();
    for (const p of projects) {
      const dept = normalizeDepartment(p.department);
      if (departmentFilter !== 'all' && dept !== departmentFilter) continue;
      if (statusQ !== 'all' && String(p?.status || '').trim().toLowerCase() !== statusQ) continue;
      if (q) {
        const haystack = [
          p?.name,
          p?.code,
          p?.description,
          p?.department,
          p?.status
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const list = map.get(dept) || [];
      list.push(p);
      map.set(dept, list);
    }
    for (const [dept, list] of map.entries()) {
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      map.set(dept, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [projects, departmentFilter, projectQuery, statusFilter]);

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

  const overviewStats = useMemo(() => {
    let planned = 0;
    let allocated = 0;
    let used = 0;

    for (const m of selectedProjectMaterials) {
      planned += Number(m?.plannedQuantity || 0);
      allocated += Number(m?.allocatedQuantity || 0);
      const summary = summaryByAssetId.get(m?.assetId);
      used += Number(summary?.usedQuantity ?? 0);
    }

    const remaining = Math.max(0, planned - used);
    return {
      planned,
      allocated,
      used,
      remaining,
      allocatedLineItems: selectedProjectMaterials.filter((m) => Number(m?.allocatedQuantity || 0) > 0).length
    };
  }, [selectedProjectMaterials, summaryByAssetId]);

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

  const filteredBom = useMemo(() => {
    const q = bomQuery.trim().toLowerCase();
    if (!q) return selectedProjectBom;
    return selectedProjectBom.filter((b) => {
      const haystack = [
        b?.srNo,
        b?.typeOfComponent,
        b?.supplierName,
        b?.nomenclatureDescription,
        b?.partNoDrg,
        b?.make,
        b?.inventoryAssetId,
        b?.inventorySku,
        b?.inventoryItemName,
        b?.remarks
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [bomQuery, selectedProjectBom]);

  const filteredMaterials = useMemo(() => {
    const q = materialsQuery.trim().toLowerCase();
    if (!q) return selectedProjectMaterials;
    return selectedProjectMaterials.filter((m) => {
      const haystack = [
        m?.itemName,
        m?.assetId,
        m?.sku,
        m?.unit
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [materialsQuery, selectedProjectMaterials]);

  return (
    <div className="min-h-screen app-bg">
      <nav className="app-nav sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" aria-label="Go to dashboard home" className="p-2 bg-primary rounded-lg">
                <img
                  src={APP_LOGO_URL}
                  alt="Optimized Solutions Ltd"
                  className="h-6 w-6 rounded bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
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

        <div className="space-y-6">
          {canCreateProject && (
            <div className="flex justify-center">
              <div className="app-card p-5 space-y-4 w-full max-w-7xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-primary" />
                    Create Project
                  </h2>
                  <div className="text-xs text-gray-500 mt-1">Create a new project (IWO-based) and start tracking BOM/materials.</div>
                </div>
              </div>
              <form onSubmit={handleCreateProject} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="create-iwo" className="text-xs font-extrabold text-gray-700">IWO No</label>
                  <input
                    id="create-iwo"
                    value={createForm.iwoNo}
                    onChange={(e) => setCreateForm((p) => ({ ...p, iwoNo: e.target.value }))}
                    placeholder="e.g. IWO-001"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                    required
                    disabled={creatingProject}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-name" className="text-xs font-extrabold text-gray-700">Project name</label>
                  <input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Smart Meter Upgrade"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                    required
                    disabled={creatingProject}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-dept" className="text-xs font-extrabold text-gray-700">
                    Department{isSalesHead ? <span className="text-accent-700"> *</span> : null}
                  </label>
                  <select
                    id="create-dept"
                    value={createForm.department}
                    onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                    required={isSalesHead}
                    disabled={creatingProject}
                  >
                    <option value="" disabled>
                      {isSalesHead ? 'Select department (required)' : 'Select department'}
                    </option>
                    <option value="IT">IT</option>
                    <option value="IoT">IoT</option>
                    <option value="PES">PES</option>
                    <option value="ATE">ATE</option>
                    <option value="DTMA">DTMA</option>
                  </select>
                </div>
                <div className="space-y-1 lg:col-span-4">
                  <label htmlFor="create-desc" className="text-xs font-extrabold text-gray-700">Description</label>
                  <textarea
                    id="create-desc"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Short description to help others understand scope"
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[96px] font-medium text-gray-900"
                    disabled={creatingProject}
                  />
                </div>
                <div className="flex justify-center lg:col-span-4">
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="px-10 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingProject ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="app-card p-5 space-y-4 lg:col-span-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Projects
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Search and pick a project to view BOM and allocated materials.</div>
                </div>
                <button
                  type="button"
                  onClick={fetchProjects}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                  disabled={loadingProjects}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingProjects ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={projectQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    placeholder="Search by name, code, department…"
                    className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium text-gray-900"
                  />
                  {projectQuery ? (
                    <button
                      type="button"
                      onClick={() => setProjectQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {lockDepartment ? (
                    <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl font-extrabold text-gray-700">
                      {userDept}
                    </div>
                  ) : (
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                    >
                      <option value="all">All departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  )}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-gray-900"
                  >
                    <option value="all">All statuses</option>
                    {statuses.map((s) => (
                      <option key={s} value={String(s).trim().toLowerCase()}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              {loadingProjects ? (
                <div className="text-sm text-gray-500 py-6">Loading…</div>
              ) : grouped.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 border border-primary-100">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-sm font-extrabold text-gray-900">No projects found</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Try changing filters or create a new project.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {grouped.map(([dept, list]) => {
                    const isCollapsed = Boolean(collapsedDepts[dept]);
                    return (
                      <div key={dept} className="border border-gray-200 rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCollapsedDepts((prev) => ({ ...prev, [dept]: !prev[dept] }))}
                          className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isCollapsed ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                            <div className="text-sm font-extrabold text-gray-900 truncate">{dept}</div>
                          </div>
                          <div className="text-xs font-black text-gray-500">{list.length} projects</div>
                        </button>
                        {isCollapsed ? null : (
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
                                    setActiveTab('materials');
                                  }}
                                  className={`w-full text-left px-4 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isSelected ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'
                                  }`}
                                  aria-current={isSelected ? 'page' : undefined}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="font-extrabold text-sm text-gray-900 truncate">{p.name}</div>
                                      <div className="text-[11px] text-gray-500 font-bold">{p.code}</div>
                                      <div className="text-[11px] text-gray-500 font-bold mt-0.5">
                                        BOM: {bomCount} • Allocated: {allocatedCount}
                                      </div>
                                      {p.description ? (
                                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">{p.description}</div>
                                      ) : null}
                                    </div>
                                    <div className="shrink-0 flex flex-col items-end gap-2">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${projectStatusPillClass(p.status)}`}>
                                        {p.status || 'Unknown'}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="app-card p-5 space-y-5 lg:col-span-8">
            {selectedProject ? (
              <>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="min-w-0">
                        <div className="text-base font-extrabold text-gray-900 truncate">{selectedProject.name}</div>
                        <div className="text-xs text-gray-500 font-bold">
                          {selectedProject.code} • {selectedProjectDept}
                        </div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${projectStatusPillClass(selectedProject.status)}`}>
                        {selectedProject.status || 'Unknown'}
                      </span>
                    </div>
                    {selectedProject.description ? (
                      <div className="text-sm text-gray-700 mt-2">{selectedProject.description}</div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white">
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">BOM Items</div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">{selectedProjectBom.length}</div>
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white">
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">Allocated Items</div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">{overviewStats.allocatedLineItems}</div>
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white">
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">Allocated Qty</div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">{Math.round(overviewStats.allocated)}</div>
                  </div>
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white">
                    <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">Used Qty</div>
                    <div className="mt-1 text-lg font-extrabold text-gray-900">{loadingSummary ? '…' : Math.round(overviewStats.used)}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('materials')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-sm transition-all ${
                        activeTab === 'materials' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      Allocated Materials
                      <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[11px] font-black ${
                        activeTab === 'materials' ? 'bg-white/15 text-white' : 'bg-white text-gray-700'
                      }`}>
                        {selectedProjectMaterials.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bom')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-sm transition-all ${
                        activeTab === 'bom' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      BOM
                      <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[11px] font-black ${
                        activeTab === 'bom' ? 'bg-white/15 text-white' : 'bg-white text-gray-700'
                      }`}>
                        {selectedProjectBom.length}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={(selectedProjectBom.length || 0) > 0 ? `/bom/${selectedProject._id}/view` : '#'}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                        (selectedProjectBom.length || 0) > 0
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-400 pointer-events-none'
                      }`}
                      aria-disabled={(selectedProjectBom.length || 0) === 0}
                    >
                      <Eye className="h-4 w-4" />
                      View BOM
                    </Link>
                    {canEditBom ? (
                      <Link
                        to={`/bom/${selectedProject._id}/add`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-700 transition-all"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Add BOM
                      </Link>
                    ) : null}
                    {canEditBom && (selectedProjectBom.length || 0) > 0 ? (
                      <Link
                        to={`/bom/${selectedProject._id}/add?mode=edit`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-primary-700 border border-primary-200 font-bold text-xs hover:bg-primary-50 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit BOM
                      </Link>
                    ) : null}
                    {canRaiseBomChangeRequest ? (
                      <Link
                        to="/projects/bom-change-request"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-gray-800 border border-gray-200 font-bold text-xs hover:bg-gray-50 transition-all"
                      >
                        <ClipboardList className="h-4 w-4" />
                        BOM Change Request
                      </Link>
                    ) : null}
                  </div>
                </div>

                {activeTab === 'bom' ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-extrabold text-gray-900">BOM</div>
                        {isSalesHead ? (
                          <div className="text-xs text-gray-500 font-bold">Highlighted cells were edited by Inventory Manager.</div>
                        ) : null}
                      </div>
                      <div className="relative sm:w-[320px]">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={bomQuery}
                          onChange={(e) => setBomQuery(e.target.value)}
                          placeholder="Search BOM…"
                          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium text-gray-900"
                        />
                        {bomQuery ? (
                          <button
                            type="button"
                            onClick={() => setBomQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700"
                            aria-label="Clear BOM search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {filteredBom.length === 0 ? (
                      <div className="text-sm text-gray-500">No BOM items found.</div>
                    ) : (
                      <div className="overflow-auto border border-gray-200 rounded-2xl">
                        {isSalesHead || isProjectManager ? (
                          <table className="min-w-[2550px] w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                              <tr className="text-[11px] font-black text-gray-700">
                                <th className="px-2 py-2 text-left whitespace-nowrap">Type of Component</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Sr. No.</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Supplier Name</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Nomenclature / Description</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Part No. / Drg.</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Make</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Qty per Board</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Board Req</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Spare qty</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Board Req with Spare</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Total Qty with Spare</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Unit cost</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Additional cost</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Landing/unit</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Total price</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">MOQ</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Lead time</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Lead time (weeks)</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Inventory Asset ID</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Inventory SKU</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Inventory Item Name</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Planned Qty</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Inventory Status</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {filteredBom.map((b) => {
                                const statusMeta = getInventoryStatusMeta(b);
                                return (
                                <tr key={String(b._id || b.srNo)} className="align-top hover:bg-gray-50">
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
                                  <td className={cellClass(b, 'inventoryStatus')}>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-black ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </td>
                                  <td className={cellClass(b, 'remarks')}>{b.remarks || '-'}</td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <table className="min-w-[1200px] w-full text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                              <tr className="text-[11px] font-black text-gray-700">
                                <th className="px-2 py-2 text-left whitespace-nowrap">Sr. No.</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Type</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Nomenclature / Description</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Total Qty+Spare</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Unit cost</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Landing/unit</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Total price</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Inventory Status</th>
                                <th className="px-2 py-2 text-left whitespace-nowrap">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {filteredBom.map((b) => {
                                const statusMeta = getInventoryStatusMeta(b);
                                return (
                                <tr key={String(b._id || b.srNo)} className="align-top hover:bg-gray-50">
                                  <td className={cellClass(b, 'srNo')}>{b.srNo}</td>
                                  <td className={cellClass(b, 'typeOfComponent')}>{b.typeOfComponent}</td>
                                  <td className={cellClass(b, 'nomenclatureDescription')}>{b.nomenclatureDescription}</td>
                                  <td className={cellClass(b, 'totalQtyWithSpare')}>{b.totalQtyWithSpare}</td>
                                  <td className={cellClass(b, 'unitCost')}>{formatMoney(b.unitCost)}</td>
                                  <td className={cellClass(b, 'landingCostPerUnit')}>{formatMoney(b.landingCostPerUnit)}</td>
                                  <td className={cellClass(b, 'totalPrice')}>{formatMoney(b.totalPrice)}</td>
                                  <td className={cellClass(b, 'inventoryStatus')}>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-black ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </td>
                                  <td className={cellClass(b, 'remarks')}>{b.remarks || '-'}</td>
                                </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-sm font-extrabold text-gray-900">Allocated Materials (Inventory Manager)</div>
                      <div className="relative sm:w-[320px]">
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={materialsQuery}
                          onChange={(e) => setMaterialsQuery(e.target.value)}
                          placeholder="Search materials…"
                          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-medium text-gray-900"
                        />
                        {materialsQuery ? (
                          <button
                            type="button"
                            onClick={() => setMaterialsQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700"
                            aria-label="Clear materials search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {filteredMaterials.length === 0 ? (
                      <div className="text-sm text-gray-500">No planned/allocated materials found.</div>
                    ) : (
                      <div className="overflow-auto border border-gray-200 rounded-2xl">
                        <table className="min-w-[980px] w-full text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                            <tr className="text-[11px] font-black text-gray-700">
                              <th className="px-2 py-2 text-left">Item</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Asset ID</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">SKU</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Planned</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Allocated</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Used</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Remaining</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Status</th>
                              <th className="px-2 py-2 text-left whitespace-nowrap">Unit</th>
                              {canUtilize ? <th className="px-2 py-2 text-left whitespace-nowrap">Action</th> : null}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredMaterials.map((m) => {
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
                                <tr key={`${m.assetId}-${m.sku}`} className={`${highlight ? 'bg-primary-50/40' : ''} hover:bg-gray-50`}>
                                  <td className="px-2 py-2">
                                    <div className="font-bold text-gray-900">{m.itemName}</div>
                                  </td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{m.assetId}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{m.sku}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{planned}</td>
                                  <td className="px-2 py-2 font-extrabold text-gray-900">{allocated}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{loadingSummary ? '…' : used}</td>
                                  <td className="px-2 py-2 font-bold text-gray-700">{loadingSummary ? '…' : remainingPlanned}</td>
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
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500">Select a project to view BOM and allocated materials.</div>
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Projects;
