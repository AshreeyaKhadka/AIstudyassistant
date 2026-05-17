import React from 'react';
import { Target, Trophy, Flame } from 'lucide-react';

const ProgressTracker = () => {
  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center">
        <div>
          <h3 className="font-editorial text-lg font-bold text-on-surface">Academic Progress</h3>
          <p className="text-xs text-outline-variant">Track your syllabus completion</p>
        </div>
        <Trophy className="text-yellow-500" size={24} />
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-6">
        <div>
          <div className="flex justify-between items-end mb-2">
            <h4 className="font-medium text-sm text-on-surface flex items-center gap-2">
              <Target size={16} className="text-primary" /> Overall Completion
            </h4>
            <span className="text-2xl font-editorial font-bold text-primary">68%</span>
          </div>
          <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '68%' }}></div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-xs text-outline-variant uppercase tracking-wider">Subject Wise Progress</h4>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-on-surface">Operating Systems</span>
              <span className="text-outline-variant">85%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-on-surface">Database Management</span>
              <span className="text-outline-variant">60%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-on-surface flex items-center gap-1">
                Computer Networks <Flame size={12} className="text-red-500" /> (Needs Attention)
              </span>
              <span className="text-outline-variant">35%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
