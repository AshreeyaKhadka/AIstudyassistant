import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Library, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { useUser } from '@clerk/react';
import { syncClerkSession } from '../utils/syncClerkSession';

const UNIVERSITY = 'Pokhara University';
const COURSE = 'Computer Engineering';

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

const collegeOptions = [
  'Nepal Engineering College (NEC), Changunarayan, Bhaktapur',
  'Pokhara Engineering College (PEC), Pokhara, Kaski',
  'Gandaki College of Engineering and Science (GCES), Pokhara, Kaski',
  'Universal Engineering & Science College (UESC), Chakupat, Lalitpur',
  'Everest Engineering College (EEC), Sanepa, Lalitpur',
  'Nepal College of Information Technology (NCIT), Balkumari, Lalitpur',
  'Lumbini Engineering, Management and Science College (LEMSC), Tilottama, Rupandehi',
  'Oxford College of Engineering and Management, Gaindakot, Nawalparasi',
  'Rapti Engineering College, Ghorahi, Dang',
  'College of Engineering & Management (COEM), Nepalgunj, Banke',
  'Ritz College of Engineering & Management, Balkumari, Lalitpur',
];

const splitName = (fullName) => {
  if (!fullName) {
    return { firstName: '', lastName: '' };
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const { isLoaded, user: clerkUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [collegeSelection, setCollegeSelection] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    college: '',
    semester: '',
    email: '',
    externalId: '',
    avatarUrl: '',
  });

  const syncCollegeFields = (college) => {
    if (collegeOptions.includes(college)) {
      setCollegeSelection(college);
      setCustomCollege('');
      return;
    }

    if (college) {
      setCollegeSelection('other');
      setCustomCollege(college);
      return;
    }

    setCollegeSelection('');
    setCustomCollege('');
  };

  const initials = useMemo(() => {
    const firstInitial = formData.firstName?.trim()?.charAt(0) || clerkUser?.firstName?.charAt(0) || 'U';
    const lastInitial = formData.lastName?.trim()?.charAt(0) || clerkUser?.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [clerkUser?.firstName, clerkUser?.lastName, formData.firstName, formData.lastName]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const clerkRole = clerkUser?.publicMetadata?.role || clerkUser?.unsafeMetadata?.role;

    if (clerkRole === 'admin') {
      syncClerkSession(clerkUser)
        .then(() => navigate('/admin', { replace: true }))
        .catch(() => navigate('/admin', { replace: true }));
      return;
    }

    const clerkFirstName = clerkUser?.firstName || '';
    const clerkLastName = clerkUser?.lastName || '';
    const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress || '';

    setFormData((current) => ({
      ...current,
      firstName: clerkFirstName,
      lastName: clerkLastName,
      email: clerkEmail,
      externalId: clerkUser?.id || '',
      avatarUrl: clerkUser?.imageUrl || '',
    }));

    const controller = new AbortController();

    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('No backend session');
        }
        return response.json();
      })
      .then((profile) => {
        // If profile is already complete, skip this page entirely
        if (profile.profile_complete) {
          sessionStorage.setItem('onboarded_session', 'true');
          if (profile.role === 'admin' || clerkRole === 'admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        const derivedNames = splitName(profile.display_name || profile.name || '');
        setFormData((current) => ({
          ...current,
          firstName: profile.first_name || derivedNames.firstName || current.firstName,
          lastName: profile.last_name || derivedNames.lastName || current.lastName,
          college: profile.college || current.college,
          semester: profile.semester ? String(profile.semester) : current.semester,
          email: profile.email || current.email,
          avatarUrl: profile.avatar_url || current.avatarUrl,
          externalId: profile.id ? String(profile.id) : current.externalId,
        }));
        syncCollegeFields(profile.college || '');
      })
      .catch(() => { })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [clerkUser?.id, clerkUser?.publicMetadata?.role, clerkUser?.unsafeMetadata?.role, isLoaded, navigate]);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCollegeChoiceChange = (event) => {
    const value = event.target.value;
    setCollegeSelection(value);

    if (value === 'other') {
      setCustomCollege('');
      setFormData((current) => ({ ...current, college: '' }));
      return;
    }

    setCustomCollege('');
    setFormData((current) => ({ ...current, college: value }));
  };

  const handleCustomCollegeChange = (event) => {
    const value = event.target.value;
    setCustomCollege(value);
    setFormData((current) => ({ ...current, college: value }));
  };

  const validate = () => {
    if (!formData.firstName.trim()) return 'First name is required.';
    if (!formData.lastName.trim()) return 'Last name is required.';
    if (!formData.college.trim()) return 'College name is required.';
    if (!formData.semester) return 'Please select your semester.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);

    try {
      const response = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          role: clerkUser?.unsafeMetadata?.role || clerkUser?.publicMetadata?.role || '',
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save profile');
      }

      sessionStorage.setItem('onboarded_session', 'true');

      // Use the role from the onboard response instead of calling /auth/me
      // (avoids cookie race condition where the new JWT cookie isn't committed yet)
      const userRole = payload?.user?.role;
      if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (submitError) {
      setError(submitError.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
        <div className="w-6 h-6 border-2 border-[#102326] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] p-6 selection:bg-[#102326] selection:text-white font-sans text-[#111111]"
      style={{
        backgroundImage: 'radial-gradient(#D7D3CF 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: '-12px -12px'
      }}
    >
      <div className="w-full max-w-2xl bg-white border border-[#D7D3CF] rounded-[4px] p-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-[#D7D3CF] pb-6 mb-8">
          <div className="w-12 h-12 bg-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
            <Library size={24} className="text-white" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider font-semibold mb-1">
              ACCOUNT CONFIGURATION
            </div>
            <h1 className="text-2xl font-bold text-[#111111] tracking-tight">
              Academic Profile Setup
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#666666] leading-relaxed mb-8">
          Confirm your academic identity to proceed. The system is currently configured exclusively for the {UNIVERSITY} {COURSE} curriculum.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
                <span>First Name</span>
                {initials && (
                  <span className="bg-[#ECEAE7] text-[#102326] px-1.5 py-0.5 rounded-[2px]">{initials}</span>
                )}
              </label>
              <input
                required
                value={formData.firstName}
                onChange={handleChange('firstName')}
                placeholder={clerkUser?.firstName || 'First name'}
                className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
                Last Name
              </label>
              <input
                required
                value={formData.lastName}
                onChange={handleChange('lastName')}
                placeholder={clerkUser?.lastName || 'Last name'}
                className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              College Name
            </label>
            <div className="space-y-3">
              <select
                value={collegeSelection}
                onChange={handleCollegeChoiceChange}
                className="w-full appearance-none bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none transition-colors cursor-pointer"
              >
                <option value="" disabled>Select your college</option>
                {collegeOptions.map((college) => (
                  <option key={college} value={college}>{college}</option>
                ))}
                <option value="other">Others</option>
              </select>

              {collegeSelection === 'other' && (
                <input
                  required
                  value={customCollege}
                  onChange={handleCustomCollegeChange}
                  placeholder="Enter your college name"
                  className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none transition-colors"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
                University
              </label>
              <input
                value={UNIVERSITY}
                readOnly
                disabled
                className="w-full bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] px-3 py-2 text-xs font-mono text-[#666666] cursor-not-allowed outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
                Course
              </label>
              <input
                value={COURSE}
                readOnly
                disabled
                className="w-full bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] px-3 py-2 text-xs font-mono text-[#666666] cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              Current Semester
            </label>
            <div className="relative">
              <select
                required
                value={formData.semester}
                onChange={handleChange('semester')}
                className="w-full appearance-none bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none transition-colors cursor-pointer"
              >
                <option value="" disabled>Select semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester.value} value={semester.value}>{semester.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#C96A32] flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-6 border-t border-[#D7D3CF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[#666666]">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Data securely processed</span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/logout')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#D7D3CF] text-[#666666] hover:text-[#111111] hover:border-[#102326] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {saving ? 'PROCESSING...' : 'CONTINUE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
