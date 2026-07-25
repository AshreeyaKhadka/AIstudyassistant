import React from 'react';

export const CardList = ({ items = [] }) => {
  return (
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] divide-y divide-[#D7D3CF]">
      {items.map((item, index) => (
        <div 
          key={index}
          className="p-3 hover:bg-[#FAF9F7] transition-colors cursor-pointer"
        >
          <div className="text-xs font-bold text-[#111111]">{item.title}</div>
          <div className="text-[11px] text-[#666666] mt-0.5">{item.subtitle}</div>
        </div>
      ))}
    </div>
  );
};
