import React from 'react';
import { motion } from 'framer-motion';
import { Layers, ChevronRight, Sparkles } from 'lucide-react';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 80 } }
};

const FlashcardPreview = ({ flashcards }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Flashcards Review</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Personalized active recall</p>
          </div>
        </div>
        <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100/50 transition-colors shadow-sm">
          Practice All
        </button>
      </div>
      
      <div className="p-6 flex-1 flex overflow-x-auto gap-5 custom-scrollbar pb-6 snap-x">
        {flashcards.map((card, idx) => (
          <motion.div 
            key={card.id} 
            variants={cardVariants}
            initial="hidden"
            animate="show"
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="min-w-[280px] sm:min-w-[320px] bg-slate-50/40 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.005)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.02)] hover:border-slate-200/50 hover:bg-white transition-all snap-center cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-100/30">
                  {card.subject}
                </span>
                <Sparkles size={12} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="font-semibold text-slate-700 text-sm leading-relaxed mb-4 line-clamp-3">
                {card.question}
              </p>
            </div>
            <div className="pt-3.5 border-t border-dashed border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">Reveal Answer</span>
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors border border-transparent group-hover:border-emerald-100/50 shadow-sm">
                <ChevronRight size={14} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default FlashcardPreview;
