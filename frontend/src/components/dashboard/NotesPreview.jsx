import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const NotesPreview = ({ notes = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-4 border-b border-[#D7D3CF] mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111111] tracking-tight">AI Generated Notes</h3>
          <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Study summaries</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/notes')}
          className="border border-[#102326] bg-white text-[#102326] hover:bg-[#102326] hover:text-white transition-colors rounded-[4px] px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase"
        >
          VIEW ALL
        </button>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] rounded-[4px] bg-[#FAF9F7]">
            No notes generated yet.
          </div>
        ) : (
          notes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              onClick={() => navigate('/dashboard/notes')}
              className="p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#FAF9F7] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-xs font-bold text-[#111111] truncate">{note.title}</h4>
                <span className="text-[10px] font-mono text-[#666666] shrink-0 ml-2">{note.date}</span>
              </div>
              <p className="text-xs text-[#666666] line-clamp-2 mb-2 leading-relaxed">
                {note.snippet}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                <span className="bg-[#ECEAE7] text-[#111111] px-2 py-0.5 rounded-[2px] font-semibold">
                  {note.subject || 'GENERAL'}
                </span>
                <span className="text-[#102326] font-semibold flex items-center gap-1">
                  OPEN <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesPreview;
