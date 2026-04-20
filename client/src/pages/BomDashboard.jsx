import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowLeft, Eye, Pencil, PlusCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const normalizeDepartment = (department) => {
  const next = typeof department === 'string' ? department.trim() : '';
  return next || 'Unassigned';
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

  return (
    <div className="min-h-screen app-bg">
      <nav className="app-nav">
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

        <div className="app-card p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-base font-extrabold text-gray-900">Projects by Department</div>
              <div className="text-xs text-gray-500">Select a department to view projects for BOM.</div>
            </div>
            <div className="flex items-center gap-2">
              {lockDepartment ? (
                <div className="px-3 py-2 text-sm bg-white/60 border border-slate-200/70 rounded-lg font-extrabold text-gray-700 backdrop-blur">
                  {userDept}
                </div>
              ) : (
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-white/60 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40 font-bold backdrop-blur"
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
                <div key={dept} className="border border-slate-200/70 rounded-2xl overflow-hidden bg-white/60 backdrop-blur">
                  <div className="px-4 py-3 bg-gradient-to-r from-primary-50 via-white to-accent-50 border-b border-slate-200/60 flex items-center justify-between">
                    <div className="text-sm font-extrabold text-gray-900">{dept}</div>
                    <div className="text-xs font-black text-gray-500">{list.length} projects</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {list.map((p) => (
                      <div key={p._id} className="px-4 py-3 hover:bg-white/50 transition-colors">
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
                              <Link
                                to={(p.bomItems?.length || 0) > 0 ? `/bom/${p._id}/view` : '#'}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                                  (p.bomItems?.length || 0) > 0
                                    ? 'bg-primary-50 text-primary-800 border border-primary-100 hover:bg-primary-100'
                                    : 'bg-slate-100 text-slate-400 pointer-events-none'
                                }`}
                                aria-disabled={(p.bomItems?.length || 0) === 0}
                              >
                                <Eye className="h-4 w-4" />
                                View BOM
                              </Link>
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

    </div>
  );
};

export default BomDashboard;
