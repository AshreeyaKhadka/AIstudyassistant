import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';

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

const NotesPreview = ({ notes }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">AI Generated Notes</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Your study summaries</p>
          </div>
        </div>
        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100/50 transition-colors shadow-sm">
          View All
        </button>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 flex-1 grid grid-cols-1 gap-4"
      >
        {notes.map((note) => (
          <motion.div 
            key={note.id} 
            variants={itemVariants}
            whileHover={{ y: -3 }}
            className="p-4.5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-indigo-200/50 hover:shadow-[0_12px_24px_rgba(99,102,241,0.03)] transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2.5">
              <h4 className="font-bold text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{note.title}</h4>
              <span className="text-[11px] text-slate-400 font-bold">{note.date}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 line-clamp-2 mb-3.5 leading-relaxed">
              {note.snippet}
            </p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-600 border border-violet-100/30 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                <Sparkles size={11} className="animate-pulse" />
                {note.subject}
              </div>
              <button className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                Open Note <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default NotesPreview;
