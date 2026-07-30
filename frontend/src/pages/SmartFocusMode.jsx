import React, { useState, useEffect } from 'react';
import { Target, Book } from 'lucide-react';
import { motion } from 'framer-motion';

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
          
        </div>

      </div>
    </div>
  );
};

export default SmartFocusMode;
