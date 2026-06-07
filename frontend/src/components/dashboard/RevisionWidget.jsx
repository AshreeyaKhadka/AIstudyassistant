import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Check, ArrowRight, Clock, Target, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RevisionWidget = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch plans to display today's and upcoming revisions
  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/revision-plans', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleStatus = async (plan) => {
    const nextStatus = plan.status === 'completed' ? 'pending' : 'completed';
    // Optimistic Update
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: nextStatus } : p));

    try {
      await fetch(`/api/revision-plans/${plan.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
        credentials: 'include'
      });
    } catch (err) {
      console.error(err);
      fetchPlans(); // Rollback on error
    }
  };

  // Get Today's Date String
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter Revisions
  const todayPlans = plans.filter(p => p.revision_date === todayStr);
  const upcomingPlans = plans.filter(p => p.revision_date > todayStr && p.status === 'pending');
  const completedCount = plans.filter(p => p.status === 'completed').length;
  const pendingCount = plans.filter(p => p.status === 'pending').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100/50">
            <CalendarCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Revision Schedule</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Spaced Repetition Active</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/dashboard/revision')}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100/30"
          title="Open Calendar Planner"
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 py-3 text-center bg-slate-50/20">
        <div>
          <span className="block text-lg font-black text-slate-800">{completedCount}</span>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Completed</span>
        </div>
        <div>
          <span className="block text-lg font-black text-indigo-600">{pendingCount}</span>
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Pending</span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-6 flex flex-col gap-4">
        {/* Today's Section */}
        <div>
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
            Today's Revision
          </h4>
          
          <div className="space-y-2.5">
            {todayPlans.map(plan => (
              <div 
                key={plan.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-white hover:border-indigo-100/30 hover:shadow-md transition-all group"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <span className={`block font-bold text-xs ${plan.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {plan.title}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 mt-1">
                    <Clock size={10} /> {plan.start_time || 'No time set'}
                  </span>
                </div>
                <button 
                  onClick={() => handleToggleStatus(plan)}
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    plan.status === 'completed'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
              </div>
            ))}

            {todayPlans.length === 0 && (
              <p className="text-[11px] font-semibold text-slate-400 italic py-2">No revision slots scheduled for today.</p>
            )}
          </div>
        </div>

        {/* Upcomings Section */}
        <div className="border-t border-slate-100/80 pt-3.5">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">Upcoming Tasks</h4>
          
          <div className="space-y-2.5">
            {upcomingPlans.slice(0, 2).map(plan => (
              <div 
                key={plan.id}
                onClick={() => navigate('/dashboard/revision')}
                className="p-3 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-white hover:shadow-sm cursor-pointer transition-all flex justify-between items-center"
              >
                <div className="min-w-0">
                  <span className="block font-bold text-xs text-slate-700 truncate pr-2">{plan.title}</span>
                  <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                    {new Date(plan.revision_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-[8px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/20">
                  {plan.subject}
                </span>
              </div>
            ))}

            {upcomingPlans.length === 0 && (
              <p className="text-[11px] font-semibold text-slate-400 italic py-1">No upcoming revisions scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RevisionWidget;
