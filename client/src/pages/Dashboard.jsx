import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ROLES } from '../constants/roles';
import { 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon, 
  Package, 
  Shield,
  Activity,
  AlertTriangle,
  History,
  Boxes,
  Briefcase
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const isInventoryManager = user?.role === ROLES.INVENTORY_MANAGER;
  const isAdmin = user?.role === ROLES.ADMIN;
  const isWarehouse = user?.role === ROLES.WAREHOUSE;
  const isProjectManager = user?.role === ROLES.PROJECT_MANAGER;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">InventoryHub</span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.username}</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full uppercase font-bold tracking-wider">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              <Link
                to="/profile"
                className="flex items-center space-x-1.5 text-gray-500 hover:text-indigo-600 transition-all duration-200 font-medium text-sm"
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
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Welcome back, {user?.username}. Here's what's happening with your inventory today.</p>
        </div>

        {isInventoryManager && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              to="/inventory?mode=view"
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-blue-50 rounded-lg w-fit mb-4 group-hover:bg-blue-100 transition-colors">
                <Boxes className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">View Real-time Stock</h3>
              <p className="text-sm text-gray-500 mt-1">Monitor current inventory levels across all departments.</p>
            </Link>

            <Link 
              to="/warehouse?tab=history"
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-green-50 rounded-lg w-fit mb-4 group-hover:bg-green-100 transition-colors">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Track Consumption</h3>
              <p className="text-sm text-gray-500 mt-1">Log stock usage and track material movement.</p>
            </Link>

            <Link 
              to="/inventory?lowStock=true&mode=view"
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-red-50 rounded-lg w-fit mb-4 group-hover:bg-red-100 transition-colors">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Low Stock Alerts</h3>
              <p className="text-sm text-gray-500 mt-1">Identify items falling below safety thresholds.</p>
            </Link>
          </div>
        )}

        {isProjectManager && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/projects"
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="p-3 bg-indigo-50 rounded-lg w-fit mb-4 group-hover:bg-indigo-100 transition-colors">
                <Briefcase className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Project Materials</h3>
              <p className="text-sm text-gray-500 mt-1">See allocations, track usage vs planned, and detect overconsumption.</p>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Inventory Management Actions
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Based on your {user?.role?.replace(/_/g, ' ')} role, you can perform the following actions:</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isWarehouse || isAdmin || isInventoryManager) && (
                  <Link 
                    to="/warehouse"
                    className="p-5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex flex-col items-center justify-center text-center shadow-md shadow-indigo-100 group"
                  >
                    <Package className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform" />
                    <span className="text-base">Quick Stock Update (QR/Barcode)</span>
                  </Link>
                )}
                <Link 
                  to="/inventory"
                  className="p-5 bg-white text-indigo-600 border border-indigo-200 font-bold rounded-xl hover:bg-indigo-50 transition-all flex flex-col items-center justify-center text-center shadow-sm group"
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
