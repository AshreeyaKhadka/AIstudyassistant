import React from 'react';
import { Layers, ChevronRight } from 'lucide-react';

const FlashcardPreview = ({ flashcards }) => {
  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center bg-surface-low/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="font-editorial text-lg font-bold text-on-surface">Flashcards Review</h3>
            <p className="text-xs text-outline-variant">Personalized quick recall</p>
          </div>
        </div>
        <button className="text-sm font-medium text-emerald-600 hover:underline">Practice All</button>
      </div>
      
      <div className="p-5 flex-1 flex overflow-x-auto gap-4 custom-scrollbar pb-6 snap-x">
        {flashcards.map((card) => (
          <div key={card.id} className="min-w-[280px] sm:min-w-[320px] bg-white rounded-xl border border-ghost-border p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow snap-center cursor-pointer group">
            <div>
              <span className="inline-block px-2 py-1 bg-surface-container rounded-md text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-3">
                {card.subject}
              </span>
              <p className="font-medium text-on-surface text-sm mb-4 line-clamp-3">
                {card.question}
              </p>
            </div>
            <div className="pt-4 border-t border-dashed border-ghost-border flex items-center justify-between">
              <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Reveal Answer</span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardPreview;
