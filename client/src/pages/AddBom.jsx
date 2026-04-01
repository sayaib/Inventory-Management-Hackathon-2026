import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardList, ArrowLeft, PlusCircle, Save, Trash2 } from 'lucide-react';
import api from '../api/axios';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const toNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0.00';
  return parsed.toFixed(2);
};

const createEmptyRow = (srNo) => ({
  typeOfComponent: '',
  srNo: srNo ? String(srNo) : '',
  supplierName: '',
  nomenclatureDescription: '',
  partNoDrg: '',
  make: '',
  qtyPerBoard: '',
  boardReq: '',
  spareQty: '',
  unitCost: '',
  additionalCost: '',
  moq: '',
  remarks: '',
  leadTimeWeeks: ''
});

const deriveRow = (row) => {
  const qtyPerBoard = Math.max(0, toNumberOrZero(row.qtyPerBoard));
  const boardReq = Math.max(0, toNumberOrZero(row.boardReq));
  const spareQty = Math.max(0, toNumberOrZero(row.spareQty));
  const boardReqWithSpare = Math.max(0, boardReq + spareQty);
  const totalQtyWithSpare = Math.max(0, qtyPerBoard * boardReqWithSpare);

  const unitCost = Math.max(0, toNumberOrZero(row.unitCost));
  const additionalCost = Math.max(0, toNumberOrZero(row.additionalCost));
  const landingCostPerUnit = Math.max(0, unitCost + additionalCost);
  const totalPrice = Math.max(0, landingCostPerUnit * totalQtyWithSpare);

  return {
    boardReqWithSpare,
    totalQtyWithSpare,
    landingCostPerUnit,
    totalPrice
  };
};

const createEditableExistingRow = (b) => {
  const row = {
    _id: b?._id,
    typeOfComponent: b?.typeOfComponent ?? '',
    srNo: String(b?.srNo ?? ''),
    supplierName: b?.supplierName ?? '',
    nomenclatureDescription: b?.nomenclatureDescription ?? '',
    partNoDrg: b?.partNoDrg ?? '',
    make: b?.make ?? '',
    qtyPerBoard: String(b?.qtyPerBoard ?? ''),
    boardReq: String(b?.boardReq ?? ''),
    spareQty: String(b?.spareQty ?? ''),
    unitCost: String(b?.unitCost ?? ''),
    additionalCost: String(b?.additionalCost ?? ''),
    moq: String(b?.moq ?? ''),
    remarks: b?.remarks ?? '',
    leadTimeWeeks: String(b?.leadTimeWeeks ?? ''),
    saving: false,
    error: '',
    savedAt: ''
  };
  return {
    ...row,
    _original: { ...row }
  };
};

const toEditableFromSaved = (b) => createEditableExistingRow(b);

const isRowDirty = (row) => {
  if (!row?._original) return true;
  const keys = [
    'typeOfComponent',
    'srNo',
    'supplierName',
    'nomenclatureDescription',
    'partNoDrg',
    'make',
    'qtyPerBoard',
    'boardReq',
    'spareQty',
    'unitCost',
    'additionalCost',
    'moq',
    'remarks',
    'leadTimeWeeks'
  ];
  return keys.some((k) => String(row[k] ?? '') !== String(row._original[k] ?? ''));
};

const AddBom = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([createEmptyRow(1)]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExistingBom, setShowExistingBom] = useState(false);
  const [showEditExistingBom, setShowEditExistingBom] = useState(false);
  const [existingRows, setExistingRows] = useState([]);
  const existingBomRef = useRef(null);
  const editExistingRef = useRef(null);
  const formRef = useRef(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.get(`/projects/${projectId}`);
      const nextProject = res.data?.project || null;
      setProject(nextProject);
      setExistingRows(
        (nextProject?.bomItems || [])
          .slice()
          .sort((a, b) => toNumberOrZero(a.srNo) - toNumberOrZero(b.srNo))
          .map((b) => createEditableExistingRow(b))
      );
      const nextSrNo = (nextProject?.bomItems?.length || 0) + 1;
      setRows([createEmptyRow(nextSrNo)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project');
      setProject(null);
      setExistingRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    const mode = String(searchParams.get('mode') || '').toLowerCase();
    if (mode === 'edit') {
      setShowEditExistingBom(true);
      setShowExistingBom(false);
      requestAnimationFrame(() => editExistingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [searchParams]);

  const baseSrNo = useMemo(() => (project?.bomItems?.length || 0) + 1, [project?.bomItems?.length]);

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(baseSrNo + prev.length)]);
  };

  const removeRow = (idx) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const nonBlankRows = rows.filter((r) => Object.values(r).some((v) => String(v || '').trim() !== ''));
      if (nonBlankRows.length === 0) {
        setError('Please add at least one BOM row');
        return;
      }

      const items = nonBlankRows.map((r, idx) => {
        const parsedSrNo = toNumberOrZero(r.srNo);
        const srNo = parsedSrNo > 0 ? parsedSrNo : baseSrNo + idx;
        const derived = deriveRow(r);
        return {
          typeOfComponent: r.typeOfComponent,
          srNo,
          supplierName: r.supplierName,
          nomenclatureDescription: r.nomenclatureDescription,
          partNoDrg: r.partNoDrg,
          make: r.make,
          qtyPerBoard: toNumberOrZero(r.qtyPerBoard),
          boardReq: toNumberOrZero(r.boardReq),
          spareQty: toNumberOrZero(r.spareQty),
          boardReqWithSpare: derived.boardReqWithSpare,
          totalQtyWithSpare: derived.totalQtyWithSpare,
          unitCost: toNumberOrZero(r.unitCost),
          additionalCost: toNumberOrZero(r.additionalCost),
          landingCostPerUnit: derived.landingCostPerUnit,
          totalPrice: derived.totalPrice,
          moq: toNumberOrZero(r.moq),
          remarks: r.remarks,
          leadTimeWeeks: toNumberOrZero(r.leadTimeWeeks)
        };
      });

      const res = await api.post(`/projects/${projectId}/bom/bulk`, { items });
      const savedItems = res.data?.bomItems || [];
      setProject((prev) => (prev ? { ...prev, bomItems: [...(prev.bomItems || []), ...savedItems] } : prev));
      setSuccess(`BOM items added: ${savedItems.length}`);
      const nextSrNo = baseSrNo + savedItems.length;
      setRows([createEmptyRow(nextSrNo)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add BOM items');
    } finally {
      setSaving(false);
    }
  };

  const updateExistingRow = (idx, patch) => {
    setExistingRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSaveExistingRow = async (idx) => {
    const row = existingRows[idx];
    if (!row?._id) {
      setError('BOM row id missing');
      return;
    }
    updateExistingRow(idx, { saving: true, error: '', savedAt: '' });
    setError('');
    setSuccess('');
    try {
      const payload = {
        typeOfComponent: row.typeOfComponent,
        srNo: toNumberOrZero(row.srNo),
        supplierName: row.supplierName,
        nomenclatureDescription: row.nomenclatureDescription,
        partNoDrg: row.partNoDrg,
        make: row.make,
        qtyPerBoard: toNumberOrZero(row.qtyPerBoard),
        boardReq: toNumberOrZero(row.boardReq),
        spareQty: toNumberOrZero(row.spareQty),
        unitCost: toNumberOrZero(row.unitCost),
        additionalCost: toNumberOrZero(row.additionalCost),
        moq: toNumberOrZero(row.moq),
        remarks: row.remarks,
        leadTimeWeeks: toNumberOrZero(row.leadTimeWeeks)
      };
      const res = await api.put(`/projects/${projectId}/bom/${row._id}`, payload);
      const saved = res.data?.bomItem;
      if (!saved) throw new Error('Missing bomItem in response');
      setProject((prev) => {
        if (!prev) return prev;
        const nextItems = (prev.bomItems || []).map((b) => (String(b._id) === String(saved._id) ? saved : b));
        return { ...prev, bomItems: nextItems };
      });
      setExistingRows((prev) =>
        prev.map((r, i) => {
          if (i !== idx) return r;
          const next = toEditableFromSaved(saved);
          return next;
        })
      );
      setSuccess('BOM updated');
    } catch (err) {
      updateExistingRow(idx, { saving: false, error: err.response?.data?.message || err.message || 'Failed to update BOM' });
      return;
    } finally {
      updateExistingRow(idx, { saving: false, savedAt: new Date().toISOString() });
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
              <span className="text-xl font-bold text-gray-900 tracking-tight">Add BOM</span>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>{success}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExistingBom(true);
                        setShowEditExistingBom(false);
                        requestAnimationFrame(() => existingBomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                      }}
                      className="px-3 py-2 rounded-lg bg-white text-primary-700 border border-primary-200 font-extrabold text-xs hover:bg-primary-50 transition-all"
                    >
                      View BOM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExistingBom(false);
                        setShowEditExistingBom(false);
                        requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                      }}
                      className="px-3 py-2 rounded-lg bg-primary text-white font-extrabold text-xs hover:bg-primary-700 transition-all"
                    >
                      Add BOM
                    </button>
                    {(project?.bomItems?.length || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditExistingBom(true);
                          setShowExistingBom(false);
                          requestAnimationFrame(() => editExistingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                        }}
                        className="px-3 py-2 rounded-lg bg-primary text-white font-extrabold text-xs hover:bg-primary-700 transition-all"
                      >
                        Edit Submitted BOM
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-500 py-6">Loading…</div>
          ) : project ? (
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-gray-900">{project.name}</div>
                <div className="text-xs text-gray-500 font-bold">{project.code}</div>
                <div className="text-xs text-gray-500 font-bold mt-1">Existing BOM items: {project.bomItems?.length || 0}</div>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                disabled={saving}
              >
                <PlusCircle className="h-4 w-4" />
                Add Row
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-6">Project not found.</div>
          )}
        </div>

        {showExistingBom && (project?.bomItems?.length || 0) > 0 ? (
          <div ref={existingBomRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-gray-900">Current BOM</div>
                <div className="text-xs text-gray-500 font-bold">Rows: {project.bomItems?.length || 0}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowExistingBom(false)}
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
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
                  {(project.bomItems || []).map((b) => (
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
          </div>
        ) : null}

        {showEditExistingBom && (project?.bomItems?.length || 0) > 0 ? (
          <div ref={editExistingRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold text-gray-900">Edit Submitted BOM</div>
                <div className="text-xs text-gray-500 font-bold">Rows: {project.bomItems?.length || 0}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchProject}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditExistingBom(false)}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-auto border border-gray-200 rounded-xl">
              <table className="min-w-[1900px] w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
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
                    <th className="px-2 py-2 text-left">Landing cost / Unit</th>
                    <th className="px-2 py-2 text-left">Total price</th>
                    <th className="px-2 py-2 text-left">MOQ</th>
                    <th className="px-2 py-2 text-left">Remarks</th>
                    <th className="px-2 py-2 text-left">Lead time (weeks)</th>
                    <th className="px-2 py-2 text-left">Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {existingRows.map((row, idx) => {
                      const derived = deriveRow(row);
                      const dirty = isRowDirty(row);
                      const cellClass = 'w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary';
                      return (
                        <tr key={String(row._id || idx)} className="align-top">
                          <td className="px-2 py-2 min-w-[180px]">
                            <input
                              value={row.typeOfComponent}
                              onChange={(e) => updateExistingRow(idx, { typeOfComponent: e.target.value, error: '' })}
                              className={cellClass}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[90px]">
                            <input
                              value={row.srNo}
                              onChange={(e) => updateExistingRow(idx, { srNo: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="numeric"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[160px]">
                            <input
                              value={row.supplierName}
                              onChange={(e) => updateExistingRow(idx, { supplierName: e.target.value, error: '' })}
                              className={cellClass}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[260px]">
                            <input
                              value={row.nomenclatureDescription}
                              onChange={(e) => updateExistingRow(idx, { nomenclatureDescription: e.target.value, error: '' })}
                              className={cellClass}
                            />
                            {row.error ? (
                              <div className="mt-1 text-[11px] text-red-600 font-bold">{row.error}</div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2 min-w-[150px]">
                            <input
                              value={row.partNoDrg}
                              onChange={(e) => updateExistingRow(idx, { partNoDrg: e.target.value, error: '' })}
                              className={cellClass}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[120px]">
                            <input
                              value={row.make}
                              onChange={(e) => updateExistingRow(idx, { make: e.target.value, error: '' })}
                              className={cellClass}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[120px]">
                            <input
                              value={row.qtyPerBoard}
                              onChange={(e) => updateExistingRow(idx, { qtyPerBoard: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[110px]">
                            <input
                              value={row.boardReq}
                              onChange={(e) => updateExistingRow(idx, { boardReq: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[110px]">
                            <input
                              value={row.spareQty}
                              onChange={(e) => updateExistingRow(idx, { spareQty: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[160px]">
                            <input
                              value={String(derived.boardReqWithSpare)}
                              readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[170px]">
                            <input
                              value={String(derived.totalQtyWithSpare)}
                              readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[110px]">
                            <input
                              value={row.unitCost}
                              onChange={(e) => updateExistingRow(idx, { unitCost: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[130px]">
                            <input
                              value={row.additionalCost}
                              onChange={(e) => updateExistingRow(idx, { additionalCost: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[150px]">
                            <input
                              value={formatMoney(derived.landingCostPerUnit)}
                              readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[130px]">
                            <input
                              value={formatMoney(derived.totalPrice)}
                              readOnly
                              className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[90px]">
                            <input
                              value={row.moq}
                              onChange={(e) => updateExistingRow(idx, { moq: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="decimal"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[220px]">
                            <input
                              value={row.remarks}
                              onChange={(e) => updateExistingRow(idx, { remarks: e.target.value, error: '' })}
                              className={cellClass}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <input
                              value={row.leadTimeWeeks}
                              onChange={(e) => updateExistingRow(idx, { leadTimeWeeks: e.target.value, error: '' })}
                              className={cellClass}
                              inputMode="numeric"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[130px]">
                            <button
                              type="button"
                              onClick={() => handleSaveExistingRow(idx)}
                              disabled={row.saving || !dirty}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-bold text-xs hover:bg-primary-700 transition-all disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              {row.saving ? 'Saving…' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {project ? (
          <form ref={formRef} onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="overflow-auto border border-gray-200 rounded-xl">
              <table className="min-w-[1700px] w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
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
                    <th className="px-2 py-2 text-left">Landing cost / Unit</th>
                    <th className="px-2 py-2 text-left">Total price</th>
                    <th className="px-2 py-2 text-left">MOQ</th>
                    <th className="px-2 py-2 text-left">Remarks</th>
                    <th className="px-2 py-2 text-left">Lead time (weeks)</th>
                    <th className="px-2 py-2 text-left"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, idx) => {
                    const derived = deriveRow(row);
                    const cellClass = 'w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary';
                    return (
                      <tr key={`${idx}-${row.srNo}`} className="align-top">
                        <td className="px-2 py-2 min-w-[180px]">
                          <input
                            value={row.typeOfComponent}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, typeOfComponent: e.target.value } : r))}
                            className={cellClass}
                            required={idx === 0}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[90px]">
                          <input
                            value={row.srNo}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, srNo: e.target.value } : r))}
                            className={cellClass}
                            inputMode="numeric"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[160px]">
                          <input
                            value={row.supplierName}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, supplierName: e.target.value } : r))}
                            className={cellClass}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[260px]">
                          <input
                            value={row.nomenclatureDescription}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, nomenclatureDescription: e.target.value } : r))}
                            className={cellClass}
                            required={idx === 0}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[150px]">
                          <input
                            value={row.partNoDrg}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, partNoDrg: e.target.value } : r))}
                            className={cellClass}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            value={row.make}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, make: e.target.value } : r))}
                            className={cellClass}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[120px]">
                          <input
                            value={row.qtyPerBoard}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, qtyPerBoard: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[110px]">
                          <input
                            value={row.boardReq}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, boardReq: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[110px]">
                          <input
                            value={row.spareQty}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, spareQty: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[160px]">
                          <input
                            value={String(derived.boardReqWithSpare)}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[170px]">
                          <input
                            value={String(derived.totalQtyWithSpare)}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[110px]">
                          <input
                            value={row.unitCost}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, unitCost: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[130px]">
                          <input
                            value={row.additionalCost}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, additionalCost: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[150px]">
                          <input
                            value={formatMoney(derived.landingCostPerUnit)}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[130px]">
                          <input
                            value={formatMoney(derived.totalPrice)}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-lg"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[90px]">
                          <input
                            value={row.moq}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, moq: e.target.value } : r))}
                            className={cellClass}
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[220px]">
                          <input
                            value={row.remarks}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, remarks: e.target.value } : r))}
                            className={cellClass}
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[140px]">
                          <input
                            value={row.leadTimeWeeks}
                            onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, leadTimeWeeks: e.target.value } : r))}
                            className={cellClass}
                            inputMode="numeric"
                          />
                        </td>
                        <td className="px-2 py-2 min-w-[56px]">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                            disabled={saving || rows.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={fetchProject}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                disabled={saving || loading}
              >
                Refresh
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save BOM'}
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
};

export default AddBom;
