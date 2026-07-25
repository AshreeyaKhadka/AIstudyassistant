import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Zap, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const FocusWidget = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetch('/api/focus/analytics', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setAnalytics(data))
      .catch(console.error);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] border border-indigo-500/30 shadow-xl overflow-hidden text-white relative"
    >
      <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px] pointer-events-none"></div>
      
      <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 text-indigo-100 rounded-2xl border border-white/10 backdrop-blur-sm">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Smart Focus Mode</h3>
            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mt-0.5">AI Study Coach</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard/focus')}
          className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-all shadow-sm border border-transparent"
          title="Open Focus Mode"
        >
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="p-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-indigo-200 mb-2">
              <Zap size={14} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Streak</span>
            </div>
            <p className="text-2xl font-black">{analytics?.streak || 0} <span className="text-xs font-semibold text-indigo-300">days</span></p>
          </div>
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-indigo-200 mb-2">
              <Clock size={14} />
              <span className="text-[9px] font-bold uppercase tracking-wider">This Week</span>
            </div>
            <p className="text-2xl font-black">{analytics?.week_hours || 0} <span className="text-xs font-semibold text-indigo-300">hrs</span></p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/dashboard/focus')}
          className="mt-4 w-full py-3 bg-white text-indigo-700 rounded-xl text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors"
        >
          Start Session
        </button>
      </div>
    </motion.div>
  );
};

export default FocusWidget;
