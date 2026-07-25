import React, { useState } from 'react';
import { BookOpen, Search, Filter, Download, ExternalLink, Sparkles, ScrollText } from 'lucide-react';

const Notes = () => {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            REVISION & REPOSITORY
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Intelligence Vault</h1>
          <p className="text-xs text-[#666666] mt-0.5">Access AI-generated summaries and personalized chapter revision notes.</p>
        </div>

        <div className="flex bg-[#ECEAE7] p-1 rounded-[4px] border border-[#D7D3CF]">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-1.5 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'personal' ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            MY INTELLIGENCE
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-1.5 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'shared' ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            SHARED VAULT
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={14} />
          <input
            type="text"
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] text-xs font-mono text-[#111111] outline-none"
          />
        </div>
        <button className="px-4 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shrink-0">
          <Filter size={14} />
          <span>FILTER</span>
        </button>
        <button className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shrink-0">
          <Sparkles size={14} />
          <span>NEW SYNTHESIS</span>
        </button>
      </div>

      {/* Notes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5 flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
            <BookOpen size={16} />
          </div>
          <span className="text-[9px] font-mono font-semibold text-[#666666] bg-[#F7F5F2] px-2 py-0.5 rounded-[2px]">{date}</span>
        </div>

        <h4 className="text-sm font-bold text-[#111111] line-clamp-2">{title}</h4>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[9px] font-mono uppercase font-semibold text-[#102326] bg-[#ECEAE7] px-2 py-0.5 rounded-[2px]">{type}</span>
          <span className="text-[9px] font-mono uppercase font-semibold text-[#666666] bg-[#F7F5F2] border border-[#D7D3CF] px-2 py-0.5 rounded-[2px]">{subject}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-[#D7D3CF]">
        <button className="flex-1 py-1.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-1">
          <ExternalLink size={13} />
          <span>OPEN</span>
        </button>
        <button className="p-1.5 border border-[#D7D3CF] text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors">
          <Download size={14} />
        </button>
      </div>
    </div>
  );
};

export default Notes;
