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
    try {
      const [histRes, statRes, recRes] = await Promise.all([
        fetch('/api/focus/sessions', { credentials: 'include' }),
        fetch('/api/focus/analytics', { credentials: 'include' }),
        fetch('/api/focus/recommendations', { credentials: 'include' })
      ]);
      
      if (histRes.ok) setSessions(await histRes.json());
      if (statRes.ok) setAnalytics(await statRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSessionComplete = async (sessionData) => {
    try {
      const payload = {
        ...sessionData,
        subject: selectedSubject || 'General',
        topic: topic || 'Review'
      };
      
      await fetch('/api/focus/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      
      fetchFocusData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-6">
        <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-500/20">
          <Target className="text-white" size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Smart Focus Mode</h1>
          <p className="text-slate-500 font-medium mt-1">Your AI study coach. Focus, track, and adapt.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Timer & Config) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Study Configuration */}
          <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
            <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">Current Session Focus</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500"
                >
                  <option value="">Select Subject (Optional)</option>
                  {dbSubjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name} (S{s.semester})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Topic (Optional)</label>
                <input 
                  type="text" 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Virtual Memory"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 placeholder:text-slate-400 font-normal"
                />
              </div>
            </div>
          </div>

          <PomodoroTimer onSessionComplete={handleSessionComplete} />

        </div>

        {/* Right Column (Analytics & Recommendations) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FocusAnalytics analytics={analytics} />
            <StudyRecommendations recommendations={recommendations} />
          </div>

          <StudyHistory sessions={sessions} />
          
        </div>

      </div>
    </div>
  );
};

export default SmartFocusMode;
