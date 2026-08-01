import React, { useCallback, useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { useAuth, useUser } from '@clerk/react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { syncClerkSession } from '../utils/syncClerkSession';
import { FocusProvider } from '../context/FocusContext';
import GlobalFocusBar from '../components/focus/GlobalFocusBar';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignIn = useCallback(() => {
    sessionStorage.removeItem('onboarded_session');
    navigate('/signin');
  }, [navigate]);

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) return;

    if (!isSignedIn) {
      handleSignIn();
      return;
    }

    if (!clerkUser) return;

    const clerkRole = clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role;
    const controller = new AbortController();

    const loadProfile = async () => {
      try {
        await syncClerkSession(clerkUser);
      } catch (syncError) {
        console.error(syncError);
      }

      if (clerkRole === 'admin') {
        if (location.pathname !== '/admin') {
          navigate('/admin', { replace: true });
        }
        setLoading(false);
        return;
      }

      const clerkFirstName = clerkUser.firstName || '';
      const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress || '';

      const fallbackUser = {
        name: clerkUser.fullName,
        username: clerkFirstName || 'User',
        email: clerkEmail,
        avatar_url: clerkUser.imageUrl,
        department: 'Computer Engineering',
      };

      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (res.ok) {
          const profile = await res.json();

          // Admin users go to /admin, not /dashboard
          if (profile.role === 'admin' && location.pathname === '/dashboard') {
            navigate('/admin', { replace: true });
            return;
          }

          if (!profile.profile_complete) {
            navigate('/profile-setup', { replace: true });
            return;
          }

          sessionStorage.setItem('onboarded_session', 'true');

          const dbFirst = profile.first_name || '';
          const dbLast = profile.last_name || '';
          const dbFull = [dbFirst, dbLast].filter(Boolean).join(' ') || profile.name || '';
          setUser({
            name: dbFull || fallbackUser.name,
            username: dbFirst || fallbackUser.username,
            email: profile.email || clerkEmail,
            avatar_url: profile.avatar_url || clerkUser.imageUrl,
            department: profile.department || 'Computer Engineering',
            college: profile.college || 'Nepal Engineering College',
            semester: profile.semester || '',
            first_name: dbFirst,
            last_name: dbLast,
          });
        } else {
          navigate('/profile-setup', { replace: true });
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setUser(fallbackUser);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => controller.abort();
  // Clerk may replace the user object while refreshing session data; depend on stable identity fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isUserLoaded, isSignedIn, clerkUser?.id, clerkUser?.publicMetadata?.role, clerkUser?.unsafeMetadata?.role, location.pathname, navigate, handleSignIn]);

  useEffect(() => {
    const handleScroll = (e) => {
      setScrolled(e.target.scrollTop > 20);
    };
    const mainArea = document.getElementById('main-scroll-area');
    if (mainArea) {
      mainArea.addEventListener('scroll', handleScroll);
      return () => mainArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F7F5F2] p-6">
        <div className="w-full max-w-sm border border-[#D7D3CF] bg-white p-6 text-center">
          <h1 className="text-base font-bold text-[#111111]">Could not load your dashboard</h1>
          <p className="mt-2 text-xs leading-5 text-[#666666]">Your sign-in session or local profile could not be synchronized.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-[4px] bg-[#102326] px-4 py-2 font-mono text-xs font-semibold uppercase text-white">Retry</button>
            <button type="button" onClick={handleSignIn} className="rounded-[4px] border border-[#D7D3CF] px-4 py-2 font-mono text-xs font-semibold uppercase text-[#111111]">Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FocusProvider>
    <div className="flex h-screen bg-[#F7F5F2] overflow-hidden font-sans text-[#111111]">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F5F2]">
        <Navbar
          user={user}
          scrolled={scrolled}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <GlobalFocusBar />

        {/* Main Content Area */}
        <div
          id="main-scroll-area"
          className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 p-4 md:p-8"
        >
          <AnimatePresence mode="wait">
            <Motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="max-w-[1400px] mx-auto min-h-full"
            >
              <Outlet context={{ user }} />
            </Motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </FocusProvider>
  );
};

export default DashboardLayout;
