import React from 'react';
import { Lightbulb } from 'lucide-react';

const StudyRecommendations = ({ recommendations = [], loading = false, error = '' }) => {
  return (
    <div className="bg-[#102326] text-white border border-[#102326] rounded-[4px] p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-4">
          <Lightbulb size={16} className="text-[#C96A32]" />
          <h3 className="text-base font-bold text-white tracking-tight">AI Coach Insights</h3>
        </div>
        
        {loading ? (
          <div className="text-xs font-mono text-[#A0B0B3] p-4 text-center border border-dashed border-white/10 rounded-[4px]">
            Loading AI study context...
          </div>
        ) : error ? (
          <div className="text-xs font-mono text-[#F2B8A0] p-4 text-center border border-dashed border-white/10 rounded-[4px]">
            Recommendations unavailable.
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-xs font-mono text-[#A0B0B3] italic p-4 text-center border border-dashed border-white/10 rounded-[4px]">
            Start logging sessions to receive personalized AI study insights.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 rounded-[4px] border border-white/10 bg-white/5 space-y-1">
                <p className="font-medium text-xs text-white leading-relaxed">{rec.message}</p>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#A0B0B3] block">
                  {rec.subject}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyRecommendations;
