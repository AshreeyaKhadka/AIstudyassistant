import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import {
  GraduationCap,
  LogOut,
  LayoutDashboard,
  BrainCircuit,
  FileUp,
  BookOpen,
  Book,
  Target,
  LineChart,
  CalendarCheck,
  User,
  Search,
  SlidersHorizontal,
  HelpCircle,
  FileText
} from 'lucide-react';

const Sidebar = ({ user }) => {
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  return (
    <aside className="w-[250px] bg-[#ECEAE7] border-r border-[#D7D3CF] flex flex-col h-screen select-none shrink-0 z-20">
      {/* Brand Header */}
      <div
        className="h-16 flex items-center gap-2.5 px-5 border-b border-[#D7D3CF] bg-[#ECEAE7] cursor-pointer"
        onClick={(e) => {
          if (e.detail === 3 && user?.role === 'admin') {
            navigate('/system-core-admin');
          }
        }}
        title={user?.role === 'admin' ? "Secret: Triple click for Admin" : ""}
      >
        <div className="w-7 h-7 bg-[#102326] rounded-[4px] flex items-center justify-center text-white shrink-0">
          <GraduationCap size={18} strokeWidth={2.2} />
        </div>
        <span className="text-base font-bold text-[#111111] tracking-tight">
          AiStudy
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {/* Section: Overview */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
            Overview
          </div>
          <div className="space-y-0.5">
            <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" end />
            <NavItem to="/dashboard/progress" icon={<LineChart size={16} />} label="Progress Tracker" />
          </div>
        </div>

        {/* Section: Personalized Learning */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
            Personalized Learning
          </div>
          <div className="space-y-0.5">
            <NavItem to="/dashboard/focus" icon={<Target size={16} />} label="Smart Focus Mode" />
            <NavItem to="/dashboard/flashcards" icon={<BrainCircuit size={16} />} label="Flashcards" />
            <NavItem to="/dashboard/revision" icon={<CalendarCheck size={16} />} label="Calendar" />
          </div>
        </div>

        {/* Section: Practice & Materials */}
        <div>
          <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
            Practice & Materials
          </div>
          <div className="space-y-0.5">
            <NavItem to="/dashboard/upload" icon={<FileUp size={16} />} label="Uploaded Materials" />
            <NavItem to="/dashboard/syllabus" icon={<Book size={16} />} label="Official Syllabus" />
            <NavItem to="/dashboard/exam-prep" icon={<FileText size={16} />} label="Exam Preparation" />
            <NavItem to="/dashboard/mcq" icon={<HelpCircle size={16} />} label="MCQ Practice" />
            <NavItem to="/dashboard/chat" icon={<BookOpen size={16} />} label="AI Chat" />
          </div>
        </div>
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-[#D7D3CF] bg-[#ECEAE7]">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-[4px]">
          <div className="w-8 h-8 rounded-full bg-[#102326] text-white flex items-center justify-center text-xs font-bold shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#111111] truncate">
              {user?.username || 'Student'}
            </p>
            <p className="text-[11px] text-[#666666] truncate">
              {user?.college || user?.department || 'Computer Engineering'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#102326] hover:text-white rounded-[4px] transition-colors font-mono text-[11px] font-semibold tracking-wider uppercase"
        >
          <LogOut size={13} />
          SIGN OUT
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
        w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-xs font-medium transition-colors
        ${isActive
          ? 'bg-[#102326] text-white font-semibold'
          : 'text-[#444444] hover:bg-[#DCD9D5] hover:text-[#111111]'}
      `}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
};

export default Sidebar;
