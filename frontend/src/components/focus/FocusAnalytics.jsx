import React from 'react';

const FocusAnalytics = ({ analytics, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-5 h-full text-xs font-mono text-[#666666]">
        Loading focus analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-5 h-full text-xs font-mono text-[#666666]">
        No focus analytics available yet.
      </div>
    );
  }

  const items = [
    { label: 'TOTAL HOURS', value: analytics.total_hours },
    { label: 'CURRENT STREAK', value: `${analytics.streak} days`, isAccent: true },
    { label: 'THIS WEEK', value: `${analytics.week_hours} hrs` },
    { label: 'TOTAL SESSIONS', value: analytics.total_sessions },
  ];

  return (
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-5 h-full">
      <div className="pb-3 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">Weekly Analytics</h3>
        <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Focus performance</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="p-3.5 border border-[#D7D3CF] rounded-[4px] bg-[#FAF9F7]">
            <div className={`text-[10px] font-mono uppercase font-semibold tracking-wider mb-1.5 ${item.isAccent ? 'text-[#C96A32]' : 'text-[#666666]'}`}>
              {item.label}
            </div>
            <div className={`text-xl font-bold font-mono ${item.isAccent ? 'text-[#C96A32]' : 'text-[#111111]'}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusAnalytics;
