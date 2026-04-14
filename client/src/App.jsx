import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
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
import BomDashboard from './pages/BomDashboard';
import AddBom from './pages/AddBom';
import ViewBom from './pages/ViewBom';
import SubmittedBom from './pages/SubmittedBom';
import BomChangeRequest from './pages/BomChangeRequest';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* User Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={Object.values(ROLES)} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<AssetManagement />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/bom" element={<BomDashboard />} />
            <Route path="/bom/:projectId/view" element={<ViewBom />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.PROJECT_MANAGER, ROLES.SALES_HEAD, ROLES.ADMIN, ROLES.INVENTORY_MANAGER]} />}>
            <Route path="/projects/bom-change-request" element={<BomChangeRequest />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.PRESALE]} />}>
            <Route path="/bom/:projectId/add" element={<AddBom />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.INVENTORY_MANAGER, ROLES.ADMIN]} />}>
            <Route path="/inventory/submitted-bom" element={<SubmittedBom />} />
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
