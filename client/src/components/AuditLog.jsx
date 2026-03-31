import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { ChevronLeft, ChevronRight, RefreshCcw, Search, X } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const safePrettyJson = (value) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '';
  }
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 25;

  const actionOptions = useMemo(() => {
    const uniq = new Set();
    for (const l of logs || []) {
      if (l?.action) uniq.add(l.action);
    }
    return Array.from(uniq).sort();
  }, [logs]);

  const fetchLogs = useCallback(
    async (nextPage) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page: nextPage,
          limit
        };
        if (search) params.search = search;
        if (action) params.action = action;
        if (actor) {
          params.actorEmail = actor;
          params.actorUsername = actor;
        }
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get('/audit-logs', { params });
        setLogs(res.data?.logs || []);
        setTotalPages(res.data?.totalPages || 1);
        setPage(res.data?.currentPage || nextPage);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    },
    [action, actor, endDate, search, startDate]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const onApplyFilters = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const onClearFilters = () => {
    setSearch('');
    setAction('');
    setActor('');
    setStartDate('');
    setEndDate('');
    fetchLogs(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Audit log</h2>
            <p className="text-xs text-slate-500">Track who did what, when, and the relevant details.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchLogs(page)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <form onSubmit={onApplyFilters} className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-600">Search</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 outline-none"
                placeholder="Action, email, entity, details…"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-600">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-bold text-slate-600">Actor</label>
            <input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              placeholder="Email or username"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-600">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-600">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="flex gap-2 lg:col-span-12">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-indigo-700"
              disabled={loading}
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  When
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                    No audit events match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(log)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                      {formatDateTime(log.occurredAt || log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-bold text-slate-900">{log.actor?.username || '—'}</div>
                      <div className="text-xs text-slate-500">{log.actor?.email || ''}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-bold text-slate-900">{log.entity?.type || '—'}</div>
                      <div className="text-xs text-slate-500">{log.entity?.id || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="line-clamp-2 max-w-xl text-xs text-slate-600">
                        {safePrettyJson(log.details).slice(0, 160)}
                        {safePrettyJson(log.details).length > 160 ? '…' : ''}
                      </div>
                      <div className="mt-1 text-xs font-bold text-indigo-700">Click to view</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs(Math.max(1, page - 1))}
              disabled={loading || page <= 1}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
              disabled={loading || page >= totalPages}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/30 p-4 sm:items-center">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-slate-900">{selected.action}</div>
                <div className="truncate text-xs text-slate-500">
                  {formatDateTime(selected.occurredAt || selected.createdAt)} • {selected.actor?.email || selected.actor?.username || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-600">Actor</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">{selected.actor?.username || '—'}</div>
                <div className="text-xs text-slate-600">{selected.actor?.email || ''}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{selected.actor?.role || ''}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-600">Entity</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">{selected.entity?.type || '—'}</div>
                <div className="text-xs text-slate-600">{selected.entity?.id || ''}</div>
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-600">Details</div>
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                {safePrettyJson(selected.details)}
              </pre>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="font-bold text-slate-700">IP</div>
                  <div className="truncate">{selected.ip || '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="font-bold text-slate-700">User agent</div>
                  <div className="truncate">{selected.userAgent || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
