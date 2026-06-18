import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import { motion } from 'framer-motion';
import {
  Library,
  LogOut,
  LayoutDashboard,
  BrainCircuit,
  FileUp,
  BookOpen,
  Book,
  Target,
  LineChart,
  CalendarCheck,
  Settings,
  User
} from 'lucide-react';

const Sidebar = ({ user }) => {
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  return (
    <aside className="w-[280px] bg-white border-r border-slate-200/60 flex flex-col transition-all duration-300 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo Area */}
      <div
        className="h-20 flex items-center gap-3 px-6 cursor-pointer mb-2 mt-2"
        onClick={(e) => {
          if (e.detail === 3 && user?.role === 'admin') {
            navigate('/system-core-admin');
          }
        }}
        title={user?.role === 'admin' ? "Secret: Triple click for Admin" : ""}
      >
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 flex-shrink-0">
          <Library className="text-white" size={24} strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight truncate">
          AiStudy
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3">Overview</div>
        <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" end />
        <NavItem to="/dashboard/progress" icon={<LineChart size={20} />} label="Progress Tracker" />

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-3">Personalized Learning</div>
        <NavItem to="/dashboard/notes" icon={<BookOpen size={20} />} label="My Notes" />
        <NavItem to="/dashboard/flashcards" icon={<BrainCircuit size={20} />} label="Flashcards" />
        <NavItem to="/dashboard/revision" icon={<CalendarCheck size={20} />} label="Calendar" />

        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-3">Practice & Materials</div>
        <NavItem to="/dashboard/upload" icon={<FileUp size={20} />} label="Uploaded Materials" />
        <NavItem to="/dashboard/syllabus" icon={<Book size={20} />} label="Official Syllabus" />
        <NavItem to="/dashboard/exam-prep" icon={<Target size={20} />} label="Exam Preparation" />
        <NavItem to="/dashboard/mcq" icon={<Library size={20} />} label="MCQ Practice" />

        <div className="mt-auto pt-4"></div>
        <NavItem to="/dashboard/profile" icon={<User size={20} />} label="Profile" />
        <NavItem to="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="bg-slate-50 rounded-2xl p-3 mb-3 border border-slate-100/50 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold border border-white shadow-sm flex-shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.college}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

const NavItem = ({ to, icon, label, end = false }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group
        ${isActive
          ? 'text-blue-700 bg-blue-50/80 shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
      `}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNavIndicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"
            />
          )}
          <div className={`
            flex items-center justify-center p-1.5 rounded-lg transition-colors
            ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
          `}>
            {icon}
          </div>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
};

export default Sidebar;
