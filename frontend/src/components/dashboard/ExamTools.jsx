import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, Layers, FileSignature, CheckCircle, GraduationCap } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

const ExamTools = () => {
  const tools = [
    { name: 'Generate MCQs', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50/60 border-blue-100/30' },
    { name: 'Mock Tests', icon: FileSignature, color: 'text-violet-500', bg: 'bg-violet-50/60 border-violet-100/30' },
    { name: 'Important Qs', icon: FileQuestion, color: 'text-rose-500', bg: 'bg-rose-50/60 border-rose-100/30' },
    { name: 'Revision Sheets', icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-50/60 border-emerald-100/30' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Exam Prep Tools</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Quick Shortcuts</p>
        </div>
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
          <GraduationCap size={18} />
        </div>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 grid grid-cols-2 gap-3.5"
      >
        {tools.map((tool, idx) => (
          <motion.button 
            key={idx} 
            variants={itemVariants}
            whileHover={{ y: -3, scale: 1.02 }}
            className="flex flex-col items-center justify-center p-4.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-indigo-200/50 hover:shadow-[0_8px_20px_rgba(99,102,241,0.03)] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 border ${tool.bg} ${tool.color} group-hover:scale-105 transition-transform duration-300`}>
              <tool.icon size={16} strokeWidth={2.2} />
            </div>
            <span className="text-xs font-bold text-slate-600 text-center tracking-tight group-hover:text-slate-800 transition-colors">{tool.name}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default ExamTools;
