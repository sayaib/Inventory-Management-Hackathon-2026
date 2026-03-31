import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Save, Trash2, User as UserIcon, ArrowLeft } from 'lucide-react';
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

const Profile = () => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-gray-900">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">Profile</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full uppercase font-bold tracking-wider">
                {role?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      </nav>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                <input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                <input
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                <input
                  name="department"
                  value={profile.department}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Job Title</label>
                <input
                  name="jobTitle"
                  value={profile.jobTitle}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Avatar URL</label>
                <input
                  name="avatarUrl"
                  value={profile.avatarUrl}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="https://..."
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 2</label>
                <input
                  name="addressLine2"
                  value={profile.addressLine2}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <input
                  name="city"
                  value={profile.city}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                <input
                  name="state"
                  value={profile.state}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
                <input
                  name="postalCode"
                  value={profile.postalCode}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <input
                  name="country"
                  value={profile.country}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleProfileChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                {error && <p className="text-red-600 font-medium">{error}</p>}
                {success && <p className="text-green-600 font-medium">{success}</p>}
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
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Profile;
