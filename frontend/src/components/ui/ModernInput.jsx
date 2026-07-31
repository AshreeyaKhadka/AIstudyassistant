import React from 'react';

export const ModernInput = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full bg-white text-[#111111] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3.5 py-2 text-sm outline-none transition-colors ${className}`}
      {...props}
    />
  );
};
