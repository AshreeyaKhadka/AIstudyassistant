import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const FocusWidget = () => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/dashboard/focus')}
      className="bg-[#102326] text-white border border-[#102326] rounded-[4px] p-5 flex items-center justify-between cursor-pointer hover:bg-[#0b191c] transition-colors"
    >
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">Smart Focus Mode</h3>
        <p className="text-xs text-[#A0B0B3] mt-0.5">AI study coach</p>
      </div>
      <ArrowRight size={18} className="text-white shrink-0 ml-3" />
    </div>
  );
};

export default FocusWidget;
