import React, { useState, useEffect } from 'react';
import { BrainCircuit, Play, BookOpen, Sparkles, Flame, Loader2, ChevronLeft, ChevronRight, RotateCcw, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGeneration } from '../context/GenerationContext';

const Flashcards = () => {
  const { flashcardState, generateFlashcards, resetFlashcards } = useGeneration();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);

  // Use local state for study session flashcards once generated
  const [sessionFlashcards, setSessionFlashcards] = useState([]);

  useEffect(() => {
    fetchUploads();
  }, []);

  // Update sessionFlashcards when generation finishes
  useEffect(() => {
    if (!flashcardState.generating && flashcardState.results) {
      setSessionFlashcards(flashcardState.results);
      setStudyMode(true);
    }
  }, [flashcardState.generating, flashcardState.results]);

  const fetchUploads = async () => {
    try {
      const res = await fetch('/api/upload/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUploads(data);
      }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (uploadId) => {
    setSelectedUpload(uploadId);
    setCurrentIndex(0);
    setFlipped(false);
    generateFlashcards(uploadId);
  };

  const nextCard = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.min(i + 1, sessionFlashcards.length - 1)), 200);
  };

  const prevCard = () => {
    setFlipped(false);
    setTimeout(() => setCurrentIndex(i => Math.max(i - 1, 0)), 200);
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setFlipped(false);
  };

  if (studyMode && sessionFlashcards.length > 0) {
    const card = sessionFlashcards[currentIndex];
    const progress = ((currentIndex + 1) / sessionFlashcards.length) * 100;

    return (
      <div className="flex flex-col h-full gap-8 pb-12">
        {/* Study Mode Header */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setStudyMode(false); resetFlashcards(); setSessionFlashcards([]); }}
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Study Session</h2>
              <p className="text-sm text-slate-500 font-medium">Card {currentIndex + 1} of {sessionFlashcards.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={resetDeck} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all" title="Reset">
              <RotateCcw size={18} />
            </button>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Flashcard Arena */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <div
              className="relative w-full h-80 perspective-1000 cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full"
              >
                {/* Front */}
                <div
                  className="absolute w-full h-full bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center shadow-lg"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-slate-300 uppercase tracking-[0.2em] bg-slate-50 px-4 py-1 rounded-full">
                    Question
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight leading-relaxed px-4">{card.front}</h3>
                  <p className="text-xs text-blue-500 font-bold mt-8 uppercase tracking-widest animate-pulse">Tap to reveal</p>
                </div>

                {/* Back */}
                <div
                  className="absolute w-full h-full bg-slate-900 border border-slate-800 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center text-white shadow-2xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-slate-600 uppercase tracking-[0.2em] bg-slate-800 px-4 py-1 rounded-full">
                    Answer
                  </div>
                  <p className="text-base font-semibold leading-relaxed text-slate-200 px-4">{card.back}</p>
                </div>
              </motion.div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <div className="flex gap-1.5">
                {sessionFlashcards.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-orange-500 w-6' : 'bg-slate-200'}`}
                  />
                ))}
              </div>
              <button
                onClick={nextCard}
                disabled={currentIndex === sessionFlashcards.length - 1}
                className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight size={24} className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="text-slate-500 font-medium">Master your subjects with AI-generated flashcards from your uploaded materials.</p>
          </div>
        </div>
      </div>

      {/* Document Selection Grid */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-extrabold text-slate-800">Select a Document</h4>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {uploads.filter(u => u.is_embedded).length} AI-indexed docs
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-slate-300" size={32} />
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <FileText size={48} className="text-slate-100 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No documents uploaded</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">Upload study materials in the Study Vault to generate flashcards.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.map((upload, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={upload.id}
                className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-orange-50 hover:border-orange-100 transition-all flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-inner">
                    <BrainCircuit size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${upload.is_embedded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{upload.is_embedded ? 'Ready' : 'Indexing'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-extrabold text-slate-800 truncate group-hover:text-orange-600 transition-colors">{upload.filename}</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {new Date(upload.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <button
                  onClick={() => handleGenerate(upload.id)}
                  disabled={flashcardState.generating}
                  className={`mt-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all ${flashcardState.generating && (selectedUpload === upload.id || flashcardState.selectedUploadId === upload.id)
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-100'
                    } ${flashcardState.generating && (selectedUpload !== upload.id && flashcardState.selectedUploadId !== upload.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {(flashcardState.generating && (selectedUpload === upload.id || flashcardState.selectedUploadId === upload.id)) ? (
                    <><Loader2 className="animate-spin" size={18} /> Generating...</>
                  ) : (
                    <><Sparkles size={18} /> Generate Flashcards</>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
