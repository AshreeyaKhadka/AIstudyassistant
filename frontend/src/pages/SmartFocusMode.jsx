import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Target } from 'lucide-react';

import PomodoroTimer from '../components/focus/PomodoroTimer';
import StudyHistory from '../components/focus/StudyHistory';
import FocusAnalytics from '../components/focus/FocusAnalytics';
import StudyRecommendations from '../components/focus/StudyRecommendations';

const SmartFocusMode = () => {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [error, setError] = useState('');
  const [coachPrompt, setCoachPrompt] = useState('');
  const [coachReply, setCoachReply] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState('');
  
  const [dbSubjects, setDbSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    fetchSubjects();
    fetchFocusData();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/syllabus/subjects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDbSubjects(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFocusData = async () => {
    setLoading(true);
    setRecommendationsLoading(true);
    setError('');
    try {
      const [histRes, statRes, recRes] = await Promise.all([
        fetch('/api/focus/sessions', { credentials: 'include' }),
        fetch('/api/focus/analytics', { credentials: 'include' }),
        fetch('/api/focus/recommendations', { credentials: 'include' })
      ]);

      if (!histRes.ok || !statRes.ok || !recRes.ok) {
        throw new Error('Failed to load focus data');
      }
      
      if (histRes.ok) setSessions(await histRes.json());
      if (statRes.ok) setAnalytics(await statRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load focus mode');
    } finally {
      setLoading(false);
      setRecommendationsLoading(false);
    }
  };

  const handleSessionComplete = async (sessionData) => {
    try {
      const payload = {
        ...sessionData,
        subject: selectedSubject || 'General',
        topic: topic || 'Review'
      };
      
      const res = await fetch('/api/focus/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to save focus session');
      
      fetchFocusData();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save focus session');
    }
  };

  const askFocusCoach = async (event) => {
    event.preventDefault();
    if (!coachPrompt.trim() || coachLoading) return;

    setCoachLoading(true);
    setCoachError('');
    try {
      const res = await fetch('/api/focus/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: coachPrompt,
          subject: selectedSubject || 'General',
          topic: topic || 'Review',
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'AI coach is unavailable.');
      setCoachReply(data.reply || '');
    } catch (err) {
      console.error(err);
      setCoachError(err.message || 'AI coach is unavailable.');
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex items-center gap-4">
        <div className="w-10 h-10 bg-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
          <Target className="text-white" size={20} />
        </div>
        <div>
          <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider font-semibold mb-1">
            PRODUCTIVITY
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Focus Mode</h1>
          <p className="text-xs text-[#666666] mt-0.5">Focus, track, and adapt your study sessions.</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFFDFB] border border-[#D7D3CF] text-[#C96A32] rounded-[4px] p-3 text-xs font-mono flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={fetchFocusData} className="underline">Retry</button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Timer & Config) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Study Configuration */}
          <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-6">
            <h3 className="text-[10px] font-mono font-semibold text-[#666666] uppercase tracking-wider mb-4 border-b border-[#D7D3CF] pb-2">
              SESSION FOCUS
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-[#666666] uppercase font-semibold mb-1.5 block">Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#111111] outline-none focus:border-[#102326] cursor-pointer"
                >
                  <option value="">Select Subject (Optional)</option>
                  {dbSubjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name} (S{s.semester})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#666666] uppercase font-semibold mb-1.5 block">Topic (Optional)</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Virtual Memory"
                  className="w-full px-3 py-2 bg-white border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#111111] outline-none focus:border-[#102326] placeholder:text-[#666666]"
                />
              </div>
            </div>
          </div>

          <PomodoroTimer
            onSessionComplete={handleSessionComplete}
            selectedSubject={selectedSubject}
            topic={topic}
            recommendations={recommendations}
          />

        </div>

        {/* Right Column (Analytics & Recommendations) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FocusAnalytics analytics={analytics} loading={loading} />
            <StudyRecommendations recommendations={recommendations} loading={recommendationsLoading} error={error} />
          </div>

          <StudyHistory sessions={sessions} loading={loading} />

          <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5">
            <div className="flex items-center gap-2 border-b border-[#D7D3CF] pb-3">
              <Sparkles size={16} className="text-[#C96A32]" />
              <div>
                <h3 className="text-base font-bold text-[#111111] tracking-tight">Ask AI Focus Coach</h3>
                <p className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">
                  Uses your selected subject, topic, and recent focus history
                </p>
              </div>
            </div>

            <form onSubmit={askFocusCoach} className="mt-4 flex gap-2">
              <input
                value={coachPrompt}
                onChange={(event) => setCoachPrompt(event.target.value)}
                placeholder="e.g. Plan this session, quiz me after focus, or break this topic into steps"
                className="min-w-0 flex-1 rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2 text-xs text-[#111111] outline-none focus:border-[#102326]"
              />
              <button
                type="submit"
                disabled={coachLoading || !coachPrompt.trim()}
                className="inline-flex items-center gap-2 rounded-[4px] border border-[#102326] bg-[#102326] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                {coachLoading ? 'Asking' : 'Ask'}
              </button>
            </form>

            {coachError && (
              <div className="mt-3 rounded-[4px] border border-[#F2B8A0] bg-[#FFF7F2] p-3 text-xs font-mono text-[#A24D23]">
                {coachError}
              </div>
            )}

            {coachReply && (
              <div className="mt-3 whitespace-pre-wrap rounded-[4px] border border-[#D7D3CF] bg-[#FAF9F7] p-4 text-sm leading-6 text-[#111111]">
                {coachReply}
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default SmartFocusMode;
