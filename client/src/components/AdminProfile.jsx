import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, User as UserIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  phone: '',
  department: '',
  jobTitle: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  avatarUrl: '',
  bio: ''
};

const AdminProfile = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  const email = user?.email || '';
  const role = user?.role || '';

  const canSubmit = useMemo(() => {
    if (!username?.trim()) return false;
    return true;
  }, [username]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/profile');
      setUsername(res.data?.username || user?.username || '');
      setProfile({ ...EMPTY_PROFILE, ...(res.data?.profile || {}) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
      setUsername(user?.username || '');
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = { username: username.trim(), ...profile };
      await api.put('/auth/profile', payload);
      await refreshUser();
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setError('');
    setSuccess('');
    try {
      await api.delete('/auth/profile');
      await refreshUser();
      await loadProfile();
      setSuccess('Profile data cleared');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clear profile data');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-700">
              <UserIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Your Profile</h2>
              <p className="text-xs text-slate-500">Update your details. Email is read-only.</p>
            </div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
            {role?.replace(/_/g, ' ')}
          </div>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                placeholder="Username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Email (read-only)</label>
              <input
                value={email}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">First Name</label>
              <input
                name="firstName"
                value={profile.firstName}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Last Name</label>
              <input
                name="lastName"
                value={profile.lastName}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Phone</label>
              <input
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Department</label>
              <input
                name="department"
                value={profile.department}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Job Title</label>
              <input
                name="jobTitle"
                value={profile.jobTitle}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Avatar URL</label>
              <input
                name="avatarUrl"
                value={profile.avatarUrl}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600">Address Line 1</label>
              <input
                name="addressLine1"
                value={profile.addressLine1}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600">Address Line 2</label>
              <input
                name="addressLine2"
                value={profile.addressLine2}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">City</label>
              <input
                name="city"
                value={profile.city}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">State</label>
              <input
                name="state"
                value={profile.state}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Postal Code</label>
              <input
                name="postalCode"
                value={profile.postalCode}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Country</label>
              <input
                name="country"
                value={profile.country}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600">Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleProfileChange}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              {error && <p className="font-medium text-rose-700">{error}</p>}
              {success && <p className="font-medium text-primary-700">{success}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Clear
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;
