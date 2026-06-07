import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowUpRight } from 'lucide-react';

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
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100 } }
};

const RecentQueries = ({ queries }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Recent AI Queries</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Your study questions</p>
        </div>
        <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100/50 transition-colors shadow-sm">
          View All
        </button>
      </div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-6 flex-1 flex flex-col gap-3.5"
      >
        {queries.map((query) => (
          <motion.div 
            key={query.id} 
            variants={itemVariants}
            whileHover={{ x: 3 }}
            className="group p-4 rounded-2xl bg-slate-50/40 hover:bg-white transition-all border border-slate-100 hover:border-slate-200/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.015)] flex justify-between items-center cursor-pointer"
          >
            <div className="flex gap-3.5 items-start overflow-hidden">
              <div className="mt-0.5 bg-blue-50/60 p-2 rounded-xl text-blue-600 border border-blue-100/30 group-hover:scale-105 transition-transform duration-300">
                <MessageSquare size={14} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-700 truncate pr-4 group-hover:text-slate-800 transition-colors">{query.title}</p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-50/50 text-blue-600 border border-blue-100/20 truncate uppercase tracking-wider">
                    {query.subject}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">{query.time}</span>
                </div>
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl border border-transparent hover:border-blue-100/30">
              <ArrowUpRight size={15} />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default RecentQueries;
