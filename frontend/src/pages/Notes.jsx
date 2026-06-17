import React, { useState } from 'react';
import { BookOpen, Search, Filter, Download, ExternalLink, Sparkles, FolderOpen, ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';

const Notes = () => {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="flex flex-col h-full gap-10 pb-12">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-lg shadow-slate-200">
            <ScrollText className="text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Intelligence Vault</h1>
            <p className="text-slate-500 font-medium">Access your AI-generated summaries and personalized revision notes.</p>
          </div>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'personal' ? 'bg-white text-blue-600 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            My Intelligence
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'shared' ? 'bg-white text-blue-600 shadow-xl shadow-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            World Knowledge
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search through your intelligence stream..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        <button className="px-6 py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
          <Filter size={18} /> Deep Filter
        </button>
        <button className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
          <Sparkles size={18} /> New AI Synthesis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-6 flex flex-col hover:shadow-2xl hover:shadow-slate-200 transition-all group overflow-hidden relative"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
          <BookOpen size={24} />
        </div>
        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">{date}</span>
      </div>

      <div className="mb-6 flex-1">
        <h4 className="text-xl font-extrabold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer leading-tight">{title}</h4>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50/50 px-3 py-1 rounded-lg">{type}</span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 bg-emerald-50/50 px-3 py-1 rounded-lg">{subject}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-6 border-t border-slate-50">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-600 hover:text-white hover:bg-slate-900 rounded-xl transition-all">
          <ExternalLink size={16} /> Open Insight
        </button>
        <button className="flex items-center justify-center p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
          <Download size={18} />
        </button>
      </div>
    </motion.div>
  );
};

export default Notes;
