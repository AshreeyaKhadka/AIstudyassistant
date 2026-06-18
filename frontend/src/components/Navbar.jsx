import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/react';

const Navbar = ({ user, scrolled }) => {
  const location = useLocation();
  const path = location.pathname;

  const getPageTitle = () => {
    if (path === '/dashboard') return `Welcome ${user?.username || 'back'} 👋`;
    if (path.includes('/upload')) return 'Uploaded Materials';
    if (path.includes('/chat')) return 'AI Chat Assistant';
    if (path.includes('/notes')) return 'My Notes';
    if (path.includes('/flashcards')) return 'Flashcards';
    if (path.includes('/exam-prep')) return 'Exam Preparation';
    if (path.includes('/mcq')) return 'MCQ Practice';
    if (path.includes('/progress')) return 'Progress Tracker';
    if (path.includes('/revision')) return 'Revision Planner';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/profile')) return 'Profile';
    return 'Dashboard';
  };

  const getPageSubtitle = () => {
    if (path === '/dashboard') return "Let's make today productive.";
    if (path.includes('/upload')) return 'Manage your personalized and shared study materials.';
    if (path.includes('/chat')) return 'Ask questions and get instant AI-powered explanations.';
    if (path.includes('/notes')) return 'Review AI-generated and saved notes.';
    if (path.includes('/flashcards')) return 'Test your memory and retention.';
    if (path.includes('/exam-prep')) return 'Important questions, mock tests, and revision sheets.';
    if (path.includes('/mcq')) return 'Practice multiple-choice questions for your subjects.';
    if (path.includes('/progress')) return 'Track your learning journey and performance.';
    if (path.includes('/revision')) return 'Schedule and plan your revision effectively.';
    if (path.includes('/settings')) return 'Manage your account and preferences.';
    if (path.includes('/profile')) return 'Manage your personal and academic information.';
    return '';
  };

  const showNavbarTitle = !['/upload', '/mcq', '/exam-prep', '/syllabus', '/notes', '/flashcards', '/chat'].some(p => path.includes(p));

  return (
    <header
      className={`flex justify-between items-center px-8 py-5 transition-all duration-300 relative z-10 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50' : 'bg-transparent'
        }`}
    >
      {showNavbarTitle ? (
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {getPageTitle()}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{getPageSubtitle()}</p>
        </div>
      ) : <div />}

      <div className="flex items-center gap-5">
        <div className="relative group w-[300px] hidden md:block">
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

        <div className="flex items-center pl-2 border-l border-slate-200">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
