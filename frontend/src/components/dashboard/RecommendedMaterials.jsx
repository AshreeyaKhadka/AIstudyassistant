import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Link2, Book } from 'lucide-react';

const RecommendedMaterials = () => {
  const navigate = useNavigate();

  const recommendations = [
    { title: 'TCP/IP Model Explained in 10 Mins', subject: 'Weak subject: Networks', icon: PlayCircle },
    { title: 'Normalization Normal Forms Cheat Sheet', subject: 'Based on queries', icon: Book },
    { title: 'Process Scheduling Simulator', subject: 'Recommended practice tool', icon: Link2 },
  ];

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5">
      <div className="pb-3 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">AI Recommendations</h3>
        <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Suggested study content</p>
      </div>

      <div className="space-y-2.5">
        {recommendations.map((rec, idx) => {
          const Icon = rec.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate('/dashboard/syllabus')}
              className="flex items-center gap-3 p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#FAF9F7] transition-colors cursor-pointer"
            >
              <Icon size={16} className="text-[#102326] shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#111111] truncate">{rec.title}</h4>
                <p className="text-[9px] font-mono uppercase text-[#666666] mt-0.5">{rec.subject}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendedMaterials;
