import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <LayoutDashboard className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">User Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-700">
                <UserIcon className="h-5 w-5" />
                <span className="font-medium">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow-xl rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome back, {user?.username}!</h1>
            <p className="text-gray-600 mb-6">This is your personal dashboard. You are logged in as a <strong>{user?.role}</strong>.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <h3 className="text-indigo-900 font-semibold mb-2">My Profile</h3>
                <p className="text-indigo-700 text-sm">Update your information and security settings.</p>
              </div>
              <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                <h3 className="text-green-900 font-semibold mb-2">My Tasks</h3>
                <p className="text-green-700 text-sm">View and manage your assigned inventory tasks.</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                <h3 className="text-purple-900 font-semibold mb-2">Notifications</h3>
                <p className="text-purple-700 text-sm">Check your latest updates and alerts.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
