import React from 'react';

const WelcomeSection = ({ data, user }) => {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const userName = user?.username || user?.first_name || data?.name?.split(' ')[0] || 'Ayush';
  const department = user?.department || data?.department || 'Computer Engineering';
  const streak = data?.streak ?? 0;

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#D7D3CF]">
        {/* Welcome message box - 6 columns */}
        <div className="md:col-span-6 p-5 md:p-6 flex flex-col justify-between">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold mb-2">
            WELCOME BACK
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111111] tracking-tight leading-snug">
            {userName} - let's make today count
          </h1>
        </div>

        {/* Program info box - 2 columns */}
        <div className="md:col-span-2 p-5 md:p-6 flex flex-col justify-between">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold mb-2">
            PROGRAM
          </div>
          <div className="text-xs font-medium text-[#111111] truncate">
            {department}
          </div>
        </div>

        {/* Date box - 2 columns */}
        <div className="md:col-span-2 p-5 md:p-6 flex flex-col justify-between">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold mb-2">
            DATE
          </div>
          <div className="text-xs font-medium text-[#111111]">
            {dateStr}
          </div>
        </div>

        {/* Streak box - 2 columns */}
        <div className="md:col-span-2 p-5 md:p-6 flex flex-col justify-between">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#666666] font-semibold mb-2">
            STREAK
          </div>
          <div className="text-sm font-bold text-[#C96A32] font-mono">
            {streak} days
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSection;
