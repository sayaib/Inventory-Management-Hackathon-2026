import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { DEPARTMENTS } from '../constants/assets';
import { BarChart3, Calculator, IndianRupee, LogOut, Search, TrendingDown, User as UserIcon } from 'lucide-react';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const formatCurrency = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
};

const FinancePanel = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('valuation');

  const departmentOptions = useMemo(() => ['All', ...DEPARTMENTS], []);

  const [valuationDepartment, setValuationDepartment] = useState('All');
  const [valuationSearch, setValuationSearch] = useState('');
  const [valuationPage, setValuationPage] = useState(1);
  const [valuationTotalPages, setValuationTotalPages] = useState(1);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationTotalValue, setValuationTotalValue] = useState(0);
  const [valuationItems, setValuationItems] = useState([]);

  const [costAssetIdOrSku, setCostAssetIdOrSku] = useState('');
  const [costFrom, setCostFrom] = useState('');
  const [costTo, setCostTo] = useState('');
  const [costLoading, setCostLoading] = useState(false);
  const [costAsset, setCostAsset] = useState(null);
  const [costLogs, setCostLogs] = useState([]);
  const [costError, setCostError] = useState('');

  const [wastageDepartment, setWastageDepartment] = useState('All');
  const [wastageFrom, setWastageFrom] = useState('');
  const [wastageTo, setWastageTo] = useState('');
  const [wastageLoading, setWastageLoading] = useState(false);
  const [wastageTotals, setWastageTotals] = useState({ totalWastageQty: 0, totalWastageValue: 0 });
  const [wastageByReason, setWastageByReason] = useState([]);
  const [wastageTopItems, setWastageTopItems] = useState([]);
  const [wastageTrend, setWastageTrend] = useState([]);

  const fetchValuation = useCallback(async () => {
    setValuationLoading(true);
    try {
      const res = await api.get('/inventory/finance/valuation', {
        params: {
          department: valuationDepartment,
          search: valuationSearch || undefined,
          page: valuationPage,
          limit: 50
        }
      });
      setValuationItems(res.data.items || []);
      setValuationTotalValue(res.data.totalInventoryValue || 0);
      setValuationTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch valuation', err);
    } finally {
      setValuationLoading(false);
    }
  }, [valuationDepartment, valuationPage, valuationSearch]);

  const fetchCostHistory = useCallback(async () => {
    if (!costAssetIdOrSku.trim()) return;
    setCostLoading(true);
    setCostError('');
    try {
      const res = await api.get('/inventory/finance/cost-history', {
        params: {
          assetIdOrSku: costAssetIdOrSku.trim(),
          from: costFrom || undefined,
          to: costTo || undefined,
          limit: 100,
          page: 1
        }
      });
      setCostAsset(res.data.asset || null);
      setCostLogs(res.data.logs || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to fetch cost history';
      setCostError(msg);
      setCostAsset(null);
      setCostLogs([]);
    } finally {
      setCostLoading(false);
    }
  }, [costAssetIdOrSku, costFrom, costTo]);

  const fetchWastage = useCallback(async () => {
    setWastageLoading(true);
    try {
      const res = await api.get('/inventory/finance/wastage-analytics', {
        params: {
          department: wastageDepartment,
          from: wastageFrom || undefined,
          to: wastageTo || undefined
        }
      });
      setWastageTotals(res.data.totals || { totalWastageQty: 0, totalWastageValue: 0 });
      setWastageByReason(res.data.byReason || []);
      setWastageTopItems(res.data.topItems || []);
      setWastageTrend(res.data.trend || []);
    } catch (err) {
      console.error('Failed to fetch wastage analytics', err);
    } finally {
      setWastageLoading(false);
    }
  }, [wastageDepartment, wastageFrom, wastageTo]);

  useEffect(() => {
    if (activeTab === 'valuation') fetchValuation();
  }, [activeTab, fetchValuation]);

  useEffect(() => {
    if (activeTab === 'wastage') fetchWastage();
  }, [activeTab, fetchWastage]);

  return (
    <div className="min-h-screen app-bg">
      <nav className="app-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" aria-label="Go to dashboard home" className="p-2 bg-primary rounded-lg">
                <img
                  src={APP_LOGO_URL}
                  alt="Optimized Solutions Ltd"
                  className="h-6 w-6 rounded bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Finance</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-700 bg-white/60 border border-slate-200/60 px-3 py-1.5 rounded-full backdrop-blur">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.username}</span>
                <span className="text-[10px] px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full uppercase font-bold tracking-wider">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center space-x-1.5 text-gray-500 hover:text-accent transition-all duration-200 font-medium text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Inventory Finance</h1>
          <p className="mt-1 text-sm text-gray-600">Inventory valuation, cost tracking, and loss/wastage analytics.</p>
        </div>

        <div className="app-tabbar">
          <button
            type="button"
            onClick={() => setActiveTab('valuation')}
            className={`px-5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'valuation' ? 'app-tab-active' : 'app-tab-idle'}`}
          >
            <Calculator className="h-4 w-4" />
            <span className="text-sm">Valuation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cost')}
            className={`px-5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'cost' ? 'app-tab-active' : 'app-tab-idle'}`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Cost Tracking</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wastage')}
            className={`px-5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${activeTab === 'wastage' ? 'app-tab-active' : 'app-tab-idle'}`}
          >
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">Loss/Wastage</span>
          </button>
        </div>

        {activeTab === 'valuation' && (
          <div className="mt-6 app-card overflow-hidden">
            <div className="p-5 border-b border-slate-200/60 bg-white/40 backdrop-blur flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Total inventory value</div>
                <div className="text-2xl font-extrabold text-gray-900">{formatCurrency(valuationTotalValue)}</div>
              </div>
              <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <select
                  value={valuationDepartment}
                  onChange={(e) => { setValuationDepartment(e.target.value); setValuationPage(1); }}
                  className="px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={valuationSearch}
                    onChange={(e) => { setValuationSearch(e.target.value); setValuationPage(1); }}
                    placeholder="Search SKU / Asset ID / Item"
                    className="pl-9 pr-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40 w-full md:w-80"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchValuation}
                  className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Refresh
                </button>
              </div>
            </div>

            {valuationLoading ? (
              <div className="p-10 text-center text-gray-500">Loading...</div>
            ) : valuationItems.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No items found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Item</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Dept</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Qty</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Avg Unit Cost</th>
                      <th className="px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {valuationItems.map((row) => (
                      <tr key={row.assetId} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-bold text-gray-900">{row.itemName}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{row.sku} · {row.assetId}</div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 font-medium">{row.department}</td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-bold">{row.totalQuantity} {row.unit}</td>
                        <td className="px-5 py-3 text-sm text-gray-700 font-bold">{formatCurrency(row.avgUnitCost)}</td>
                        <td className="px-5 py-3 text-sm text-gray-900 font-extrabold text-right">{formatCurrency(row.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 border-t border-slate-200/60 bg-white/30 backdrop-blur flex items-center justify-between">
              <div className="text-xs font-semibold text-gray-500">Page {valuationPage} / {valuationTotalPages}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValuationPage((p) => Math.max(1, p - 1))}
                  disabled={valuationPage <= 1}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200/70 rounded-lg disabled:opacity-50 hover:bg-white/60"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setValuationPage((p) => Math.min(valuationTotalPages, p + 1))}
                  disabled={valuationPage >= valuationTotalPages}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200/70 rounded-lg disabled:opacity-50 hover:bg-white/60"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="mt-6 app-card overflow-hidden">
            <div className="p-5 border-b border-slate-200/60 bg-white/40 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex-1">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Asset ID or SKU</label>
                  <input
                    value={costAssetIdOrSku}
                    onChange={(e) => setCostAssetIdOrSku(e.target.value)}
                    placeholder="e.g. ASSET-XXXX or SKU-XXXX"
                    className="mt-1 w-full px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex gap-2">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">From</label>
                    <input
                      type="date"
                      value={costFrom}
                      onChange={(e) => setCostFrom(e.target.value)}
                      className="mt-1 px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">To</label>
                    <input
                      type="date"
                      value={costTo}
                      onChange={(e) => setCostTo(e.target.value)}
                      className="mt-1 px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchCostHistory}
                    className="h-10 self-end px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    Search
                  </button>
                </div>
              </div>

              {costError && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                  {costError}
                </div>
              )}
            </div>

            <div className="p-5">
              {costLoading ? (
                <div className="py-10 text-center text-gray-500">Loading...</div>
              ) : !costAsset ? (
                <div className="py-10 text-center text-gray-500">Search an Asset ID/SKU to see movement costs.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Asset</div>
                      <div className="text-lg font-extrabold text-gray-900">{costAsset.itemName}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{costAsset.sku} · {costAsset.assetId}</div>
                    </div>
                  </div>

                  {costLogs.length === 0 ? (
                    <div className="py-10 text-center text-gray-500">No movements found for this item.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Qty</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Unit Cost</th>
                            <th className="px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {costLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700">{log.type}</td>
                              <td className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500">{log.reason || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-bold">{log.quantity} {costAsset.unit}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-bold">{formatCurrency(log.unitCost)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-extrabold text-right">{formatCurrency(log.totalCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'wastage' && (
          <div className="mt-6 space-y-6">
            <div className="app-card overflow-hidden">
              <div className="p-5 border-b border-slate-200/60 bg-white/40 backdrop-blur flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Loss/Wastage</div>
                  <div className="text-2xl font-extrabold text-gray-900">{formatCurrency(wastageTotals.totalWastageValue)}</div>
                  <div className="text-sm text-gray-600 font-bold">{wastageTotals.totalWastageQty || 0} units</div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <select
                    value={wastageDepartment}
                    onChange={(e) => setWastageDepartment(e.target.value)}
                    className="px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={wastageFrom}
                    onChange={(e) => setWastageFrom(e.target.value)}
                    className="px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="date"
                    value={wastageTo}
                    onChange={(e) => setWastageTo(e.target.value)}
                    className="px-3 py-2 text-sm bg-white/70 border border-slate-200/70 rounded-lg outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={fetchWastage}
                    className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {wastageLoading ? (
                <div className="p-10 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">By reason</div>
                    <div className="overflow-hidden border border-gray-200 rounded-xl">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason</th>
                            <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {wastageByReason.length === 0 ? (
                            <tr><td className="px-4 py-4 text-sm text-gray-500" colSpan={2}>No data.</td></tr>
                          ) : (
                            wastageByReason.map((r) => (
                              <tr key={r._id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-700">{r._id}</td>
                                <td className="px-4 py-2 text-sm font-extrabold text-gray-900 text-right">{formatCurrency(r.value)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Top items</div>
                      <div className="overflow-hidden border border-gray-200 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50">
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Item</th>
                              <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {wastageTopItems.length === 0 ? (
                              <tr><td className="px-4 py-4 text-sm text-gray-500" colSpan={2}>No data.</td></tr>
                            ) : (
                              wastageTopItems.map((i) => (
                                <tr key={i._id.assetId} className="hover:bg-gray-50">
                                  <td className="px-4 py-2">
                                    <div className="text-sm font-bold text-gray-900">{i._id.itemName}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{i._id.sku} · {i._id.assetId}</div>
                                  </td>
                                  <td className="px-4 py-2 text-sm font-extrabold text-gray-900 text-right">{formatCurrency(i.value)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Trend</div>
                      <div className="overflow-hidden border border-gray-200 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50">
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
                              <th className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {wastageTrend.length === 0 ? (
                              <tr><td className="px-4 py-4 text-sm text-gray-500" colSpan={2}>No data.</td></tr>
                            ) : (
                              wastageTrend.map((t) => (
                                <tr key={t._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-700 font-bold">{t._id}</td>
                                  <td className="px-4 py-2 text-sm font-extrabold text-gray-900 text-right">{formatCurrency(t.value)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinancePanel;
