import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFilteredSubjects } from '../hooks/useFilteredSubjects';
import { ChevronRight, Library, Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const MCQPractice = () => {
  const { user } = useOutletContext();
  const userSemester = user?.semester || '';
  const { subjects } = useFilteredSubjects(userSemester);

  return (
    <div className="flex flex-col h-full gap-10 pb-12">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-100">
            <Target className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">MCQ Practice</h1>
            <p className="text-slate-500 font-medium">Test your knowledge with semester-specific practice questions.</p>
          </div>
        </div>
        <button className="px-7 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2">
          <Sparkles size={18} /> Generate New Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map((subject, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={subject}
            className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-50 hover:border-blue-100 transition-all cursor-pointer flex flex-col gap-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-blue-600 transition-colors duration-500" />

            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-all duration-300 relative z-10 shadow-inner">
              <Library size={28} />
            </div>

            <div className="relative z-10">
              <h4 className="text-xl font-extrabold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">{subject}</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Systematic practice for all units in this subject. Track your accuracy and speed.</p>
            </div>

            <div className="flex items-center text-blue-600 text-sm font-bold gap-2 mt-auto pt-4 border-t border-slate-50 relative z-10">
              Start Practicing <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}

        {subjects.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target size={32} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No subjects synced</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">Update your profile to Semester {userSemester} to see relevant practice materials.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCQPractice;
