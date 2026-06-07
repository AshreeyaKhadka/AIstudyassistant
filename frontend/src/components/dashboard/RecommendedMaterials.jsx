import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, PlayCircle, Link2, Book } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
};

const RecommendedMaterials = () => {
  const recommendations = [
    { type: 'video', title: 'TCP/IP Model Explained in 10 Mins', subject: 'Weak subject: Networks', icon: PlayCircle, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-100/30' },
    { type: 'article', title: 'Normalization Normal Forms Cheat Sheet', subject: 'Based on queries', icon: Book, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100/30' },
    { type: 'link', title: 'Process Scheduling Simulator', subject: 'Recommended practice tool', icon: Link2, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100/30' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden relative"
    >
      <div className="absolute top-[-20%] right-[-10%] w-[180px] h-[180px] bg-gradient-to-br from-amber-400/5 to-orange-400/5 rounded-full blur-[40px] pointer-events-none"></div>
      
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Lightbulb className="text-amber-500 animate-pulse" size={18} /> AI Recommendations
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Suggestions based on activity</p>
        </div>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 flex-1 flex flex-col gap-3.5"
      >
        {recommendations.map((rec, idx) => (
          <motion.div 
            key={idx} 
            variants={itemVariants}
            whileHover={{ x: 3 }}
            className="flex gap-3.5 items-center p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-amber-200 hover:shadow-[0_8px_20px_rgba(245,158,11,0.02)] cursor-pointer transition-all group"
          >
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${rec.bg} ${rec.color} group-hover:scale-105 transition-transform duration-300`}>
              <rec.icon size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-700 truncate pr-2 group-hover:text-amber-600 transition-colors">{rec.title}</h4>
              <p className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider mt-1.5">{rec.subject}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default RecommendedMaterials;
