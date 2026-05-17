import React from 'react';
import { MessageSquare, ArrowUpRight } from 'lucide-react';

const RecentQueries = ({ queries }) => {
  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center">
        <div>
          <h3 className="font-editorial text-lg font-bold text-on-surface">Recent AI Queries</h3>
          <p className="text-xs text-outline-variant">Your personalized study questions</p>
        </div>
        <button className="text-sm text-primary font-medium hover:underline">View All</button>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        {queries.map((query) => (
          <div key={query.id} className="group p-4 rounded-lg bg-surface-low hover:bg-surface-container transition-colors border border-ghost-border flex justify-between items-center cursor-pointer">
            <div className="flex gap-3 items-start overflow-hidden">
              <div className="mt-1 bg-white p-1.5 rounded-md text-primary">
                <MessageSquare size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-on-surface truncate pr-4">{query.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-on-secondary truncate">
                    {query.subject}
                  </span>
                  <span className="text-xs text-outline-variant">{query.time}</span>
                </div>
              </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-outline-variant hover:text-primary hover:bg-white rounded-full">
              <ArrowUpRight size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentQueries;
