import React from 'react';

const ProgressTracker = () => {
  return (
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-5">
      <div className="pb-4 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">Academic progress</h3>
        <p className="text-xs text-[#666666] mt-0.5 font-sans">Syllabus completion</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-mono uppercase text-[#666666] tracking-wider font-semibold">
            Overall completion
          </span>
          <span className="text-2xl font-bold font-mono text-[#111111]">
            68%
          </span>
        </div>

        <div className="w-full h-1.5 bg-[#ECEAE7] rounded-none overflow-hidden">
          <div className="bg-[#102326] h-full w-[68%] transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
