import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Link2, Book, ArrowUpRight } from 'lucide-react';

const RecommendedMaterials = ({ recommendations = [] }) => {
  const navigate = useNavigate();

  const handleRecClick = (rec) => {
    if (rec.type === 'upload') {
      navigate('/dashboard/syllabus');
    } else if (rec.type === 'mcq') {
      navigate('/dashboard/mcq');
    } else {
      navigate('/dashboard/upload');
    }
  };

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5">
      <div className="pb-3 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">AI Recommendations</h3>
        <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Suggested study content</p>
      </div>

      <div className="space-y-2.5">
        {recommendations.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] rounded-[4px] bg-[#FAF9F7]">
            No recommendations currently available.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              onClick={() => handleRecClick(rec)}
              className="flex items-center gap-3 p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#FAF9F7] transition-colors cursor-pointer justify-between"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#111111] truncate">{rec.title}</h4>
                <p className="text-[9px] font-mono uppercase text-[#666666] mt-0.5">{rec.subject}</p>
              </div>
              <ArrowUpRight size={14} className="text-[#102326] shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendedMaterials;
