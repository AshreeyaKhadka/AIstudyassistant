import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useUser } from '@clerk/react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSignIn = () => {
    sessionStorage.removeItem('onboarded_session');
    navigate('/signin');
  };

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) return;

    if (!isSignedIn) {
      handleSignIn();
      return;
    }

    if (!clerkUser) return;

    const clerkFirstName = clerkUser.firstName || '';
    const clerkLastName = clerkUser.lastName || '';
    const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress || '';

    const fallbackUser = {
      name: clerkUser.fullName,
      username: clerkFirstName || 'User',
      email: clerkEmail,
      avatar_url: clerkUser.imageUrl,
      department: 'Computer Engineering',
    };

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });

        if (res.ok) {
          const profile = await res.json();

          const hasOnboardedThisSession = sessionStorage.getItem('onboarded_session');

          if (!profile.profile_complete || !hasOnboardedThisSession) {
            navigate('/profile-setup', { replace: true });
            return;
          }

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
      } catch {
        setUser(fallbackUser);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isLoaded, isUserLoaded, isSignedIn, clerkUser, navigate]);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#F7F5F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#102326] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#F7F5F2] overflow-hidden font-sans text-[#111111]">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F5F2]">
        <Navbar user={user} scrolled={scrolled} />

        {/* Main Content Area */}
        <div
          id="main-scroll-area"
          className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 p-6 md:p-8"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="max-w-[1400px] mx-auto min-h-full"
            >
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
