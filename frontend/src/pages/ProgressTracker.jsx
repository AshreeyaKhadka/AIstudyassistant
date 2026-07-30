import React from 'react';
import { LineChart } from 'lucide-react';

const ProgressTracker = () => {
  return (
    <div className="flex flex-col h-full gap-6 pb-12">
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
          ANALYTICS & INSIGHTS
        </div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Progress Tracker</h1>
        <p className="text-xs text-[#666666] mt-0.5">Track your study habits and performance over time.</p>
      </div>
      
      <div className="flex-1 bg-white rounded-[4px] border border-[#D7D3CF] p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center mb-4">
          <LineChart size={32} />
        </div>
        <h4 className="text-sm font-bold text-[#111111] mb-1 font-mono uppercase">Insufficient Data</h4>
        <p className="text-xs font-mono text-[#666666] max-w-sm">
          Complete quizzes, read notes, and interact with the system to generate progress analytics.
        </p>
      </div>
    </div>
  );
};

export default ProgressTracker;
