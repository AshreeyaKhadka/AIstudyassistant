import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LineChart, BookOpen, Brain, Target, Calendar, AlertTriangle,
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  Loader2, ChevronRight, Sparkles, FileText, BarChart3,
  RefreshCw, ArrowUpRight, Lightbulb, AlertCircle, Zap,
  BookMarked, GraduationCap, Timer, Flame, Trophy,
  ArrowRight, Star, Repeat, Eye, Award, PieChart
} from 'lucide-react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VALID_SECTIONS = ['overview', 'recommendations', 'summary', 'mistakes', 'weekly'];

const PRIORITY_STYLES = {
  high: 'bg-[#FFFDFB] border-[#C96A32] text-[#C96A32]',
  medium: 'bg-[#E8EEF2] border-[#7B97A8] text-[#24485B]',
  low: 'bg-[#F3F1ED] border-[#9B948C] text-[#5C554E]',
};

const TASK_TYPE_STYLES = {
  scheduled: 'bg-[#ECEAE7] text-[#102326]',
  recommended: 'bg-[#FFFDFB] text-[#C96A32]',
};

const ProgressTracker = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const requestedUploadId = Number(searchParams.get('upload_id')) || null;
  const activeSection = VALID_SECTIONS.includes(requestedSection) ? requestedSection : 'overview';

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [mistakes, setMistakes] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [coachSubject, setCoachSubject] = useState('');
  const [mistakeSubject, setMistakeSubject] = useState('');
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/progress/overview', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load progress data');
      const data = await res.json();
      setOverview(data);
      if (data.uploads?.length > 0) {
        const requestedOwnedUpload = data.uploads.find((upload) => upload.id === requestedUploadId);
        setSelectedUploadId((current) => requestedOwnedUpload?.id || current || data.uploads[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestedUploadId]);

  const chooseSection = (section) => {
    const next = new URLSearchParams(searchParams);
    if (section === 'overview') next.delete('section');
    else next.set('section', section);
    if (section !== 'summary') next.delete('upload_id');
    setSearchParams(next, { replace: true });
  };

  const chooseSummaryUpload = (uploadId) => {
    setSelectedUploadId(uploadId);
    const next = new URLSearchParams(searchParams);
    next.set('section', 'summary');
    next.set('upload_id', String(uploadId));
    setSearchParams(next, { replace: true });
  };

  const fetchSummary = useCallback(async (uploadId) => {
    if (!uploadId) return;
    try {
      setSummaryLoading(true);
      setSummary(null);
      const res = await fetch(`/api/progress/summary/${uploadId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to generate summary');
      setSummary(await res.json());
    } catch (err) {
      setSummary({ error: err.message });
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchMistakes = useCallback(async (subject) => {
    try {
      const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
      const res = await fetch(`/api/progress/mistakes${params}`, { credentials: 'include' });
      if (res.ok) setMistakes(await res.json());
    } catch (err) {
      console.error('Failed to fetch mistakes:', err);
    }
  }, []);

  const fetchRecommendations = useCallback(async (subject) => {
    try {
      const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
      const res = await fetch(`/api/progress/recommendations${params}`, { credentials: 'include' });
      if (res.ok) setRecommendations(await res.json());
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
  }, []);

  const fetchWeeklyPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/progress/weekly-plan', { credentials: 'include' });
      if (res.ok) setWeeklyPlan(await res.json());
    } catch (err) {
      console.error('Failed to fetch weekly plan:', err);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeSection === 'recommendations') fetchRecommendations(coachSubject);
  }, [activeSection, coachSubject, fetchRecommendations]);

  useEffect(() => {
    if (activeSection === 'mistakes') fetchMistakes(mistakeSubject);
  }, [activeSection, mistakeSubject, fetchMistakes]);

  useEffect(() => {
    if (activeSection === 'summary' && selectedUploadId) fetchSummary(selectedUploadId);
  }, [activeSection, selectedUploadId, fetchSummary]);

  useEffect(() => {
    if (activeSection === 'weekly') fetchWeeklyPlan();
  }, [activeSection, fetchWeeklyPlan]);

  const refreshCurrentSection = () => {
    fetchOverview();
    if (activeSection === 'recommendations') fetchRecommendations(coachSubject);
    if (activeSection === 'mistakes') fetchMistakes(mistakeSubject);
    if (activeSection === 'summary' && selectedUploadId) fetchSummary(selectedUploadId);
    if (activeSection === 'weekly') fetchWeeklyPlan();
  };

  const selectedUpload = overview?.uploads?.find(u => u.id === selectedUploadId);
  const stats = overview?.stats;
  const uploadSubjects = [...new Set(overview?.uploads?.filter(u => u.subject).map(u => u.subject))];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">REVISION PLANNER</div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Progress Tracker</h1>
          <p className="text-xs text-[#666666] mt-0.5">Your personalized study command center.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* HEADER */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#102326]"></span>
            REVISION PLANNER
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Progress Tracker</h1>
          <p className="text-xs text-[#666666] mt-0.5">Your personalized study command center. Track, plan, and conquer.</p>
        </div>
        <button
          onClick={refreshCurrentSection}
          className="px-4 py-2 bg-white border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <RefreshCw size={14} />
          <span>REFRESH</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#C96A32] flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={14} />{error}</span>
          <button onClick={() => setError('')} className="underline">Dismiss</button>
        </div>
      )}

      {/* STATS BAR */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#D7D3CF] bg-white rounded-[4px] divide-x divide-[#D7D3CF] overflow-hidden">
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOTAL PDFS</span>
            <span className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.total_uploads}</span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">QUIZZES TAKEN</span>
            <span className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.total_quizzes_taken}</span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">SYLLABUS COVERAGE</span>
            <span className="text-xl font-bold font-mono text-[#111111] mt-1">{stats.coverage_percent}%</span>
          </div>
          <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">WEAK TOPICS</span>
            <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{stats.weak_topics}</span>
          </div>
        </div>
      )}

      {/* SECTION TABS */}
      <div className="flex bg-[#ECEAE7] p-1 rounded-[4px] border border-[#D7D3CF] overflow-x-auto">
        {[
          { id: 'overview', label: 'STUDYING', icon: BookOpen },
          { id: 'recommendations', label: 'AI COACH', icon: Brain },
          { id: 'summary', label: 'SUMMARIES', icon: FileText },
          { id: 'mistakes', label: 'MISTAKE LEDGER', icon: Target },
          { id: 'weekly', label: 'WEEKLY PLAN', icon: Calendar },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => chooseSection(id)}
            className={`px-4 py-1.5 rounded-[2px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeSection === id ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            {React.createElement(icon, { size: 13 })}
            {label}
          </button>
        ))}
      </div>

      {/* SECTION: CURRENTLY STUDYING */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold flex items-center gap-2">
              <BookOpen size={14} className="text-[#102326]" />
              Currently Studying
            </h4>
            <span className="text-[10px] font-mono text-[#666666]">{overview?.uploads?.length || 0} materials</span>
          </div>

          {!overview?.uploads?.length ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <FileText size={32} className="text-[#666666] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#111111] mb-1">No Materials Yet</h3>
              <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto mb-4">Upload PDFs in the Study Vault to begin tracking your progress.</p>
              <button
                onClick={() => navigate('/dashboard/upload')}
                className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase"
              >
                GO TO STUDY VAULT
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.uploads.map((upload) => {
                const isSelected = selectedUploadId === upload.id;
                const coverage = upload.coverage_percent || 0;
                const mastery = upload.mastery_score || 0;
                return (
                  <button
                    key={upload.id}
                    onClick={() => setSelectedUploadId(upload.id)}
                    className={`bg-white rounded-[4px] border p-5 text-left transition-all shadow-2xs ${
                      isSelected
                        ? 'border-[#102326] ring-1 ring-[#102326]'
                        : 'border-[#D7D3CF] hover:bg-[#FAF9F7]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
                        <BookMarked size={18} />
                      </div>
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-[2px] uppercase ${
                        upload.validation_status === 'approved'
                          ? 'bg-[#DDEFE2] text-[#185C28]'
                          : upload.validation_status === 'rejected'
                            ? 'bg-[#FFFDFB] text-[#C96A32]'
                            : 'bg-[#F7F5F2] text-[#666666]'
                      }`}>
                        {upload.validation_status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#111111] truncate mb-2" title={upload.filename}>
                      {upload.filename}
                    </h4>
                    <div className="text-[10px] font-mono text-[#666666] mb-3">
                      {upload.subject || 'Unassigned'} &middot; {upload.topic_count || 0} topics
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-[#666666]">Coverage</span>
                          <span className="font-bold text-[#102326]">{coverage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#ECEAE7] rounded-none overflow-hidden">
                          <div className="bg-[#102326] h-full transition-all duration-500" style={{ width: `${coverage}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-[#666666]">Mastery</span>
                          <span className="font-bold text-[#C96A32]">{mastery}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#ECEAE7] rounded-none overflow-hidden">
                          <div className="bg-[#C96A32] h-full transition-all duration-500" style={{ width: `${mastery}%` }} />
                        </div>
                      </div>
                    </div>
                    {upload.weak_count > 0 && (
                      <div className="mt-3 flex items-center gap-1 text-[10px] font-mono text-[#C96A32]">
                        <AlertTriangle size={11} />
                        {upload.weak_count} weak topic{upload.weak_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SECTION: AI COACH */}
      {activeSection === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold flex items-center gap-2">
              <Brain size={14} className="text-[#102326]" />
              AI Study Coach
            </h4>
          </div>

          {uploadSubjects.length > 0 && (
            <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-2 block">SELECT SUBJECT</span>
              <select
                value={coachSubject}
                onChange={(e) => { setCoachSubject(e.target.value); setRecommendations(null); }}
                className="w-full bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              >
                <option value="">All Subjects</option>
                {uploadSubjects.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {!recommendations ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-[#D7D3CF]">
              <Loader2 size={24} className="animate-spin text-[#102326] mx-auto mb-3" />
              <p className="text-xs font-mono text-[#666666]">Analyzing your progress and generating coaching insights...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Performance Snapshot */}
              {recommendations.performance && (
                <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#D7D3CF] bg-white rounded-[4px] divide-x divide-[#D7D3CF] overflow-hidden">
                  <div className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">ACCURACY</span>
                    <span className={`text-xl font-bold font-mono mt-1 ${recommendations.performance.accuracy >= 70 ? 'text-[#102326]' : recommendations.performance.accuracy >= 50 ? 'text-[#C96A32]' : 'text-[#C96A32]'}`}>
                      {recommendations.performance.accuracy}%
                    </span>
                  </div>
                  <div className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">QUIZZES TAKEN</span>
                    <span className="text-xl font-bold font-mono text-[#111111] mt-1">{recommendations.stats?.total_quizzes || 0}</span>
                  </div>
                  <div className="p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOPICS COVERED</span>
                    <span className="text-xl font-bold font-mono text-[#111111] mt-1">{recommendations.stats?.topics_covered || 0}/{recommendations.stats?.total_topics || 0}</span>
                  </div>
                  <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">WEAK SPOTS</span>
                    <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{recommendations.stats?.weak_count || 0}</span>
                  </div>
                </div>
              )}

              {/* AI Coaching Summary */}
              {recommendations.coaching?.coaching_summary && (
                <div className="bg-[#102326] text-white rounded-[4px] p-6 border border-[#102326]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#C96A32] text-white rounded-[4px] flex items-center justify-center">
                      <Brain size={18} />
                    </div>
                    <h5 className="text-xs font-mono font-semibold uppercase tracking-wider">YOUR PERSONAL COACH</h5>
                  </div>
                  <p className="text-sm text-[#D6E0DE] leading-relaxed">{recommendations.coaching.coaching_summary}</p>
                  {recommendations.coaching.daily_goal && (
                    <div className="mt-4 p-3 bg-white/10 rounded-[4px] border border-white/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={12} className="text-[#C96A32]" />
                        <span className="text-[10px] font-mono font-semibold uppercase text-[#C96A32]">TODAY'S GOAL</span>
                      </div>
                      <p className="text-xs text-white">{recommendations.coaching.daily_goal}</p>
                    </div>
                  )}
                  {recommendations.coaching.motivation && (
                    <p className="mt-3 text-[11px] text-[#A0B0B3] italic">"{recommendations.coaching.motivation}"</p>
                  )}
                </div>
              )}

              {/* Study Strategy */}
              {recommendations.coaching?.study_strategy && (
                <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                  <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[#102326]" />
                    {recommendations.coaching.study_strategy.title}
                  </h6>
                  <div className="space-y-2">
                    {recommendations.coaching.study_strategy.steps?.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#FAF9F7] rounded-[4px] border border-[#D7D3CF]">
                        <span className="w-6 h-6 bg-[#102326] text-white rounded-[4px] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs text-[#111111] leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Management & Study Techniques side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.coaching?.time_management && (
                  <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                    <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                      <Timer size={12} className="text-[#C96A32]" />
                      {recommendations.coaching.time_management.title}
                    </h6>
                    <div className="space-y-2">
                      {recommendations.coaching.time_management.tips?.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 size={14} className="text-[#102326] mt-0.5 shrink-0" />
                          <span className="text-xs text-[#444444] leading-relaxed">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recommendations.coaching?.study_techniques?.length > 0 && (
                  <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                    <h6 className="text-xs font-mono uppercase tracking-[0.18em] text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[#C96A32]" />
                      STUDY TECHNIQUES
                    </h6>
                    <div className="space-y-2">
                      {recommendations.coaching.study_techniques.map((tech, i) => (
                        <div key={i} className="p-3 bg-[#FAF9F7] rounded-[4px] border border-[#D7D3CF]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#102326] leading-tight">{tech.name}</span>
                            {tech.best_for && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#ECEAE7] text-[#666666] rounded-[2px] leading-none">{tech.best_for}</span>
                            )}
                          </div>
                          <p className="text-xs text-[#444444] leading-relaxed">{tech.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Focus Areas */}
              {recommendations.coaching?.focus_areas?.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                  <h6 className="text-xs font-mono uppercase tracking-[0.18em] text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                    <Target size={13} className="text-[#C96A32]" />
                    PRIORITY FOCUS AREAS
                  </h6>
                  <div className="space-y-2">
                    {recommendations.coaching.focus_areas.map((area, i) => (
                      <div key={i} className={`p-3 rounded-[4px] border ${
                        area.priority === 'high' ? 'bg-[#FFFDFB] border-[#C96A32]' :
                        area.priority === 'medium' ? 'bg-[#FAF9F7] border-[#D7D3CF]' :
                        'bg-white border-[#D7D3CF]'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#111111] leading-tight">{area.topic}</span>
                          <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-[2px] ${
                            area.priority === 'high' ? 'bg-[#C96A32] text-white' :
                            area.priority === 'medium' ? 'bg-[#ECEAE7] text-[#102326]' :
                            'bg-[#F7F5F2] text-[#666666]'
                          }`}>
                            {area.priority}
                          </span>
                        </div>
                        <p className="text-xs text-[#555555] leading-relaxed mb-1">{area.reason}</p>
                        {area.suggested_action && (
                          <p className="text-xs font-mono text-[#102326] font-semibold leading-relaxed">{area.suggested_action}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Alerts */}
              {recommendations.recommendations?.map((rec, idx) => (
                <div key={idx} className={`bg-white rounded-[4px] border border-[#D7D3CF] p-4 ${
                  rec.type === 'urgent' ? 'border-l-4 border-l-[#C96A32]' :
                  rec.type === 'weak_spot' ? 'border-l-4 border-l-[#C96A32]' :
                  rec.type === 'on_track' ? 'border-l-4 border-l-[#102326]' :
                  ''
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center shrink-0 ${
                      rec.type === 'urgent' ? 'bg-[#FFFDFB] text-[#C96A32]' :
                      rec.type === 'weak_spot' ? 'bg-[#FFFDFB] text-[#C96A32]' :
                      rec.type === 'on_track' ? 'bg-[#ECEAE7] text-[#102326]' :
                      'bg-[#E8EEF2] text-[#24485B]'
                    }`}>
                      {rec.type === 'urgent' ? <AlertTriangle size={16} /> :
                       rec.type === 'weak_spot' ? <TrendingDown size={16} /> :
                       rec.type === 'on_track' ? <CheckCircle2 size={16} /> :
                       <Lightbulb size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-[#111111]">{rec.title}</h5>
                      <p className="text-[10px] text-[#666666]">{rec.description}</p>
                    </div>
                    {rec.topics?.length > 0 && (
                      <span className="text-[9px] font-mono text-[#666666] shrink-0">{rec.topics.length} topics</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Prerequisite Context Box for Selected PDF */}
              {selectedUpload && (
                <div className="bg-[#102326] text-white rounded-[4px] p-5 border border-[#102326]">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={16} className="text-[#C96A32]" />
                    <h5 className="text-xs font-mono font-semibold uppercase tracking-wider">Prerequisite Context</h5>
                  </div>
                  <p className="text-xs text-[#A0B0B3] mb-2">
                    Before studying <span className="text-white font-bold">{selectedUpload.filename}</span>, ensure you are familiar with:
                  </p>
                  <div className="space-y-2">
                    {selectedUpload.subject && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-[#6FCF97] mt-0.5 shrink-0" />
                        <span className="text-xs text-[#D6E0DE]">Fundamentals of <span className="text-white font-semibold">{selectedUpload.subject}</span></span>
                      </div>
                    )}
                    {selectedUpload.coverage_percent < 50 && (
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-[#C96A32] mt-0.5 shrink-0" />
                        <span className="text-xs text-[#D6E0DE]">Low coverage ({selectedUpload.coverage_percent}%) - review basics first</span>
                      </div>
                    )}
                    {selectedUpload.weak_count > 0 && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-[#C96A32] mt-0.5 shrink-0" />
                        <span className="text-xs text-[#D6E0DE]">{selectedUpload.weak_count} weak topic{selectedUpload.weak_count !== 1 ? 's' : ''} need reinforcement before advancing</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Zap size={14} className="text-[#6FCF97] mt-0.5 shrink-0" />
                      <span className="text-xs text-[#D6E0DE]">Active recall through MCQs recommended after reading</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION: SMART SUMMARIES */}
      {activeSection === 'summary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold flex items-center gap-2">
              <FileText size={14} className="text-[#102326]" />
              Smart Summaries
            </h4>
          </div>

          {!overview?.uploads?.length ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <FileText size={32} className="text-[#666666] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#111111] mb-1">No Materials to Summarize</h3>
              <p className="text-xs font-mono text-[#666666]">Upload PDFs first to generate AI-powered summaries.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-2 block">SELECT DOCUMENT</span>
                <select
                  value={selectedUploadId || ''}
                  onChange={(e) => chooseSummaryUpload(Number(e.target.value))}
                  className="w-full bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                >
                  {overview.uploads.map(u => (
                    <option key={u.id} value={u.id}>{u.filename} ({u.subject || 'Unassigned'})</option>
                  ))}
                </select>
              </div>

              {summaryLoading ? (
                <div className="py-12 text-center bg-white rounded-[4px] border border-[#D7D3CF]">
                  <Loader2 size={24} className="animate-spin text-[#102326] mx-auto mb-3" />
                  <p className="text-xs font-mono text-[#666666]">Generating AI summary...</p>
                </div>
              ) : summary?.error ? (
                <div className="py-8 text-center bg-white rounded-[4px] border border-[#D7D3CF]">
                  <AlertCircle size={24} className="text-[#C96A32] mx-auto mb-2" />
                  <p className="text-xs font-mono text-[#666666]">{summary.error}</p>
                </div>
              ) : summary ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-[#111111]">{summary.filename}</h5>
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-[2px] uppercase ${
                        summary.difficulty_level === 'advanced' ? 'bg-[#FFFDFB] text-[#C96A32]' :
                        summary.difficulty_level === 'beginner' ? 'bg-[#DDEFE2] text-[#185C28]' :
                        'bg-[#E8EEF2] text-[#24485B]'
                      }`}>
                        {summary.difficulty_level}
                      </span>
                    </div>
                    <p className="text-xs text-[#444444] leading-relaxed">{summary.summary}</p>
                    <div className="flex items-center gap-4 mt-3 text-[10px] font-mono text-[#666666]">
                      <span className="flex items-center gap-1"><Clock size={11} /> ~{summary.estimated_study_hours}h study time</span>
                      <span className="flex items-center gap-1"><BookOpen size={11} /> {summary.subject || 'General'}</span>
                    </div>
                  </div>

                  {summary.key_takeaways?.length > 0 && (
                    <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                      <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-[#C96A32]" />
                        KEY TAKEAWAYS
                      </h6>
                      <div className="space-y-2">
                        {summary.key_takeaways.map((tk, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-[#102326] mt-0.5 shrink-0" />
                            <span className="text-xs text-[#111111] leading-relaxed">{tk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.paragraphs?.length > 0 && (
                    <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                      <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                        <FileText size={12} className="text-[#102326]" />
                        DETAILED SUMMARY BY PAGE
                      </h6>
                      <div className="space-y-3">
                        {summary.paragraphs.map((para, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-[#FAF9F7] rounded-[4px] border border-[#D7D3CF]">
                            {para.page_number > 0 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#ECEAE7] text-[#102326] rounded-[2px] shrink-0 mt-0.5">
                                Pg {para.page_number}
                              </span>
                            )}
                            <p className="text-xs text-[#444444] leading-relaxed">{para.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.prerequisites?.length > 0 && (
                    <div className="bg-[#FFFDFB] rounded-[4px] border border-[#D7D3CF] p-5">
                      <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold mb-3 flex items-center gap-1.5">
                        <AlertTriangle size={12} />
                        PREREQUISITE KNOWLEDGE
                      </h6>
                      <div className="space-y-2">
                        {summary.prerequisites.map((prereq, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-[#C96A32] text-white rounded-[2px] text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-xs text-[#111111]">{prereq}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* SECTION: MCQ MISTAKE LEDGER */}
      {activeSection === 'mistakes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold flex items-center gap-2">
              <Target size={14} className="text-[#102326]" />
              MCQ Mistake Ledger & Analysis
            </h4>
          </div>

          {uploadSubjects.length > 0 && (
            <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-2 block">SELECT SUBJECT</span>
              <select
                value={mistakeSubject}
                onChange={(e) => { setMistakeSubject(e.target.value); setMistakes(null); }}
                className="w-full bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
              >
                <option value="">All Subjects</option>
                {uploadSubjects.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {!mistakes ? (
            <div className="py-8 text-center bg-white rounded-[4px] border border-[#D7D3CF]">
              <Loader2 size={20} className="animate-spin text-[#102326] mx-auto" />
            </div>
          ) : mistakes.total_mistakes === 0 ? (
            <div className="py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <Target size={32} className="text-[#666666] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#111111] mb-1">No Mistakes Recorded</h3>
              <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">Complete MCQ quizzes to start tracking your mistake patterns.</p>
              <button
                onClick={() => navigate('/dashboard/mcq')}
                className="mt-4 px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase"
              >
                PRACTICE MCQS
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mistake Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#D7D3CF] bg-white rounded-[4px] divide-x divide-[#D7D3CF] overflow-hidden">
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOTAL ATTEMPTED</span>
                  <span className="text-xl font-bold font-mono text-[#111111] mt-1">{mistakes.total_attempted}</span>
                </div>
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">CORRECT</span>
                  <span className="text-xl font-bold font-mono text-[#102326] mt-1">{mistakes.total_correct}</span>
                </div>
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">INCORRECT</span>
                  <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{mistakes.total_incorrect}</span>
                </div>
                <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">ACCURACY</span>
                  <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{mistakes.accuracy_percent}%</span>
                </div>
              </div>

              {/* Weak Areas */}
              {mistakes.weak_areas?.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                  <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                    <BarChart3 size={12} className="text-[#C96A32]" />
                    WEAK AREAS BY DOCUMENT
                  </h6>
                  <div className="space-y-3">
                    {mistakes.weak_areas.map((area, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-[#FAF9F7] rounded-[4px] border border-[#D7D3CF]">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#111111] truncate">{area.topic}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-[#666666]">
                            <span>{area.total_errors} errors</span>
                            <span className="text-[#C96A32]">Easy: {area.easy}</span>
                            <span className="text-[#C96A32]">Med: {area.medium}</span>
                            <span className="text-[#C96A32]">Hard: {area.hard}</span>
                          </div>
                        </div>
                        <div className="w-16 h-1.5 bg-[#ECEAE7] rounded-none overflow-hidden shrink-0">
                          <div
                            className="bg-[#C96A32] h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (area.total_errors / Math.max(mistakes.total_incorrect, 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Mistakes Log */}
              {mistakes.recent_mistakes?.length > 0 && (
                <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
                  <h6 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-3 flex items-center gap-1.5">
                    <XCircle size={12} className="text-[#C96A32]" />
                    RECENT INCORRECT ANSWERS
                  </h6>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {mistakes.recent_mistakes.map((m, i) => (
                      <div key={i} className="p-3 bg-[#FAF9F7] rounded-[4px] border border-[#D7D3CF]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-[#111111] leading-relaxed line-clamp-2 flex-1">{m.question}</p>
                          {m.page_number > 0 && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-[#ECEAE7] text-[#102326] rounded-[2px] shrink-0">
                              Pg {m.page_number}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
                          <span className="text-[#102326] font-semibold">Correct: {m.correct_answer}</span>
                          <span className={`px-1.5 py-0.5 rounded-[2px] ${
                            m.difficulty === 'hard' ? 'bg-[#FFFDFB] text-[#C96A32]' :
                            m.difficulty === 'easy' ? 'bg-[#DDEFE2] text-[#185C28]' :
                            'bg-[#E8EEF2] text-[#24485B]'
                          }`}>
                            {m.difficulty}
                          </span>
                          <span className="text-[#666666]">{m.topic?.substring(0, 20)}</span>
                        </div>
                        {m.explanation && (
                          <p className="text-[10px] text-[#666666] mt-2 leading-relaxed italic">{m.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION: WEEKLY REVISION PLAN */}
      {activeSection === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold flex items-center gap-2">
              <Calendar size={14} className="text-[#102326]" />
              Your Study Planner Week
            </h4>
            <button
              onClick={() => navigate('/dashboard/revision')}
              className="text-[10px] font-mono text-[#102326] font-semibold uppercase inline-flex items-center gap-1 hover:underline"
            >
              FULL CALENDAR <ArrowUpRight size={11} />
            </button>
          </div>

          {!weeklyPlan ? (
            <div className="py-8 text-center bg-white rounded-[4px] border border-[#D7D3CF]">
              <Loader2 size={20} className="animate-spin text-[#102326] mx-auto" />
            </div>
          ) : (
            <>
              {weeklyPlan.stats?.topics_scheduled === 0 && (
                <div className="bg-white border border-dashed border-[#BDB8B2] rounded-[4px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-[#111111]">No sessions scheduled for the next seven days</h5>
                    <p className="mt-1 text-[10px] font-mono text-[#666666]">Choose the documents you want to study, then build your week in Study Planner.</p>
                  </div>
                  <button onClick={() => navigate('/dashboard/revision')} className="px-3 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase inline-flex items-center justify-center gap-1.5 shrink-0">
                    <Calendar size={13} /> Build My Week
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#D7D3CF] bg-white rounded-[4px] divide-x divide-[#D7D3CF] overflow-hidden">
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">NEXT 7 DAYS</span>
                  <span className="text-xl font-bold font-mono text-[#102326] mt-1">{weeklyPlan.stats?.topics_scheduled || 0}</span>
                </div>
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">WEAK TOPICS</span>
                  <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{weeklyPlan.stats?.total_weak || 0}</span>
                </div>
                <div className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">UNSCHEDULED DUE</span>
                  <span className="text-xl font-bold font-mono text-[#111111] mt-1">{weeklyPlan.stats?.total_needs_revision || 0}</span>
                </div>
                <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">UNCOVERED</span>
                  <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{weeklyPlan.stats?.total_uncovered || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {weeklyPlan.weekly_plan?.map((day, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-[4px] border p-4 space-y-3 ${
                      day.is_today
                        ? 'border-[#102326] ring-1 ring-[#102326]'
                        : day.is_weekend
                          ? 'border-[#D7D3CF] bg-[#FAF9F7]'
                          : 'border-[#D7D3CF]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-mono font-bold ${day.is_today ? 'text-[#102326]' : 'text-[#111111]'}`}>
                          {day.day}
                        </span>
                        <span className="block text-[10px] font-mono text-[#666666]">{day.date}</span>
                      </div>
                      {day.is_today && (
                        <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 bg-[#102326] text-white rounded-[2px]">
                          TODAY
                        </span>
                      )}
                    </div>

                    {day.tasks.length === 0 ? (
                      <div className="py-3 text-center border border-dashed border-[#D7D3CF] rounded-[4px]">
                        <span className="text-[10px] font-mono text-[#999999]">Free day</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {day.tasks.map((task, ti) => (
                          <div
                            key={ti}
                            className={`p-2 rounded-[4px] border text-left w-full ${
                              task.type === 'recommended'
                                ? 'bg-[#FFFDFB] border-[#C96A32]'
                                : 'bg-[#ECEAE7] border-[#D7D3CF]'
                            }`}
                          >
                            <p className="text-[10px] font-mono font-bold text-[#111111] leading-tight line-clamp-2">{task.title}</p>
                            {task.start_time && (
                              <span className="mt-1 block font-mono text-[9px] text-[#666666]">
                                {task.start_time}{task.end_time ? ` - ${task.end_time}` : ''}
                              </span>
                            )}
                            {task.filename ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    study_mode: 'document',
                                    upload_id: String(task.upload_id),
                                    filename: task.filename,
                                  });
                                  if (task.subject) params.set('subject', task.subject);
                                  navigate(`/dashboard/chat?${params.toString()}`);
                                }}
                                className="mt-1 block max-w-full truncate text-left font-mono text-[9px] text-[#24485B] underline"
                                title={`Study from ${task.filename}`}
                              >
                                {task.filename}
                              </button>
                            ) : task.source_type === 'uncovered_syllabus' ? (
                              <span className="mt-1 block font-mono text-[9px] text-[#666666]">Uncovered syllabus topic</span>
                            ) : null}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[8px] font-mono uppercase px-1 py-0.5 rounded-[1px] font-semibold ${
                                PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                              }`}>
                                {task.priority}
                              </span>
                              {task.mastery != null && (
                                <span className="text-[9px] font-mono text-[#666666]">{Math.round(task.mastery)}%</span>
                              )}
                              {task.warning && <span className="text-[8px] font-mono font-semibold uppercase text-[#C96A32]">Warning</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
