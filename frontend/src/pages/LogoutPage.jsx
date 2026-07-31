import React, { useEffect } from 'react';
import { useClerk } from '@clerk/react';

const LogoutPage = () => {
  const { signOut } = useClerk();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (_) {
        // Continue with Clerk sign-out even if the backend request fails.
      }

      if (!cancelled) {
        try {
          await signOut({ redirectUrl: '/' });
        } catch (_) {
          window.location.replace('/');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [signOut]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2] text-[#111111]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent" />
    </div>
  );
};

export default LogoutPage;