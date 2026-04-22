import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, Trash2, User as UserIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../constants/assets';
import Alert from './ui/Alert';
import Spinner from './ui/Spinner';

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

const AdminProfile = () => {
  const { user, refreshUser } = useAuth();
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
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6 text-primary" />
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
                className="mt-1 app-input"
                placeholder="Username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Email (read-only)</label>
              <input
                value={email}
                className="mt-1 app-input bg-slate-50 text-slate-500"
                readOnly
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
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
                  <p className="text-sm font-bold text-slate-900">Profile image</p>
                  <p className="text-xs text-slate-500">Upload a small image (auto-compressed).</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="app-btn app-btn-secondary cursor-pointer">
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
                  className="app-btn app-btn-secondary text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">First Name</label>
              <input
                name="firstName"
                value={profile.firstName}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Last Name</label>
              <input
                name="lastName"
                value={profile.lastName}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Phone</label>
              <input
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Department</label>
              <select
                name="department"
                value={profile.department}
                onChange={handleProfileChange}
                className="mt-1 app-select"
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
              <label className="block text-xs font-bold text-slate-600">Job Title</label>
              <input
                name="jobTitle"
                value={profile.jobTitle}
                onChange={handleProfileChange}
                className="mt-1 app-input"
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
                className="mt-1 app-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600">Address Line 2</label>
              <input
                name="addressLine2"
                value={profile.addressLine2}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">City</label>
              <input
                name="city"
                value={profile.city}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">State</label>
              <input
                name="state"
                value={profile.state}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Postal Code</label>
              <input
                name="postalCode"
                value={profile.postalCode}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Country</label>
              <input
                name="country"
                value={profile.country}
                onChange={handleProfileChange}
                className="mt-1 app-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600">Bio</label>
              <textarea
                name="bio"
                value={profile.bio}
                onChange={handleProfileChange}
                rows={4}
                className="mt-1 app-textarea"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              {error && <Alert variant="error">{error}</Alert>}
              {!error && success && <Alert variant="success">{success}</Alert>}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={clearing}
                className="app-btn app-btn-secondary text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
              >
                {clearing ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                Clear
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="app-btn app-btn-primary px-5 py-2"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
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
