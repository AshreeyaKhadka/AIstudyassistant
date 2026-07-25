import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, FileText, ChevronRight } from 'lucide-react';

const SharedResources = ({ resources = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5">
      <div className="flex items-center justify-between pb-4 border-b border-[#D7D3CF] mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111111] tracking-tight">University Resources</h3>
          <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Global student materials</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/upload')}
          className="border border-[#102326] bg-white text-[#102326] hover:bg-[#102326] hover:text-white transition-colors rounded-[4px] px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase"
        >
          BROWSE ALL
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resources.map((res) => (
          <div
            key={res.id}
            onClick={() => navigate('/dashboard/upload')}
            className="flex items-center gap-3 p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#FAF9F7] transition-colors cursor-pointer"
          >
            <div className="p-2 bg-[#ECEAE7] text-[#102326] rounded-[4px] shrink-0">
              {res.type === 'folder' ? <Folder size={14} /> : <FileText size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#111111] truncate">{res.title}</p>
              <span className="text-[9px] font-mono uppercase text-[#666666]">{res.category}</span>
            </div>
            <ChevronRight size={14} className="text-[#102326] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedResources;
