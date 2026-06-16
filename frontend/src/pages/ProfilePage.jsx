import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/react';
import { motion } from 'framer-motion';
import { User, Mail, GraduationCap, Calendar, Save, ChevronDown, Camera, CheckCircle2, AlertCircle } from 'lucide-react';

const semesterOptions = [
  { value: '1', label: '1st Semester' },
  { value: '2', label: '2nd Semester' },
  { value: '3', label: '3rd Semester' },
  { value: '4', label: '4th Semester' },
  { value: '5', label: '5th Semester' },
  { value: '6', label: '6th Semester' },
  { value: '7', label: '7th Semester' },
  { value: '8', label: '8th Semester' },
];

const ProfilePage = () => {
  const { user: clerkUser, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    college: '',
    semester: '',
    email: '',
  });

  useEffect(() => {
    if (!isLoaded || !clerkUser) return;

    const clerkFirstName = clerkUser.firstName || '';
    const clerkLastName = clerkUser.lastName || '';
    const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress || '';

    const loadProfile = async () => {
      try {
        let res = await fetch('/api/auth/me', { credentials: 'include' });

        if (!res.ok) {
          res = await fetch('/api/auth/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              firstName: clerkFirstName,
              lastName: clerkLastName,
              email: clerkEmail,
              externalId: clerkUser.id,
              avatarUrl: clerkUser.imageUrl,
              college: 'Not specified',
              semester: 1,
            }),
          });
          if (res.ok) res = await fetch('/api/auth/me', { credentials: 'include' });
        }

        if (res.ok) {
          const profile = await res.json();
          setFormData({
            firstName: profile.first_name || clerkFirstName,
            lastName: profile.last_name || clerkLastName,
            college: profile.college || '',
            semester: profile.semester ? String(profile.semester) : '',
            email: profile.email || clerkEmail,
          });
        } else {
          setFormData({
            firstName: clerkFirstName,
            lastName: clerkLastName,
            college: '',
            semester: '',
            email: clerkEmail,
          });
        }
      } catch {
        setFormData({
          firstName: clerkFirstName,
          lastName: clerkLastName,
          college: '',
          semester: '',
          email: clerkEmail,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isLoaded, clerkUser]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.college.trim() || !formData.semester) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          college: formData.college,
          semester: formData.semester,
          email: formData.email,
          externalId: clerkUser?.id || '',
          avatarUrl: clerkUser?.imageUrl || '',
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to update profile');

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal and academic information.</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        {/* Avatar Section */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
                {clerkUser?.imageUrl ? (
                  <img src={clerkUser.imageUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  `${formData.firstName?.charAt(0) || ''}${formData.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <Camera size={18} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                {formData.firstName} {formData.lastName}
              </h3>
              <p className="text-sm text-slate-500">{formData.email}</p>
              {clerkUser?.username && (
                <p className="text-xs text-slate-400 mt-0.5">@{clerkUser.username}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ProfileField label="First Name" icon={<User size={16} />}>
              <input
                type="text"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                placeholder="First name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </ProfileField>
            <ProfileField label="Last Name" icon={<User size={16} />}>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                placeholder="Last name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </ProfileField>
          </div>

          <ProfileField label="Email Address" icon={<Mail size={16} />}>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed opacity-70"
            />
          </ProfileField>

          <ProfileField label="College" icon={<GraduationCap size={16} />}>
            <input
              type="text"
              value={formData.college}
              onChange={handleChange('college')}
              placeholder="Enter your college name"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </ProfileField>

          <ProfileField label="Semester" icon={<Calendar size={16} />}>
            <div className="relative">
              <select
                value={formData.semester}
                onChange={handleChange('semester')}
                className="w-full appearance-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select semester</option>
                {semesterOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </ProfileField>

          {/* Messages */}
          {message.text && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
      >
        <h4 className="text-sm font-semibold text-slate-800 mb-4">Account Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Account ID</span>
            <p className="text-slate-600 font-mono text-xs mt-0.5 truncate">{clerkUser?.id || 'N/A'}</p>
          </div>
          <div>
            <span className="text-slate-400">Role</span>
            <p className="text-slate-600 mt-0.5 capitalize">Student</p>
          </div>
          <div>
            <span className="text-slate-400">Provider</span>
            <p className="text-slate-600 mt-0.5">Clerk Auth</p>
          </div>
          <div>
            <span className="text-slate-400">Joined</span>
            <p className="text-slate-600 mt-0.5">
              {clerkUser?.createdAt ? new Date(clerkUser.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ProfileField = ({ label, icon, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
      <span className="text-slate-400">{icon}</span>
      {label}
    </label>
    {children}
  </div>
);

export default ProfilePage;
