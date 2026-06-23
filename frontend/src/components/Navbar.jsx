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
    if (path.includes('/revision')) return 'Calendar';
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
    if (path.includes('/revision')) return 'Plan revisions, track exams, and manage your schedule.';
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
        <div className="flex items-center pl-2 border-l border-slate-200">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
