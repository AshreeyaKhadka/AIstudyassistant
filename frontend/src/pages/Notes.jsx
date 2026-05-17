import React, { useState } from 'react';
import { BookOpen, Search, Filter, Download, ExternalLink } from 'lucide-react';

const Notes = () => {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Notes & Summaries</h3>
          <p className="text-sm text-slate-500">Access your AI-generated summaries and revision notes.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'personal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              My Notes
            </button>
            <button 
              onClick={() => setActiveTab('shared')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'shared' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Global Notes
            </button>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            + New Note
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search notes, chapters, or keywords..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2">
          <Filter size={18} /> Subject Filter
        </button>
      </div>
      
      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <NoteCard title="Chapter 3: Memory Management" type="Revision Notes" subject="Operating Systems" date="Oct 24" />
        <NoteCard title="Data Structures Overview" type="AI Summary" subject="Data Structures" date="Oct 22" />
        <NoteCard title="Database Normalization" type="Chapter Notes" subject="DBMS" date="Oct 15" />
        <NoteCard title="Network Layers Summary" type="AI Summary" subject="Computer Networks" date="Oct 10" />
      </div>
    </div>
  );
};

const NoteCard = ({ title, type, subject, date }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <BookOpen size={20} />
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{date}</span>
      </div>
      <div className="mb-4 flex-1">
        <h4 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer">{title}</h4>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{type}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{subject}</span>
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <ExternalLink size={16} /> Open
        </button>
        <button className="flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Download size={18} />
        </button>
      </div>
    </div>
  );
};

export default Notes;
