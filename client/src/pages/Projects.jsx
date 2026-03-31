import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, PlusCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import api from '../api/axios';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [summary, setSummary] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [createForm, setCreateForm] = useState({ code: '', name: '' });
  const [planForm, setPlanForm] = useState({ assetIdOrSku: '', plannedQuantity: 0 });
  const [allocateForm, setAllocateForm] = useState({ assetIdOrSku: '', quantity: 1 });
  const [usedForm, setUsedForm] = useState({ assetIdOrSku: '', usedQuantity: 0 });
  const [assets, setAssets] = useState([]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p._id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const assetsById = useMemo(() => {
    const map = new Map();
    for (const a of assets) map.set(a.assetId, a);
    return map;
  }, [assets]);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError('');
    try {
      const res = await api.get('/projects');
      const list = res.data.projects || [];
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelectedProjectId(list[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedProjectId]);

  const fetchAllAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const pageLimit = 200;
      const maxPages = 25;
      let page = 1;
      let totalPages = 1;
      const all = [];

      while (page <= totalPages && page <= maxPages) {
        const res = await api.get('/inventory', { params: { page, limit: pageLimit } });
        const nextAssets = res.data.assets || [];
        for (const a of nextAssets) all.push(a);
        totalPages = Number(res.data.totalPages || 1);
        page += 1;
      }

      setAssets(all);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  const fetchSummary = useCallback(async (projectId) => {
    if (!projectId) return;
    setLoadingSummary(true);
    setError('');
    try {
      const res = await api.get(`/projects/${projectId}/summary`);
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project summary');
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) fetchSummary(selectedProjectId);
  }, [fetchSummary, selectedProjectId]);

  useEffect(() => {
    fetchAllAssets();
  }, [fetchAllAssets]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/projects', createForm);
      const created = res.data.project;
      setProjects((prev) => [created, ...prev]);
      setSelectedProjectId(created._id);
      setCreateForm({ code: '', name: '' });
      setSuccess('Project created');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleUpsertPlanned = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setError('');
    setSuccess('');
    try {
      await api.post(`/projects/${selectedProjectId}/materials/upsert`, {
        assetIdOrSku: planForm.assetIdOrSku,
        plannedQuantity: Number(planForm.plannedQuantity)
      });
      setPlanForm({ assetIdOrSku: '', plannedQuantity: 0 });
      setSuccess('Planned quantity updated');
      fetchSummary(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update planned quantity');
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setError('');
    setSuccess('');
    try {
      await api.post(`/projects/${selectedProjectId}/materials/allocate`, {
        assetIdOrSku: allocateForm.assetIdOrSku,
        quantity: Number(allocateForm.quantity)
      });
      setAllocateForm({ assetIdOrSku: '', quantity: 1 });
      setSuccess('Materials allocated');
      fetchSummary(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate materials');
    }
  };

  const handleUpdateUsed = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setError('');
    setSuccess('');
    try {
      await api.post(`/projects/${selectedProjectId}/materials/used`, {
        assetIdOrSku: usedForm.assetIdOrSku,
        usedQuantity: Number(usedForm.usedQuantity)
      });
      setUsedForm({ assetIdOrSku: '', usedQuantity: 0 });
      setSuccess('Used quantity updated');
      fetchSummary(selectedProjectId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update used quantity');
    }
  };

  const overConsumedCount = (summary?.materials || []).filter((m) => m.overConsumed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Projects</span>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-all duration-200 font-medium text-sm"
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
              <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
                {success}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-indigo-600" />
              Create Project
            </h2>
            <form className="space-y-3" onSubmit={handleCreateProject}>
              <input
                value={createForm.code}
                onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="Code (e.g. PROJ-001)"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all"
              >
                Create
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">Your Projects</h2>
              <button
                type="button"
                onClick={fetchProjects}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                disabled={loadingProjects}
              >
                Refresh
              </button>
            </div>
            {loadingProjects ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : projects.length === 0 ? (
              <div className="text-sm text-gray-500">No projects yet.</div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedProjectId(p._id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                      selectedProjectId === p._id
                        ? 'border-indigo-200 bg-indigo-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-sm text-gray-900">{p.name}</div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{p.status}</div>
                    </div>
                    <div className="text-[11px] text-gray-500 font-bold">{p.code}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-900">Overconsumption</h2>
              <div className={`text-xs font-black px-3 py-1.5 rounded-lg ${
                overConsumedCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {overConsumedCount} items
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {selectedProject ? (
                <span className="font-bold text-gray-900">{selectedProject.name}</span>
              ) : (
                'Select a project'
              )}
            </div>
            <div className="text-xs text-gray-500">
              An item is flagged when used quantity exceeds planned quantity.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                {summary?.project?.name || 'Project Materials'}
              </h2>
              <p className="text-xs text-gray-500">
                Planned vs allocated vs used per material.
              </p>
            </div>
            {overConsumedCount > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                <AlertTriangle className="h-4 w-4" />
                Overconsumption detected
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <form onSubmit={handleUpsertPlanned} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="text-sm font-extrabold text-gray-900">Set Planned Quantity</div>
              <select
                value={planForm.assetIdOrSku}
                onChange={(e) => setPlanForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-50"
                disabled={!selectedProjectId || loadingAssets}
              >
                <option value="">
                  {loadingAssets ? 'Loading materials…' : 'Select material (optional)'}
                </option>
                {assets.map((a) => (
                  <option key={a._id} value={a.assetId}>
                    {a.itemName} — {a.assetId} • {a.sku}
                  </option>
                ))}
              </select>
              <input
                value={planForm.assetIdOrSku}
                onChange={(e) => setPlanForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                placeholder="Asset ID or SKU"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <input
                value={planForm.plannedQuantity}
                onChange={(e) => setPlanForm((p) => ({ ...p, plannedQuantity: e.target.value }))}
                type="number"
                min="0"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                disabled={!selectedProjectId}
              >
                Save Planned
              </button>
            </form>

            <form onSubmit={handleAllocate} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="text-sm font-extrabold text-gray-900">Allocate From Inventory</div>
              <select
                value={allocateForm.assetIdOrSku}
                onChange={(e) => setAllocateForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-50"
                disabled={!selectedProjectId || loadingAssets}
              >
                <option value="">
                  {loadingAssets ? 'Loading materials…' : 'Select material (optional)'}
                </option>
                {assets.map((a) => (
                  <option key={a._id} value={a.assetId}>
                    {a.itemName} — {a.assetId} • {a.sku}
                  </option>
                ))}
              </select>
              <input
                value={allocateForm.assetIdOrSku}
                onChange={(e) => setAllocateForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                placeholder="Asset ID or SKU"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <input
                value={allocateForm.quantity}
                onChange={(e) => setAllocateForm((p) => ({ ...p, quantity: e.target.value }))}
                type="number"
                min="1"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                disabled={!selectedProjectId}
              >
                Allocate
              </button>
            </form>

            <form onSubmit={handleUpdateUsed} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="text-sm font-extrabold text-gray-900">Update Used Quantity</div>
              <select
                value={usedForm.assetIdOrSku}
                onChange={(e) => setUsedForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold disabled:opacity-50"
                disabled={!selectedProjectId || loadingAssets}
              >
                <option value="">
                  {loadingAssets ? 'Loading materials…' : 'Select material (optional)'}
                </option>
                {assets.map((a) => (
                  <option key={a._id} value={a.assetId}>
                    {a.itemName} — {a.assetId} • {a.sku}
                  </option>
                ))}
              </select>
              <input
                value={usedForm.assetIdOrSku}
                onChange={(e) => setUsedForm((p) => ({ ...p, assetIdOrSku: e.target.value }))}
                placeholder="Asset ID or SKU"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <input
                value={usedForm.usedQuantity}
                onChange={(e) => setUsedForm((p) => ({ ...p, usedQuantity: e.target.value }))}
                type="number"
                min="0"
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
                disabled={!selectedProjectId}
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
                disabled={!selectedProjectId}
              >
                Save Used
              </button>
            </form>
          </div>

          {loadingSummary ? (
            <div className="text-sm text-gray-500 py-8">Loading materials…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Material</th>
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available</th>
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Planned</th>
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Allocated</th>
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Used</th>
                    <th className="py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(summary?.materials || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                        No materials planned or allocated yet.
                      </td>
                    </tr>
                  ) : (
                    (summary?.materials || []).map((m) => (
                      <tr key={`${m.assetId}-${m.sku}`} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3">
                          <div className="font-extrabold text-sm text-gray-900">{m.itemName}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {m.assetId} • {m.sku}
                          </div>
                        </td>
                        <td className="py-3 font-bold text-sm text-gray-700">
                          {assetsById.get(m.assetId)?.availableQuantity ?? '-'} {m.unit}
                        </td>
                        <td className="py-3 font-bold text-sm text-gray-700">
                          {m.plannedQuantity} {m.unit}
                        </td>
                        <td className="py-3 font-bold text-sm text-gray-700">
                          {m.allocatedQuantity} {m.unit}
                        </td>
                        <td className="py-3 font-bold text-sm text-gray-700">
                          {m.usedQuantity} {m.unit}
                          {m.usedQuantitySource === 'manual' && (
                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                              Manual
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          {m.overConsumed ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600">
                              Over by {m.overConsumedBy}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Projects;
