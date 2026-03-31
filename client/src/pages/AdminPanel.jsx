import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, inventoryRes] = await Promise.all([
          api.get('/auth/users'),
          api.get('/inventory')
        ]);
        setStats({
          users: Array.isArray(usersRes.data) ? usersRes.data.length : (usersRes.data.users?.length || 0),
          inventory: inventoryRes.data.totalAssets || 0,
          lowStock: inventoryRes.data.lowStockCount || 0
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

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
        <aside className="hidden w-60 shrink-0 border-r border-slate-800/40 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
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

        <main className="min-w-0 flex-1">
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Users</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-700">
                        <Users className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.users}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Registered accounts</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Inventory</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700">
                        <Package className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-slate-900">{stats.inventory}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Tracked assets/items</div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Low stock</div>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/10 text-rose-700">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-rose-700">{stats.lowStock}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Items needing attention</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">System snapshot</h3>
                      <p className="text-xs text-slate-500">Quick health view (charts coming soon)</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Read-only</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold text-slate-600">Status</div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">Operational</div>
                      <div className="mt-1 text-xs text-slate-500">API reachable, auth enabled</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold text-slate-600">Next step</div>
                      <div className="mt-1 text-sm font-extrabold text-slate-900">Review low-stock list</div>
                      <div className="mt-1 text-xs text-slate-500">Prioritize replenishment actions</div>
                    </div>
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
