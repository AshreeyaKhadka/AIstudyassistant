import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const FlashcardPreview = ({ flashcards = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5 sm:p-6 flex flex-col justify-between">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-[#D7D3CF] mb-5">
        <div>
          <h3 className="text-base font-bold text-[#111111] tracking-tight">Flashcards review</h3>
          <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">
            Personalized active recall
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/flashcards')}
          className="border border-[#102326] bg-white text-[#102326] hover:bg-[#102326] hover:text-white transition-colors rounded-[4px] px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase"
        >
          PRACTICE ALL
        </button>
      </div>

      {/* Main Content Area */}
      {flashcards.length === 0 ? (
        <div className="border border-dashed border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px] min-h-[200px] flex items-center justify-center p-8 text-center">
          <p className="text-xs text-[#666666] font-mono leading-relaxed max-w-md">
            No flashcards yet - generate a set from an uploaded document to start reviewing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flashcards.slice(0, 2).map((card) => (
            <div
              key={card.id}
              onClick={() => navigate('/dashboard/flashcards')}
              className="border border-[#D7D3CF] bg-white hover:bg-[#FAF9F7] transition-colors rounded-[4px] p-4 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <span className="text-[9px] font-mono uppercase font-semibold text-[#666666] bg-[#ECEAE7] px-2 py-0.5 rounded-[2px] tracking-wider">
                  {card.subject || 'GENERAL'}
                </span>
                <p className="text-xs font-medium text-[#111111] mt-3 line-clamp-3 leading-snug">
                  {card.question}
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-[#D7D3CF] flex items-center justify-between text-[10px] font-mono uppercase text-[#C96A32] font-semibold">
                <span>REVEAL ANSWER</span>
                <ChevronRight size={14} className="text-[#102326]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardPreview;
