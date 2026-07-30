import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const RevisionWidget = () => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/dashboard/revision')}
      className="bg-white text-[#111111] border border-[#D7D3CF] rounded-[4px] p-5 flex items-center justify-between cursor-pointer hover:bg-[#FAF9F7] transition-colors"
    >
      <div>
        <h3 className="text-base font-bold text-[#111111] tracking-tight">Revision schedule</h3>
        <p className="text-xs text-[#666666] mt-0.5">Spaced repetition active</p>
      </div>
      <ArrowRight size={18} className="text-[#111111] shrink-0 ml-3" />
    </div>
  );
};

export default RevisionWidget;
