import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const formatMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toFixed(2);
};

const toNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const computeLandingCostPerUnit = (bomItem) => {
  const unitCost = Math.max(0, toNumberOrZero(bomItem?.unitCost));
  const additionalCostRaw = bomItem?.additionalCost;
  const additionalCost =
    additionalCostRaw === undefined || additionalCostRaw === null || String(additionalCostRaw).trim() === ''
      ? 1
      : Math.max(0, toNumberOrZero(additionalCostRaw));
  return Math.max(0, unitCost * additionalCost);
};

const computeTotalPrice = (bomItem) => {
  const landingCostPerUnit = computeLandingCostPerUnit(bomItem);
  const totalQtyWithSpare = Math.max(0, toNumberOrZero(bomItem?.totalQtyWithSpare));
  return Math.max(0, landingCostPerUnit * totalQtyWithSpare);
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
  const incoming = String(bomItem?.inventoryStatus || '').trim();
  const status = incoming || (hasLink ? 'Assigned' : 'Pending');
  
  if (status === 'Utilized') {
    return {
      label: 'Utilized',
      className: 'bg-primary-50 text-primary-700 border-primary-200'
    };
  }
  if (status === 'Non Utilized') {
    return {
      label: 'Non Utilized',
      className: 'bg-gray-50 text-gray-700 border-gray-200'
    };
  }
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

const ViewBom = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data?.project || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load BOM');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleUpdateBomStatus = useCallback(async (bomItemId, status) => {
    if (!project) return;
    try {
      await api.put(`/projects/${project._id}/bom/${bomItemId}`, { inventoryStatus: status });
      setSuccess(`Inventory status updated to ${status}`);
      await fetchProject();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  }, [project, fetchProject]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

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
              <span className="text-xl font-bold text-gray-900 tracking-tight">View BOM</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all duration-200 font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
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
        <div className="app-card p-5 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-6">Loading…</div>
          ) : project ? (
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-gray-900">{project.name}</div>
                <div className="text-xs text-gray-500 font-bold">{project.code}</div>
                <div className="text-xs text-gray-500 font-bold mt-1">Rows: {project.bomItems?.length || 0}</div>
              </div>
              <button
                type="button"
                onClick={fetchProject}
                className="px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-6">Project not found.</div>
          )}
        </div>

        {project && (project.bomItems?.length || 0) > 0 ? (
          <div className="app-card p-5 space-y-4">
            <div className="space-y-1">
              <div className="text-base font-extrabold text-gray-900">Saved BOM</div>
              <div className="text-xs text-gray-500 font-bold">
                Note: highlighted cells were edited by Inventory Manager.
              </div>
            </div>
            <div className="overflow-auto border border-slate-200/70 rounded-xl bg-white/60 backdrop-blur">
              <table className="min-w-[2550px] w-full text-[11px]">
                <thead className="bg-gradient-to-r from-primary-50 via-white to-accent-50 border-b border-slate-200/60">
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
                    <th className="px-2 py-2 text-left">Inventory Status</th>
                    <th className="px-2 py-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(project.bomItems || [])
                    .slice()
                    .sort((a, b) => Number(a.srNo || 0) - Number(b.srNo || 0))
                    .map((b) => {
                      const statusMeta = getInventoryStatusMeta(b);
                      return (
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
                        <td className={cellClass(b, 'landingCostPerUnit')}>{formatMoney(computeLandingCostPerUnit(b))}</td>
                        <td className={cellClass(b, 'totalPrice')}>{formatMoney(computeTotalPrice(b))}</td>
                        <td className={cellClass(b, 'moq')}>{b.moq ?? 0}</td>
                        <td className={cellClass(b, 'leadTime')}>{b.leadTime || '-'}</td>
                        <td className={cellClass(b, 'leadTimeWeeks')}>{b.leadTimeWeeks ?? 0}</td>
                        <td className={cellClass(b, 'inventoryAssetId')}>{b.inventoryAssetId || '-'}</td>
                        <td className={cellClass(b, 'inventorySku')}>{b.inventorySku || '-'}</td>
                        <td className={cellClass(b, 'inventoryItemName')}>{b.inventoryItemName || '-'}</td>
                        <td className={cellClass(b, 'plannedQty')}>{b.plannedQty ?? 0}</td>
                        <td className={cellClass(b, 'inventoryStatus')}>
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[10px] font-black ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                            {isProjectManager && (b.inventoryAssetId || b.inventorySku) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBomStatus(b._id, 'Utilized')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary text-white hover:bg-primary-700 transition-all"
                                >
                                  Utilized
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBomStatus(b._id, 'Non Utilized')}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-500 text-white hover:bg-gray-600 transition-all"
                                >
                                  Non Utilized
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={cellClass(b, 'remarks')}>{b.remarks || '-'}</td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : project ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="text-sm text-gray-500">No BOM items found.</div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default ViewBom;
