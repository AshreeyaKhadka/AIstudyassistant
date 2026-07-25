import React from 'react';
import { Target, TrendingUp, Calendar, Zap } from 'lucide-react';

const FocusAnalytics = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8 h-full">
      <h3 className="text-xl font-extrabold text-slate-800 mb-6">Weekly Analytics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100/50">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Target size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Hours</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{analytics.total_hours}</p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100/50">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Zap size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Current Streak</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{analytics.streak} <span className="text-sm font-semibold text-slate-500">days</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100/50">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">This Week</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{analytics.week_hours} <span className="text-sm font-semibold text-slate-500">hrs</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100/50">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Calendar size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Sessions</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{analytics.total_sessions}</p>
        </div>
      </div>
    </div>
  );
};

export default FocusAnalytics;
