import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const toNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const trimOrUndefined = (value) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const BomChangeRequest = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [project, setProject] = useState(null);
  const [requests, setRequests] = useState([]);

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBomItemId, setSelectedBomItemId] = useState('');
  const [proposed, setProposed] = useState({
    typeOfComponent: '',
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
    leadTimeWeeks: '',
    remarks: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = [ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.INVENTORY_MANAGER].includes(user?.role);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError('');
    try {
      const res = await api.get('/projects');
      const list = res.data?.projects || [];
      setProjects(list);

      const initialFromQuery = String(searchParams.get('projectId') || '').trim();
      const first = list?.[0]?._id || '';
      const nextSelected = initialFromQuery && list.some((p) => String(p._id) === initialFromQuery) ? initialFromQuery : first;
      setSelectedProjectId((prev) => prev || nextSelected);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchProject = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingProject(true);
    setError('');
    try {
      const res = await api.get(`/projects/${selectedProjectId}`);
      setProject(res.data?.project || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project');
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const fetchRequests = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoadingRequests(true);
    try {
      const res = await api.get(`/projects/${selectedProjectId}/bom-change-requests`);
      setRequests(res.data?.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setSelectedBomItemId('');
  }, [selectedProjectId]);

  const bomItems = useMemo(() => {
    const items = Array.isArray(project?.bomItems) ? project.bomItems : [];
    return items.slice().sort((a, b) => Number(a?.srNo || 0) - Number(b?.srNo || 0));
  }, [project?.bomItems]);

  const selectedBomItem = useMemo(() => {
    if (!selectedBomItemId) return null;
    return bomItems.find((b) => String(b?._id) === String(selectedBomItemId)) || null;
  }, [bomItems, selectedBomItemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    if (!canSubmit) return;

    setError('');
    setSuccess('');

    const nextTitle = title.trim();
    const nextReason = reason.trim();
    if (!nextTitle || !nextReason) {
      setError('Please provide a title and reason');
      return;
    }

    const proposedChanges = {};
    const stringKeys = [
      'typeOfComponent',
      'supplierName',
      'nomenclatureDescription',
      'partNoDrg',
      'make',
      'remarks'
    ];
    for (const k of stringKeys) {
      const v = trimOrUndefined(proposed?.[k]);
      if (v !== undefined) proposedChanges[k] = v;
    }

    const numberKeys = ['qtyPerBoard', 'boardReq', 'spareQty', 'unitCost', 'additionalCost', 'moq', 'leadTimeWeeks'];
    for (const k of numberKeys) {
      const v = toNumberOrUndefined(proposed?.[k]);
      if (v !== undefined) proposedChanges[k] = v;
    }

    if (!selectedBomItemId && Object.keys(proposedChanges).length === 0) {
      setError('Select a BOM item or provide at least one proposed change');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: nextTitle,
        priority,
        reason: nextReason,
        notes: notes.trim(),
        effectiveDate: effectiveDate || null,
        bomItemId: selectedBomItemId || null,
        proposedChanges
      };
      await api.post(`/projects/${selectedProjectId}/bom-change-requests`, payload);
      await fetchRequests();
      setSuccess('BOM change request submitted');
      setTitle('');
      setPriority('medium');
      setEffectiveDate('');
      setReason('');
      setNotes('');
      setSelectedBomItemId('');
      setProposed({
        typeOfComponent: '',
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
        leadTimeWeeks: '',
        remarks: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit change request');
    } finally {
      setSubmitting(false);
    }
  };

  const sortedRequests = useMemo(() => {
    const list = Array.isArray(requests) ? requests : [];
    return list
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
  }, [requests]);

  const formatDateTime = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
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
              <span className="text-xl font-bold text-gray-900 tracking-tight">BOM Change Request</span>
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
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Project</div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  disabled={loadingProjects}
                >
                  <option value="" disabled>
                    {loadingProjects ? 'Loading projects...' : 'Select project'}
                  </option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">BOM Item (Optional)</div>
                <select
                  value={selectedBomItemId}
                  onChange={(e) => setSelectedBomItemId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  disabled={!selectedProjectId || loadingProject}
                >
                  <option value="">
                    {loadingProject ? 'Loading BOM...' : bomItems.length ? 'Select BOM item' : 'No BOM items found'}
                  </option>
                  {bomItems.map((b) => (
                    <option key={b._id} value={b._id}>
                      SR {b.srNo} — {b.nomenclatureDescription || b.partNoDrg || 'BOM Item'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {canSubmit ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Title</div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Replace connector due to lead time"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</div>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Effective Date</div>
                    <input
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      type="date"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Reason</div>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. vendor EOL / cost reduction / availability"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes (Optional)</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Any extra context for presales/procurement/approvers"
                  />
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="text-sm font-extrabold text-gray-900">Proposed Changes</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={proposed.typeOfComponent}
                      onChange={(e) => setProposed((p) => ({ ...p, typeOfComponent: e.target.value }))}
                      placeholder="Type of Component"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.supplierName}
                      onChange={(e) => setProposed((p) => ({ ...p, supplierName: e.target.value }))}
                      placeholder="Supplier Name"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.nomenclatureDescription}
                      onChange={(e) => setProposed((p) => ({ ...p, nomenclatureDescription: e.target.value }))}
                      placeholder="Nomenclature / Description"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.partNoDrg}
                      onChange={(e) => setProposed((p) => ({ ...p, partNoDrg: e.target.value }))}
                      placeholder="Part No / Drg"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.make}
                      onChange={(e) => setProposed((p) => ({ ...p, make: e.target.value }))}
                      placeholder="Make"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.remarks}
                      onChange={(e) => setProposed((p) => ({ ...p, remarks: e.target.value }))}
                      placeholder="Remarks"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={proposed.qtyPerBoard}
                      onChange={(e) => setProposed((p) => ({ ...p, qtyPerBoard: e.target.value }))}
                      placeholder="Qty per Board"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.boardReq}
                      onChange={(e) => setProposed((p) => ({ ...p, boardReq: e.target.value }))}
                      placeholder="Board Req"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.spareQty}
                      onChange={(e) => setProposed((p) => ({ ...p, spareQty: e.target.value }))}
                      placeholder="Spare Qty"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.unitCost}
                      onChange={(e) => setProposed((p) => ({ ...p, unitCost: e.target.value }))}
                      placeholder="Unit Cost"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.additionalCost}
                      onChange={(e) => setProposed((p) => ({ ...p, additionalCost: e.target.value }))}
                      placeholder="Additional Cost"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.moq}
                      onChange={(e) => setProposed((p) => ({ ...p, moq: e.target.value }))}
                      placeholder="MOQ"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      value={proposed.leadTimeWeeks}
                      onChange={(e) => setProposed((p) => ({ ...p, leadTimeWeeks: e.target.value }))}
                      placeholder="Lead Time (Weeks)"
                      inputMode="decimal"
                      className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary md:col-span-3"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedProjectId}
                  className="w-full bg-primary text-white px-4 py-2.5 rounded-xl font-extrabold hover:bg-primary-700 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Change Request'}
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 font-bold">
                You can view submitted change requests here. Submissions are allowed for Project Manager / Admin / Inventory Manager.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="text-sm font-extrabold text-gray-900">Current BOM Snapshot</div>
            {!selectedBomItem ? (
              <div className="text-sm text-gray-600">
                Select a BOM item to preview current values. You can still submit a request without selecting an item if you
                provide proposed changes.
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">SR No</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.srNo}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Description</span>
                  <span className="text-gray-900 font-extrabold text-right">
                    {selectedBomItem.nomenclatureDescription || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Part No</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.partNoDrg || '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Make</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.make || '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Qty/Board</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.qtyPerBoard}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Board Req</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.boardReq}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Spare</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.spareQty}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Unit Cost</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.unitCost}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 font-bold">Lead Time (Weeks)</span>
                  <span className="text-gray-900 font-extrabold">{selectedBomItem.leadTimeWeeks}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-base font-extrabold text-gray-900">Submitted Change Requests</div>
            <button
              type="button"
              onClick={fetchRequests}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-extrabold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60"
              disabled={!selectedProjectId || loadingRequests}
            >
              {loadingRequests ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {!selectedProjectId ? (
            <div className="text-sm text-gray-600">Select a project to see its change requests.</div>
          ) : loadingRequests ? (
            <div className="text-sm text-gray-600">Loading requests...</div>
          ) : sortedRequests.length === 0 ? (
            <div className="text-sm text-gray-600">No change requests submitted for this project yet.</div>
          ) : (
            <div className="space-y-3">
              {sortedRequests.map((r) => (
                <div key={r?._id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-gray-900 truncate">{r?.title || 'Untitled request'}</div>
                      <div className="mt-0.5 text-xs text-gray-600">
                        {formatDateTime(r?.createdAt)} {r?.requestedBy?.username ? `• by ${r.requestedBy.username}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                        {String(r?.priority || 'medium')}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold text-primary-700 uppercase tracking-wider">
                        {String(r?.status || 'submitted')}
                      </span>
                    </div>
                  </div>

                  {r?.bomItemId && (
                    <div className="mt-2 text-xs text-gray-700 font-bold">
                      BOM Item: {r?.currentBomItem?.srNo ? `SR ${r.currentBomItem.srNo}` : 'Selected'}{' '}
                      {r?.currentBomItem?.nomenclatureDescription ? `— ${r.currentBomItem.nomenclatureDescription}` : ''}
                    </div>
                  )}

                  {r?.reason && <div className="mt-2 text-sm text-gray-700"><span className="font-extrabold">Reason:</span> {r.reason}</div>}

                  {r?.proposedChanges && Object.keys(r.proposedChanges || {}).length > 0 && (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Proposed Changes</div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(r.proposedChanges || {}).map(([k, v]) => (
                          <div key={k} className="text-sm text-gray-700">
                            <span className="font-extrabold">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {r?.notes && <div className="mt-2 text-sm text-gray-700"><span className="font-extrabold">Notes:</span> {r.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BomChangeRequest;
