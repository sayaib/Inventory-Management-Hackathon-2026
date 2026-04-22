import React, { useMemo, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { UserPlus, User, Mail, Shield, Trash2, Pencil, Search, X, RefreshCw, Users } from 'lucide-react';

import { ROLES } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import Alert from './ui/Alert';
import EmptyState from './ui/EmptyState';
import Spinner from './ui/Spinner';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || currentUser?._id;
  const isCurrentAdmin = currentUser?.role === ROLES.ADMIN;

  const ALL_DEPARTMENTS_LABEL = 'All Departments';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [panelMode, setPanelMode] = useState('none');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ROLES.INVENTORY_MANAGER,
    department: ALL_DEPARTMENTS_LABEL
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [tableError, setTableError] = useState('');
  const [editForm, setEditForm] = useState({ username: '', email: '', role: ROLES.INVENTORY_MANAGER, password: '', department: ALL_DEPARTMENTS_LABEL });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [rowBusyId, setRowBusyId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [avatarErrorById, setAvatarErrorById] = useState({});

  const fetchUsers = useCallback(async () => {
    try {
      setTableError('');
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      setTableError(err.response?.data?.message || 'Failed to fetch users');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get('/settings/company-directory');
        const list = Array.isArray(res.data?.departments) ? res.data.departments : [];
        const unique = [];
        const seen = new Set();
        for (const d of list) {
          const value = String(d || '').trim();
          if (!value) continue;
          if (value.toLowerCase() === ALL_DEPARTMENTS_LABEL.toLowerCase()) continue;
          const key = value.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(value);
        }
        if (unique.length > 0) setDepartments(unique);
      } catch {
        setDepartments([]);
      }
    };
    loadDepartments();
  }, []);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => String(u?._id) === String(selectedUserId)) || null;
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUserId) return;
    const exists = users.some((u) => String(u?._id) === String(selectedUserId));
    if (!exists) {
      setSelectedUserId('');
      setPanelMode('none');
      setMobilePanelOpen(false);
    }
  }, [selectedUserId, users]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const formatRole = (role) => {
    if (!role) return '';
    return String(role)
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const rolePillClass = (role) => {
    if (role === ROLES.ADMIN) return 'bg-primary-50 text-primary-800';
    if (role === ROLES.FINANCE) return 'bg-muted-50 text-muted-800';
    if (role === ROLES.PROJECT_MANAGER) return 'bg-primary-50 text-primary-800';
    return 'bg-muted-100 text-muted-800';
  };

  const departmentOptions = useMemo(() => {
    const values = new Map();
    for (const d of departments) {
      const value = String(d || '').trim();
      if (!value) continue;
      values.set(value.toLowerCase(), value);
    }
    for (const u of users) {
      const value = String(u?.profile?.department || '').trim();
      if (!value) continue;
      values.set(value.toLowerCase(), value);
    }
    return Array.from(values.values()).sort((a, b) => a.localeCompare(b));
  }, [departments, users]);

  const buildAvatarUrl = (userId, avatarUpdatedAt) => {
    if (!userId) return '';
    const updatedAtMs = avatarUpdatedAt ? new Date(avatarUpdatedAt).getTime() : 0;
    const base = `${api.defaults.baseURL}/auth/users/${userId}/avatar`;
    return updatedAtMs ? `${base}?v=${updatedAtMs}` : base;
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
      if (!matchesRole) return false;
      const matchesDepartment =
        departmentFilter === 'all'
          ? true
          : String(u?.profile?.department || '').trim().toLowerCase() === String(departmentFilter).trim().toLowerCase();
      if (!matchesDepartment) return false;
      if (!normalizedQuery) return true;
      const username = String(u.username || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      return username.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [users, search, roleFilter, departmentFilter]);

  const openPanel = (mode) => {
    setPanelMode(mode);
    setMobilePanelOpen(true);
  };

  const closeMobilePanel = () => {
    setMobilePanelOpen(false);
    if (panelMode === 'create') setPanelMode('none');
  };

  const selectUser = (u) => {
    if (!u?._id) return;
    setSelectedUserId(u._id);
    setEditError('');
    setError('');
    setSuccess('');
    setPanelMode('view');
    setMobilePanelOpen(true);
  };

  const startCreate = () => {
    setSelectedUserId('');
    setEditError('');
    setError('');
    setSuccess('');
    setFormData({ username: '', email: '', password: '', role: ROLES.INVENTORY_MANAGER, department: ALL_DEPARTMENTS_LABEL });
    openPanel('create');
  };

  const startEdit = (u) => {
    if (!u?._id) return;
    setEditError('');
    setError('');
    setSuccess('');
    setSelectedUserId(u._id);
    const currentDepartment = String(u?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL;
    setEditForm({
      username: u.username || '',
      email: u.email || '',
      role: u.role || ROLES.INVENTORY_MANAGER,
      password: '',
      department: currentDepartment
    });
    openPanel('edit');
  };

  const cancelEdit = () => {
    setEditSubmitting(false);
    setEditError('');
    setPanelMode(selectedUser ? 'view' : 'none');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const createdUsername = String(formData.username || '').trim();
      const createdEmail = String(formData.email || '').trim();
      await api.post('/auth/register', formData);
      setSuccess('User created successfully');
      setFormData({ username: '', email: '', password: '', role: ROLES.INVENTORY_MANAGER, department: ALL_DEPARTMENTS_LABEL });
      const list = await fetchUsers();
      const created =
        list.find((u) => String(u?.username || '').toLowerCase() === createdUsername.toLowerCase()) ||
        list.find((u) => String(u?.email || '').toLowerCase() === createdEmail.toLowerCase());
      if (created?._id) {
        setSelectedUserId(created._id);
        setPanelMode('view');
      } else {
        setPanelMode('none');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    setEditError('');
    setEditSubmitting(true);
    setRowBusyId(selectedUser._id);

    const payload = {
      username: editForm.username,
      email: editForm.email
    };
    if (editForm.role !== selectedUser.role) payload.role = editForm.role;
    if (editForm.password.trim().length > 0) payload.password = editForm.password;
    const prevDepartment = String(selectedUser?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL;
    if (String(editForm.department || '').trim() !== prevDepartment) payload.department = editForm.department;

    try {
      const res = await api.put(`/auth/users/${selectedUser._id}`, payload);
      setUsers((prev) => prev.map((u) => (u._id === selectedUser._id ? res.data : u)));
      setSuccess('User updated successfully');
      setPanelMode('view');
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setEditSubmitting(false);
      setRowBusyId('');
    }
  };

  const openDelete = (u) => {
    setSuccess('');
    setError('');
    setTableError('');
    setDeleteError('');
    setDeletePassword('');
    setDeleteUser(u);
  };

  const closeDelete = () => {
    setDeleteSubmitting(false);
    setDeleteError('');
    setDeletePassword('');
    setDeleteUser(null);
  };

  const submitDelete = async () => {
    if (!deleteUser?._id) return;
    setDeleteSubmitting(true);
    setRowBusyId(deleteUser._id);
    try {
      if (deleteUser.role === ROLES.ADMIN) {
        const password = String(deletePassword || '');
        if (!password.trim()) {
          setDeleteError('Password is required to delete an Admin user');
          return;
        }
        await api.delete(`/auth/users/${deleteUser._id}`, { data: { password } });
      } else {
        await api.delete(`/auth/users/${deleteUser._id}`);
      }
      setUsers((prev) => prev.filter((u) => u._id !== deleteUser._id));
      setSuccess('User deleted successfully');
      if (String(selectedUserId) === String(deleteUser._id)) {
        setSelectedUserId('');
        setPanelMode('none');
        setMobilePanelOpen(false);
      }
      closeDelete();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete user';
      if (deleteUser?.role === ROLES.ADMIN) setDeleteError(msg);
      else setTableError(msg);
    } finally {
      setDeleteSubmitting(false);
      setRowBusyId('');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setDepartmentFilter('all');
  };

  const detailsCard = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {panelMode === 'create' ? 'Create User' : panelMode === 'edit' ? 'Edit User' : 'User Details'}
          </div>
          <div className="mt-1 truncate text-sm font-extrabold text-slate-900">
            {panelMode === 'create' ? 'New account' : selectedUser?.username || 'Select a user'}
          </div>
        </div>
        <button
          type="button"
          onClick={closeMobilePanel}
          className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-4">
        {panelMode === 'none' && (
          <div className="py-8">
            <EmptyState icon={User} title="Select a user" description="Pick a user from the list to view details, or create a new account." />
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={startCreate} className="app-btn app-btn-primary">
                <UserPlus className="h-4 w-4" />
                New user
              </button>
            </div>
          </div>
        )}

        {panelMode === 'create' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="app-input pl-10"
                  placeholder="e.g. warehouse-admin"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="app-input pl-10"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="app-input"
                  placeholder="Temporary password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700" htmlFor="role">
                  Role
                </label>
                <select id="role" name="role" value={formData.role} onChange={handleChange} className="app-select">
                  {Object.entries(ROLES)
                    .filter(([, value]) => value !== ROLES.PROCUREMENT && (isCurrentAdmin ? true : value !== ROLES.ADMIN))
                    .map(([key, value]) => (
                      <option key={value} value={value}>
                        {key
                          .replace(/_/g, ' ')
                          .split(' ')
                          .filter(Boolean)
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                          .join(' ')}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700" htmlFor="department">
                Department
              </label>
              <select id="department" name="department" value={formData.department} onChange={handleChange} className="app-select">
                <option value={ALL_DEPARTMENTS_LABEL}>{ALL_DEPARTMENTS_LABEL}</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {(error || success) && <Alert variant={error ? 'error' : 'success'}>{error || success}</Alert>}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPanelMode('none')} disabled={submitting} className="app-btn app-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="app-btn app-btn-primary">
                {submitting && <Spinner className="h-4 w-4" />}
                Create user
              </button>
            </div>
          </form>
        )}

        {(panelMode === 'view' || panelMode === 'edit') && selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {(() => {
                const avatarUpdatedAt = selectedUser?.profile?.avatarUpdatedAt || null;
                const avatarUrl = avatarUpdatedAt ? buildAvatarUrl(selectedUser._id, avatarUpdatedAt) : '';
                const showAvatar = Boolean(avatarUrl) && !avatarErrorById?.[selectedUser._id];
                const initials = String(selectedUser.username || 'U')
                  .slice(0, 2)
                  .toUpperCase();
                return showAvatar ? (
                  <img
                    src={avatarUrl}
                    alt={selectedUser.username ? `${selectedUser.username} avatar` : 'User avatar'}
                    className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200"
                    loading="lazy"
                    onError={() => setAvatarErrorById((prev) => ({ ...(prev || {}), [selectedUser._id]: true }))}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-muted/15 text-slate-800 font-extrabold">
                    {initials}
                  </div>
                );
              })()}
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold text-slate-900">{selectedUser.username}</div>
                <div className="truncate text-sm text-slate-600">{selectedUser.email}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={['px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide', rolePillClass(selectedUser.role)].join(' ')}>
                {formatRole(selectedUser.role)}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-700">
                {String(selectedUser?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL}
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                Joined {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>

            {panelMode === 'view' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => startEdit(selectedUser)} className="app-btn app-btn-secondary">
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(selectedUser)}
                  disabled={currentUserId && String(currentUserId) === String(selectedUser._id)}
                  className="app-btn app-btn-danger"
                  title={currentUserId && String(currentUserId) === String(selectedUser._id) ? 'You cannot delete your own account' : 'Delete user'}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}

            {panelMode === 'edit' && (
              <form onSubmit={submitEdit} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="edit-username">
                      Username
                    </label>
                    <input
                      id="edit-username"
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                      className="app-input"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="edit-email">
                      Email
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      className="app-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="edit-role">
                      Role
                    </label>
                    <select
                      id="edit-role"
                      value={editForm.role}
                      onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                      className="app-select"
                    >
                      {Object.entries(ROLES)
                        .filter(([, value]) => value !== ROLES.PROCUREMENT && (isCurrentAdmin ? true : value !== ROLES.ADMIN))
                        .map(([key, value]) => (
                          <option key={value} value={value}>
                            {key
                              .replace(/_/g, ' ')
                              .split(' ')
                              .filter(Boolean)
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                              .join(' ')}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700" htmlFor="edit-password">
                      Reset password
                    </label>
                    <input
                      id="edit-password"
                      type="password"
                      value={editForm.password}
                      onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                      className="app-input"
                      placeholder="Leave blank to keep"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700" htmlFor="edit-department">
                    Department
                  </label>
                  <select
                    id="edit-department"
                    value={editForm.department}
                    onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))}
                    className="app-select"
                  >
                    <option value={ALL_DEPARTMENTS_LABEL}>{ALL_DEPARTMENTS_LABEL}</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {editError && <Alert variant="error">{editError}</Alert>}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={cancelEdit} disabled={editSubmitting} className="app-btn app-btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSubmitting} className="app-btn app-btn-primary">
                    {editSubmitting && <Spinner className="h-4 w-4" />}
                    Save changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-primary-700 to-accent p-[1px] shadow-[0_18px_55px_-28px_rgba(2,6,23,0.45)]">
        <div className="rounded-2xl bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin</div>
                <h2 className="text-lg font-extrabold text-slate-900">User Management</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                <Users className="h-3.5 w-3.5" />
                {loading ? 'Loading…' : `${users.length} users`}
              </span>
              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={['h-3.5 w-3.5', loading ? 'animate-spin' : ''].join(' ')} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-600">
            Create accounts, update roles, or remove users from the system.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Directory</h3>
                  <p className="text-xs text-slate-500">Search, filter, and select a user to manage details.</p>
                </div>
                <button type="button" onClick={startCreate} className="app-btn app-btn-primary">
                  <UserPlus className="h-4 w-4" />
                  New user
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search username or email…"
                    className="app-input pl-9 pr-9"
                  />
                  {search.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center sm:gap-2">
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="app-select sm:w-44">
                    <option value="all">All roles</option>
                    {Object.entries(ROLES)
                      .filter(([, value]) => value !== ROLES.PROCUREMENT)
                      .map(([key, value]) => (
                        <option key={value} value={value}>
                          {key
                            .replace(/_/g, ' ')
                            .split(' ')
                            .filter(Boolean)
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ')}
                        </option>
                      ))}
                  </select>
                  <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="app-select sm:w-52">
                    <option value="all">All departments</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={search.trim().length === 0 && roleFilter === 'all' && departmentFilter === 'all'}
                    className="app-btn app-btn-ghost justify-center sm:w-32"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {tableError && (
              <div className="border-b border-slate-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800" role="alert">
                {tableError}
              </div>
            )}
            {!tableError && success && (
              <div className="border-b border-slate-200 bg-primary-50 px-4 py-3 text-xs font-semibold text-primary-800" role="status">
                {success}
              </div>
            )}
            {!loading && !tableError && (
              <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                Showing <span className="font-extrabold text-slate-900">{filteredUsers.length}</span> of{' '}
                <span className="font-extrabold text-slate-900">{users.length}</span>
              </div>
            )}

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-bold">User</th>
                    <th className="px-4 py-3 font-bold">Role</th>
                    <th className="px-4 py-3 font-bold">Department</th>
                    <th className="px-4 py-3 font-bold">Joined</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center">
                        <Spinner className="h-7 w-7 text-primary mx-auto" />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center">
                        <EmptyState icon={Users} title="No users found" description="Try a different search or reset the filters." />
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = currentUserId && String(currentUserId) === String(u._id);
                      const isAdminUser = u.role === ROLES.ADMIN;
                      const initials = String(u.username || 'U')
                        .slice(0, 2)
                        .toUpperCase();
                      const busy = rowBusyId === u._id;
                      const isSelected = selectedUserId && String(selectedUserId) === String(u._id);
                      const avatarUpdatedAt = u?.profile?.avatarUpdatedAt || null;
                      const avatarUrl = avatarUpdatedAt ? buildAvatarUrl(u._id, avatarUpdatedAt) : '';
                      const showAvatar = Boolean(avatarUrl) && !avatarErrorById?.[u._id];
                      return (
                        <tr
                          key={u._id}
                          className={[
                            'hover:bg-slate-50/70 transition-colors cursor-pointer',
                            isSelected ? 'bg-primary-50/40' : ''
                          ].join(' ')}
                          onClick={() => selectUser(u)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {showAvatar ? (
                                <img
                                  src={avatarUrl}
                                  alt={u.username ? `${u.username} avatar` : 'User avatar'}
                                  className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200"
                                  loading="lazy"
                                  onError={() => setAvatarErrorById((prev) => ({ ...(prev || {}), [u._id]: true }))}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-muted/15 text-slate-800 font-extrabold">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="truncate font-extrabold text-slate-900">{u.username}</div>
                                  {isSelf && (
                                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-800">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="truncate text-sm text-slate-600">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={[
                                'px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide',
                                rolePillClass(u.role)
                              ].join(' ')}
                            >
                              {formatRole(u.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                            {String(u?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(u);
                                }}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Edit user"
                              >
                                {busy ? <Spinner className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDelete(u);
                                }}
                                disabled={busy || isSelf}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                title={
                                  isSelf ? 'You cannot delete your own account' : isAdminUser ? 'Delete admin user (requires password)' : 'Delete user'
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-10 text-center">
                  <Spinner className="h-7 w-7 text-primary mx-auto" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-4 py-10">
                  <EmptyState icon={Users} title="No users found" description="Try a different search or reset the filters." />
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserId && String(selectedUserId) === String(u._id);
                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className={[
                        'w-full text-left px-4 py-3 transition',
                        isSelected ? 'bg-primary-50/40' : 'bg-white hover:bg-slate-50/70'
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-extrabold text-slate-900">{u.username}</div>
                          <div className="truncate text-sm text-slate-600">{u.email}</div>
                        </div>
                        <span className={['shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide', rolePillClass(u.role)].join(' ')}>
                          {formatRole(u.role)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">{String(u?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-4">{detailsCard}</div>
        </div>
      </div>

      {mobilePanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 p-3 backdrop-blur-sm lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="User details"
          onClick={closeMobilePanel}
        >
          <div className="mx-auto mt-12 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {detailsCard}
          </div>
        </div>
      )}

      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Delete user">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-900">Delete user?</div>
                <div className="truncate text-sm text-slate-500">{deleteUser.username} · {deleteUser.email}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {deleteUser.role === ROLES.ADMIN
                ? 'This is an Admin user. Enter your password to confirm deletion.'
                : 'This action removes the user account and cannot be undone.'}
            </div>

            {deleteUser.role === ROLES.ADMIN && (
              <div className="mt-4 space-y-1">
                <label className="text-xs font-bold text-slate-700" htmlFor="delete-admin-password">
                  Your password
                </label>
                <input
                  id="delete-admin-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="app-input"
                  placeholder="Enter current password"
                />
              </div>
            )}

            {deleteError && (
              <div className="mt-3">
                <Alert variant="error">{deleteError}</Alert>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleteSubmitting}
                className="app-btn app-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDelete}
                disabled={deleteSubmitting}
                className="app-btn app-btn-danger"
              >
                {deleteSubmitting && <Spinner className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
