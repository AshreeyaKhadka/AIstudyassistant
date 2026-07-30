import React, { useEffect, useState } from 'react';
import useAmbientMixer from '../../hooks/useAmbientMixer';
import { Check, Pause, Play, RefreshCw, Settings, Volume2, X } from 'lucide-react';
import StudyRecommendations from './StudyRecommendations';

const backgrounds = [
  ['library', 'Library', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=2200&q=85'],
  ['forest', 'Forest', 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2200&q=85'],
  ['city', 'City', 'https://images.unsplash.com/photo-1519608487953-e999c86e7454?auto=format&fit=crop&w=2200&q=85'],
  ['coast', 'Coast', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2200&q=85'],
];
const format = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function FullscreenFocus({ open, onClose, currentMode, modes, setMode, timeLeft, isActive, setIsActive, isBreak, resetTimer, sessionCount, selectedSubject, topic, recommendations, completion }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [background, setBackground] = useState(() => localStorage.getItem('focus-background') || 'city');
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('focus-custom-background') || '');
  const [sounds, setSounds] = useState({ Rain: 0, Cafe: 0, 'Lo-fi': 0, 'White noise': 0 });
  const setAmbientVolume = useAmbientMixer();
  const sessionName = selectedSubject ? `${selectedSubject}${topic ? ` · ${topic}` : ''}` : topic || 'General session';
  const fallback = backgrounds.find(([id]) => id === background) || backgrounds[2];
  const image = background === 'custom' && customUrl.trim() ? customUrl.trim() : fallback[2];
  const selectBackground = (id) => { setBackground(id); localStorage.setItem('focus-background', id); };
  useEffect(() => { if (!open) return undefined; const escape = (event) => event.key === 'Escape' && onClose(); const original = document.body.style.overflow; document.body.style.overflow = 'hidden'; window.addEventListener('keydown', escape); return () => { document.body.style.overflow = original; window.removeEventListener('keydown', escape); }; }, [open, onClose]);
  if (!open) return null;
  return <section className="fixed inset-0 z-[100] overflow-hidden bg-[#07131b] text-white">
    <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url("${image}")` }} />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,13,41,.38)_0%,rgba(6,26,50,.38)_44%,rgba(3,17,33,.68)_100%)] backdrop-blur-[2px]" />
    <header className="absolute left-7 top-7 z-10 sm:left-10 sm:top-9"><span className="text-xl font-semibold tracking-tight sm:text-2xl">AiStudy</span><p className="mt-0.5 font-mono text-[8px] uppercase tracking-[.32em] text-white/60">focus mode</p></header>
    <button onClick={onClose} className="absolute right-6 top-6 z-20 rounded-full p-3 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="Exit focus zoom mode"><X size={20} /></button>
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-24 text-center">
      <div className="mb-7 flex flex-wrap justify-center gap-2"><button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17202a]">pomodoro</button>{modes.map((mode) => <button key={mode.label} onClick={() => setMode(mode)} className={`rounded-full border px-4 py-2 text-sm transition ${currentMode.label === mode.label ? 'border-white/80 bg-white/15' : 'border-white/55 bg-black/5 hover:bg-white/15'}`}>{mode.label === '25/5' ? 'short break' : mode.label === '50/10' ? 'long break' : mode.label}</button>)}</div>
      <p className="mb-2 text-sm text-white/65">{sessionName}</p>
      <h1 className="font-sans text-[clamp(5rem,14vw,10rem)] font-semibold leading-none tracking-[-.08em] tabular-nums text-white drop-shadow-sm">{format(timeLeft)}</h1>
      <div className="mt-8 flex items-center gap-3"><button onClick={() => setIsActive((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#15212a] transition hover:scale-[1.02]">{isActive ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}{isActive ? 'pause' : 'start'}</button><button onClick={resetTimer} aria-label="Reset timer" className="rounded-full p-3 text-white transition hover:bg-white/15"><RefreshCw size={25} /></button><button onClick={() => setSettingsOpen((value) => !value)} aria-label="Focus settings" className={`rounded-full p-3 transition ${settingsOpen ? 'bg-white text-[#15212a]' : 'text-white hover:bg-white/15'}`}><Settings size={25} /></button></div>
      <div className="mt-9 flex items-center gap-2"><span className="text-xs text-white/55">{sessionCount + 1} / 4</span>{[0, 1, 2, 3].map((item) => <span key={item} className={`h-1.5 w-1.5 rounded-full ${item < (sessionCount % 4) + 1 ? 'bg-white' : 'bg-white/35'}`} />)}</div>
    </main>
    {settingsOpen && <aside className="absolute bottom-5 right-5 z-30 w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-white/20 bg-[#10202bcc] p-5 text-left shadow-2xl backdrop-blur-xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold">Focus settings</p><p className="mt-1 text-xs text-white/55">{sessionName}</p></div><button onClick={() => setSettingsOpen(false)} className="text-white/60 hover:text-white"><X size={18} /></button></div><div className="border-t border-white/10 pt-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/50">Ambient mix</p>{Object.entries(sounds).map(([name, value]) => <label key={name} className="mb-3 flex items-center gap-3"><Volume2 size={15} className={value ? 'text-white' : 'text-white/40'} /><span className="w-20 text-xs">{name}</span><input className="h-1 flex-1 accent-white" type="range" min="0" max="100" value={value} onChange={(e) => (() => { const level = Number(e.target.value); setSounds((old) => ({ ...old, [name]: level })); setAmbientVolume(name, level); })()} /></label>)}</div><div className="border-t border-white/10 pt-4"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-white/50">Backdrop</p><div className="flex flex-wrap gap-2">{backgrounds.map(([id, name]) => <button key={id} onClick={() => selectBackground(id)} className={`rounded-full border px-3 py-1 text-xs ${background === id ? 'border-white bg-white text-[#15212a]' : 'border-white/30 text-white/80'}`}>{name}</button>)}</div><input value={customUrl} onChange={(e) => { setCustomUrl(e.target.value); localStorage.setItem('focus-custom-background', e.target.value); if (e.target.value.trim()) selectBackground('custom'); }} placeholder="Paste image URL" className="mt-3 w-full rounded-lg border border-white/20 bg-black/15 px-3 py-2 text-xs text-white placeholder:text-white/45 outline-none" /></div><div className="mt-4 border-t border-white/10 pt-4"><StudyRecommendations recommendations={recommendations} /></div></aside>}
    {completion && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#05101b]/60 backdrop-blur-sm"><div className="rounded-2xl border border-white/20 bg-[#10202b] px-9 py-7 text-center shadow-2xl"><Check className="mx-auto" size={28} /><p className="mt-3 text-lg font-semibold">Session logged</p><p className="mt-1 text-sm text-white/60">Your break is ready.</p></div></div>}
  </section>;
}
