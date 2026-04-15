import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

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

const ViewBom = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-6">Loading…</div>
          ) : error ? (
            <div className="bg-accent-50 border border-accent-100 text-accent-700 px-4 py-3 rounded-xl text-sm font-bold">
              {error}
            </div>
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="space-y-1">
              <div className="text-base font-extrabold text-gray-900">Saved BOM</div>
              <div className="text-xs text-gray-500 font-bold">
                Note: highlighted cells were edited by Inventory Manager.
              </div>
            </div>
            <div className="overflow-auto border border-gray-200 rounded-xl">
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
                  {(project.bomItems || [])
                    .slice()
                    .sort((a, b) => Number(a.srNo || 0) - Number(b.srNo || 0))
                    .map((b) => (
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
