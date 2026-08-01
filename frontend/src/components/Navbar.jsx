import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Bell, Menu, X, FileText, BookOpen, MessageSquare, CalendarDays, LayoutGrid, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/react';

const pages = [
  ['Dashboard', 'Overview and recent study activity', '/dashboard'],
  ['Smart Focus Mode', 'Start or resume a focus session', '/dashboard/focus'],
  ['Uploaded Materials', 'Your notes, slides and PDFs', '/dashboard/upload'],
  ['Official Syllabus', 'Browse subjects, units and topics', '/dashboard/syllabus'],
  ['AI Chat', 'Ask questions and open conversations', '/dashboard/chat'],
  ['MCQ Practice', 'Practice questions from your documents', '/dashboard/mcq'],
  ['Study Planner', 'Calendar and revision schedule', '/dashboard/revision'],
  ['Progress Tracker', 'Document-based learning progress', '/dashboard/progress'],
];

const typeIcons = {
  page: LayoutGrid, document: FileText, syllabus: BookOpen, subject: BookOpen,
  chat: MessageSquare, plan: CalendarDays, exam: CalendarDays,
};

const Navbar = ({ scrolled, onToggleSidebar }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const localResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pages.map(([title, subtitle, url]) => ({ type: 'page', title, subtitle, url }));
    return pages
      .filter(([title, subtitle]) => `${title} ${subtitle}`.toLowerCase().includes(normalized))
      .map(([title, subtitle, url]) => ({ type: 'page', title, subtitle, url }));
  }, [query]);
  const results = [...localResults, ...remoteResults];

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    if (query.trim().length < 2) {
      setRemoteResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: 'include', signal: controller.signal,
        });
        const data = await response.json().catch(() => []);
        if (response.ok) setRemoteResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.name !== 'AbortError') setRemoteResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const choose = (result) => {
    setOpen(false);
    setQuery('');
    navigate(result.url);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      choose(results[activeIndex]);
    }
  };

  return (
    <>
      <header className={`flex justify-between items-center px-4 md:px-8 py-3.5 bg-[#F7F5F2] border-b border-[#D7D3CF] shrink-0 ${scrolled ? 'shadow-sm' : ''}`}>
        <button onClick={onToggleSidebar} className="p-1.5 text-[#102326] hover:bg-[#ECEAE7] rounded-[4px] lg:hidden" title="Open menu">
          <Menu size={20} />
        </button>
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <button onClick={() => setOpen(true)} className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px]" title="Search">
            <Search size={18} />
          </button>
          <button onClick={() => navigate('/dashboard/revision')} className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px]" title="Schedule">
            <Bell size={18} />
          </button>
          <div className="flex items-center pl-2 border-l border-[#D7D3CF]">
            <UserButton afterSignOutUrl="/" userProfileMode="navigation" userProfileUrl="/dashboard/profile" />
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/25 p-3 sm:p-12" onMouseDown={() => setOpen(false)}>
          <section className="mx-auto mt-[8vh] w-full max-w-2xl overflow-hidden rounded-[6px] border border-[#BEBAB5] bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-14 items-center gap-3 border-b border-[#D7D3CF] px-4">
              {loading ? <Loader2 size={18} className="animate-spin text-[#666666]" /> : <Search size={18} className="text-[#666666]" />}
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleInputKeyDown} placeholder="Search pages, documents, subjects, chats, or plans" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-[#ECEAE7] rounded-[4px]" title="Close search"><X size={18} /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 && !loading ? (
                <p className="px-3 py-10 text-center text-sm text-[#666666]">No matching content found.</p>
              ) : results.map((result, index) => {
                const Icon = typeIcons[result.type] || Search;
                return (
                  <button key={`${result.type}-${result.id || result.url}-${index}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result)} className={`flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left ${index === activeIndex ? 'bg-[#ECEAE7]' : 'hover:bg-[#F7F5F2]'}`}>
                    <Icon size={17} className="shrink-0 text-[#102326]" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{result.title}</span><span className="block truncate text-xs text-[#666666]">{result.subtitle}</span></span>
                    <span className="font-mono text-[9px] uppercase text-[#777]">{result.type}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[#D7D3CF] px-4 py-2 font-mono text-[10px] text-[#777]">Use arrow keys to move, Enter to open, Esc to close</div>
          </section>
        </div>
      )}
    </>
  );
};

export default Navbar;
