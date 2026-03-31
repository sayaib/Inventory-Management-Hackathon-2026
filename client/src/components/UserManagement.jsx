import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { UserPlus, User, Mail, Shield, Loader2, Trash2 } from 'lucide-react';

import { ROLES } from '../constants/roles';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: ROLES.INVENTORY_MANAGER
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/auth/register', formData);
      setSuccess('User created successfully');
      setFormData({ username: '', email: '', password: '', role: ROLES.INVENTORY_MANAGER });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-700">
              <UserPlus className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Create user</h3>
              <p className="text-xs text-slate-500">Add a new team member with a role.</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 sm:flex">
            <Shield className="h-3.5 w-3.5" />
            Admin
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2">
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
                className="block w-full rounded-lg border border-slate-200 bg-white px-10 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
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
                className="block w-full rounded-lg border border-slate-200 bg-white px-10 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                placeholder="name@company.com"
              />
            </div>
          </div>

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
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
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
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            >
              {Object.entries(ROLES).map(([key, value]) => (
                <option key={value} value={value}>
                  {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[18px]">
              {error && (
                <p className="text-xs font-semibold text-rose-700" role="alert" aria-live="polite">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-xs font-semibold text-emerald-700" role="status" aria-live="polite">
                  {success}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create user
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Users</h3>
            <p className="text-xs text-slate-500">Manage registered accounts.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {loading ? 'Loading' : `${users.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 font-bold">Username</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-10 text-center">
                    <Loader2 className="animate-spin h-7 w-7 text-indigo-600 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-10 text-center text-slate-500 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">{u.username}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-sm">{u.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={[
                          'px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide',
                          u.role === ROLES.ADMIN ? 'bg-indigo-50 text-indigo-800' : 'bg-emerald-50 text-emerald-800'
                        ].join(' ')}
                      >
                        {u.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-sm">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
