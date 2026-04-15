import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FEATURES, ROLES } from '../constants/roles';
import { 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon, 
  Shield,
  AlertTriangle,
  Boxes,
  Briefcase,
  ClipboardList,
  IndianRupee
} from 'lucide-react';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const role = user?.role;
  const roleLabel = role?.replace(/_/g, ' ') || 'user';

  const isInventoryManager = user?.role === ROLES.INVENTORY_MANAGER;
  const isAdmin = user?.role === ROLES.ADMIN;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;
  const isSalesHead = user?.role === ROLES.SALES_HEAD;
  const isPresale = user?.role === ROLES.PRESALE;
  const isFinance = user?.role === ROLES.FINANCE;
  const isProcurement = user?.role === ROLES.PROCUREMENT;

  const roleUi = (() => {
    const base = {
      pageBg: 'bg-gradient-to-b from-primary-50 via-white to-muted-50',
      brandBg: 'bg-primary',
      badge: 'bg-primary-100 text-primary-800',
      linkHover: 'hover:text-primary-700',
      heroBorder: 'border-primary-200',
      heroAccent: 'text-primary-700',
      heroIconBg: 'bg-primary/10 text-primary-700',
      layout: 'stack',
      actionsTitle: 'Inventory Management Actions',
      actionsIconClass: 'text-primary-700',
      primaryAction: 'bg-primary text-white hover:bg-primary-700 shadow-md shadow-primary/10',
      secondaryAction: 'bg-white text-primary border border-primary-200 hover:bg-primary-50 shadow-sm'
    };

    if (isFinance) {
      return {
        ...base,
        pageBg: 'bg-gradient-to-b from-muted-50 via-white to-primary-50',
        brandBg: 'bg-muted',
        badge: 'bg-muted-100 text-muted-800',
        linkHover: 'hover:text-muted-800',
        heroBorder: 'border-muted-200',
        heroAccent: 'text-muted-800',
        heroIconBg: 'bg-muted/10 text-muted-800',
        heroTitle: 'Finance Dashboard',
        heroSubtitle: 'Track valuation, costs, and wastage signals tied to inventory.',
        layout: 'stack',
        actionsTitle: 'Finance Shortcuts',
        actionsIconClass: 'text-muted-800',
        primaryAction: 'bg-primary text-white hover:bg-primary-700 shadow-md shadow-primary/10',
        secondaryAction: 'bg-white text-primary border border-primary-200 hover:bg-primary-50 shadow-sm'
      };
    }

    if (isProjectManager) {
      return {
        ...base,
        heroTitle: 'Project Materials Hub',
        heroSubtitle: 'Keep project allocations on track and surface overconsumption early.',
        layout: 'split',
        actionsTitle: 'Project Shortcuts',
        actionsIconClass: 'text-primary-700',
        primaryAction: 'bg-primary text-white hover:bg-primary-700 shadow-md shadow-primary/10',
        secondaryAction: 'bg-white text-primary border border-primary-200 hover:bg-primary-50 shadow-sm'
      };
    }

    if (isInventoryManager) {
      return {
        ...base,
        heroTitle: 'Inventory Command Center',
        heroSubtitle: 'Monitor stock health, consumption, and safety thresholds.',
        layout: 'cards',
        actionsTitle: 'Inventory Actions',
        actionsIconClass: 'text-primary-700',
        primaryAction: 'bg-primary text-white hover:bg-primary-700 shadow-md shadow-primary/10',
        secondaryAction: 'bg-white text-primary border border-primary-200 hover:bg-primary-50 shadow-sm'
      };
    }

    if (isProcurement) {
      return {
        ...base,
        heroTitle: 'Procurement Workspace',
        heroSubtitle: 'Review inventory signals and prepare purchasing decisions.',
        layout: 'split',
        actionsTitle: 'Procurement Actions',
        actionsIconClass: 'text-primary-700',
        primaryAction: 'bg-primary text-white hover:bg-primary-700 shadow-md shadow-primary/10',
        secondaryAction: 'bg-white text-primary border border-primary-200 hover:bg-primary-50 shadow-sm'
      };
    }

    return {
      ...base,
      heroTitle: 'Dashboard',
      heroSubtitle: "Welcome back. Here's what's happening with your inventory today.",
      layout: 'stack'
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
                <img
                  src={APP_LOGO_URL}
                  alt="Optimized Solutions Ltd"
                  className="h-6 w-6 rounded bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                />
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
                className="flex items-center space-x-1.5 text-gray-500 hover:text-accent transition-all duration-200 font-medium text-sm"
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
                ) : isPresale ? (
                  <ClipboardList className="h-6 w-6" />
                ) : isProjectManager ? (
                  <Briefcase className="h-6 w-6" />
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
                  <div className="p-3 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/15 transition-colors">
                    <Boxes className="h-6 w-6 text-primary-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stock</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">View Real-time Stock</h3>
                <p className="text-sm text-slate-600 mt-1">Monitor current inventory levels across all departments.</p>
              </Link>

              <Link
                to="/inventory/submitted-bom"
                className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/15 transition-colors">
                    <ClipboardList className="h-6 w-6 text-primary-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">BOM</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">Submitted BOM</h3>
                <p className="text-sm text-slate-600 mt-1">View submitted BOMs grouped by department.</p>
              </Link>

              <Link
                to="/inventory?lowStock=true&mode=view"
                className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-accent/10 rounded-xl w-fit group-hover:bg-accent/15 transition-colors">
                    <AlertTriangle className="h-6 w-6 text-accent-700" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alerts</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">Low Stock Alerts</h3>
                <p className="text-sm text-slate-600 mt-1">Identify items falling below safety thresholds.</p>
              </Link>
            </div>
          </section>
        )}

        {(isProjectManager || isSalesHead) && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link
                to="/projects"
                className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-primary-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary-700 group-hover:bg-primary/15 transition-colors">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projects</div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900">Projects</h3>
                      <p className="text-sm text-slate-600 mt-1">Create and view projects.</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-primary-700">
                    Open workspace
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
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
                {(isProjectManager || isSalesHead) && (
                  <Link
                    to="/projects/bom-change-request"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-sm font-extrabold hover:bg-primary-700 transition-all"
                  >
                    <ClipboardList className="h-4 w-4" />
                    {isProjectManager ? 'Raise BOM Change Request' : 'View BOM Change Requests'}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {isPresale && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link
                to="/bom"
                className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-primary-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary-700 group-hover:bg-primary/15 transition-colors">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">BOM</div>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900">BOM Dashboard</h3>
                      <p className="text-sm text-slate-600 mt-1">See projects department-wise for BOM.</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-primary-700">
                    Open dashboard
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
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
                className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-muted-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted/10 text-muted-800 group-hover:bg-muted/15 transition-colors">
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
                  <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-800">
                    View insights
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-muted/10 text-muted-800">
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

        {isProcurement && !isInventoryManager && !isFinance && !isProjectManager && !isAdmin && (
          <section className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white/80 backdrop-blur p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className={`text-base font-extrabold ${roleUi.heroAccent}`}>
                  Get started
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Review inventory and move into detailed management when needed.
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
                  Designed for planning and purchasing signals.
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
