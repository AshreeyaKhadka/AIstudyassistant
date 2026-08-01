import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/react';
import { useOutletContext } from 'react-router-dom';
import { User, Mail, GraduationCap, Calendar, Save, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const { setUser: setDashboardUser } = useOutletContext() || {};
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

    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        let res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });

        if (!res.ok) {
          res = await fetch('/api/auth/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            signal: controller.signal,
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
          if (res.ok) res = await fetch('/api/auth/me', { credentials: 'include', signal: controller.signal });
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

    return () => controller.abort();
  }, [isLoaded, clerkUser?.id]);

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

      const savedUser = payload.user || {};
      setDashboardUser?.((current) => ({
        ...current,
        id: savedUser.id || current?.id,
        name: [savedUser.first_name, savedUser.last_name].filter(Boolean).join(' ') || savedUser.name,
        username: savedUser.first_name || current?.username,
        first_name: savedUser.first_name,
        last_name: savedUser.last_name,
        college: savedUser.college,
        semester: savedUser.semester,
      }));
      try {
        await clerkUser?.update?.({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
        });
        await clerkUser?.reload?.();
      } catch {
        // The app profile is already saved even if the identity provider is temporarily unavailable.
      }
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin border-2 border-[#102326] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
          USER PROFILE & ACADEMIC SETTINGS
        </div>
        <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Student Profile</h2>
        <p className="text-xs text-[#666666] mt-0.5">Manage your identity and current enrolled semester details.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 space-y-6">
        {/* User Identity Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#D7D3CF]">
          <div className="w-14 h-14 rounded-[4px] bg-[#102326] text-white flex items-center justify-center text-lg font-mono font-bold border border-[#102326]">
            {clerkUser?.imageUrl ? (
              <img src={clerkUser.imageUrl} alt="avatar" className="w-full h-full rounded-[4px] object-cover" />
            ) : (
              `${formData.firstName?.charAt(0) || ''}${formData.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111111]">
              {formData.firstName} {formData.lastName}
            </h3>
            <p className="text-xs font-mono text-[#666666]">{formData.email}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ProfileField label="FIRST NAME" icon={<User size={14} />}>
              <input
                type="text"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                placeholder="First name"
                className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              />
            </ProfileField>
            <ProfileField label="LAST NAME" icon={<User size={14} />}>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                placeholder="Last name"
                className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              />
            </ProfileField>
          </div>

          <ProfileField label="EMAIL ADDRESS" icon={<Mail size={14} />}>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="w-full bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] px-3 py-2 text-xs font-mono text-[#666666] cursor-not-allowed opacity-70"
            />
          </ProfileField>

          <ProfileField label="COLLEGE / INSTITUTION" icon={<GraduationCap size={14} />}>
            <input
              type="text"
              value={formData.college}
              onChange={handleChange('college')}
              placeholder="Enter your college name"
              className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
            />
          </ProfileField>

          <ProfileField label="ENROLLED SEMESTER" icon={<Calendar size={14} />}>
            <div className="relative">
              <select
                value={formData.semester}
                onChange={handleChange('semester')}
                className="w-full appearance-none bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none cursor-pointer"
              >
                <option value="">Select semester</option>
                {semesterOptions.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] pointer-events-none" />
            </div>
          </ProfileField>

          {/* Messages */}
          {message.text && (
            <div className={`p-3 rounded-[4px] text-xs font-mono flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-white text-[#102326] border-[#102326]'
                : 'bg-[#FFFDFB] text-[#C96A32] border-[#D7D3CF]'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saving ? 'SAVING...' : 'SAVE CHANGES'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Info Details */}
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 space-y-3">
        <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold pb-2 border-b border-[#D7D3CF]">
          SYSTEM ACCOUNT DETAILS
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[#666666]">USER ID</span>
            <p className="text-[#111111] font-semibold mt-0.5 truncate">{clerkUser?.id || 'N/A'}</p>
          </div>
          <div>
            <span className="text-[#666666]">ROLE</span>
            <p className="text-[#111111] font-semibold mt-0.5">STUDENT</p>
          </div>
          <div>
            <span className="text-[#666666]">AUTHENTICATION</span>
            <p className="text-[#111111] font-semibold mt-0.5">CLERK OAUTH</p>
          </div>
          <div>
            <span className="text-[#666666]">CREATED AT</span>
            <p className="text-[#111111] font-semibold mt-0.5">
              {clerkUser?.createdAt ? new Date(clerkUser.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileField = ({ label, icon, children }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
      <span>{icon}</span>
      {label}
    </label>
    {children}
  </div>
);

export default ProfilePage;
