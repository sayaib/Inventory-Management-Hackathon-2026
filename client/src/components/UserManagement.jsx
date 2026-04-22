import React, { useMemo, useState, useEffect } from 'react';
import api from '../api/axios';
import { UserPlus, User, Mail, Shield, Loader2, Trash2, Pencil, Search, X, RefreshCw, Users } from 'lucide-react';

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
  const [editUser, setEditUser] = useState(null);
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

  const fetchUsers = async () => {
    try {
      setTableError('');
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      setTableError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/auth/register', formData);
      setSuccess('User created successfully');
      setFormData({ username: '', email: '', password: '', role: ROLES.INVENTORY_MANAGER, department: ALL_DEPARTMENTS_LABEL });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (u) => {
    setSuccess('');
    setError('');
    setEditError('');
    setEditUser(u);
    const currentDepartment = String(u?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL;
    setEditForm({
      username: u.username || '',
      email: u.email || '',
      role: u.role || ROLES.INVENTORY_MANAGER,
      password: '',
      department: currentDepartment
    });
  };

  const closeEdit = () => {
    setEditSubmitting(false);
    setEditError('');
    setEditUser(null);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editUser?._id) return;
    setEditError('');
    setEditSubmitting(true);
    setRowBusyId(editUser._id);

    const payload = {
      username: editForm.username,
      email: editForm.email
    };
    if (editForm.role !== editUser.role) payload.role = editForm.role;
    if (editForm.password.trim().length > 0) payload.password = editForm.password;
    const prevDepartment = String(editUser?.profile?.department || '').trim() || ALL_DEPARTMENTS_LABEL;
    if (String(editForm.department || '').trim() !== prevDepartment) payload.department = editForm.department;

    try {
      const res = await api.put(`/auth/users/${editUser._id}`, payload);
      setUsers((prev) => prev.map((u) => (u._id === editUser._id ? res.data : u)));
      setSuccess('User updated successfully');
      closeEdit();
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Create user</h3>
                  <p className="text-xs text-slate-500">Invite a new member with role access.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
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
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
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
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
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

              {(error || success) && (
                <Alert variant={error ? 'error' : 'success'}>{error || success}</Alert>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="app-btn app-btn-primary w-full py-3"
              >
                {submitting && <Spinner className="h-4 w-4" />}
                Create user
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Users</h3>
                <p className="text-xs text-slate-500">Search, filter, edit and delete accounts.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search username or email…"
                    className="app-input pl-9 sm:w-60"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="app-select sm:w-52"
                >
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
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="app-select sm:w-56"
                >
                  <option value="all">All departments</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
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

            <div className="overflow-x-auto">
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
                        <EmptyState
                          icon={Users}
                          title="No users found"
                          description="Try a different search or clear the filter."
                        />
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
                      const avatarUpdatedAt = u?.profile?.avatarUpdatedAt || null;
                      const avatarUrl = avatarUpdatedAt ? buildAvatarUrl(u._id, avatarUpdatedAt) : '';
                      const showAvatar = Boolean(avatarUrl) && !avatarErrorById?.[u._id];
                      return (
                        <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
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
                                  {avatarUpdatedAt && !showAvatar && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                                      Logo
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
                                onClick={() => openEdit(u)}
                                disabled={busy}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Edit user"
                              >
                                {busy ? <Spinner className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(u)}
                                disabled={busy || isSelf}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                title={
                                  isSelf
                                    ? 'You cannot delete your own account'
                                    : isAdminUser
                                      ? 'Delete admin user (requires password)'
                                      : 'Delete user'
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
          </div>
        </div>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit user">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Edit User</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900">{editUser.username}</div>
                <div className="text-sm text-slate-500">{editUser.email}</div>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="space-y-4 px-5 py-5">
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

              {editError && (
                <Alert variant="error">{editError}</Alert>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSubmitting}
                  className="app-btn app-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="app-btn app-btn-primary"
                >
                  {editSubmitting && <Spinner className="h-4 w-4" />}
                  Save changes
                </button>
              </div>
            </form>
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
