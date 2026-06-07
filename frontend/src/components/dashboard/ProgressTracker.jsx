import React from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Flame } from 'lucide-react';

const ProgressTracker = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Academic Progress</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Syllabus Completion</p>
        </div>
        <div className="p-2 bg-amber-50 text-amber-500 rounded-xl border border-amber-100/50">
          <Trophy size={18} className="animate-pulse" />
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-6">
        <div>
          <div className="flex justify-between items-end mb-2.5">
            <h4 className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
              <Target size={14} className="text-blue-500" /> Overall Completion
            </h4>
            <span className="text-2xl font-black text-blue-600 tracking-tight">68%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '68%' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full relative"
            >
              {/* Dynamic glossy liquid light sweep */}
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </motion.div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100/50">
          <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-3">Subject Wise Progress</h4>
          
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="font-bold">Operating Systems</span>
              <span className="text-slate-400">85%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '85%' }}
                transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                className="h-full bg-emerald-500 rounded-full"
              ></motion.div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="font-bold">Database Management</span>
              <span className="text-slate-400">60%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full bg-blue-500 rounded-full"
              ></motion.div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="font-bold flex items-center gap-1">
                Computer Networks <Flame size={12} className="text-rose-500 animate-bounce" />
              </span>
              <span className="text-rose-500 font-bold">35%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '35%' }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full bg-rose-500 rounded-full"
              ></motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressTracker;
