import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, LogOut, MessageSquare, LayoutDashboard, BrainCircuit, Search, FileUp, Settings, Bell } from 'lucide-react';
import { ModernInput } from '../components/ui/ModernInput';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => {
        if (!data.college || !data.semester) {
          navigate('/onboard');
        } else {
          setUser(data);
        }
      })
      .catch((err) => {
        console.error(err);
        navigate('/');
      });
  }, [navigate]);

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

  const handleNav = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      navigate('/');
    } catch (err) {
      console.error(err);
      navigate('/');
    }
  };

  if (!user) return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[280px] bg-white/60 backdrop-blur-2xl border-r border-slate-200/50 flex flex-col transition-all duration-300 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Logo Area */}
        <div 
          className="h-20 flex items-center gap-3 px-6 cursor-pointer mb-4 mt-2"
          onClick={(e) => {
            if (e.detail === 3 && user?.role === 'admin') {
              handleNav('/system-core-admin');
            }
          }}
          title={user?.role === 'admin' ? "Secret: Triple click for Admin" : ""}
        >
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Library className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
            AiStudy
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-3">Menu</div>
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active={location.pathname === '/dashboard'} onClick={() => handleNav('/dashboard')} />
          <NavItem icon={<FileUp size={20} />} label="Syllabus & Materials" active={location.pathname.includes('/upload')} onClick={() => handleNav('/dashboard/upload')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Tutor Chat" active={location.pathname.includes('/chat')} onClick={() => handleNav('/dashboard/chat')} />
          <NavItem icon={<BrainCircuit size={20} />} label="Quizzes & Flashcards" active={location.pathname.includes('/quizzes')} onClick={() => handleNav('/dashboard/quizzes')} />
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold border border-white shadow-sm">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                <p className="text-xs text-slate-500 truncate">{user.college}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-[#f8fafc]">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/30 blur-[100px] pointer-events-none"></div>
        
        {/* Header */}
        <header 
          className={`flex justify-between items-center px-8 py-5 transition-all duration-300 relative z-10 ${
            scrolled ? 'bg-white/70 backdrop-blur-xl shadow-sm border-b border-slate-200/40' : 'bg-transparent'
          }`}
        >
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {location.pathname === '/dashboard' ? `Welcome ${user?.username} 👋` : 
               location.pathname.includes('/upload') ? 'Study Materials' :
               location.pathname.includes('/chat') ? 'AI Assistant' :
               location.pathname.includes('/quizzes') ? 'Practice Area' : 'Dashboard'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Let's make today productive.</p>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="relative group w-[300px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search resources, topics..." 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">⌘</kbd>
                <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 rounded border border-slate-200">K</kbd>
              </div>
            </div>

            <button className="relative p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

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

const NavItem = ({ icon, label, active, onClick }) => {
  return (
    <button 
      onClick={onClick} 
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative group
        ${active 
          ? 'text-blue-700 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 shadow-sm border border-blue-100/50' 
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'}
      `}
    >
      {active && (
        <motion.div 
          layoutId="activeNavIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"
        />
      )}
      <div className={`
        flex items-center justify-center p-1.5 rounded-lg transition-colors
        ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
      `}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
};

export default Dashboard;
