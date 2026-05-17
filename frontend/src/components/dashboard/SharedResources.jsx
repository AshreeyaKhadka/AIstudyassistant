import React from 'react';
import { Globe, Folder, FileText, ChevronRight } from 'lucide-react';

const SharedResources = ({ resources }) => {
  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full overflow-hidden relative">
      {/* Decorative top border to distinguish global content */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
      
      <div className="p-5 border-b border-ghost-border flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
            <Globe size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-lg font-bold text-on-surface">University Resources</h3>
            <p className="text-xs text-outline-variant">Global resources for all students</p>
          </div>
        </div>
        <button className="text-sm font-medium text-indigo-600 hover:underline">Browse All</button>
      </div>
      
      <div className="p-5 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {resources.map((res) => (
          <div key={res.id} className="flex items-center gap-3 p-3 rounded-lg border border-ghost-border hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors group">
            <div className={`p-2 rounded-md ${res.type === 'folder' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
              {res.type === 'folder' ? <Folder size={20} /> : <FileText size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-on-surface truncate">{res.title}</p>
              <div className="flex gap-2 items-center mt-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 bg-indigo-100 px-1.5 rounded-sm">{res.category}</span>
                <span className="text-xs text-outline-variant">{res.date}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-outline-variant opacity-0 group-hover:opacity-100 group-hover:text-indigo-600 transition-all -translate-x-2 group-hover:translate-x-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharedResources;
