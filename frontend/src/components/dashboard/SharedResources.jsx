import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Folder, FileText, ChevronRight } from 'lucide-react';

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
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const SharedResources = ({ resources }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2.25rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden relative"
    >
      {/* Decorative top border gradient to distinguish global content */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 to-indigo-500"></div>
      
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30 mt-[3px]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">University Resources</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Global materials for all students</p>
          </div>
        </div>
        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100/50 transition-colors shadow-sm">
          Browse All
        </button>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {resources.map((res) => (
          <motion.div 
            key={res.id} 
            variants={itemVariants}
            whileHover={{ y: -2 }}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-indigo-100 hover:shadow-[0_8px_20px_rgba(99,102,241,0.02)] cursor-pointer transition-all group"
          >
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${res.type === 'folder' ? 'bg-amber-50 text-amber-500 border-amber-100/30' : 'bg-rose-50 text-rose-500 border-rose-100/30'} group-hover:scale-105 transition-transform duration-300`}>
              {res.type === 'folder' ? <Folder size={18} /> : <FileText size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-700 truncate pr-2 group-hover:text-indigo-600 transition-colors">{res.title}</p>
              <div className="flex gap-2 items-center mt-1.5">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100/30 px-2 py-0.5 rounded-md">{res.category}</span>
                <span className="text-[11px] text-slate-400 font-bold">{res.date}</span>
              </div>
            </div>
            <ChevronRight size={15} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-indigo-600 transition-all -translate-x-2 group-hover:translate-x-0" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default SharedResources;
