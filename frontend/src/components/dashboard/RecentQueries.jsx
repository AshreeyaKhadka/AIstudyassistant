import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const RecentQueries = ({ queries = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-[#D7D3CF] mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111111] tracking-tight">Recent AI Queries</h3>
          <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Study questions</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/chat')}
          className="border border-[#102326] bg-white text-[#102326] hover:bg-[#102326] hover:text-white transition-colors rounded-[4px] px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase"
        >
          VIEW ALL
        </button>
      </div>

      <div className="space-y-2.5">
        {queries.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] rounded-[4px] bg-[#FAF9F7]">
            No recent queries yet.
          </div>
        ) : (
          queries.slice(0, 3).map((query) => (
            <div
              key={query.id}
              onClick={() => navigate('/dashboard/chat')}
              className="p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#FAF9F7] transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-xs font-bold text-[#111111] truncate">{query.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#666666]">
                  <span className="bg-[#ECEAE7] text-[#111111] px-1.5 py-0.5 rounded-[2px] font-semibold uppercase">
                    {query.subject || 'GENERAL'}
                  </span>
                  <span>{query.time}</span>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-[#102326] shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentQueries;
