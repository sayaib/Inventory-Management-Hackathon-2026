import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User as UserIcon, Settings, BarChart3, Users, LayoutDashboard, Package, History } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import AuditLog from '../components/AuditLog';
import AdminProfile from '../components/AdminProfile';
import api from '../api/axios';

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    users: 0,
    inventory: 0,
    lowStock: 0
  });
  const [addedTrend, setAddedTrend] = useState([]);
  const [rangePreset, setRangePreset] = useState('30d');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [hover, setHover] = useState(null);
  const [movementTrend, setMovementTrend] = useState([]);
  const [deptQty, setDeptQty] = useState([]);
  const [deptValue, setDeptValue] = useState([]);
  const purchasesRef = useRef(null);
  const [purchasesWidth, setPurchasesWidth] = useState(600);

  useEffect(() => {
    const el = purchasesRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect?.width || 0;
      if (cr > 0) setPurchasesWidth(cr);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, inventoryRes, inventoryListRes, logsInRes, logsOutRes, valuationRes] = await Promise.all([
          api.get('/auth/users'),
          api.get('/inventory'),
          api.get(`/inventory?limit=500&page=1&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
          api.get('/inventory/logs?type=IN&limit=500&page=1'),
          api.get('/inventory/logs?type=OUT&limit=500&page=1'),
          api.get('/inventory/finance/valuation?limit=500&page=1')
        ]);
        setStats({
          users: Array.isArray(usersRes.data) ? usersRes.data.length : (usersRes.data.users?.length || 0),
          inventory: inventoryRes.data.totalAssets || 0,
          lowStock: inventoryRes.data.lowStockCount || 0
        });
        const assets = Array.isArray(inventoryListRes.data?.assets) ? inventoryListRes.data.assets : [];
        const grouped = {};
        for (const a of assets) {
          const raw = a?.purchaseDate;
          if (!raw) continue;
          const key = new Date(raw).toISOString().slice(0, 10);
          grouped[key] = (grouped[key] || 0) + 1;
        }
        const series = Object.entries(grouped)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setAddedTrend(series);
        const deptMap = {};
        for (const a of assets) {
          const d = a?.department || 'Unknown';
          const q = Number(a?.availableQuantity ?? a?.totalQuantity ?? 0) || 0;
          deptMap[d] = (deptMap[d] || 0) + q;
        }
        const deptQtyArr = Object.entries(deptMap).map(([department, qty]) => ({ department, qty })).sort((a, b) => b.qty - a.qty);
        setDeptQty(deptQtyArr);
        const from = new Date(startDate);
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        const inLogs = Array.isArray(logsInRes.data?.logs) ? logsInRes.data.logs : [];
        const outLogs = Array.isArray(logsOutRes.data?.logs) ? logsOutRes.data.logs : [];
        const inMap = {};
        const outMap = {};
        for (const l of inLogs) {
          const t = l?.timestamp ? new Date(l.timestamp) : null;
          if (!t || t < from || t > to) continue;
          const k = t.toISOString().slice(0, 10);
          inMap[k] = (inMap[k] || 0) + 1;
        }
        for (const l of outLogs) {
          const t = l?.timestamp ? new Date(l.timestamp) : null;
          if (!t || t < from || t > to) continue;
          const k = t.toISOString().slice(0, 10);
          outMap[k] = (outMap[k] || 0) + 1;
        }
        const allDates = Array.from(new Set([...Object.keys(inMap), ...Object.keys(outMap)])).sort();
        setMovementTrend(allDates.map((d) => ({ date: d, inCount: inMap[d] || 0, outCount: outMap[d] || 0 })));
        const items = Array.isArray(valuationRes.data?.items) ? valuationRes.data.items : [];
        const valMap = {};
        for (const it of items) {
          const d = it?.department || 'Unknown';
          const v = Number(it?.totalValue || 0);
          valMap[d] = (valMap[d] || 0) + v;
        }
        const valArr = Object.entries(valMap).map(([department, value]) => ({ department, value })).sort((a, b) => b.value - a.value);
        setDeptValue(valArr);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, [startDate, endDate]);

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'audit', label: 'Audit Logs', icon: History },
    { key: 'reports', label: 'Reports', icon: BarChart3, disabled: true },
    { key: 'settings', label: 'Settings', icon: Settings, disabled: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-60 shrink-0 border-r border-slate-800/40 bg-slate-950 text-slate-100 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-white">Admin Portal</div>
              <div className="text-xs text-slate-300">Inventory control</div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                const isDisabled = Boolean(item.disabled);
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveTab(item.key)}
                    className={[
                      'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                      isActive ? 'bg-indigo-500/15 text-white' : 'text-slate-200 hover:bg-white/5 hover:text-white',
                      isDisabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-200' : ''
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                    {isDisabled && <span className="ml-auto text-[10px] font-bold text-slate-300">Soon</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-800/40 p-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-100 shadow-sm">
                <UserIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{user?.username || 'Admin'}</div>
                <div className="truncate text-xs text-slate-300">{user?.email || ' '}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-60">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/85 backdrop-blur">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold text-slate-900">
                  {activeTab === 'users' ? 'User Management' : activeTab === 'profile' ? 'Your Profile' : activeTab === 'audit' ? 'Audit Logs' : 'Overview'}
                </h1>
                <p className="truncate text-xs text-slate-500">Admin controls for inventory operations</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 sm:flex">
                  <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                  {user?.username || 'Admin'}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 lg:hidden"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white lg:hidden">
              <div className="w-full overflow-x-auto px-4 py-2 sm:px-6">
                <div className="flex w-max items-center gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    const isDisabled = Boolean(item.disabled);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setActiveTab(item.key)}
                        className={[
                          'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition',
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                          isDisabled ? 'cursor-not-allowed opacity-50' : ''
                        ].join(' ')}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          <div className="w-full px-4 py-4 sm:px-6">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 p-6 text-white shadow-sm">
                  <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white/80">Admin Overview</div>
                      <h2 className="mt-1 text-xl font-extrabold">Inventory Command Center</h2>
                      <p className="text-sm text-white/90">Monitor purchases, movement, and department distribution at a glance.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-300"></span>
                        {startDate} – {endDate}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                        <span className="inline-block h-2 w-2 rounded-full bg-white/70"></span>
                        {stats.inventory} items
                      </span>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Users</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700">
                        <Users className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{stats.users}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Registered accounts</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Inventory</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                        <Package className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{stats.inventory}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Tracked assets/items</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Low stock</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600/10 text-rose-700">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-rose-700">{stats.lowStock}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Items needing attention</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Purchases by date</h3>
                      <p className="text-xs text-slate-500">Counts of items by purchase date</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                        {[
                          { key: '7d', label: '7d', days: 7 },
                          { key: '14d', label: '14d', days: 14 },
                          { key: '30d', label: '30d', days: 30 },
                          { key: '90d', label: '90d', days: 90 }
                        ].map((p) => {
                          const isActive = rangePreset === p.key;
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => {
                                setRangePreset(p.key);
                                const e = new Date();
                                const s = new Date();
                                s.setDate(e.getDate() - (p.days - 1));
                                setStartDate(s.toISOString().slice(0, 10));
                                setEndDate(e.toISOString().slice(0, 10));
                              }}
                              className={[
                                'px-2 py-1 text-[11px] font-bold rounded-full',
                                isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                              ].join(' ')}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setRangePreset('custom')}
                          className={[
                            'px-2 py-1 text-[11px] font-bold rounded-full',
                            rangePreset === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          ].join(' ')}
                        >
                          Custom
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setRangePreset('custom');
                            setStartDate(e.target.value);
                          }}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                        />
                        <span className="text-xs font-bold text-slate-500">–</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setRangePreset('custom');
                            setEndDate(e.target.value);
                          }}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="p-4" ref={purchasesRef}>
                    {(() => {
                      const data = addedTrend;
                      const hoverable = true;
                      const maxVal = data.reduce((m, d) => Math.max(m, d.count), 0);
                      const height = 220;
                      const padL = 36;
                      const padR = 16;
                      const padT = 16;
                      const padB = 32;
                      const width = purchasesWidth;
                      const chartW = Math.max(0, width - padL - padR);
                      const chartH = height - padB - padT;
                      const n = Math.max(1, data.length);
                      let barGap = 8;
                      let barW = Math.floor((chartW - (n - 1) * barGap) / n);
                      if (barW < 4) {
                        barGap = 1;
                        barW = Math.max(2, Math.floor((chartW - (n - 1) * barGap) / n));
                      }
                      return (
                        <div className="w-full">
                          {data.length === 0 ? (
                            <div className="text-sm text-slate-500">No recent inventory additions.</div>
                          ) : (
                            <svg width={width} height={height} className="text-slate-400">
                              <defs>
                                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.9" />
                                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.6" />
                                </linearGradient>
                              </defs>
                              <rect x="0" y="0" width={width} height={height} rx="12" className="fill-slate-50" />
                              <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="currentColor" strokeWidth="1" />
                              <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="currentColor" strokeWidth="1" />
                              {Array.from({ length: 4 }).map((_, i) => {
                                const y = padT + (chartH * i) / 4;
                                return <line key={i} x1={padL} y1={y} x2={width - padR} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />;
                              })}
                              {data.map((d, idx) => {
                                const x = padL + idx * (barW + barGap);
                                const h = maxVal > 0 ? Math.round((d.count / maxVal) * chartH) : 0;
                                const y = height - padB - h;
                                return (
                                  <g key={d.date} onMouseEnter={() => hoverable && setHover({ x: x + barW / 2, y, date: d.date, count: d.count })} onMouseLeave={() => hoverable && setHover(null)}>
                                    <rect x={x} y={y} width={barW} height={h} rx="6" fill="url(#barFill)" />
                                    <text x={x + barW / 2} y={height - padB + 16} textAnchor="middle" fontSize="10" className="fill-slate-600">
                                      {d.date.slice(5).replace('-', '/')}
                                    </text>
                                  </g>
                                );
                              })}
                              {Array.from({ length: 5 }).map((_, i) => {
                                const val = Math.round((maxVal * i) / 4);
                                const y = height - padB - (chartH * i) / 4;
                                return (
                                  <text key={i} x={padL - 8} y={y} textAnchor="end" fontSize="10" className="fill-slate-600">
                                    {val}
                                  </text>
                                );
                              })}
                              {hover && (
                                <g transform={`translate(${hover.x},${hover.y - 10})`}>
                                  <rect x={-44} y={-28} width="88" height="24" rx="6" className="fill-slate-900" />
                                  <text x="0" y="-12" textAnchor="middle" fontSize="10" className="fill-white font-bold">
                                    {hover.count} items
                                  </text>
                                  <text x="0" y="-2" textAnchor="middle" fontSize="9" className="fill-slate-300">
                                    {hover.date}
                                  </text>
                                </g>
                              )}
                            </svg>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">Stock movement trend</h3>
                        <p className="text-xs text-slate-500">IN vs OUT within selected dates</p>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <span className="inline-flex items-center gap-1 text-indigo-700"><span className="h-2 w-2 rounded-full bg-indigo-600"></span> IN</span>
                        <span className="inline-flex items-center gap-1 text-rose-700"><span className="h-2 w-2 rounded-full bg-rose-600"></span> OUT</span>
                      </div>
                    </div>
                    <div className="p-4">
                      {(() => {
                        const data = movementTrend;
                        const height = 220;
                        const padL = 36;
                        const padR = 16;
                        const padT = 16;
                        const padB = 32;
                        const chartW = Math.max(560 - padL - padR, data.length * 36);
                        const width = chartW + padL + padR;
                        const chartH = height - padB - padT;
                        const maxVal = data.reduce((m, d) => Math.max(m, d.inCount, d.outCount), 0);
                        const pointsIn = data.map((d, i) => {
                          const x = padL + (chartW / Math.max(1, data.length - 1)) * i;
                          const y = padT + (maxVal > 0 ? chartH - (d.inCount / maxVal) * chartH : chartH);
                          return `${x},${y}`;
                        }).join(' ');
                        const pointsOut = data.map((d, i) => {
                          const x = padL + (chartW / Math.max(1, data.length - 1)) * i;
                          const y = padT + (maxVal > 0 ? chartH - (d.outCount / maxVal) * chartH : chartH);
                          return `${x},${y}`;
                        }).join(' ');
                        return (
                          <div className="w-full overflow-x-auto">
                            {data.length === 0 ? (
                              <div className="text-sm text-slate-500">No movement data.</div>
                            ) : (
                              <svg width={width} height={height} className="text-slate-400">
                                <rect x="0" y="0" width={width} height={height} rx="12" className="fill-slate-50" />
                                <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="currentColor" strokeWidth="1" />
                                <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="currentColor" strokeWidth="1" />
                                {Array.from({ length: 4 }).map((_, i) => {
                                  const y = padT + (chartH * i) / 4;
                                  return <line key={i} x1={padL} y1={y} x2={width - padR} y2={y} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />;
                                })}
                                <polyline points={pointsIn} fill="none" stroke="#6366F1" strokeWidth="2" />
                                <polyline points={pointsOut} fill="none" stroke="#E11D48" strokeWidth="2" />
                                {data.map((d, i) => {
                                  const x = padL + (chartW / Math.max(1, data.length - 1)) * i;
                                  return (
                                    <text key={d.date} x={x} y={height - padB + 16} textAnchor="middle" fontSize="10" className="fill-slate-600">
                                      {d.date.slice(5).replace('-', '/')}
                                    </text>
                                  );
                                })}
                                {Array.from({ length: 5 }).map((_, i) => {
                                  const val = Math.round((maxVal * i) / 4);
                                  const y = height - padB - (chartH * i) / 4;
                                  return (
                                    <text key={i} x={padL - 8} y={y} textAnchor="end" fontSize="10" className="fill-slate-600">
                                      {val}
                                    </text>
                                  );
                                })}
                              </svg>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">Stock by department</h3>
                        <p className="text-xs text-slate-500">Available quantity distribution</p>
                      </div>
                    </div>
                    <div className="p-4">
                      {(() => {
                        const data = deptQty.slice(0, 8);
                        const maxVal = data.reduce((m, d) => Math.max(m, d.qty), 0);
                        return (
                          <div className="space-y-2">
                            {data.length === 0 ? (
                              <div className="text-sm text-slate-500">No department data.</div>
                            ) : (
                              data.map((d) => {
                                const pct = maxVal > 0 ? Math.round((d.qty / maxVal) * 100) : 0;
                                return (
                                  <div key={d.department} className="flex items-center gap-3">
                                    <div className="w-28 shrink-0 text-xs font-bold text-slate-700">{d.department}</div>
                                    <div className="flex-1 h-3 rounded-full bg-slate-100">
                                      <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                                    </div>
                                    <div className="w-16 shrink-0 text-right text-xs font-extrabold text-slate-700">{d.qty}</div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Inventory value by department</h3>
                      <p className="text-xs text-slate-500">Snapshot based on average cost</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {(() => {
                      const data = deptValue.slice(0, 8);
                      const total = data.reduce((s, d) => s + d.value, 0);
                      return (
                        <div className="space-y-2">
                          {data.length === 0 ? (
                            <div className="text-sm text-slate-500">No valuation data.</div>
                          ) : (
                            data.map((d) => {
                              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                              return (
                                <div key={d.department} className="flex items-center gap-3">
                                  <div className="w-28 shrink-0 text-xs font-bold text-slate-700">{d.department}</div>
                                  <div className="flex-1 h-3 rounded-full bg-slate-100">
                                    <div className="h-3 rounded-full bg-indigo-500" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <div className="w-24 shrink-0 text-right text-xs font-extrabold text-slate-700">₹{Math.round(d.value).toLocaleString()}</div>
                                  <div className="w-10 shrink-0 text-right text-[11px] font-bold text-slate-500">{pct}%</div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'users' && <UserManagement />}

            {activeTab === 'audit' && <AuditLog />}

            {activeTab === 'profile' && <AdminProfile />}

            {activeTab === 'reports' && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                Reports UI coming soon.
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                Settings UI coming soon.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
