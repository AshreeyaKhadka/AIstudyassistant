import React from 'react';
import { Target, FileText, CheckSquare, Zap, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFilteredSubjects } from '../hooks/useFilteredSubjects';
import { motion } from 'framer-motion';

const ExamPreparation = () => {
  const { user } = useOutletContext();
  const userSemester = user?.semester || '';
  const { subjects } = useFilteredSubjects(userSemester);

  return (
    <div className="flex flex-col h-full gap-10 pb-12">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-lg shadow-slate-200">
            <Trophy className="text-amber-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Exam Preparation</h1>
            <p className="text-slate-500 font-medium">Focused revision tools and curated question banks for Semester {userSemester}.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-4 bg-white border border-slate-100 text-slate-800 rounded-2xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            Download Guide
          </button>
          <button className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Sparkles size={18} /> AI Intensity Mod
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PrepCard icon={FileText} title="High Yield Qs" desc="AI-curated based on syllabus" color="blue" />
        <PrepCard icon={Target} title="Mock Battles" desc="Timed exam simulation" color="indigo" />
        <PrepCard icon={CheckSquare} title="Blueprint Sheets" desc="Visual content maps" color="emerald" />
        <PrepCard icon={Zap} title="Rapid Revision" desc="Focus on core units" color="amber" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-extrabold text-slate-800">Subject-Specific Tactics</h4>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{subjects.length} Subjects available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={subject}
              className="group p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-500/30 hover:shadow-2xl hover:shadow-slate-100 transition-all cursor-pointer flex items-center gap-5"
            >
              <div className="w-14 h-14 bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner">
                <BookOpen size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-extrabold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-400 font-bold tracking-tight">Active Prep Available</span>
                </div>
              </div>
            </motion.div>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
              <Trophy size={48} className="text-slate-100 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No curriculum found for this semester</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PrepCard = ({ icon: Icon, title, desc, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100'
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-xl transition-all"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-4 ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <h5 className="font-extrabold text-slate-800">{title}</h5>
        <p className="text-xs text-slate-500 font-medium mt-1">{desc}</p>
      </div>
    </motion.div>
  );
};

export default ExamPreparation;
