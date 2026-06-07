import React from 'react';
import { LineChart } from 'lucide-react';

const ProgressTracker = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800">Progress Tracker</h3>
        <p className="text-sm text-slate-500">Analytics and insights on your study habits and performance.</p>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
          <LineChart size={32} />
        </div>
        <h4 className="text-lg font-bold text-slate-800 mb-2">No data yet</h4>
        <p className="text-slate-500 max-w-sm mb-6">
          Complete quizzes, read notes, and interact with the AI to generate progress analytics.
        </p>
      </div>
    </div>
  );
};

export default ProgressTracker;
