import React, { useState, useEffect } from 'react';
import { BrainCircuit, Loader2, ChevronLeft, ChevronRight, RotateCcw, FileText, Sparkles } from 'lucide-react';
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
  const [sessionFlashcards, setSessionFlashcards] = useState([]);

  useEffect(() => {
    fetchUploads();
  }, []);

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
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="bg-white p-5 border border-[#D7D3CF] rounded-[4px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStudyMode(false); resetFlashcards(); setSessionFlashcards([]); }}
              className="p-1.5 bg-[#F7F5F2] border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Study Session</h2>
              <p className="text-xs font-mono text-[#666666]">Card {currentIndex + 1} of {sessionFlashcards.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={resetDeck} className="p-1.5 bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors" title="Reset Deck">
              <RotateCcw size={16} />
            </button>
            <div className="w-32 h-1.5 bg-[#ECEAE7] rounded-none overflow-hidden">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-[#102326] transition-all duration-300"
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#111111]">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Flashcard Arena */}
        <div className="flex items-center justify-center py-6">
          <div className="w-full max-w-lg">
            <div
              className="relative w-full h-72 perspective-1000 cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full"
              >
                {/* Front */}
                <div
                  className="absolute w-full h-full bg-white border border-[#D7D3CF] rounded-[4px] p-8 flex flex-col items-center justify-center text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold bg-[#F7F5F2] px-2 py-0.5 rounded-[2px]">
                    QUESTION
                  </div>
                  <h3 className="text-lg font-bold text-[#111111] tracking-tight leading-relaxed px-4">{card.front}</h3>
                  <p className="text-[10px] font-mono text-[#C96A32] uppercase tracking-wider mt-6 font-semibold">TAP TO REVEAL</p>
                </div>

                {/* Back */}
                <div
                  className="absolute w-full h-full bg-[#102326] border border-[#102326] rounded-[4px] p-8 flex flex-col items-center justify-center text-center text-white"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <div className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-wider text-[#A0B0B3] font-semibold bg-white/10 px-2 py-0.5 rounded-[2px]">
                    ANSWER
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-white px-4">{card.back}</p>
                </div>
              </motion.div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="p-2 bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-mono text-[#666666]">
                {currentIndex + 1} / {sessionFlashcards.length}
              </span>
              <button
                onClick={nextCard}
                disabled={currentIndex === sessionFlashcards.length - 1}
                className="p-2 bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
          PERSONALIZED ACTIVE RECALL
        </div>
        <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Flashcard Decks</h1>
        <p className="text-xs text-[#666666] mt-1">Master your syllabus with instant generated review cards from uploaded documents.</p>
      </div>

      {/* Document Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Select Document</h4>
          <span className="text-[10px] font-mono text-[#666666]">
            {uploads.length} uploaded files
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[#102326]" size={24} />
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
            <FileText size={32} className="text-[#666666] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#111111] mb-1">No documents uploaded</h3>
            <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">Upload PDF materials in Uploaded Materials section to generate decks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
                      <BrainCircuit size={18} />
                    </div>
                    <span className="text-[9px] font-mono uppercase font-semibold text-[#666666] bg-[#F7F5F2] px-2 py-0.5 rounded-[2px]">
                      {upload.is_embedded ? 'READY' : 'INDEXING'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#111111] truncate">{upload.filename}</h4>
                  <p className="text-[10px] font-mono text-[#666666] mt-1">
                    {new Date(upload.created_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleGenerate(upload.id)}
                  disabled={flashcardState.generating}
                  className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
                    flashcardState.generating && (selectedUpload === upload.id || flashcardState.selectedUploadId === upload.id)
                      ? 'bg-[#ECEAE7] text-[#111111]'
                      : 'bg-[#102326] text-white hover:bg-[#0b191c]'
                  }`}
                >
                  {(flashcardState.generating && (selectedUpload === upload.id || flashcardState.selectedUploadId === upload.id)) ? (
                    <><Loader2 className="animate-spin" size={14} /> GENERATING...</>
                  ) : (
                    <><Sparkles size={14} /> GENERATE FLASHCARDS</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flashcards;
