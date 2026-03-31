import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User as UserIcon, Settings, BarChart3, Users, LayoutDashboard, Package } from 'lucide-react';
import UserManagement from '../components/UserManagement';
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 flex items-center space-x-2">
          <Shield className="h-8 w-8 text-indigo-400" />
          <span className="text-2xl font-bold tracking-tight">Admin Portal</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
              activeTab === 'overview' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-800'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
              activeTab === 'users' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-800'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>User Management</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-indigo-100 hover:bg-indigo-800 transition-colors">
            <BarChart3 className="h-5 w-5" />
            <span>Reports</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-indigo-100 hover:bg-indigo-800 transition-colors">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-indigo-800">
          <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-300 hover:bg-indigo-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">{activeTab === 'users' ? 'User Management' : 'Admin Dashboard'}</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">Logged in as:</span>
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full text-indigo-700">
              <UserIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Users</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.users}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">Inventory Items</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.inventory}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">Low Stock Alerts</div>
                  <div className="text-3xl font-bold text-red-600">{stats.lowStock}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-wider">Total Value</div>
                  <div className="text-3xl font-bold text-gray-900">₹1,28,400</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">System Statistics</h3>
                <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium">Chart Visualization Area</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'users' && <UserManagement />}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
