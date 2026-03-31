import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FEATURES, ROLES } from '../constants/roles';
import { 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon, 
  Package, 
  Shield,
  Activity,
  AlertTriangle,
  Boxes,
  Briefcase,
  IndianRupee
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const role = user?.role;
  const roleLabel = role?.replace(/_/g, ' ') || 'user';

  const isInventoryManager = user?.role === ROLES.INVENTORY_MANAGER;
  const isAdmin = user?.role === ROLES.ADMIN;
  const isWarehouse = user?.role === ROLES.WAREHOUSE;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const isFinance = user?.role === ROLES.FINANCE;
  const isProcurement = user?.role === ROLES.PROCUREMENT;

  const roleUi = (() => {
    if (isWarehouse) {
      return {
        pageBg: 'bg-gradient-to-b from-amber-50 via-white to-orange-50',
        brandBg: 'bg-amber-600',
        badge: 'bg-amber-100 text-amber-900',
        linkHover: 'hover:text-amber-700',
        heroBorder: 'border-amber-200',
        heroAccent: 'text-amber-700',
        heroIconBg: 'bg-amber-600/10 text-amber-700',
        heroTitle: 'Warehouse Operations',
        heroSubtitle: "Scan, update, and sync stock movement with minimal clicks.",
        layout: 'split',
        actionsTitle: 'Shift Tools',
        actionsIconClass: 'text-amber-700',
        primaryAction: 'bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-100',
        secondaryAction: 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 shadow-sm'
      };
    }

    if (isFinance) {
      return {
        pageBg: 'bg-gradient-to-b from-emerald-50 via-white to-slate-50',
        brandBg: 'bg-emerald-600',
        badge: 'bg-emerald-100 text-emerald-900',
        linkHover: 'hover:text-emerald-700',
        heroBorder: 'border-emerald-200',
        heroAccent: 'text-emerald-700',
        heroIconBg: 'bg-emerald-600/10 text-emerald-700',
        heroTitle: 'Finance Dashboard',
        heroSubtitle: 'Track valuation, costs, and wastage signals tied to inventory.',
        layout: 'stack',
        actionsTitle: 'Finance Shortcuts',
        actionsIconClass: 'text-emerald-700',
        primaryAction: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100',
        secondaryAction: 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-sm'
      };
    }

    if (isProjectManager) {
      return {
        pageBg: 'bg-gradient-to-b from-indigo-50 via-white to-purple-50',
        brandBg: 'bg-indigo-600',
        badge: 'bg-indigo-100 text-indigo-900',
        linkHover: 'hover:text-indigo-700',
        heroBorder: 'border-indigo-200',
        heroAccent: 'text-indigo-700',
        heroIconBg: 'bg-indigo-600/10 text-indigo-700',
        heroTitle: 'Project Materials Hub',
        heroSubtitle: 'Keep project allocations on track and surface overconsumption early.',
        layout: 'split',
        actionsTitle: 'Project Shortcuts',
        actionsIconClass: 'text-indigo-700',
        primaryAction: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100',
        secondaryAction: 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm'
      };
    }

    if (isInventoryManager) {
      return {
        pageBg: 'bg-gradient-to-b from-slate-50 via-white to-blue-50',
        brandBg: 'bg-blue-600',
        badge: 'bg-blue-100 text-blue-900',
        linkHover: 'hover:text-blue-700',
        heroBorder: 'border-blue-200',
        heroAccent: 'text-blue-700',
        heroIconBg: 'bg-blue-600/10 text-blue-700',
        heroTitle: 'Inventory Command Center',
        heroSubtitle: 'Monitor stock health, consumption, and safety thresholds.',
        layout: 'cards',
        actionsTitle: 'Inventory Actions',
        actionsIconClass: 'text-blue-700',
        primaryAction: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100',
        secondaryAction: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 shadow-sm'
      };
    }

    if (isProcurement) {
      return {
        pageBg: 'bg-gradient-to-b from-teal-50 via-white to-cyan-50',
        brandBg: 'bg-teal-600',
        badge: 'bg-teal-100 text-teal-900',
        linkHover: 'hover:text-teal-700',
        heroBorder: 'border-teal-200',
        heroAccent: 'text-teal-700',
        heroIconBg: 'bg-teal-600/10 text-teal-700',
        heroTitle: 'Procurement Workspace',
        heroSubtitle: 'Review inventory signals and prepare purchasing decisions.',
        layout: 'split',
        actionsTitle: 'Procurement Actions',
        actionsIconClass: 'text-teal-700',
        primaryAction: 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-100',
        secondaryAction: 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 shadow-sm'
      };
    }

    return {
      pageBg: 'bg-gray-50',
      brandBg: 'bg-indigo-600',
      badge: 'bg-indigo-200 text-indigo-900',
      linkHover: 'hover:text-indigo-700',
      heroBorder: 'border-indigo-200',
      heroAccent: 'text-indigo-700',
      heroIconBg: 'bg-indigo-600/10 text-indigo-700',
      heroTitle: 'Dashboard',
      heroSubtitle: "Welcome back. Here's what's happening with your inventory today.",
      layout: 'stack',
      actionsTitle: 'Inventory Management Actions',
      actionsIconClass: 'text-indigo-600',
      primaryAction: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100',
      secondaryAction: 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 shadow-sm'
    };
  })();

  const roleFeatures = FEATURES?.[role] || [];

  return (
    <div className={`min-h-screen ${roleUi.pageBg}`}>
      <nav className="bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${roleUi.brandBg} rounded-lg shadow-sm`}>
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Inventory Management</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.username}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${roleUi.badge}`}>
                  {roleLabel}
                </span>
              </div>
              <Link
                to="/profile"
                className={`flex items-center space-x-1.5 text-gray-500 ${roleUi.linkHover} transition-all duration-200 font-medium text-sm`}
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 text-gray-500 hover:text-red-600 transition-all duration-200 font-medium text-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className={`mb-8 rounded-2xl border ${roleUi.heroBorder} bg-white/70 backdrop-blur p-6 shadow-sm`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${roleUi.heroIconBg}`}>
                {isFinance ? (
                  <IndianRupee className="h-6 w-6" />
                ) : isProjectManager ? (
                  <Briefcase className="h-6 w-6" />
                ) : isWarehouse ? (
                  <Package className="h-6 w-6" />
                ) : isProcurement ? (
                  <Boxes className="h-6 w-6" />
                ) : (
                  <LayoutDashboard className="h-6 w-6" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">{roleUi.heroTitle}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {isAdmin ? roleUi.heroSubtitle : `Welcome back, ${user?.username}. ${roleUi.heroSubtitle}`}
                </p>
              </div>
            </div>

            {!isAdmin && roleFeatures.length > 0 && (
              <div className="flex flex-wrap justify-start sm:justify-end gap-2">
                {roleFeatures.slice(0, 3).map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isInventoryManager && (
          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className={`text-base font-extrabold ${roleUi.heroAccent}`}>Today’s Priorities</h2>
                <p className="mt-0.5 text-xs text-slate-600">Quick entry points to monitor stock health and movement.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/inventory?mode=view"
                className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-600/10 rounded-xl w-fit group-hover:bg-blue-600/15 transition-colors">
                    <Boxes className="h-6 w-6 text-blue-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stock</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">View Real-time Stock</h3>
                <p className="text-sm text-slate-600 mt-1">Monitor current inventory levels across all departments.</p>
              </Link>

              <Link
                to="/warehouse?tab=history"
                className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-600/10 rounded-xl w-fit group-hover:bg-emerald-600/15 transition-colors">
                    <Activity className="h-6 w-6 text-emerald-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Movement</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">Track Consumption</h3>
                <p className="text-sm text-slate-600 mt-1">Log stock usage and track material movement.</p>
              </Link>

              <Link
                to="/inventory?lowStock=true&mode=view"
                className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-rose-600/10 rounded-xl w-fit group-hover:bg-rose-600/15 transition-colors">
                    <AlertTriangle className="h-6 w-6 text-rose-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alerts</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">Low Stock Alerts</h3>
                <p className="text-sm text-slate-600 mt-1">Identify items falling below safety thresholds.</p>
              </Link>
            </div>
          </section>
        )}

        {isProjectManager && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link
                to="/projects"
                className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-indigo-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-700 group-hover:bg-indigo-600/15 transition-colors">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projects</div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900">Project Materials</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        See allocations, track usage vs planned, and detect overconsumption.
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-indigo-700">
                    Open workspace
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-700">
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>

              <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Shield className={`h-4 w-4 ${roleUi.actionsIconClass}`} />
                  What you can do
                </div>
                <div className="mt-3 space-y-2">
                  {roleFeatures.slice(0, 4).map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${roleUi.brandBg}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {isFinance && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link
                to="/finance"
                className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-700 group-hover:bg-emerald-600/15 transition-colors">
                      <IndianRupee className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Analytics</div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900">Finance Analytics</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Inventory valuation, cost tracking, and loss/wastage analytics.
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-700">
                    View insights
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>

              <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Shield className={`h-4 w-4 ${roleUi.actionsIconClass}`} />
                  Signals to watch
                </div>
                <div className="mt-3 space-y-2">
                  {roleFeatures.slice(0, 4).map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className={`mt-1 inline-flex h-2 w-2 shrink-0 rounded-full ${roleUi.brandBg}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {(isWarehouse || isProcurement) && !isInventoryManager && !isFinance && !isProjectManager && !isAdmin && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className={`text-base font-extrabold ${roleUi.heroAccent}`}>
                  {isWarehouse ? 'Start your shift' : 'Get started'}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {isWarehouse
                    ? 'Fast access to scanning and stock updates.'
                    : 'Review inventory and move into detailed management when needed.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {roleFeatures.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Shield className={`h-4 w-4 ${roleUi.actionsIconClass}`} />
                  Role
                </div>
                <div className="mt-2 text-sm font-bold text-slate-700 uppercase tracking-wider">{roleLabel}</div>
                <div className="mt-3 text-sm text-slate-600">
                  {isWarehouse
                    ? 'Designed for quick, repeatable operational tasks.'
                    : 'Designed for planning and purchasing signals.'}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white/80 backdrop-blur shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className={`h-4 w-4 ${roleUi.actionsIconClass}`} />
                {roleUi.actionsTitle}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Based on your {roleLabel} role, you can perform the following actions:
              </p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isWarehouse || isAdmin || isInventoryManager) && (
                  <Link
                    to="/warehouse"
                    className={`p-5 font-extrabold rounded-2xl transition-all flex flex-col items-center justify-center text-center group ${roleUi.primaryAction}`}
                  >
                    <Package className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-base">Quick Stock Update (QR/Barcode)</span>
                  </Link>
                )}
                <Link
                  to="/inventory"
                  className={`p-5 font-extrabold rounded-2xl transition-all flex flex-col items-center justify-center text-center group ${roleUi.secondaryAction}`}
                >
                  <LayoutDashboard className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="text-base">Full Inventory Management</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
