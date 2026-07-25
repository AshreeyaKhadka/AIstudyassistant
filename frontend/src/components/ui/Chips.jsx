import React from 'react';

export const SelectionChip = ({ label, active = false, onClick, ...props }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-[4px] border font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-[#102326] text-white border-[#102326]'
          : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
      }`}
      {...props}
    >
      {label}
    </button>
  );
};
