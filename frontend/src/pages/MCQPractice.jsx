import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Library, Sparkles, Loader2, ChevronLeft, CheckCircle2,
  XCircle, FileText, AlertCircle, Trophy, Bookmark, Clock, Search,
  RotateCcw, ArrowRight, BookOpen, Check, HelpCircle
} from 'lucide-react';

const MCQPractice = () => {
  const navigate = useNavigate();

  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [currentQuizSetId, setCurrentQuizSetId] = useState(null);

  const [mcqs, setMcqs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [quizMode, setQuizMode] = useState(false); // false | true | 'summary'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [limitError, setLimitError] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);

  const [savedMCQs, setSavedMCQs] = useState({});
  const [loadingSaved, setLoadingSaved] = useState({});
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'saved'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/upload/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUploads(data.filter((upload) =>
          upload.admission_status === 'admitted' &&
          upload.processing_status === 'ready' &&
          upload.embedding_status === 'embedded' &&
          ['approved', 'needs_review'].includes(upload.validation_status)
        ));
      }
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedMCQs = async (uploadId) => {
    setLoadingSaved(prev => ({ ...prev, [uploadId]: true }));
    try {
      const res = await fetch(`/api/generate/saved-mcqs/${uploadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSavedMCQs(prev => ({ ...prev, [uploadId]: data.saved_sets || [] }));
      }
    } catch (err) {
      console.error('Failed to fetch saved MCQs:', err);
    } finally {
      setLoadingSaved(prev => ({ ...prev, [uploadId]: false }));
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
        setCurrentQuizSetId(data.quiz_set_id);
        setQuizMode(true);
        setCurrentIndex(0);
        setAnswers({});
        setShowResult(false);
        fetchUploads();
      } else {
        setLimitError(data.error || 'Failed to generate MCQs.');
      }
    } catch (err) {
      console.error('Generate failed:', err);
      setLimitError('Network error while generating MCQs.');
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

  const handleFinishQuiz = async () => {
    if (currentQuizSetId) {
      setSubmittingScore(true);
      try {
        await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            quiz_set_id: currentQuizSetId,
            answers
          })
        });
      } catch (err) {
        console.error('Failed to submit score:', err);
      } finally {
        setSubmittingScore(false);
      }
    }
    setQuizMode('summary');
  };

  const startSavedQuiz = (questions, quizSetId = null) => {
    setMcqs(questions);
    setCurrentQuizSetId(quizSetId);
    setQuizMode(true);
    setCurrentIndex(0);
    setAnswers({});
    setShowResult(false);
    setActiveTab('generate');
  };

  // Filter materials
  const subjectsList = ['ALL', ...Array.from(new Set(uploads.map(u => u.subject).filter(Boolean)))];

  const filteredUploads = uploads.filter(u => {
    const matchesSearch = u.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.subject && u.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubjectFilter === 'ALL' || u.subject?.toLowerCase() === selectedSubjectFilter.toLowerCase();
    return matchesSearch && matchesSubject;
  });

  // Calculate aggregated stats
  const totalGenerationsCount = uploads.reduce((acc, u) => acc + (u.mcq_generation_count || 0), 0);

  // 1. ACTIVE QUIZ SESSION MODE
  if (quizMode === true && mcqs.length > 0) {
    const q = mcqs[currentIndex];
    const isAnswered = answers[currentIndex] !== undefined;
    const isLast = currentIndex === mcqs.length - 1;

    return (
      <div className="flex flex-col gap-6 pb-12 max-w-3xl mx-auto">
        {/* Session Header */}
        <div className="bg-white p-5 border border-[#D7D3CF] rounded-[4px] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setQuizMode(false); setMcqs([]); }}
              className="p-1.5 bg-[#F7F5F2] border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors"
              title="Exit Quiz"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#111111]">MCQ Drill Session</h2>
              <p className="text-xs font-mono text-[#666666]">Question {currentIndex + 1} of {mcqs.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32 bg-[#ECEAE7] rounded-full h-2 overflow-hidden hidden sm:block border border-[#D7D3CF]">
              <div
                className="bg-[#102326] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / mcqs.length) * 100}%` }}
              ></div>
            </div>
            <span className="font-mono text-xs text-[#102326] font-bold">
              {Math.round(((currentIndex + 1) / mcqs.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] space-y-6 shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#102326] font-semibold bg-[#ECEAE7] px-2.5 py-1 rounded-[2px]">
                QUESTION {currentIndex + 1} OF {mcqs.length}
              </span>
              <span className="text-[10px] font-mono text-[#666666]">
                {Object.keys(answers).length} / {mcqs.length} Answered
              </span>
            </div>

            <h3 className="text-base font-bold text-[#111111] leading-relaxed">
              {q.question}
            </h3>
            <p className="text-[10px] font-mono text-[#666666]">
              {q.topic_title || 'General'}{q.page_number ? ` · Source page ${q.page_number}` : ''}{q.difficulty ? ` · ${q.difficulty}` : ''}
            </p>

            {/* MCQ Options Grid */}
            <div className="space-y-2.5 pt-2">
              {Object.entries(q.options || {}).map(([key, val]) => {
                const isSelected = answers[currentIndex] === key;
                const isCorrect = key === q.correct;
                let colorClass = "bg-white border-[#D7D3CF] text-[#111111] hover:border-[#102326] hover:bg-[#FAF9F7]";

                if (showResult) {
                  if (isCorrect) colorClass = "bg-[#ECEAE7] border-[#102326] text-[#102326] font-bold shadow-xs";
                  else if (isSelected) colorClass = "bg-[#FFFDFB] border-[#C96A32] text-[#C96A32]";
                  else colorClass = "bg-white border-[#D7D3CF] opacity-40";
                } else if (isSelected) {
                  colorClass = "bg-[#102326] text-white border-[#102326] font-medium";
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectOption(key)}
                    disabled={showResult}
                    className={`w-full text-left p-3.5 rounded-[4px] border transition-all flex items-center justify-between text-xs font-mono ${colorClass}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-[2px] border text-[10px] flex items-center justify-center font-bold ${
                        isSelected && !showResult ? 'border-white text-white' : 'border-[#D7D3CF] text-[#666666]'
                      }`}>
                        {key}
                      </span>
                      <span>{val}</span>
                    </span>
                    {showResult && isCorrect && <CheckCircle2 className="text-[#102326] shrink-0" size={16} />}
                    {showResult && isSelected && !isCorrect && <XCircle className="text-[#C96A32] shrink-0" size={16} />}
                  </button>
                );
              })}
            </div>

            {/* Explanation Section */}
            {showResult && q.explanation && (
              <div className="p-4 bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#C96A32] font-bold tracking-wider flex items-center gap-1">
                  <HelpCircle size={12} />
                  EXPLANATION & REASONING
                </span>
                <p className="text-xs text-[#111111] leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>

          {/* Question Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-[#D7D3CF]">
            <button
              onClick={() => { setCurrentIndex(i => Math.max(0, i - 1)); setShowResult(false); }}
              disabled={currentIndex === 0}
              className="px-3.5 py-1.5 border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono uppercase disabled:opacity-30 transition-colors"
            >
              PREVIOUS
            </button>

            {!showResult ? (
              <button
                onClick={() => setShowResult(true)}
                disabled={!isAnswered}
                className="px-5 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <span>CHECK ANSWER</span>
                <Check size={14} />
              </button>
            ) : (
              !isLast ? (
                <button
                  onClick={() => { setCurrentIndex(i => i + 1); setShowResult(false); }}
                  className="px-5 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors inline-flex items-center gap-1.5"
                >
                  <span>NEXT QUESTION</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleFinishQuiz}
                  disabled={submittingScore}
                  className="px-5 py-2 bg-[#C96A32] text-white hover:bg-[#a85222] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors inline-flex items-center gap-1.5"
                >
                  {submittingScore ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                  <span>VIEW SUMMARY</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. QUIZ SUMMARY RESULT SCREEN
  if (quizMode === 'summary') {
    const score = calculateScore();
    const percentage = Math.round((score / mcqs.length) * 100);

    return (
      <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center gap-6 py-12">
        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-8 w-full space-y-5 shadow-lg">
          <div className="w-16 h-16 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center mx-auto">
            <Trophy size={32} />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase text-[#666666] font-semibold tracking-wider">PRACTICE DRILL COMPLETE</span>
            <h2 className="text-4xl font-mono font-bold text-[#111111] mt-1">{percentage}% SCORE</h2>
            <p className="text-xs text-[#666666] mt-1.5">
              Answered <span className="font-bold text-[#111111]">{score}</span> out of <span className="font-bold text-[#111111]">{mcqs.length}</span> questions correctly.
            </p>
          </div>

          <div className="p-3 bg-[#F7F5F2] border border-[#D7D3CF] rounded-[4px] text-left text-xs font-mono space-y-1">
            <div className="flex justify-between text-[#666666]">
              <span>Correct Answers:</span>
              <span className="font-bold text-[#102326]">{score}</span>
            </div>
            <div className="flex justify-between text-[#666666]">
              <span>Incorrect Answers:</span>
              <span className="font-bold text-[#C96A32]">{mcqs.length - score}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#D7D3CF]">
            <button
              onClick={() => { setQuizMode(true); setCurrentIndex(0); setAnswers({}); setShowResult(false); }}
              className="flex-1 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>RETRY</span>
            </button>
            <button
              onClick={() => { setQuizMode(false); setMcqs([]); }}
              className="flex-1 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors"
            >
              FINISH DRILL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. MAIN MCQ PRACTICE DASHBOARD
  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header Card */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#102326]"></span>
            TARGETED AI-GENERATED QUIZ DRILLS
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">MCQ Strategist</h1>
          <p className="text-xs text-[#666666] mt-0.5 max-w-xl">
            Test your understanding with automated multiple-choice questions extracted directly from your course syllabus PDFs.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/upload')}
          className="px-4 py-2 bg-white border border-[#102326] text-[#102326] hover:bg-[#102326] hover:text-white rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <BookOpen size={15} />
          <span>STUDY VAULT</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#D7D3CF] bg-white rounded-[4px] divide-y sm:divide-y-0 sm:divide-x divide-[#D7D3CF] overflow-hidden shadow-2xs">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">AVAILABLE SOURCE PDFS</span>
          <span className="text-xl font-bold font-mono text-[#111111] mt-1">{uploads.length} Materials</span>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOTAL MCQ SETS CREATED</span>
          <span className="text-xl font-bold font-mono text-[#111111] mt-1">{totalGenerationsCount} Quiz Sets</span>
        </div>
        <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">PRACTICE LIMIT PER PDF</span>
          <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">2 Sets / PDF</span>
        </div>
      </div>

      {limitError && (
        <div className="p-3 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#C96A32] flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{limitError}</span>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#D7D3CF] rounded-[4px]">
        {/* Tabs */}
        <div className="flex bg-[#ECEAE7] p-1 rounded-[4px] border border-[#D7D3CF]">
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
            SAVED MCQ DRILLS
          </button>
        </div>

        {/* Search & Subject Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="bg-[#F7F5F2] border border-[#D7D3CF] text-xs font-mono px-2.5 py-1.5 rounded-[4px] text-[#111111] outline-none"
          >
            {subjectsList.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Subjects' : s}</option>
            ))}
          </select>

          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter materials..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] text-xs font-mono text-[#111111] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">Select Source Material</h4>
            <span className="text-[10px] font-mono text-[#666666]">{filteredUploads.length} files matched</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
              ))}
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8 space-y-3">
              <FileText size={36} className="text-[#666666] mx-auto" />
              <h3 className="text-sm font-bold text-[#111111]">No matching PDF materials</h3>
              <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">Upload course notes in Study Vault to generate instant MCQ practice sets.</p>
              <button
                onClick={() => navigate('/dashboard/upload')}
                className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase"
              >
                GO TO STUDY VAULT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUploads.map((upload) => {
                const genCount = upload.mcq_generation_count || 0;
                const limitReached = genCount >= 2;
                return (
                  <div
                    key={upload.id}
                    className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] flex flex-col justify-between hover:bg-[#FAF9F7] transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
                          <Library size={18} />
                        </div>
                        <span className="text-[9px] font-mono font-semibold text-[#666666] bg-[#F7F5F2] border border-[#D7D3CF] px-2 py-0.5 rounded-[2px] uppercase">
                          {upload.subject || 'GENERAL'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-[#111111] truncate" title={upload.filename}>
                        {upload.filename}
                      </h4>
                      <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-[#666666]">
                        <span>Quota Used:</span>
                        <span className="font-bold text-[#102326]">{genCount}/2 Sets</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleGenerate(upload.id)}
                      disabled={generating || limitReached}
                      className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
                        limitReached
                          ? 'bg-[#ECEAE7] text-[#666666] cursor-not-allowed border border-[#D7D3CF]'
                          : generating && selectedUpload === upload.id
                            ? 'bg-[#ECEAE7] text-[#111111] border border-[#D7D3CF]'
                            : 'bg-[#102326] text-white hover:bg-[#0b191c]'
                      }`}
                    >
                      {limitReached ? (
                        'LIMIT REACHED (2/2)'
                      ) : generating && selectedUpload === upload.id ? (
                        <><Loader2 className="animate-spin" size={14} /> GENERATING MCQS...</>
                      ) : (
                        <><Target size={14} /> INITIATE MCQ TEST</>
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
            {filteredUploads.map((upload) => (
              <SavedMCQCard
                key={upload.id}
                upload={upload}
                fetchSavedMCQs={fetchSavedMCQs}
                savedMCQs={savedMCQs[upload.id] || []}
                loadingSaved={loadingSaved[upload.id]}
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

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchSavedMCQs(upload.id);
  };

  return (
    <div className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] space-y-3 shadow-2xs">
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
          <Bookmark size={18} />
        </div>
        <span className="text-[9px] font-mono text-[#666666] bg-[#F7F5F2] border border-[#D7D3CF] px-2 py-0.5 rounded-[2px] uppercase">
          {upload.subject || 'GENERAL'}
        </span>
      </div>

      <h4 className="text-xs font-bold text-[#111111] truncate" title={upload.filename}>
        {upload.filename}
      </h4>

      <button
        onClick={toggleExpanded}
        className="w-full py-1.5 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors"
      >
        {expanded ? 'HIDE SAVED SETS' : `VIEW SETS (${genCount})`}
      </button>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-[#D7D3CF]">
          {loadingSaved ? (
            <div className="flex justify-center py-2">
              <Loader2 className="animate-spin text-[#102326]" size={16} />
            </div>
          ) : savedMCQs.length === 0 ? (
            <p className="text-[10px] font-mono text-[#666666] text-center py-2">No saved sets for this document</p>
          ) : (
            savedMCQs.map((qs) => (
              <div key={qs.id} className="p-3 bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[#111111]">{qs.question_count} Questions</p>
                  <p className="text-[9px] font-mono text-[#666666]">
                    {qs.created_at ? new Date(qs.created_at).toLocaleDateString() : 'Saved'} • {qs.score !== null ? `Score: ${qs.score}/${qs.question_count}` : 'Unattempted'}
                  </p>
                </div>
                <button
                  onClick={() => onStartQuiz(qs.questions, qs.id)}
                  className="px-3 py-1.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-[10px] font-mono uppercase font-semibold shrink-0"
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
