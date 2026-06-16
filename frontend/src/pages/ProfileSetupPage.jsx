import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Library, Sparkles } from 'lucide-react';
import { useUser } from '@clerk/react';
import { Button } from '../components/ui/Button';
import { ModernInput } from '../components/ui/ModernInput';

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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    college: '',
    semester: '',
    email: '',
    externalId: '',
    avatarUrl: '',
  });

  const initials = useMemo(() => {
    const firstInitial = formData.firstName?.trim()?.charAt(0) || clerkUser?.firstName?.charAt(0) || 'U';
    const lastInitial = formData.lastName?.trim()?.charAt(0) || clerkUser?.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }, [clerkUser?.firstName, clerkUser?.lastName, formData.firstName, formData.lastName]);

  useEffect(() => {
    if (!isLoaded) {
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

    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('No backend session');
        }
        return response.json();
      })
      .then((profile) => {
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
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [clerkUser, isLoaded]);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
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
        body: JSON.stringify(formData),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save profile');
      }

      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--outline-variant)] border-t-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 'auto auto -15% -10%', width: '32rem', height: '32rem', borderRadius: '9999px', background: 'radial-gradient(circle, rgba(26,115,232,0.12) 0%, rgba(26,115,232,0.02) 55%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '-20% -15% auto auto', width: '28rem', height: '28rem', borderRadius: '9999px', background: 'radial-gradient(circle, rgba(176,42,102,0.08) 0%, rgba(176,42,102,0.02) 55%, transparent 72%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: '760px', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', boxShadow: 'var(--shadow-ambient)', padding: '2rem', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.85rem', background: 'var(--primary)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-ambient)' }}>
              <Library color="white" size={22} />
            </div>
            <div>
              <span className="title-sm" style={{ color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profile setup</span>
              <h1 className="headline-sm" style={{ marginBottom: 0, letterSpacing: '-0.02em' }}>Confirm your academic profile</h1>
            </div>
          </div>

          <p className="body-sm" style={{ color: 'var(--outline-variant)', lineHeight: 1.6, maxWidth: '52rem' }}>
            Confirm your identity and study context before entering the workspace. Your university and course are locked to the Pokhara University Computer Engineering track.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              <Field label="First Name" badge={initials}>
                <ModernInput
                  required
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  placeholder={clerkUser?.firstName || 'First name'}
                />
              </Field>
              <Field label="Last Name">
                <ModernInput
                  required
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  placeholder={clerkUser?.lastName || 'Last name'}
                />
              </Field>
            </div>

            <Field label="College Name">
              <ModernInput
                required
                value={formData.college}
                onChange={handleChange('college')}
                placeholder="Enter your college name"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
              <Field label="University">
                <ModernInput
                  value={UNIVERSITY}
                  readOnly
                  disabled
                  style={{ opacity: 0.82, cursor: 'not-allowed', backgroundColor: 'var(--surface-container-low)' }}
                />
              </Field>
              <Field label="Course">
                <ModernInput
                  value={COURSE}
                  readOnly
                  disabled
                  style={{ opacity: 0.82, cursor: 'not-allowed', backgroundColor: 'var(--surface-container-low)' }}
                />
              </Field>
            </div>

            <Field label="Current Semester">
              <div style={{ position: 'relative' }}>
                <select
                  required
                  value={formData.semester}
                  onChange={handleChange('semester')}
                  style={{
                    width: '100%',
                    appearance: 'none',
                    fontFamily: 'var(--font-functional)',
                    fontSize: '1rem',
                    padding: '0.9rem 3rem 0.9rem 1rem',
                    backgroundColor: 'var(--surface-container-low)',
                    color: 'var(--on-surface)',
                    border: 'none',
                    borderBottom: '2px solid var(--outline-variant)',
                    outline: 'none',
                    borderTopLeftRadius: 'var(--radius-sm)',
                    borderTopRightRadius: 'var(--radius-sm)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>Select semester</option>
                  {semesterOptions.map((semester) => (
                    <option key={semester.value} value={semester.value}>{semester.label}</option>
                  ))}
                </select>
                <ChevronDown size={18} color="var(--outline-variant)" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </Field>

            {error ? (
              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-default)', background: 'rgba(176, 42, 102, 0.08)', color: 'var(--tertiary)', fontSize: '0.875rem', fontWeight: 500 }}>
                {error}
              </div>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--outline-variant)' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span className="body-sm" style={{ color: 'var(--outline-variant)', fontSize: '0.8rem' }}>This only takes a moment.</span>
              </div>

              <Button type="submit" style={{ minWidth: '180px', padding: '0.95rem 1.4rem' }} disabled={saving}>
                {saving ? 'Saving profile...' : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const Field = ({ label, children, badge }) => (
  <div style={{ display: 'grid', gap: '0.5rem' }}>
    <label className="title-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--on-surface)', letterSpacing: '0.01em' }}>
      <span>{label}</span>
      {badge ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '2rem', height: '1.5rem', padding: '0 0.45rem', borderRadius: '9999px', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', fontSize: '0.7rem', fontWeight: 700 }}>
          {badge}
        </span>
      ) : null}
    </label>
    {children}
  </div>
);

export default ProfileSetupPage;