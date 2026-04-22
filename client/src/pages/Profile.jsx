import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Save, Trash2, User as UserIcon, ArrowLeft, LayoutDashboard, FolderKanban, BarChart3, Users, History, Settings, Package, LogOut } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../constants/assets';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

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
  bio: '',
  avatarUpdatedAt: null
};

const Profile = () => {
  const { user, refreshUser, logout } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [userId, setUserId] = useState('');

  const email = user?.email || '';
  const role = user?.role || '';
  const showAdminLayout = useMemo(() => {
    const fromAdminQuery = new URLSearchParams(String(location?.search || '')).get('from') === 'admin';
    return String(role || '') === 'admin' || fromAdminQuery;
  }, [location?.search, role]);

  const adminNavItems = useMemo(
    () => [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/admin/overview' },
      { key: 'projectStatus', label: 'Project Status', icon: FolderKanban, href: '/admin/project-status' },
      { key: 'prediction', label: 'Prediction', icon: BarChart3, href: '/admin/predictions' },
      { key: 'users', label: 'Users', icon: Users, href: '/admin/users' },
      { key: 'audit', label: 'Audit Logs', icon: History, href: '/admin/audit-logs' },
      { key: 'reports', label: 'Reports', icon: BarChart3, href: '/admin/reports' },
      { key: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
      { key: 'inventory', label: 'Inventory', icon: Package, href: '/inventory?from=admin' },
      { key: 'profile', label: 'Profile', icon: UserIcon, href: '/profile?from=admin' }
    ],
    []
  );

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get('/settings/company-directory');
        const list = Array.isArray(res.data?.departments) && res.data.departments.length > 0 ? res.data.departments : DEPARTMENTS;
        setDepartments(list);
      } catch {
        setDepartments(DEPARTMENTS);
      }
    };
    loadDepartments();
  }, []);

  const canSubmit = useMemo(() => {
    if (!username?.trim()) return false;
    return true;
  }, [username]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/auth/profile');
      setUserId(res.data?.id || user?._id || user?.id || '');
      setUsername(res.data?.username || user?.username || '');
      setProfile({ ...EMPTY_PROFILE, ...(res.data?.profile || {}) });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
      setUserId(user?._id || user?.id || '');
      setUsername(user?.username || '');
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.id, user?.username]);

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
      const profileFields = { ...(profile || {}) };
      delete profileFields.avatarUpdatedAt;
      const payload = { username: username.trim(), ...profileFields };
      await api.put('/auth/profile', payload);
      await refreshUser();
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const buildAvatarUrl = useMemo(() => {
    if (!userId) return '';
    const updatedAt = profile?.avatarUpdatedAt ? new Date(profile.avatarUpdatedAt).getTime() : 0;
    const base = `${api.defaults.baseURL}/auth/users/${userId}/avatar`;
    return updatedAt ? `${base}?v=${updatedAt}` : base;
  }, [profile?.avatarUpdatedAt, userId]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarUploading(true);
    setError('');
    setSuccess('');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 256;
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const targetW = Math.max(1, Math.round((img.width || 1) * scale));
            const targetH = Math.max(1, Math.round((img.height || 1) * scale));
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const out = canvas.toDataURL('image/jpeg', 0.82);
            URL.revokeObjectURL(objectUrl);
            resolve(out);
          } catch (canvasErr) {
            URL.revokeObjectURL(objectUrl);
            reject(canvasErr);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Invalid image'));
        };
        img.src = objectUrl;
      });

      const res = await api.put('/auth/profile/avatar', { imageDataUrl: dataUrl });
      setProfile((prev) => ({ ...(prev || {}), avatarUpdatedAt: res.data?.avatarUpdatedAt || new Date().toISOString() }));
      await refreshUser();
      setSuccess('Profile image updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload profile image');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete('/auth/profile/avatar');
      setProfile((prev) => ({ ...(prev || {}), avatarUpdatedAt: null }));
      await refreshUser();
      setSuccess('Profile image removed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove profile image');
    } finally {
      setAvatarUploading(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pageMain = (
    <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-xl font-extrabold text-gray-900">Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Update your details. Email is read-only.</p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                  placeholder="Username"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email (read-only)</label>
                <input
                  value={email}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500"
                  readOnly
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-200">
                    {buildAvatarUrl ? (
                      <img
                        src={buildAvatarUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Profile image</p>
                    <p className="text-xs text-gray-500">Upload a small image (auto-compressed).</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                      className="hidden"
                    />
                    {avatarUploading ? 'Uploading...' : 'Upload'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={avatarUploading || !profile?.avatarUpdatedAt}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                <input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                <input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                <select
                  name="department"
                  value={profile.department}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                >
                  <option value="">Unassigned</option>
                  {(() => {
                    const list = Array.isArray(departments) ? departments : [];
                    const unique = [];
                    const seen = new Set();
                    const current = String(profile.department || '').trim();
                    if (current) {
                      unique.push(current);
                      seen.add(current.toLowerCase());
                    }
                    for (const d of list) {
                      const value = String(d || '').trim();
                      if (!value) continue;
                      const key = value.toLowerCase();
                      if (seen.has(key)) continue;
                      seen.add(key);
                      unique.push(value);
                    }
                    return unique.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                <input
                  name="jobTitle"
                  value={profile.jobTitle}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 1</label>
                <input
                  name="addressLine1"
                  value={profile.addressLine1}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 2</label>
                <input
                  name="addressLine2"
                  value={profile.addressLine2}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <input
                  name="city"
                  value={profile.city}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                <input
                  name="state"
                  value={profile.state}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
                <input
                  name="postalCode"
                  value={profile.postalCode}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <input
                  name="country"
                  value={profile.country}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleProfileChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                {error && <p className="text-red-600 font-medium">{error}</p>}
                {success && <p className="text-primary-700 font-medium">{success}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={clearing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={saving || !canSubmit}
                  className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </form>
      </div>
    </main>
  );

  if (showAdminLayout) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-60 bg-slate-950 text-slate-100 border-r border-white/10">
          <div className="flex w-full flex-col py-4">
            <div className="px-3 mb-4 flex items-center gap-3">
              <Link
                to="/admin/overview"
                aria-label="Go to admin home"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm"
              >
                <img
                  src={APP_LOGO_URL}
                  alt="Optimized Solutions Ltd"
                  className="h-6 w-6 rounded bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <div className="leading-tight">
                <div className="text-sm font-extrabold text-white">Admin Portal</div>
                <div className="text-xs text-slate-300">Inventory control</div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-2">
              <div className="space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === 'profile';
                  return (
                    <Link
                      key={item.key}
                      to={item.href}
                      className={[
                        'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                        isActive ? 'bg-white/10 text-white shadow-sm' : 'text-slate-200 hover:bg-white/5 hover:text-white'
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="px-3">
              <button
                type="button"
                onClick={logout}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-60">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold text-slate-900">Profile</h1>
                <p className="truncate text-xs text-slate-500">Admin profile settings</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] px-2.5 py-1 bg-primary-100 text-primary-800 rounded-full uppercase font-bold tracking-wider">
                  {role?.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
          </header>

          {pageMain}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-gray-900">
                <Link to="/dashboard" aria-label="Go to dashboard home" className="p-2 bg-primary rounded-lg">
                  <img
                    src={APP_LOGO_URL}
                    alt="Optimized Solutions Ltd"
                    className="h-5 w-5 rounded bg-white object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </Link>
                <span className="text-lg font-bold tracking-tight">Profile</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] px-2.5 py-1 bg-primary-100 text-primary-800 rounded-full uppercase font-bold tracking-wider">
                {role?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {pageMain}
    </div>
  );
};

export default Profile;
