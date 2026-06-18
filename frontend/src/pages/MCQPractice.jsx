import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, Library, Sparkles, Loader2, ChevronLeft, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MCQPractice = () => {
  const { user } = useOutletContext();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: selectedOption }
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

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
    setGenerating(true);
    setSelectedUpload(uploadId);
    try {
      const res = await fetch('/api/generate/mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ upload_id: uploadId, count: 10 }),
      });

      const data = await res.json();
      if (res.ok && data.mcqs) {
        setMcqs(data.mcqs);
        setQuizMode(true);
        setCurrentIndex(0);
        setAnswers({});
        setShowResult(false);
      }
    } catch (err) {
      console.error('Generate failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (optionKey) => {
    if (showResult) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: optionKey }));
  };

  const calculateScore = () => {
    let score = 0;
    mcqs.forEach((q, i) => {
      if (answers[i] === q.correct) score++;
    });
    return score;
  };

  if (quizMode && mcqs.length > 0) {
    const q = mcqs[currentIndex];
    const isAnswered = answers[currentIndex] !== undefined;
    const isLast = currentIndex === mcqs.length - 1;

    return (
      <div className="flex flex-col h-full gap-8 pb-12">
        {/* Quiz Header */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setQuizMode(false); setMcqs([]); }}
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800">Practice Session</h2>
              <p className="text-sm text-slate-500 font-medium">Question {currentIndex + 1} of {mcqs.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
              <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / mcqs.length) * 100}%` }}
                  className="h-full bg-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm"
          >
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  {currentIndex + 1}
                </div>
                <h3 className="text-xl font-bold text-slate-800 leading-relaxed pt-1">
                  {q.question}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.entries(q.options || {}).map(([key, val]) => {
                  const isSelected = answers[currentIndex] === key;
                  const isCorrect = key === q.correct;
                  let colorClass = "bg-slate-50 border-slate-100 hover:border-blue-200 text-slate-700";

                  if (showResult) {
                    if (isCorrect) colorClass = "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-100";
                    else if (isSelected) colorClass = "bg-rose-50 border-rose-300 text-rose-800";
                    else colorClass = "bg-slate-50 border-slate-100 opacity-50";
                  } else if (isSelected) {
                    colorClass = "bg-blue-50 border-blue-600 text-blue-700 ring-2 ring-blue-100";
                  }

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectOption(key)}
                      disabled={showResult}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${colorClass}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border text-slate-400'}`}>
                        {key}
                      </div>
                      <span className="font-semibold">{val}</span>
                      {showResult && isCorrect && <CheckCircle2 className="ml-auto text-emerald-500" size={20} />}
                      {showResult && isSelected && !isCorrect && <XCircle className="ml-auto text-rose-500" size={20} />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showResult && q.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-blue-600" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Contextual Explanation</span>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed font-medium">
                      {q.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="flex justify-between items-center px-4">
            <button
              onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setShowResult(false); }}
              disabled={currentIndex === 0}
              className="px-6 py-3 text-slate-500 font-bold disabled:opacity-0 transition-opacity flex items-center gap-2"
            >
              <ChevronLeft size={20} /> Previous
            </button>

            {!showResult ? (
              <button
                onClick={() => setShowResult(true)}
                disabled={!isAnswered}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all hover:bg-slate-800 flex items-center gap-2"
              >
                Check Answer
              </button>
            ) : (
              !isLast ? (
                <button
                  onClick={() => { setCurrentIndex(i => i + 1); setShowResult(false); }}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  Next Question <Sparkles size={18} />
                </button>
              ) : (
                <button
                  onClick={() => setQuizMode('summary')}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  View Summary <Trophy size={18} />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  if (quizMode === 'summary') {
    const score = calculateScore();
    const percentage = Math.round((score / mcqs.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center gap-8 py-12">
        <div className="relative">
          <div className="w-48 h-48 bg-emerald-50 rounded-full flex items-center justify-center">
            <Trophy size={80} className="text-emerald-500" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-blue-600 text-white w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-lg"
          >
            <span className="text-lg font-bold">{percentage}%</span>
          </motion.div>
        </div>

        <div className="space-y-2">
          <h2 className="text-4xl font-black text-slate-800">Battle Complete!</h2>
          <p className="text-slate-500 font-medium text-lg">You correctly answered {score} out of {mcqs.length} questions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <button
            onClick={() => { setQuizMode(true); setCurrentIndex(0); setAnswers({}); setShowResult(false); }}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-3xl font-bold hover:bg-slate-50 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => { setQuizMode(false); setMcqs([]); }}
            className="w-full py-4 bg-slate-900 text-white rounded-3xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-10 pb-12">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-100">
            <Target className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">MCQ Strategist</h1>
            <p className="text-slate-500 font-medium">AI-driven practice tests derived directly from your personal study notes.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-extrabold text-slate-800">Deployment Sources</h4>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {uploads.filter(u => u.is_embedded).length} Ready Targets
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-slate-300" size={32} />
          </div>
        ) : uploads.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText size={32} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No documents synced</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto">Upload curriculum materials in the Study Vault to activate MCQ generation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.map((upload, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={upload.id}
                className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-50 hover:border-blue-100 transition-all flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                    <Library size={24} />
                  </div>
                  <div className={`p-1.5 rounded-lg border ${upload.is_embedded ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse'}`}>
                    <Sparkles size={14} />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-extrabold text-slate-800 truncate group-hover:text-blue-700 transition-colors uppercase tracking-tight">{upload.filename}</h4>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">
                    Source: User Vault
                  </p>
                </div>

                <button
                  onClick={() => handleGenerate(upload.id)}
                  disabled={generating}
                  className={`mt-auto w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all ${generating && selectedUpload === upload.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200'
                    } ${generating && selectedUpload !== upload.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {generating && selectedUpload === upload.id ? (
                    <><Loader2 className="animate-spin" size={18} /> Constructing MCQ...</>
                  ) : (
                    <><Target size={18} /> Initiate Test</>
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

export default MCQPractice;
