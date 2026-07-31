import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Play, Pause, RefreshCw, SkipForward, Maximize2 } from 'lucide-react';
import FullscreenFocus from './FullscreenFocus';

const DEFAULT_MODES = [
  { label: '25/5', focus: 25, break: 5 },
  { label: '50/10', focus: 50, break: 10 },
  { label: '90/20', focus: 90, break: 20 },
];

const PomodoroTimer = ({ onSessionComplete, selectedSubject, topic, recommendations }) => {
  const [customFocus, setCustomFocus] = useState('30');
  const [customBreak, setCustomBreak] = useState('5');
  const [customMode, setCustomMode] = useState(null);
  const modes = useMemo(() => customMode ? [...DEFAULT_MODES, customMode] : DEFAULT_MODES, [customMode]);
  const [currentMode, setCurrentMode] = useState(DEFAULT_MODES[0]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MODES[0].focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [completion, setCompletion] = useState(false);

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
    setCompletion(true);
      onSessionComplete?.({
        duration_minutes: currentMode.focus,
        break_duration_minutes: currentMode.break,
        completed: true
      });
      setSessionCount(c => c + 1);
      setIsBreak(true);
      setTimeLeft(currentMode.break * 60);
    } else {
      window.setTimeout(() => setCompletion(false), 1800);
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

  const toggleFullscreen = () => setIsFullscreen((value) => !value);

  const clampMinutes = (value, min, max) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return min;
    return Math.min(max, Math.max(min, parsed));
  };

  const applyCustomMode = () => {
    const nextMode = {
      label: `${clampMinutes(customFocus, 1, 240)}/${clampMinutes(customBreak, 1, 120)}`,
      focus: clampMinutes(customFocus, 1, 240),
      break: clampMinutes(customBreak, 1, 120),
      custom: true,
    };
    setCustomFocus(String(nextMode.focus));
    setCustomBreak(String(nextMode.break));
    setCustomMode(nextMode);
    setCurrentMode(nextMode);
    setIsActive(false);
    setIsBreak(false);
    setCompletion(false);
    setTimeLeft(nextMode.focus * 60);
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

  return (<>
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 sm:p-8 flex flex-col items-center relative select-none">
      <div className="absolute top-4 right-4">
        <button onClick={toggleFullscreen} className="p-2 text-[#666666] hover:text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] transition-colors">
          <Maximize2 size={16} />
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

      <div className="mb-6 grid w-full max-w-sm grid-cols-[1fr_1fr_auto] gap-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-wider text-[#666666]">Focus min</span>
          <input
            type="number"
            min="1"
            max="240"
            value={customFocus}
            onChange={(event) => setCustomFocus(event.target.value)}
            className="w-full rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2 font-mono text-xs text-[#111111] outline-none focus:border-[#102326]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-wider text-[#666666]">Break min</span>
          <input
            type="number"
            min="1"
            max="120"
            value={customBreak}
            onChange={(event) => setCustomBreak(event.target.value)}
            className="w-full rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2 font-mono text-xs text-[#111111] outline-none focus:border-[#102326]"
          />
        </label>
        <button
          type="button"
          onClick={applyCustomMode}
          className="self-end rounded-[4px] border border-[#102326] bg-[#102326] px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#0b191c]"
        >
          Set
        </button>
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
    {isFullscreen && createPortal(<FullscreenFocus open={isFullscreen} onClose={() => setIsFullscreen(false)} currentMode={currentMode} modes={modes}
      setMode={(mode) => { setCurrentMode(mode); setIsActive(false); setIsBreak(false); setCompletion(false); setTimeLeft(mode.focus * 60); }}
      timeLeft={timeLeft} isActive={isActive} setIsActive={setIsActive} isBreak={isBreak}
      resetTimer={resetTimer} skipBreak={skipBreak} sessionCount={sessionCount}
      selectedSubject={selectedSubject} topic={topic} recommendations={recommendations} completion={completion}
    />, document.body)}
  </>);
};

export default PomodoroTimer;
