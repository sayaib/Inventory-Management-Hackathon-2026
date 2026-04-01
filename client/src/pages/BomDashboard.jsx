import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowLeft, Eye, Pencil, PlusCircle, X } from 'lucide-react';
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

const BomDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const canEditBom = user?.role === ROLES.PRESALE;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const userDept = normalizeDepartment(user?.profile?.department);
  const lockDepartment = isProjectManager && userDept !== 'Unassigned';
  const [viewingProject, setViewingProject] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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

  const openViewBom = useCallback(async (projectId) => {
    if (!projectId) return;
    setViewLoading(true);
    setViewError('');
    try {
      const res = await api.get(`/projects/${projectId}`);
      setViewingProject(res.data?.project || null);
    } catch (err) {
      setViewError(err.response?.data?.message || 'Failed to load BOM');
      setViewingProject(null);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeViewBom = () => {
    setViewingProject(null);
    setViewError('');
    setViewLoading(false);
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
              <span className="text-xl font-bold text-gray-900 tracking-tight">BOM Dashboard</span>
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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-gray-900">Projects by Department</div>
              <div className="text-xs text-gray-500">Select a department to view projects for BOM.</div>
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
            <div className="text-sm text-gray-500 py-6">No projects found.</div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([dept, list]) => (
                <div key={dept} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="text-sm font-extrabold text-gray-900">{dept}</div>
                    <div className="text-xs font-black text-gray-500">{list.length} projects</div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {list.map((p) => (
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
                            <div className="text-[10px] font-black uppercase tracking-wider text-gray-500">{p.status}</div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openViewBom(p._id)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-all disabled:opacity-50"
                                disabled={(p.bomItems?.length || 0) === 0}
                              >
                                <Eye className="h-4 w-4" />
                                View BOM
                              </button>
                              {canEditBom && (p.bomItems?.length || 0) > 0 ? (
                                <Link
                                  to={`/bom/${p._id}/add?mode=edit`}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-primary-700 border border-primary-200 font-bold text-xs hover:bg-primary-50 transition-all"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit BOM
                                </Link>
                              ) : null}
                            </div>
                            {canEditBom ? (
                              <Link
                                to={`/bom/${p._id}/add`}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary-700 transition-all"
                              >
                                <PlusCircle className="h-4 w-4" />
                                Add BOM
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {viewingProject || viewLoading || viewError ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeViewBom();
          }}
        >
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-200 mt-10">
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-gray-900">BOM</div>
                {viewingProject ? (
                  <div className="text-xs text-gray-500 font-bold">
                    {viewingProject.name} • {viewingProject.code} • Rows: {viewingProject.bomItems?.length || 0}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeViewBom}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {viewLoading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : viewError ? (
                <div className="bg-accent-50 border border-accent-100 text-accent-700 px-4 py-3 rounded-xl text-sm font-bold">
                  {viewError}
                </div>
              ) : viewingProject && (viewingProject.bomItems?.length || 0) > 0 ? (
                <div className="overflow-auto border border-gray-200 rounded-xl">
                  <table className="min-w-[1200px] w-full text-[11px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-[11px] font-black text-gray-700">
                        <th className="px-2 py-2 text-left">Sr. No.</th>
                        <th className="px-2 py-2 text-left">Type of Component</th>
                        <th className="px-2 py-2 text-left">Nomenclature / Description</th>
                        <th className="px-2 py-2 text-left">Total Qty+Spare</th>
                        <th className="px-2 py-2 text-left">Unit cost</th>
                        <th className="px-2 py-2 text-left">Landing/unit</th>
                        <th className="px-2 py-2 text-left">Total price</th>
                        <th className="px-2 py-2 text-left">MOQ</th>
                        <th className="px-2 py-2 text-left">Lead time (weeks)</th>
                        <th className="px-2 py-2 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(viewingProject.bomItems || [])
                        .slice()
                        .sort((a, b) => Number(a.srNo || 0) - Number(b.srNo || 0))
                        .map((b) => (
                          <tr key={String(b._id || b.srNo)} className="align-top">
                            <td className="px-2 py-2">{b.srNo}</td>
                            <td className="px-2 py-2">{b.typeOfComponent}</td>
                            <td className="px-2 py-2">{b.nomenclatureDescription}</td>
                            <td className="px-2 py-2">{b.totalQtyWithSpare}</td>
                            <td className="px-2 py-2">{formatMoney(b.unitCost)}</td>
                            <td className="px-2 py-2">{formatMoney(b.landingCostPerUnit)}</td>
                            <td className="px-2 py-2">{formatMoney(b.totalPrice)}</td>
                            <td className="px-2 py-2">{b.moq}</td>
                            <td className="px-2 py-2">{b.leadTimeWeeks ?? 0}</td>
                            <td className="px-2 py-2">{b.remarks || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No BOM items found.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BomDashboard;
