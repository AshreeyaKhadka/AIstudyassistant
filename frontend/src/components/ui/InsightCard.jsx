import React from 'react';

export const InsightCard = ({ title, children }) => {
  return (
    <div className="bg-white border border-[#D7D3CF] border-l-4 border-l-[#102326] rounded-[4px] p-4 space-y-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#102326] font-semibold">
        {title || "AI INSIGHT"}
      </div>
      <div className="text-xs text-[#111111] leading-relaxed">
        {children}
      </div>
    </div>
  );
};
