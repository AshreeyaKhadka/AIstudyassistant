import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/react';
import {
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
  HelpCircle,
  FileText,
  X,
  Compass,
  Code2,
  Gamepad2
} from 'lucide-react';

const Sidebar = ({ user, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-[250px] bg-[#ECEAE7] border-r border-[#D7D3CF]
          flex flex-col h-screen select-none shrink-0
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div
          className="h-16 flex items-center justify-between px-5 border-b border-[#D7D3CF] bg-[#ECEAE7] cursor-pointer"
          onClick={(e) => {
            if (e.detail === 3 && user?.role === 'admin') {
              navigate('/admin');
            }
          }}
          title={user?.role === 'admin' ? "Secret: Triple click for Admin" : ""}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-[#111111] tracking-tight">
              AiStudy
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#666666] hover:text-[#111111] lg:hidden"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Section: Overview */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
              Overview
            </div>
            <div className="space-y-0.5">
              <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" end onClick={handleNavClick} />
              <NavItem to="/dashboard/progress" icon={<LineChart size={16} />} label="Progress Tracker" onClick={handleNavClick} />
            </div>
          </div>

          {/* Section: Personalized Learning */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
              Personalized Learning
            </div>
            <div className="space-y-0.5">
              <NavItem to="/dashboard/focus" icon={<Target size={16} />} label="Smart Focus Mode" onClick={handleNavClick} />
              <NavItem to="/dashboard/flashcards" icon={<BrainCircuit size={16} />} label="Flashcards" onClick={handleNavClick} />
              <NavItem to="/dashboard/revision" icon={<CalendarCheck size={16} />} label="Study Planner" onClick={handleNavClick} />
            </div>
          </div>

          {/* Section: Practice & Materials */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
              Practice & Materials
            </div>
            <div className="space-y-0.5">
              <NavItem to="/dashboard/upload" icon={<FileUp size={16} />} label="Uploaded Materials" onClick={handleNavClick} />
              <NavItem to="/dashboard/syllabus" icon={<Book size={16} />} label="Official Syllabus" onClick={handleNavClick} />
              <NavItem to="/dashboard/exam-prep" icon={<FileText size={16} />} label="Exam Preparation" onClick={handleNavClick} />
              <NavItem to="/dashboard/mcq" icon={<HelpCircle size={16} />} label="MCQ Practice" onClick={handleNavClick} />
              <NavItem to="/dashboard/arcade" icon={<Gamepad2 size={16} />} label="Arcade" onClick={handleNavClick} />
              <NavItem to="/dashboard/coding-practice" icon={<Code2 size={16} />} label="Coding Practice" onClick={handleNavClick} />
              <NavItem to="/dashboard/chat" icon={<BookOpen size={16} />} label="AI Chat" onClick={handleNavClick} />
            </div>
          </div>

          {/* Section: Career & Growth */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold">
              Career & Growth
            </div>
            <div className="space-y-0.5">
              <NavItem to="/dashboard/career" icon={<Compass size={16} />} label="Career Compass" onClick={handleNavClick} />
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
                {user?.semester ? `Sem ${user.semester} · ` : ''}{user?.college || user?.department || 'Computer Engineering'}
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
    </>
  );
};

const NavItem = ({ to, icon, label, end = false, onClick }) => {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
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
