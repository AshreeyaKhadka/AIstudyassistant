import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import { useRef } from 'react';
import { syncClerkSession } from '../../utils/syncClerkSession';

const AdminGuard = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [role, setRole] = useState(null);
  const [checking, setChecking] = useState(true);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Not ready yet — keep waiting
    if (!isLoaded || !isUserLoaded) return;

    // Not signed in — stop checking, the redirect below will handle it
    if (!isSignedIn) {
      setChecking(false);
      hasCheckedRef.current = false;
      return;
    }

    if (hasCheckedRef.current) {
      return;
    }

    hasCheckedRef.current = true;

    let cancelled = false;
    const clerkRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;

    const run = async () => {
      try {
        await syncClerkSession(user);

        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const profile = await res.json();
          if (!cancelled) {
            setRole(profile.role || clerkRole || null);
            setChecking(false);
          }
          return;
        }

        if (!cancelled) {
          setRole(clerkRole || null);
          setChecking(false);
        }
        return;
      } catch (_) {}

      if (!cancelled) {
        setRole(clerkRole || null);
        setChecking(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [isLoaded, isUserLoaded, isSignedIn, user?.id, user?.publicMetadata?.role, user?.unsafeMetadata?.role]);

  // Still loading Clerk
  if (!isLoaded || !isUserLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return <Navigate to="/signin" replace />;
  }

  // Checking role
  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" />
      </div>
    );
  }

  // Not admin
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminGuard;
