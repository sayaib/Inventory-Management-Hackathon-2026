import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import WarehousePanel from './pages/WarehousePanel';
import AssetManagement from './pages/AssetManagement';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './constants/roles';
import Projects from './pages/Projects';
import FinancePanel from './pages/FinancePanel';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* User Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={Object.values(ROLES)} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<AssetManagement />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/projects" element={<Projects />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          {/* Warehouse Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.WAREHOUSE, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]} />}>
            <Route path="/warehouse" element={<WarehousePanel />} />
          </Route>

          {/* Finance Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN]} />}>
            <Route path="/finance" element={<FinancePanel />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
