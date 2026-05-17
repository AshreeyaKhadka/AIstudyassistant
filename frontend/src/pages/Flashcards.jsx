import React, { useState } from 'react';
import { BrainCircuit, Play, Plus, BookOpen } from 'lucide-react';

const Flashcards = () => {
  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Flashcard Decks</h3>
          <p className="text-sm text-slate-500">Master your subjects with active recall and spaced repetition.</p>
        </div>
        
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <BookOpen size={16} /> Shared Decks
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Plus size={16} /> Generate AI Deck
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DeckCard title="Operating Systems Core Concepts" subject="Operating Systems" count={42} difficulty="Hard" progress={65} />
        <DeckCard title="Data Structures & Algorithms" subject="Computer Science" count={120} difficulty="Medium" progress={30} />
        <DeckCard title="Database Normalization Forms" subject="DBMS" count={15} difficulty="Easy" progress={100} />
      </div>

      {/* Interactive Practice Mode Demo */}
      <div className="mt-8">
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BrainCircuit className="text-blue-500" /> Practice Mode Demo
        </h4>
        <div className="bg-slate-100 p-8 rounded-3xl flex items-center justify-center">
          <FlashcardDemo />
        </div>
      </div>
    </div>
  );
};

const DeckCard = ({ title, subject, count, difficulty, progress }) => {
  const getDiffColor = () => {
    if (difficulty === 'Hard') return 'text-red-600 bg-red-50 border-red-100';
    if (difficulty === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{subject}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${getDiffColor()}`}>
          {difficulty}
        </span>
      </div>
      
      <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{title}</h4>
      <p className="text-sm text-slate-500 mb-4">{count} cards</p>
      
      <div className="mt-auto">
        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
          <span>Mastery</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        
        <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors">
          <Play size={16} fill="currentColor" /> Practice Now
        </button>
      </div>
    </div>
  );
};

const FlashcardDemo = () => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      className="relative w-full max-w-md h-64 perspective-1000 cursor-pointer group"
      onClick={() => setFlipped(!flipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-white border border-slate-200 rounded-3xl shadow-sm p-8 flex flex-col items-center justify-center text-center">
          <span className="absolute top-4 left-4 text-xs font-bold text-slate-400">Front</span>
          <h3 className="text-2xl font-bold text-slate-800">What is a Deadlock?</h3>
          <p className="text-sm text-slate-400 mt-4 group-hover:text-blue-500 transition-colors">Click to reveal answer</p>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden bg-blue-600 border border-blue-500 rounded-3xl shadow-lg p-8 flex flex-col items-center justify-center text-center rotate-y-180 text-white">
          <span className="absolute top-4 left-4 text-xs font-bold text-blue-200">Back</span>
          <p className="text-lg font-medium leading-relaxed">
            A situation in OS where a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process.
          </p>
          <div className="absolute bottom-6 flex gap-2">
            <button className="px-4 py-1.5 bg-red-500 hover:bg-red-400 rounded-lg text-sm font-bold transition-colors">Hard</button>
            <button className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm font-bold transition-colors">Good</button>
            <button className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-bold transition-colors">Easy</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flashcards;
