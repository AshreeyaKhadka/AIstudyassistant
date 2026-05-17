import React from 'react';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';

const NotesPreview = ({ notes }) => {
  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-lg font-bold text-on-surface">AI Generated Notes</h3>
            <p className="text-xs text-outline-variant">Your tailored study summaries</p>
          </div>
        </div>
        <button className="text-sm font-medium text-primary hover:underline">View All</button>
      </div>
      
      <div className="p-5 flex-1 grid grid-cols-1 gap-4">
        {notes.map((note) => (
          <div key={note.id} className="p-4 rounded-xl border border-ghost-border bg-surface-low hover:bg-white hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-on-surface text-sm group-hover:text-primary transition-colors">{note.title}</h4>
              <span className="text-xs text-outline-variant">{note.date}</span>
            </div>
            <p className="text-sm text-outline-variant line-clamp-2 mb-3 leading-relaxed">
              {note.snippet}
            </p>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-tertiary/10 rounded-md text-tertiary text-xs font-semibold">
                <Sparkles size={12} />
                {note.subject}
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                Open Note <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesPreview;
