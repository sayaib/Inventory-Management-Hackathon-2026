import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User as UserIcon, Settings, BarChart3, Users, LayoutDashboard, Package, History, FolderKanban, Download } from 'lucide-react';
import UserManagement from '../components/UserManagement';
import AuditLog from '../components/AuditLog';
import AdminProfile from '../components/AdminProfile';
import api from '../api/axios';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

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
  const [projectStatusRows, setProjectStatusRows] = useState([]);
  const [projectStatusLoading, setProjectStatusLoading] = useState(false);
  const [projectStatusError, setProjectStatusError] = useState('');
  const [projectStatusSearch, setProjectStatusSearch] = useState('');
  const [projectStatusDept, setProjectStatusDept] = useState('all');
  const [reportDept, setReportDept] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [lowStockRows, setLowStockRows] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockError, setLowStockError] = useState('');
  const [lowStockPage, setLowStockPage] = useState(1);
  const [lowStockTotalPages, setLowStockTotalPages] = useState(1);
  const [lowStockDept, setLowStockDept] = useState('all');
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [valuationRows, setValuationRows] = useState([]);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState('');
  const [valuationPage, setValuationPage] = useState(1);
  const [valuationTotalPages, setValuationTotalPages] = useState(1);
  const [valuationDept, setValuationDept] = useState('all');
  const [valuationSearch, setValuationSearch] = useState('');
  const [valuationTotalValue, setValuationTotalValue] = useState(0);
  const [reportLogRows, setReportLogRows] = useState([]);
  const [reportLogLoading, setReportLogLoading] = useState(false);
  const [reportLogError, setReportLogError] = useState('');
  const [reportLogPage, setReportLogPage] = useState(1);
  const [reportLogTotalPages, setReportLogTotalPages] = useState(1);
  const [reportLogType, setReportLogType] = useState('ALL');
  const [reportLogSearch, setReportLogSearch] = useState('');

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

  const normalizeDepartment = (value) => {
    const next = typeof value === 'string' ? value.trim() : '';
    return next || 'Unassigned';
  };

  const formatRupees = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '₹0';
    return `₹${Math.round((n + Number.EPSILON) * 100) / 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const downloadCsv = (fileName, rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) return;
    const headers = Object.keys(safeRows[0] || {});
    const escapeCell = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.map(escapeCell).join(','),
      ...safeRows.map((r) => headers.map((h) => escapeCell(r?.[h])).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fetchProjectStatuses = async () => {
    setProjectStatusLoading(true);
    setProjectStatusError('');
    try {
      const res = await api.get('/projects/status/overview');
      const rows = Array.isArray(res.data?.projects) ? res.data.projects : [];
      setProjectStatusRows(rows);
    } catch (err) {
      setProjectStatusError(err.response?.data?.message || 'Failed to fetch project statuses');
    } finally {
      setProjectStatusLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'projectStatus' && activeTab !== 'reports') return;
    fetchProjectStatuses();
  }, [activeTab]);
  
  const fetchLowStock = async () => {
    setLowStockLoading(true);
    setLowStockError('');
    try {
      const params = new URLSearchParams();
      params.set('lowStock', 'true');
      params.set('limit', '20');
      params.set('page', String(lowStockPage));
      if (lowStockDept !== 'all') params.set('department', lowStockDept);
      if (lowStockSearch.trim()) params.set('search', lowStockSearch.trim());
      const res = await api.get(`/inventory?${params.toString()}`);
      const rows = Array.isArray(res.data?.assets) ? res.data.assets : [];
      setLowStockRows(rows);
      setLowStockTotalPages(Number(res.data?.totalPages || 1));
    } catch (err) {
      setLowStockError(err.response?.data?.message || 'Failed to fetch low stock');
    } finally {
      setLowStockLoading(false);
    }
  };
  
  const fetchValuation = async () => {
    setValuationLoading(true);
    setValuationError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('page', String(valuationPage));
      if (valuationDept !== 'all') params.set('department', valuationDept);
      if (valuationSearch.trim()) params.set('search', valuationSearch.trim());
      const res = await api.get(`/inventory/finance/valuation?${params.toString()}`);
      const rows = Array.isArray(res.data?.items) ? res.data.items : [];
      setValuationRows(rows);
      setValuationTotalPages(Number(res.data?.totalPages || 1));
      setValuationTotalValue(Number(res.data?.totalInventoryValue || 0));
    } catch (err) {
      setValuationError(err.response?.data?.message || 'Failed to fetch valuation');
    } finally {
      setValuationLoading(false);
    }
  };
  
  const fetchReportLogs = async () => {
    setReportLogLoading(true);
    setReportLogError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      params.set('page', String(reportLogPage));
      if (reportLogType !== 'ALL') params.set('type', reportLogType);
      if (reportLogSearch.trim()) params.set('search', reportLogSearch.trim());
      const res = await api.get(`/inventory/logs?${params.toString()}`);
      const rows = Array.isArray(res.data?.logs) ? res.data.logs : [];
      setReportLogRows(rows);
      setReportLogTotalPages(Number(res.data?.totalPages || 1));
    } catch (err) {
      setReportLogError(err.response?.data?.message || 'Failed to fetch logs');
    } finally {
      setReportLogLoading(false);
    }
  };
  
  useEffect(() => {
    if (activeTab !== 'reports') return;
    fetchLowStock();
    fetchValuation();
    fetchReportLogs();
  }, [
    activeTab,
    lowStockPage,
    lowStockDept,
    lowStockSearch,
    valuationPage,
    valuationDept,
    valuationSearch,
    reportLogPage,
    reportLogType,
    reportLogSearch
  ]);

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'projectStatus', label: 'Project Status', icon: FolderKanban },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'audit', label: 'Audit Logs', icon: History },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings, disabled: true }
  ];

  const deptQtyMap = (() => {
    const map = new Map();
    for (const row of deptQty || []) {
      const key = normalizeDepartment(row?.department);
      map.set(key, Number(row?.qty || 0));
    }
    return map;
  })();

  const deptValueMap = (() => {
    const map = new Map();
    for (const row of deptValue || []) {
      const key = normalizeDepartment(row?.department);
      map.set(key, Number(row?.value || 0));
    }
    return map;
  })();

  const deptProjectReport = (() => {
    const map = new Map();
    for (const p of projectStatusRows || []) {
      const dept = normalizeDepartment(p?.department);
      const current = map.get(dept) || {
        department: dept,
        projectCount: 0,
        allocatedProjects: 0,
        bomProjects: 0,
        usedTotal: 0,
        basisTotal: 0,
        lastActivityAt: null
      };
      current.projectCount += 1;
      if (p?.statuses?.inventoryAllocated?.value) current.allocatedProjects += 1;
      if (p?.statuses?.bomCreated?.value) current.bomProjects += 1;
      const used = Number(p?.statuses?.utilization?.usedTotal || 0);
      const denom = Number(p?.statuses?.utilization?.denominator || 0);
      if (Number.isFinite(used)) current.usedTotal += used;
      if (Number.isFinite(denom)) current.basisTotal += denom;
      const lastAt = p?.lastActivityAt ? new Date(p.lastActivityAt) : null;
      if (lastAt && !Number.isNaN(lastAt.getTime())) {
        if (!current.lastActivityAt || lastAt > current.lastActivityAt) current.lastActivityAt = lastAt;
      }
      map.set(dept, current);
    }
    const out = Array.from(map.values()).map((d) => {
      const basisTotal = Math.round((Number(d.basisTotal || 0) + Number.EPSILON) * 100) / 100;
      const usedTotal = Math.round((Number(d.usedTotal || 0) + Number.EPSILON) * 100) / 100;
      const utilizationPercent =
        basisTotal > 0 ? Math.round(((usedTotal / basisTotal) * 100 + Number.EPSILON) * 10) / 10 : 0;
      const stockQty = Math.max(0, Number(deptQtyMap.get(d.department) || 0));
      const stockValue = Math.max(0, Number(deptValueMap.get(d.department) || 0));
      return {
        ...d,
        usedTotal,
        basisTotal,
        utilizationPercent,
        stockQty,
        stockValue,
        lastActivityAt: d.lastActivityAt ? d.lastActivityAt.toISOString() : null
      };
    });
    out.sort((a, b) => (b.stockValue || 0) - (a.stockValue || 0));
    return out;
  })();

  const reportDepartments = (() => {
    const set = new Set();
    for (const d of deptProjectReport || []) set.add(d.department);
    for (const d of deptQtyMap.keys()) set.add(d);
    for (const d of deptValueMap.keys()) set.add(d);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  })();

  const filteredDeptReport = (() => {
    if (reportDept === 'all') return deptProjectReport;
    return (deptProjectReport || []).filter((d) => d.department === reportDept);
  })();

  const filteredProjectDetails = (() => {
    const q = reportSearch.trim().toLowerCase();
    const list = (projectStatusRows || []).filter((p) => {
      const dept = normalizeDepartment(p?.department);
      if (reportDept !== 'all' && dept !== reportDept) return false;
      if (!q) return true;
      const hay = `${p?.code || ''} ${p?.name || ''} ${dept}`.toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => String(a?.code || '').localeCompare(String(b?.code || '')));
    return list;
  })();
 
  const dummyInventoryStatus = [
    { name: 'Steel Rod 12mm', department: 'ATE', status: 'Completed', allocated: true, procured: true, utilUsed: 120, utilDen: 200, utilPct: 60, lastActivityAt: new Date().toISOString() },
    { name: 'Copper Wire 2.5mm', department: 'IT', status: 'In Progress', allocated: false, procured: false, utilUsed: 0, utilDen: 0, utilPct: 0, lastActivityAt: null },
    { name: 'PVC Pipe 1"', department: 'IoT', status: 'Completed', allocated: true, procured: true, utilUsed: 40, utilDen: 50, utilPct: 80, lastActivityAt: new Date().toISOString() },
    { name: 'Server RAM 16GB', department: 'DTMA', status: 'In Progress', allocated: true, procured: false, utilUsed: 8, utilDen: 32, utilPct: 25, lastActivityAt: new Date().toISOString() },
    { name: 'Safety Gloves', department: 'PES', status: 'Completed', allocated: true, procured: true, utilUsed: 0, utilDen: 0, utilPct: 0, lastActivityAt: null },
    { name: 'Paint Primer', department: 'ATE', status: 'Completed', allocated: true, procured: true, utilUsed: 18, utilDen: 30, utilPct: 60, lastActivityAt: new Date().toISOString() },
    { name: 'Router AX', department: 'IT', status: 'In Progress', allocated: false, procured: true, utilUsed: 0, utilDen: 0, utilPct: 0, lastActivityAt: null },
    { name: 'Bearing 6203', department: 'IoT', status: 'Completed', allocated: true, procured: true, utilUsed: 75, utilDen: 100, utilPct: 75, lastActivityAt: new Date().toISOString() },
    { name: 'LED Panel', department: 'DTMA', status: 'Completed', allocated: true, procured: true, utilUsed: 20, utilDen: 25, utilPct: 80, lastActivityAt: new Date().toISOString() },
    { name: 'Cable Tray', department: 'PES', status: 'In Progress', allocated: false, procured: false, utilUsed: 0, utilDen: 0, utilPct: 0, lastActivityAt: null }
  ];
 
   const dummyInventoryStatusResolved = dummyInventoryStatus.map((r) => ({
     ...r,
     allocated: r.status === 'Completed' ? true : r.allocated,
     procured: r.status === 'Completed' ? true : r.procured
   }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-60 shrink-0 border-r border-slate-800/40 bg-slate-950 text-slate-100 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <img
                src={APP_LOGO_URL}
                alt="Optimized Solutions Ltd"
                className="h-6 w-6 rounded bg-white object-contain"
                loading="lazy"
                decoding="async"
              />
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
                const isDisabled = item.disabled === true;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveTab(item.key)}
                    className={[
                      'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                      isActive ? 'bg-primary/20 text-white' : 'text-slate-200 hover:bg-white/5 hover:text-white',
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
                  {activeTab === 'users' ? 'User Management' : activeTab === 'profile' ? 'Your Profile' : activeTab === 'audit' ? 'Audit Logs' : activeTab === 'projectStatus' ? 'Project Status' : activeTab === 'reports' ? 'Reports' : 'Overview'}
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
                    const isDisabled = item.disabled === true;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setActiveTab(item.key)}
                        className={[
                          'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition',
                          isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
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
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-primary via-primary-700 to-accent p-6 text-white shadow-sm">
                  <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white/80">Admin Overview</div>
                      <h2 className="mt-1 text-xl font-extrabold">Inventory Command Center</h2>
                      <p className="text-sm text-white/90">Monitor purchases, movement, and department distribution at a glance.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
                        <span className="inline-block h-2 w-2 rounded-full bg-accent-200"></span>
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
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
                        <Users className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{stats.users}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Registered accounts</div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-600">Inventory</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
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
                              isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
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
                          rangePreset === 'custom' ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
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
                        <span className="inline-flex items-center gap-1 text-primary-700"><span className="h-2 w-2 rounded-full bg-primary"></span> IN</span>
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
                                      <div className="h-3 rounded-full bg-primary" style={{ width: `${pct}%` }}></div>
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
                                    <div className="h-3 rounded-full bg-primary" style={{ width: `${pct}%` }}></div>
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
 
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Current inventory status</div>
                      <div className="text-xs text-slate-500">Allocated, utilization, and procurement (dummy)</div>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">{dummyInventoryStatusResolved.length} items</div>
                  </div>
                  <div className="w-full overflow-auto">
                    {(() => {
                      const badge = (ok, yes, no) => (
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                            ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                          ].join(' ')}
                        >
                          {ok ? yes : no}
                        </span>
                      );
                      return (
                        <table className="min-w-[1000px] w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-[11px] font-extrabold text-slate-700">
                              <th className="px-4 py-3">Asset</th>
                              <th className="px-4 py-3">Department</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Allocated</th>
                              <th className="px-4 py-3">Utilization</th>
                              <th className="px-4 py-3">Procured</th>
                              <th className="px-4 py-3">Last activity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dummyInventoryStatusResolved.map((r, idx) => (
                              <tr key={`${r.name}-${idx}`} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <div className="font-extrabold text-slate-900">{r.name}</div>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-extrabold text-slate-700">{r.department}</td>
                                <td className="px-4 py-3">
                                  {(() => {
                                    const cls =
                                      r.status === 'Completed'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : r.status === 'In Progress'
                                          ? 'bg-primary/10 text-primary-700 border border-primary/20'
                                          : 'bg-slate-50 text-slate-700 border border-slate-200';
                                    return (
                                      <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold', cls].join(' ')}>
                                        {r.status || '—'}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3">
                                  {badge(r.allocated, 'Allocated', 'Not allocated')}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-extrabold text-slate-900">{r.utilDen > 0 ? `${r.utilPct}%` : '—'}</span>
                                    <span className="text-[11px] font-bold text-slate-500">{r.utilDen > 0 ? 'Allocated' : '—'}</span>
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-600">
                                    {r.utilDen > 0 ? `${r.utilUsed} / ${r.utilDen}` : 'No planned/allocated qty'}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {badge(r.procured, 'Procured', 'Not procured')}
                                </td>
                                <td className="px-4 py-3 text-[11px] font-semibold text-slate-600">{formatDateTime(r.lastActivityAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'projectStatus' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-900">Current project status</h2>
                      <p className="text-xs text-slate-500">Inventory allocated, BOM created, and utilization with date & time.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={projectStatusSearch}
                        onChange={(e) => setProjectStatusSearch(e.target.value)}
                        placeholder="Search by code/name/department…"
                        className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      />
                      <select
                        value={projectStatusDept}
                        onChange={(e) => setProjectStatusDept(e.target.value)}
                        className="h-9 w-full sm:w-52 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        {(() => {
                          const depts = Array.from(
                            new Set((projectStatusRows || []).map((p) => String(p?.department || '').trim()).filter(Boolean))
                          ).sort((a, b) => a.localeCompare(b));
                          return [
                            <option key="all" value="all">All departments</option>,
                            ...depts.map((d) => <option key={d} value={d}>{d}</option>)
                          ];
                        })()}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchProjectStatuses();
                        }}
                        className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {projectStatusError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {projectStatusError}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <div className="text-xs font-bold text-slate-600">
                      {projectStatusLoading ? 'Loading…' : `${projectStatusRows.length} projects`}
                    </div>
                  </div>
                  <div className="w-full overflow-auto">
                    {(() => {
                      const q = projectStatusSearch.trim().toLowerCase();
                      const rows = (projectStatusRows || []).filter((p) => {
                        const dept = String(p?.department || '').trim();
                        if (projectStatusDept !== 'all' && dept !== projectStatusDept) return false;
                        if (!q) return true;
                        const hay = `${p?.code || ''} ${p?.name || ''} ${dept}`.toLowerCase();
                        return hay.includes(q);
                      });

                      const badge = (ok, label) => (
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                            ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                          ].join(' ')}
                        >
                          {label}
                        </span>
                      );

                      return (
                        <table className="min-w-[1100px] w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-[11px] font-extrabold text-slate-700">
                              <th className="px-4 py-3">Project</th>
                              <th className="px-4 py-3">Department</th>
                              <th className="px-4 py-3">Inventory allocated</th>
                              <th className="px-4 py-3">BOM created</th>
                              <th className="px-4 py-3">Utilization</th>
                              <th className="px-4 py-3">Last activity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {projectStatusLoading ? (
                              <tr>
                                <td className="px-4 py-4 text-slate-500" colSpan={6}>Loading…</td>
                              </tr>
                            ) : rows.length === 0 ? (
                              <tr>
                                <td className="px-4 py-4 text-slate-500" colSpan={6}>No projects found.</td>
                              </tr>
                            ) : (
                              rows.map((p) => {
                                const allocated = Boolean(p?.statuses?.inventoryAllocated?.value);
                                const bom = Boolean(p?.statuses?.bomCreated?.value);
                                const util = p?.statuses?.utilization || {};
                                const utilBasis = util?.basis === 'allocated' ? 'Allocated' : util?.basis === 'planned' ? 'Planned' : '—';
                                const utilDen = Number(util?.denominator || 0);
                                const utilUsed = Number(util?.usedTotal || 0);
                                const utilPct = Number(util?.percent || 0);
                                return (
                                  <tr key={p?.id || p?._id || p?.code} className="hover:bg-slate-50/70">
                                    <td className="px-4 py-3">
                                      <div className="font-extrabold text-slate-900">{p?.code || '-'}</div>
                                      <div className="text-[11px] font-semibold text-slate-600">{p?.name || ''}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-[11px] font-extrabold text-slate-700">{p?.department || '-'}</div>
                                      <div className="text-[11px] font-semibold text-slate-500">{String(p?.status || '').replace('_', ' ')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-1">
                                        {badge(allocated, allocated ? 'Allocated' : 'Not allocated')}
                                        <div className="text-[11px] font-semibold text-slate-500">{formatDateTime(p?.statuses?.inventoryAllocated?.at)}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-1">
                                        {badge(bom, bom ? 'Created' : 'Not created')}
                                        <div className="text-[11px] font-semibold text-slate-500">{formatDateTime(p?.statuses?.bomCreated?.at)}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-extrabold text-slate-900">{utilDen > 0 ? `${utilPct}%` : '—'}</span>
                                          <span className="text-[11px] font-bold text-slate-500">{utilBasis}</span>
                                        </div>
                                        <div className="text-[11px] font-semibold text-slate-600">
                                          {utilDen > 0 ? `${utilUsed} / ${utilDen}` : 'No planned/allocated qty'}
                                        </div>
                                        <div className="text-[11px] font-semibold text-slate-500">{formatDateTime(util?.at)}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] font-semibold text-slate-600">
                                      {formatDateTime(p?.lastActivityAt)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
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
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-900">Low stock items</h2>
                      <p className="text-xs text-slate-500">Items at or below threshold</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={lowStockSearch}
                        onChange={(e) => {
                          setLowStockSearch(e.target.value);
                          setLowStockPage(1);
                        }}
                        placeholder="Search by name/asset/sku…"
                        className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      />
                      <select
                        value={lowStockDept}
                        onChange={(e) => {
                          setLowStockDept(e.target.value);
                          setLowStockPage(1);
                        }}
                        className="h-9 w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        <option value="all">All departments</option>
                        {reportDepartments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchLowStock();
                        }}
                        className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = (lowStockRows || []).map((a) => ({
                            Department: a?.department || '',
                            AssetId: a?.assetId || '',
                            SKU: a?.sku || '',
                            Name: a?.itemName || '',
                            TotalQty: Number(a?.totalQuantity || 0),
                            AllocatedQty: Number(a?.allocatedQuantity || 0),
                            AvailableQty: Number(a?.availableQuantity || 0),
                            Threshold: Number(a?.lowStockThreshold ?? 5)
                          }));
                          downloadCsv(`low_stock_${lowStockDept === 'all' ? 'all' : lowStockDept}.csv`, rows);
                        }}
                        className="h-9 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-extrabold text-white hover:bg-primary-700"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  {lowStockError && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      {lowStockError}
                    </div>
                  )}
                  <div className="mt-3 w-full overflow-auto">
                    <table className="min-w-[1100px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[11px] font-extrabold text-slate-700">
                          <th className="px-4 py-3">Asset</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Allocated</th>
                          <th className="px-4 py-3">Available</th>
                          <th className="px-4 py-3">Threshold</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lowStockLoading ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={7}>Loading…</td>
                          </tr>
                        ) : (lowStockRows || []).length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={7}>No low stock items.</td>
                          </tr>
                        ) : (
                          (lowStockRows || []).map((a) => {
                            const threshold = Number(a?.lowStockThreshold ?? 5);
                            const avail = Number(a?.availableQuantity || 0);
                            const isCritical = avail <= threshold;
                            return (
                              <tr key={a?._id || a?.assetId} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <div className="font-extrabold text-slate-900">{a?.itemName || '-'}</div>
                                  <div className="text-[11px] font-semibold text-slate-600">{a?.assetId || ''} {a?.sku ? `• ${a.sku}` : ''}</div>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-extrabold text-slate-700">{normalizeDepartment(a?.department)}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{Number(a?.totalQuantity || 0)}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{Number(a?.allocatedQuantity || 0)}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{avail}</td>
                                <td className="px-4 py-3 font-bold text-slate-700">{threshold}</td>
                                <td className="px-4 py-3">
                                  <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold', isCritical ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'].join(' ')}>
                                    {isCritical ? 'Attention' : 'OK'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500">Page {lowStockPage} / {lowStockTotalPages}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={lowStockPage <= 1}
                        onClick={() => setLowStockPage((p) => Math.max(1, p - 1))}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={lowStockPage >= lowStockTotalPages}
                        onClick={() => setLowStockPage((p) => p + 1)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-900">Department-wise project inventory report</h2>
                      <p className="text-xs text-slate-500">Projects utilization + current stock snapshot grouped by department.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        placeholder="Search projects by code/name…"
                        className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      />
                      <select
                        value={reportDept}
                        onChange={(e) => setReportDept(e.target.value)}
                        className="h-9 w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        <option value="all">All departments</option>
                        {reportDepartments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchProjectStatuses();
                        }}
                        className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = (filteredDeptReport || []).map((d) => ({
                            Department: d.department,
                            Projects: d.projectCount,
                            'Projects Allocated': d.allocatedProjects,
                            'Projects BOM': d.bomProjects,
                            'Used Qty (total)': d.usedTotal,
                            'Basis Qty (total)': d.basisTotal,
                            'Utilization %': d.utilizationPercent,
                            'Stock Qty (available)': d.stockQty,
                            'Stock Value (snapshot)': Math.round((d.stockValue + Number.EPSILON) * 100) / 100,
                            'Last Activity': d.lastActivityAt ? new Date(d.lastActivityAt).toLocaleString() : ''
                          }));
                          downloadCsv(`dept_project_inventory_${reportDept === 'all' ? 'all' : reportDept}.csv`, rows);
                        }}
                        className="h-9 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-extrabold text-white hover:bg-primary-700"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>

                {projectStatusError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                    {projectStatusError}
                  </div>
                )}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-900">Inventory valuation</h2>
                      <p className="text-xs text-slate-500">Per-item average cost and total value</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={valuationSearch}
                        onChange={(e) => {
                          setValuationSearch(e.target.value);
                          setValuationPage(1);
                        }}
                        placeholder="Search by name/asset/sku…"
                        className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      />
                      <select
                        value={valuationDept}
                        onChange={(e) => {
                          setValuationDept(e.target.value);
                          setValuationPage(1);
                        }}
                        className="h-9 w-full sm:w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        <option value="all">All departments</option>
                        {reportDepartments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchValuation();
                        }}
                        className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = (valuationRows || []).map((i) => ({
                            Department: i?.department || '',
                            AssetId: i?.assetId || '',
                            SKU: i?.sku || '',
                            Name: i?.itemName || '',
                            TotalQty: Number(i?.totalQuantity || 0),
                            Unit: i?.unit || '',
                            AvgUnitCost: Math.round((Number(i?.avgUnitCost || 0) + Number.EPSILON) * 100) / 100,
                            TotalValue: Math.round((Number(i?.totalValue || 0) + Number.EPSILON) * 100) / 100
                          }));
                          downloadCsv(`inventory_valuation_${valuationDept === 'all' ? 'all' : valuationDept}.csv`, rows);
                        }}
                        className="h-9 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-extrabold text-white hover:bg-primary-700"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  {valuationError && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      {valuationError}
                    </div>
                  )}
                  <div className="mt-3 border-b border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-700">
                    Total snapshot value: {formatRupees(valuationTotalValue)}
                  </div>
                  <div className="w-full overflow-auto">
                    <table className="min-w-[1100px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[11px] font-extrabold text-slate-700">
                          <th className="px-4 py-3">Asset</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3">Avg unit cost</th>
                          <th className="px-4 py-3">Total value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {valuationLoading ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={6}>Loading…</td>
                          </tr>
                        ) : (valuationRows || []).length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={6}>No valuation items.</td>
                          </tr>
                        ) : (
                          (valuationRows || []).map((i) => (
                            <tr key={i?.assetId || i?.sku} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3">
                                <div className="font-extrabold text-slate-900">{i?.itemName || '-'}</div>
                                <div className="text-[11px] font-semibold text-slate-600">{i?.assetId || ''} {i?.sku ? `• ${i.sku}` : ''}</div>
                              </td>
                              <td className="px-4 py-3 text-[11px] font-extrabold text-slate-700">{normalizeDepartment(i?.department)}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{Number(i?.totalQuantity || 0)}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{i?.unit || ''}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{formatRupees(Number(i?.avgUnitCost || 0))}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{formatRupees(Number(i?.totalValue || 0))}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500">Page {valuationPage} / {valuationTotalPages}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={valuationPage <= 1}
                        onClick={() => setValuationPage((p) => Math.max(1, p - 1))}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={valuationPage >= valuationTotalPages}
                        onClick={() => setValuationPage((p) => p + 1)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-900">Stock movement logs</h2>
                      <p className="text-xs text-slate-500">IN/OUT history with cost</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={reportLogSearch}
                        onChange={(e) => {
                          setReportLogSearch(e.target.value);
                          setReportLogPage(1);
                        }}
                        placeholder="Search by name/asset/sku/project…"
                        className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      />
                      <select
                        value={reportLogType}
                        onChange={(e) => {
                          setReportLogType(e.target.value);
                          setReportLogPage(1);
                        }}
                        className="h-9 w-full sm:w-40 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                      >
                        <option value="ALL">All</option>
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchReportLogs();
                        }}
                        className="h-9 w-full sm:w-auto rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = (reportLogRows || []).map((l) => ({
                            Type: l?.type || '',
                            Reason: l?.reason || '',
                            Department: l?.department || '',
                            AssetId: l?.assetId || '',
                            SKU: l?.sku || '',
                            Name: l?.itemName || '',
                            Project: l?.projectName || '',
                            Quantity: Number(l?.quantity || 0),
                            UnitCost: Math.round((Number(l?.unitCost || 0) + Number.EPSILON) * 100) / 100,
                            TotalCost: Math.round((Number(l?.totalCost || 0) + Number.EPSILON) * 100) / 100,
                            PerformedBy: l?.performedBy || '',
                            Timestamp: l?.timestamp ? new Date(l.timestamp).toLocaleString() : ''
                          }));
                          downloadCsv(`stock_logs_${reportLogType.toLowerCase()}.csv`, rows);
                        }}
                        className="h-9 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-extrabold text-white hover:bg-primary-700"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  {reportLogError && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                      {reportLogError}
                    </div>
                  )}
                  <div className="w-full overflow-auto mt-3">
                    <table className="min-w-[1200px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[11px] font-extrabold text-slate-700">
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Asset</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Unit cost</th>
                          <th className="px-4 py-3">Total cost</th>
                          <th className="px-4 py-3">By</th>
                          <th className="px-4 py-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportLogLoading ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={9}>Loading…</td>
                          </tr>
                        ) : (reportLogRows || []).length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={9}>No logs found.</td>
                          </tr>
                        ) : (
                          (reportLogRows || []).map((l, idx) => (
                            <tr key={`${l?._id || ''}-${idx}`} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3">
                                <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold', l?.type === 'IN' ? 'bg-primary/10 text-primary-700 border border-primary/20' : 'bg-rose-50 text-rose-700 border border-rose-200'].join(' ')}>
                                  {l?.type || ''}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[11px] font-extrabold text-slate-700">{normalizeDepartment(l?.department)}</td>
                              <td className="px-4 py-3">
                                <div className="font-extrabold text-slate-900">{l?.itemName || '-'}</div>
                                <div className="text-[11px] font-semibold text-slate-600">{l?.assetId || ''} {l?.sku ? `• ${l.sku}` : ''}</div>
                              </td>
                              <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{l?.projectName || ''}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{Number(l?.quantity || 0)}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{formatRupees(Number(l?.unitCost || 0))}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{formatRupees(Number(l?.totalCost || 0))}</td>
                              <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{l?.performedBy || ''}</td>
                              <td className="px-4 py-3 text-[11px] font-semibold text-slate-600">{l?.timestamp ? new Date(l.timestamp).toLocaleString() : ''}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500">Page {reportLogPage} / {reportLogTotalPages}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={reportLogPage <= 1}
                        onClick={() => setReportLogPage((p) => Math.max(1, p - 1))}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={reportLogPage >= reportLogTotalPages}
                        onClick={() => setReportLogPage((p) => p + 1)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold text-slate-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-extrabold text-slate-700">Department summary</div>
                    <div className="text-[11px] font-bold text-slate-500">
                      {projectStatusLoading ? 'Loading…' : `${filteredDeptReport.length} departments`}
                    </div>
                  </div>
                  <div className="w-full overflow-auto">
                    <table className="min-w-[1100px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[11px] font-extrabold text-slate-700">
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Projects</th>
                          <th className="px-4 py-3">Allocated</th>
                          <th className="px-4 py-3">BOM</th>
                          <th className="px-4 py-3">Used / Basis</th>
                          <th className="px-4 py-3">Utilization</th>
                          <th className="px-4 py-3">Stock qty</th>
                          <th className="px-4 py-3">Stock value</th>
                          <th className="px-4 py-3">Last activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectStatusLoading ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={9}>Loading…</td>
                          </tr>
                        ) : filteredDeptReport.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={9}>No departments found.</td>
                          </tr>
                        ) : (
                          filteredDeptReport.map((d) => (
                            <tr
                              key={d.department}
                              className="hover:bg-slate-50/70 cursor-pointer"
                              onClick={() => setReportDept(d.department)}
                            >
                              <td className="px-4 py-3 font-extrabold text-slate-900">{d.department}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{d.projectCount}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{d.allocatedProjects}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{d.bomProjects}</td>
                              <td className="px-4 py-3">
                                <div className="text-[11px] font-extrabold text-slate-900">{d.basisTotal > 0 ? `${d.usedTotal} / ${d.basisTotal}` : '—'}</div>
                                <div className="text-[11px] font-semibold text-slate-500">qty</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-[11px] font-extrabold text-slate-900">{d.basisTotal > 0 ? `${d.utilizationPercent}%` : '—'}</div>
                                <div className="text-[11px] font-semibold text-slate-500">total</div>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-700">{d.stockQty || 0}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{formatRupees(d.stockValue || 0)}</td>
                              <td className="px-4 py-3 text-[11px] font-semibold text-slate-600">{formatDateTime(d.lastActivityAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-extrabold text-slate-700">Project details</div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-500">
                        {projectStatusLoading ? 'Loading…' : `${filteredProjectDetails.length} projects`}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const rows = (filteredProjectDetails || []).map((p) => {
                            const dept = normalizeDepartment(p?.department);
                            const util = p?.statuses?.utilization || {};
                            const basis = util?.basis === 'allocated' ? 'Allocated' : util?.basis === 'planned' ? 'Planned' : '—';
                            return {
                              Department: dept,
                              Code: p?.code || '',
                              Name: p?.name || '',
                              Status: p?.status || '',
                              'Inventory Allocated': p?.statuses?.inventoryAllocated?.value ? 'Yes' : 'No',
                              'BOM Created': p?.statuses?.bomCreated?.value ? 'Yes' : 'No',
                              'Used Qty': Number(util?.usedTotal || 0),
                              'Basis Type': basis,
                              'Basis Qty': Number(util?.denominator || 0),
                              'Utilization %': Number(util?.denominator || 0) > 0 ? Number(util?.percent || 0) : '',
                              'Last Activity': p?.lastActivityAt ? new Date(p.lastActivityAt).toLocaleString() : ''
                            };
                          });
                          downloadCsv(
                            `project_inventory_details_${reportDept === 'all' ? 'all' : reportDept}.csv`,
                            rows
                          );
                        }}
                        className="h-8 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-extrabold text-slate-700 hover:bg-slate-100"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    </div>
                  </div>
                  <div className="w-full overflow-auto">
                    <table className="min-w-[1200px] w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-[11px] font-extrabold text-slate-700">
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Allocated</th>
                          <th className="px-4 py-3">BOM</th>
                          <th className="px-4 py-3">Used / Basis</th>
                          <th className="px-4 py-3">Utilization</th>
                          <th className="px-4 py-3">Last activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectStatusLoading ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={7}>Loading…</td>
                          </tr>
                        ) : filteredProjectDetails.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-slate-500" colSpan={7}>No projects found.</td>
                          </tr>
                        ) : (
                          filteredProjectDetails.map((p) => {
                            const allocated = !!p?.statuses?.inventoryAllocated?.value;
                            const bom = !!p?.statuses?.bomCreated?.value;
                            const util = p?.statuses?.utilization || {};
                            const utilBasis = util?.basis === 'allocated' ? 'Allocated' : util?.basis === 'planned' ? 'Planned' : '—';
                            const utilDen = Number(util?.denominator || 0);
                            const utilUsed = Number(util?.usedTotal || 0);
                            const utilPct = Number(util?.percent || 0);
                            const badge = (ok, label) => (
                              <span
                                className={[
                                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold',
                                  ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
                                ].join(' ')}
                              >
                                {label}
                              </span>
                            );
                            return (
                              <tr key={p?.id || p?._id || p?.code} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <div className="font-extrabold text-slate-900">{p?.code || '-'}</div>
                                  <div className="text-[11px] font-semibold text-slate-600">{p?.name || ''}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-[11px] font-extrabold text-slate-700">{normalizeDepartment(p?.department)}</div>
                                  <div className="text-[11px] font-semibold text-slate-500">{String(p?.status || '').replace('_', ' ')}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    {badge(allocated, allocated ? 'Allocated' : 'Not allocated')}
                                    <div className="text-[11px] font-semibold text-slate-500">{formatDateTime(p?.statuses?.inventoryAllocated?.at)}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    {badge(bom, bom ? 'Created' : 'Not created')}
                                    <div className="text-[11px] font-semibold text-slate-500">{formatDateTime(p?.statuses?.bomCreated?.at)}</div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-[11px] font-extrabold text-slate-900">{utilDen > 0 ? `${utilUsed} / ${utilDen}` : '—'}</div>
                                  <div className="text-[11px] font-semibold text-slate-500">{utilBasis}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-[11px] font-extrabold text-slate-900">{utilDen > 0 ? `${utilPct}%` : '—'}</div>
                                </td>
                                <td className="px-4 py-3 text-[11px] font-semibold text-slate-600">
                                  {formatDateTime(p?.lastActivityAt)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
