import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, SkipForward, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

const PomodoroTimer = ({ onSessionComplete }) => {
  const modes = [
    { label: '25/5', focus: 25, break: 5 },
    { label: '50/10', focus: 50, break: 10 },
    { label: '90/20', focus: 90, break: 20 },
  ];
  
  const [currentMode, setCurrentMode] = useState(modes[0]);
  const [timeLeft, setTimeLeft] = useState(modes[0].focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleComplete = () => {
    setIsActive(false);
    if (!isBreak) {
      onSessionComplete({
        duration_minutes: currentMode.focus,
        break_duration_minutes: currentMode.break,
        completed: true
      });
      setSessionCount(c => c + 1);
      setIsBreak(true);
      setTimeLeft(currentMode.break * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(currentMode.focus * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft((isBreak ? currentMode.break : currentMode.focus) * 60);
  };
  const skipBreak = () => {
    if (isBreak) {
      setIsActive(false);
      setIsBreak(false);
      setTimeLeft(currentMode.focus * 60);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = (isBreak ? currentMode.break : currentMode.focus) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  
  const circumference = 2 * Math.PI * 120; // r=120
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={toggleFullscreen} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition">
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {modes.map(m => (
          <button 
            key={m.label}
            onClick={() => {
              setCurrentMode(m);
              setIsActive(false);
              setIsBreak(false);
              setTimeLeft(m.focus * 60);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentMode.label === m.label ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative w-72 h-72 flex items-center justify-center mb-8">
        {/* SVG Circle for progress */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
          <motion.circle 
            cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="12" fill="transparent" 
            className={isBreak ? "text-emerald-400" : "text-indigo-500"}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "linear" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="z-10 text-center flex flex-col items-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
            {isBreak ? 'Break Time' : 'Focus Mode'}
          </span>
          <h2 className="text-6xl font-black text-slate-800 tracking-tighter tabular-nums">
            {formatTime(timeLeft)}
          </h2>
          <span className="text-xs font-semibold text-slate-400 mt-2">
            Session {sessionCount + 1}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleTimer} className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${isBreak ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
          {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>
        
        <button onClick={resetTimer} className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <RefreshCw size={20} />
        </button>

        {isBreak && (
          <button onClick={skipBreak} className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Skip Break">
            <SkipForward size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;
