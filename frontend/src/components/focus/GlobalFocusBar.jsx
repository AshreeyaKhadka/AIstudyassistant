import React from 'react';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatFocusTime, useFocus } from '../../context/FocusContext';

const GlobalFocusBar = () => {
  const navigate = useNavigate();
  const { state, start, pause, reset } = useFocus();
  if (state.status === 'idle') return null;

  const recallReady = ['recall', 'reviewed'].includes(state.status);
  return (
    <div className="shrink-0 border-b border-[#D7D3CF] bg-white px-4 py-2 md:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3">
        <Timer size={16} className="shrink-0 text-[#102326]" />
        <button type="button" onClick={() => navigate('/dashboard/focus')} className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-semibold text-[#111111]">{state.subject?.name || 'Focus session'}{state.topic ? ` · ${state.topic}` : ''}</p>
          <p className="text-[10px] font-mono text-[#666666]">{recallReady ? 'Recall question ready' : state.running ? 'Focus session running' : state.status === 'saving' ? 'Saving session' : 'Focus session paused'}</p>
        </button>
        {!recallReady && <span className="w-16 text-right font-mono text-sm font-bold tabular-nums text-[#111111]">{formatFocusTime(state.remainingSeconds)}</span>}
        {!recallReady && state.status !== 'saving' && (
          <button type="button" onClick={state.running ? pause : start} title={state.running ? 'Pause' : 'Resume'} className="grid h-8 w-8 place-items-center rounded-[4px] bg-[#102326] text-white">
            {state.running ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
        {recallReady ? (
          <button type="button" onClick={() => navigate('/dashboard/focus')} className="rounded-[4px] bg-[#102326] px-3 py-2 font-mono text-[10px] font-semibold uppercase text-white">Open recall</button>
        ) : (
          <button type="button" onClick={reset} title="End session" className="grid h-8 w-8 place-items-center rounded-[4px] border border-[#D7D3CF] text-[#111111]"><RotateCcw size={14} /></button>
        )}
      </div>
    </div>
  );
};

export default GlobalFocusBar;
