import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './constants/roles';
import Spinner from './components/ui/Spinner';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminProjectStatus = lazy(() => import('./pages/admin/AdminProjectStatus'));
const AdminPredictions = lazy(() => import('./pages/admin/AdminPredictions'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const Profile = lazy(() => import('./pages/Profile'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const Projects = lazy(() => import('./pages/Projects'));
const FinancePanel = lazy(() => import('./pages/FinancePanel'));
const BomDashboard = lazy(() => import('./pages/BomDashboard'));
const AddBom = lazy(() => import('./pages/AddBom'));
const ViewBom = lazy(() => import('./pages/ViewBom'));
const SubmittedBom = lazy(() => import('./pages/SubmittedBom'));
const BomChangeRequest = lazy(() => import('./pages/BomChangeRequest'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          }
        >
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
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/admin/overview" element={<AdminOverview />} />
              <Route path="/admin/project-status" element={<AdminProjectStatus />} />
              <Route path="/admin/predictions" element={<AdminPredictions />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/profile" element={<Navigate to="/profile?from=admin" replace />} />
            </Route>

            {/* Finance Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN]} />}>
              <Route path="/finance" element={<FinancePanel />} />
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
