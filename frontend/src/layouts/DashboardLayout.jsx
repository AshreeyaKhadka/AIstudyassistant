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

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) return;

    if (!isSignedIn) {
      navigate('/signin');
      return;
    }

    if (!clerkUser) return;

    const userData = {
      name: clerkUser.fullName,
      username: clerkUser.firstName || clerkUser.username || 'User',
      email: clerkUser.primaryEmailAddress?.emailAddress,
      avatar_url: clerkUser.imageUrl,
      department: 'Computer Engineering',
    };
    setUser(userData);
    setLoading(false);
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
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Handle case where user fetch fails but hasn't redirected yet
  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-[#f8fafc]">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-[100px] pointer-events-none"></div>
        
        <Navbar user={user} scrolled={scrolled} />

        {/* Scrollable Outlet Area */}
        <div id="main-scroll-area" className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-0 custom-scrollbar pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              <Outlet context={{ user }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
        }
      `}} />
    </div>
  );
};

export default DashboardLayout;
