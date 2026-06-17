import React, { useState } from 'react';
import { BrainCircuit, Play, Plus, BookOpen, Sparkles, Zap, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

const Flashcards = () => {
  return (
    <div className="flex flex-col h-full gap-10 pb-12">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-orange-500 p-4 rounded-3xl shadow-lg shadow-orange-100">
            <Flame className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Active Recall</h1>
            <p className="text-slate-500 font-medium">Master your subjects with active recall and spaced repetition algorithms.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="px-6 py-4 bg-white border border-slate-100 text-slate-700 rounded-2xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <BookOpen size={18} /> Shared Repos
          </button>
          <button className="px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Sparkles size={18} /> Sync with AI
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-xl font-extrabold text-slate-800">Your Knowledge Decks</h4>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">3 Active Decks</span>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <DeckCard title="Operating Systems Core Concepts" subject="Operating Systems" count={42} difficulty="Hard" progress={65} />
        <DeckCard title="Data Structures & Algorithms" subject="Computer Science" count={120} difficulty="Medium" progress={30} />
        <DeckCard title="Database Normalization Forms" subject="DBMS" count={15} difficulty="Easy" progress={100} />
      </div>

      {/* Interactive Practice Mode Demo */}
      <div className="mt-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <BrainCircuit size={20} />
          </div>
          <h4 className="text-xl font-extrabold text-slate-800">Spaced Repetition Lab</h4>
        </div>
        <div className="bg-slate-50/50 p-12 rounded-[3.5rem] border border-slate-100 border-dashed flex items-center justify-center">
          <FlashcardDemo />
        </div>
      </div>
    </div>
  );
};

const DeckCard = ({ title, subject, count, difficulty, progress }) => {
  const getDiffColor = () => {
    if (difficulty === 'Hard') return 'text-rose-500 bg-rose-50 border-rose-100';
    if (difficulty === 'Medium') return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8 flex flex-col hover:shadow-2xl hover:shadow-slate-100 transition-all group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-6">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg">{subject}</span>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-lg border ${getDiffColor()}`}>
          {difficulty}
        </span>
      </div>

      <h4 className="text-xl font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">{title}</h4>
      <p className="text-sm text-slate-400 font-bold mb-6 uppercase tracking-tight">{count} Intelligence Units</p>

      <div className="mt-auto">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-3 uppercase">
          <span>Mastery Depth</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-50 rounded-full h-2 mb-6 shadow-inner">
          <div className="bg-blue-600 h-2 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-100">
          <Play size={18} fill="currentColor" /> Enter Arena
        </button>
      </div>
    </motion.div>
  );
};

const FlashcardDemo = () => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full max-w-md h-72 perspective-1000 cursor-pointer group"
      onClick={() => setFlipped(!flipped)}
    >
      <div className={`relative w-full h-full transition-all duration-700 preserve-3d shadow-2xl rounded-[3rem] ${flipped ? 'rotate-y-180' : ''}`}>

        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center shadow-inner">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-slate-300 uppercase tracking-[0.2em] bg-slate-50 px-4 py-1 rounded-full">Primary Question</div>
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">What defines a "Deadlock" in Distributed Systems?</h3>
          <p className="text-xs text-blue-500 font-bold mt-8 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Tap to reveal internal mapping</p>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden bg-slate-900 border border-slate-800 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center rotate-y-180 text-white shadow-2xl">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-slate-600 uppercase tracking-[0.2em] bg-slate-800 px-4 py-1 rounded-full">AI Synthesized Answer</div>
          <p className="text-base font-semibold leading-relaxed text-slate-200">
            A synchronization bottleneck where a cluster of nodes enter mutual suspension, each waiting for a state transition that only another suspended node can trigger.
          </p>
          <div className="absolute bottom-10 flex gap-3">
            <button className="px-5 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-lg shadow-rose-900/40">Difficult</button>
            <button className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40">Adequate</button>
            <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/40">Mastered</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flashcards;
