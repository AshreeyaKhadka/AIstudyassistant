import React from 'react';
import { CalendarCheck } from 'lucide-react';

const RevisionPlanner = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Revision Planner</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          Schedule Revision
        </button>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
          <CalendarCheck size={32} />
        </div>
        <h4 className="text-lg font-bold text-slate-800 mb-2">Your calendar is clear</h4>
        <p className="text-slate-500 max-w-sm mb-6">
          Schedule your revision sessions to ensure you retain information efficiently using spaced repetition.
        </p>
      </div>
    </div>
  );
};

export default RevisionPlanner;
