import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import { syncClerkSession } from '../../utils/syncClerkSession';

const AdminGuard = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const clerkRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;

  useEffect(() => {
    if (!isLoaded || !isUserLoaded || !isSignedIn) return;
    // fire-and-forget background sync — never blocks rendering
    syncClerkSession(user).catch(() => {});
  }, [isLoaded, isUserLoaded, isSignedIn, user?.id]);

  if (!isLoaded || !isUserLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) return <Navigate to="/signin" replace />;
  if (clerkRole !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

export default AdminGuard;
