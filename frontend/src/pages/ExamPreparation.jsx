import React from 'react';
import { Target, FileText, CheckSquare, Zap, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFilteredSubjects } from '../hooks/useFilteredSubjects';

const ExamPreparation = () => {
  const { user } = useOutletContext();
  const userSemester = user?.semester || '';
  const { subjects } = useFilteredSubjects(userSemester);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            EXAM STRATEGY & REVISION
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Exam Preparation</h1>
          <p className="text-xs text-[#666666] mt-0.5">Focused revision tools and curated question banks for Semester {userSemester}.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors">
            DOWNLOAD GUIDE
          </button>
          <button className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>AI INTENSITY MOD</span>
          </button>
        </div>
      </div>

      {/* Grid of Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PrepCard icon={FileText} title="High Yield Qs" desc="AI-curated based on syllabus" />
        <PrepCard icon={Target} title="Mock Battles" desc="Timed exam simulation" />
        <PrepCard icon={CheckSquare} title="Blueprint Sheets" desc="Visual content maps" />
        <PrepCard icon={Zap} title="Rapid Revision" desc="Focus on core units" />
      </div>

      {/* Subject-Specific Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Subject-Specific Tactics</h4>
          <span className="text-[10px] font-mono text-[#666666]">{subjects.length} subjects active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject}
              className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] flex items-center gap-4 hover:border-[#102326] transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
                <BookOpen size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#111111] truncate">{subject}</p>
                <span className="text-[9px] font-mono text-[#666666] uppercase mt-0.5 block">ACTIVE PREP AVAILABLE</span>
              </div>
            </div>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <Trophy size={32} className="text-[#666666] mx-auto mb-2" />
              <p className="text-xs font-mono text-[#666666]">No curriculum subjects found for this semester.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PrepCard = ({ icon: Icon, title, desc }) => {
  return (
    <div className="bg-white p-5 rounded-[4px] border border-[#D7D3CF] space-y-2">
      <div className="w-8 h-8 rounded-[4px] bg-[#ECEAE7] text-[#102326] flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <h5 className="text-xs font-bold text-[#111111]">{title}</h5>
        <p className="text-[10px] font-mono text-[#666666] mt-0.5">{desc}</p>
      </div>
    </div>
  );
};

export default ExamPreparation;
