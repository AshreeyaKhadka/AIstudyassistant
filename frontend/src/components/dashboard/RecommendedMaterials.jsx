import React from 'react';
import { Lightbulb, PlayCircle, Link2, Book } from 'lucide-react';

const RecommendedMaterials = () => {
  const recommendations = [
    { type: 'video', title: 'TCP/IP Model Explained in 10 Mins', subject: 'Based on your weak subject: Networks', icon: PlayCircle, color: 'text-red-500' },
    { type: 'article', title: 'Normalization Normal Forms Cheat Sheet', subject: 'Based on recent queries', icon: Book, color: 'text-indigo-500' },
    { type: 'link', title: 'Process Scheduling Simulator', subject: 'Recommended practice tool', icon: Link2, color: 'text-emerald-500' },
  ];

  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Lightbulb size={120} />
      </div>
      
      <div className="p-5 border-b border-ghost-border flex justify-between items-center relative z-10">
        <div>
          <h3 className="font-editorial text-lg font-bold text-on-surface flex items-center gap-2">
            <Lightbulb className="text-amber-500" size={20} /> AI Recommendations
          </h3>
          <p className="text-xs text-outline-variant">Smart suggestions based on your activity</p>
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-3 relative z-10">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="flex gap-3 items-center p-3 rounded-lg border border-ghost-border bg-white hover:border-amber-300 hover:shadow-sm cursor-pointer transition-all group">
            <div className={`p-2 rounded-md bg-surface-container ${rec.color} group-hover:bg-amber-50 transition-colors`}>
              <rec.icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-on-surface truncate group-hover:text-amber-700 transition-colors">{rec.title}</h4>
              <p className="text-[10px] uppercase font-semibold text-outline-variant tracking-wider mt-0.5">{rec.subject}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedMaterials;
