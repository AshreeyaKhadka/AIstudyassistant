import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RefreshCw, SkipForward, Maximize2, Minimize2 } from 'lucide-react';

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
      onSessionComplete?.({
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
  
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 sm:p-8 flex flex-col items-center relative select-none">
      <div className="absolute top-4 right-4">
        <button onClick={toggleFullscreen} className="p-2 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Mode Switches */}
      <div className="flex gap-2 mb-6">
        {modes.map(m => (
          <button 
            key={m.label}
            onClick={() => {
              setCurrentMode(m);
              setIsActive(false);
              setIsBreak(false);
              setTimeLeft(m.focus * 60);
            }}
            className={`px-3 py-1.5 rounded-[4px] border font-mono text-xs font-semibold tracking-wider transition-colors ${
              currentMode.label === m.label 
                ? 'bg-[#102326] text-white border-[#102326]' 
                : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Circle Timer Dial */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-6">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
          <circle cx="128" cy="128" r="110" stroke="#ECEAE7" strokeWidth="8" fill="transparent" />
          <motion.circle 
            cx="128" cy="128" r="110" stroke={isBreak ? "#C96A32" : "#102326"} strokeWidth="8" fill="transparent" 
            strokeLinecap="square"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: "linear" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="z-10 text-center flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            {isBreak ? 'BREAK TIME' : 'FOCUS MODE'}
          </span>
          <h2 className="text-5xl font-bold font-mono text-[#111111] tracking-tight tabular-nums">
            {formatTime(timeLeft)}
          </h2>
          <span className="text-xs font-mono text-[#666666] mt-2">
            Session {sessionCount + 1}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleTimer} 
          className={`h-11 px-6 rounded-[4px] font-mono text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 ${
            isBreak ? 'bg-[#C96A32] hover:bg-[#b05a28] text-white border border-[#C96A32]' : 'bg-[#102326] hover:bg-[#0b191c] text-white border border-[#102326]'
          }`}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          <span>{isActive ? 'PAUSE' : 'START'}</span>
        </button>

        <button 
          onClick={resetTimer} 
          className="h-11 w-11 rounded-[4px] border border-[#D7D3CF] bg-white hover:bg-[#ECEAE7] text-[#111111] flex items-center justify-center transition-colors"
          title="Reset Timer"
        >
          <RefreshCw size={16} />
        </button>

        {isBreak && (
          <button 
            onClick={skipBreak} 
            className="h-11 px-4 rounded-[4px] border border-[#D7D3CF] bg-white hover:bg-[#ECEAE7] text-[#111111] font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
          >
            <SkipForward size={16} />
            <span>SKIP BREAK</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PomodoroTimer;
