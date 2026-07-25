import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, Library, Sparkles, Loader2, ChevronLeft, CheckCircle2, XCircle, FileText, AlertCircle, Trophy, Bookmark, Clock } from 'lucide-react';

const MCQPractice = () => {
  const { user } = useOutletContext();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [limitError, setLimitError] = useState('');

  const [savedMCQs, setSavedMCQs] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

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

  const fetchSavedMCQs = async (uploadId) => {
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/generate/saved-mcqs/${uploadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSavedMCQs(data.saved_sets || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved MCQs:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleGenerate = async (uploadId) => {
    setGenerating(true);
    setSelectedUpload(uploadId);
    setLimitError('');
    try {
      const res = await fetch('/api/generate/mcqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ upload_id: uploadId, count: 10 }),
      });

      const data = await res.json();

      if (res.status === 403 && data.limit_reached) {
        setLimitError(data.error);
        setTimeout(() => setLimitError(''), 5000);
        return;
      }

      if (res.ok && data.mcqs) {
        setMcqs(data.mcqs);
        setQuizMode(true);
        setCurrentIndex(0);
        setAnswers({});
        setShowResult(false);
        fetchUploads();
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

  const startSavedQuiz = (questions) => {
    setMcqs(questions);
    setQuizMode(true);
    setCurrentIndex(0);
    setAnswers({});
    setShowResult(false);
    setActiveTab('generate');
  };

  if (quizMode === true && mcqs.length > 0) {
    const q = mcqs[currentIndex];
    const isAnswered = answers[currentIndex] !== undefined;
    const isLast = currentIndex === mcqs.length - 1;

    return (
      <div className="flex flex-col gap-6 pb-12 max-w-3xl mx-auto">
        {/* Session Header */}
        <div className="bg-white p-5 border border-[#D7D3CF] rounded-[4px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setQuizMode(false); setMcqs([]); }}
              className="p-1.5 bg-[#F7F5F2] border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#111111]">MCQ Session</h2>
              <p className="text-xs font-mono text-[#666666]">Question {currentIndex + 1} of {mcqs.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#111111] font-bold">
            PROGRESS: {Math.round(((currentIndex + 1) / mcqs.length) * 100)}%
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] space-y-6">
          <div className="space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold bg-[#F7F5F2] px-2 py-1 rounded-[2px] w-fit">
              QUESTION {currentIndex + 1}
            </div>
            <h3 className="text-base font-bold text-[#111111] leading-relaxed">
              {q.question}
            </h3>

            <div className="space-y-2">
              {Object.entries(q.options || {}).map(([key, val]) => {
                const isSelected = answers[currentIndex] === key;
                const isCorrect = key === q.correct;
                let colorClass = "bg-white border-[#D7D3CF] text-[#111111] hover:border-[#102326]";

                if (showResult) {
                  if (isCorrect) colorClass = "bg-[#ECEAE7] border-[#102326] text-[#102326] font-bold";
                  else if (isSelected) colorClass = "bg-[#FFFDFB] border-[#C96A32] text-[#C96A32]";
                  else colorClass = "bg-white border-[#D7D3CF] opacity-50";
                } else if (isSelected) {
                  colorClass = "bg-[#102326] text-white border-[#102326]";
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectOption(key)}
                    disabled={showResult}
                    className={`w-full text-left p-3 rounded-[4px] border transition-colors flex items-center justify-between text-xs font-mono ${colorClass}`}
                  >
                    <span><strong className="mr-2">{key}.</strong> {val}</span>
                    {showResult && isCorrect && <CheckCircle2 className="text-[#102326]" size={16} />}
                    {showResult && isSelected && !isCorrect && <XCircle className="text-[#C96A32]" size={16} />}
                  </button>
                );
              })}
            </div>

            {showResult && q.explanation && (
              <div className="p-4 bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#666666] font-semibold block">EXPLANATION</span>
                <p className="text-xs text-[#111111] leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[#D7D3CF]">
            <button
              onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setShowResult(false); }}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono uppercase disabled:opacity-30"
            >
              PREVIOUS
            </button>

            {!showResult ? (
              <button
                onClick={() => setShowResult(true)}
                disabled={!isAnswered}
                className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase disabled:opacity-50"
              >
                CHECK ANSWER
              </button>
            ) : (
              !isLast ? (
                <button
                  onClick={() => { setCurrentIndex(i => i + 1); setShowResult(false); }}
                  className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase"
                >
                  NEXT QUESTION
                </button>
              ) : (
                <button
                  onClick={() => setQuizMode('summary')}
                  className="px-4 py-2 bg-[#C96A32] text-white rounded-[4px] text-xs font-mono font-semibold uppercase"
                >
                  VIEW SUMMARY
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
      <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center gap-6 py-12">
        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-8 w-full space-y-4">
          <div className="w-16 h-16 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center mx-auto">
            <Trophy size={32} />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase text-[#666666] font-semibold">SESSION COMPLETE</span>
            <h2 className="text-3xl font-mono font-bold text-[#111111] mt-1">{percentage}% SCORE</h2>
            <p className="text-xs text-[#666666] mt-1">Answered {score} out of {mcqs.length} correctly.</p>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[#D7D3CF]">
            <button
              onClick={() => { setQuizMode(true); setCurrentIndex(0); setAnswers({}); setShowResult(false); }}
              className="flex-1 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase"
            >
              RETRY
            </button>
            <button
              onClick={() => { setQuizMode(false); setMcqs([]); }}
              className="flex-1 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase"
            >
              FINISH
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            MULTIPLE CHOICE PRACTICE
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">MCQ Strategist</h1>
          <p className="text-xs text-[#666666] mt-0.5">Practice multiple-choice questions generated from uploaded documents.</p>
        </div>
      </div>

      {limitError && (
        <div className="p-3 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#C96A32] flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{limitError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#ECEAE7] p-1 rounded-[4px] border border-[#D7D3CF] w-fit">
        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-1.5 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'generate' ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
          }`}
        >
          GENERATE NEW
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-1.5 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'saved' ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
          }`}
        >
          SAVED MCQS
        </button>
      </div>

      {activeTab === 'generate' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Source Documents</h4>
            <span className="text-[10px] font-mono text-[#666666]">{uploads.length} files available</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#102326]" size={24} />
            </div>
          ) : uploads.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <FileText size={32} className="text-[#666666] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#111111] mb-1">No materials found</h3>
              <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">Upload PDFs in Study Vault to generate MCQ practice sets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((upload) => {
                const genCount = upload.mcq_generation_count || 0;
                const limitReached = genCount >= 2;

                return (
                  <div
                    key={upload.id}
                    className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
                          <Library size={18} />
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-[#666666] bg-[#F7F5F2] px-2 py-0.5 rounded-[2px]">
                          {upload.is_embedded ? 'READY' : 'INDEXING'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#111111] truncate">{upload.filename}</h4>
                      <p className="text-[10px] font-mono text-[#666666] mt-1">
                        {genCount}/2 MCQ sets generated
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerate(upload.id)}
                      disabled={generating || limitReached || !upload.is_embedded}
                      className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
                        limitReached
                          ? 'bg-[#ECEAE7] text-[#666666] cursor-not-allowed'
                          : generating && selectedUpload === upload.id
                            ? 'bg-[#ECEAE7] text-[#111111]'
                            : 'bg-[#102326] text-white hover:bg-[#0b191c]'
                      }`}
                    >
                      {limitReached ? (
                        'LIMIT REACHED'
                      ) : generating && selectedUpload === upload.id ? (
                        <><Loader2 className="animate-spin" size={14} /> GENERATING...</>
                      ) : (
                        <><Target size={14} /> INITIATE TEST</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Saved MCQ Sets</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((upload) => (
              <SavedMCQCard
                key={upload.id}
                upload={upload}
                fetchSavedMCQs={fetchSavedMCQs}
                savedMCQs={savedMCQs}
                loadingSaved={loadingSaved}
                onStartQuiz={startSavedQuiz}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SavedMCQCard = ({ upload, fetchSavedMCQs, savedMCQs, loadingSaved, onStartQuiz }) => {
  const [expanded, setExpanded] = useState(false);
  const genCount = upload.mcq_generation_count || 0;

  useEffect(() => {
    if (expanded) {
      fetchSavedMCQs(upload.id);
    }
  }, [expanded]);

  return (
    <div className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] space-y-3">
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
          <Bookmark size={18} />
        </div>
        <span className="text-[9px] font-mono text-[#666666] bg-[#F7F5F2] px-2 py-0.5 rounded-[2px]">
          {genCount} SETS
        </span>
      </div>

      <h4 className="text-sm font-bold text-[#111111] truncate">{upload.filename}</h4>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-1.5 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono uppercase transition-colors"
      >
        {expanded ? 'HIDE SETS' : 'VIEW SETS'}
      </button>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-[#D7D3CF]">
          {loadingSaved ? (
            <div className="flex justify-center py-2">
              <Loader2 className="animate-spin text-[#102326]" size={16} />
            </div>
          ) : savedMCQs.length === 0 ? (
            <p className="text-[10px] font-mono text-[#666666] text-center">No saved sets</p>
          ) : (
            savedMCQs.map((qs) => (
              <div key={qs.id} className="p-2.5 bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111111]">{qs.question_count} Questions</p>
                  <p className="text-[9px] font-mono text-[#666666]">
                    {new Date(qs.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onStartQuiz(qs.questions)}
                  className="px-2.5 py-1 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-[10px] font-mono uppercase"
                >
                  PRACTICE
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MCQPractice;
