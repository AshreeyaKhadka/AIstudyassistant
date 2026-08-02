import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Pause, Play, Plus, RotateCcw, Target, Trash2, X } from 'lucide-react';
import { formatFocusTime, useFocus } from '../context/FocusContext';

const PRESETS = [25, 50, 90];

const SmartFocusMode = () => {
  const { state, configure, start, pause, reset, submitRecall } = useFocus();
  const [subjects, setSubjects] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [subjectManagerOpen, setSubjectManagerOpen] = useState(false);
  const [semester, setSemester] = useState(1);
  const [answer, setAnswer] = useState('');
  const [customMinutes, setCustomMinutes] = useState(String(state.focusMinutes));
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  const loadSubjects = async () => {
    const response = await fetch('/api/syllabus/subjects', { credentials: 'include' });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data.error || 'Could not load subjects.');
    setSubjects(data);
    if (!state.subject && data.length) configure({ subject: data[0] });
  };

  useEffect(() => {
    loadSubjects().catch((error) => setPageError(error.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openSubjectManager = async () => {
    setPageError('');
    try {
      const response = await fetch('/api/syllabus/catalog', { credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load the subject catalog.');
      setCatalog(data.subjects || []);
      setSemester(data.subjects?.[0]?.semester || 1);
      setSubjectManagerOpen(true);
    } catch (error) {
      setPageError(error.message);
    }
  };

  const additionalCount = subjects.filter((subject) => subject.is_backlog).length;
  const activeCatalogKeys = new Set(subjects.map((subject) => subject.catalog_key).filter(Boolean));
  const semesterSubjects = catalog.filter((subject) => Number(subject.semester) === Number(semester));

  const addSubject = async (catalogKey) => {
    setPageError('');
    const response = await fetch('/api/syllabus/subjects/additional', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ catalog_key: catalogKey }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setPageError(data.error || 'Could not add subject.');
    await loadSubjects();
  };

  const removeSubject = async (subject) => {
    const response = await fetch(`/api/syllabus/subjects/${subject.id}/additional`, { method: 'DELETE', credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setPageError(data.error || 'Could not remove subject.');
    if (state.subject?.id === subject.id) configure({ subject: null });
    await loadSubjects();
  };

  const totalSeconds = state.focusMinutes * 60;
  const progress = totalSeconds ? Math.min(100, ((totalSeconds - state.remainingSeconds) / totalSeconds) * 100) : 0;
  const timerLocked = state.running || ['saving', 'recall', 'reviewed'].includes(state.status);

  const handleRecall = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setPageError('');
    try {
      await submitRecall(answer);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyCustomTime = (event) => {
    event.preventDefault();
    const parsed = Number.parseInt(customMinutes, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 240) {
      setPageError('Study time must be between 1 and 240 minutes.');
      return;
    }
    configure({ focusMinutes: parsed });
    setCustomMinutes(String(parsed));
    setPageError('');
  };

  const citationText = useMemo(() => (state.recall?.citations || []).map((citation) => (
    [citation.filename, citation.page_number ? `page ${citation.page_number}` : '', citation.heading].filter(Boolean).join(' · ')
  )), [state.recall]);
  const recallFeedbackText = useMemo(() => {
    const feedback = String(state.feedback?.feedback || '');
    if (/\b(saved|stored)\b/i.test(feedback)) {
      return 'Automated scoring is unavailable. Compare your answer with your notes and identify one important point you missed.';
    }
    return feedback;
  }, [state.feedback]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-12">
      <header className="flex items-center gap-3 border-b border-[#D7D3CF] pb-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[#102326] text-white"><Target size={18} /></div>
        <div>
          <h1 className="text-xl font-bold text-[#111111]">Focus Mode</h1>
          <p className="text-xs text-[#666666]">Choose what you are studying, focus, then check what you remember.</p>
        </div>
      </header>

      {(pageError || state.error) && <div className="rounded-[4px] border border-[#E3B39B] bg-[#FFF7F2] p-3 text-xs text-[#A24D23]">{pageError || state.error}</div>}

      <main className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="space-y-4 border-r-0 border-[#D7D3CF] lg:border-r lg:pr-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="focus-subject" className="font-mono text-[10px] font-semibold uppercase text-[#666666]">Subject</label>
              <button type="button" onClick={openSubjectManager} disabled={timerLocked} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#102326] disabled:opacity-40"><Plus size={12} /> Add other subject</button>
            </div>
            <select id="focus-subject" value={state.subject?.id || ''} disabled={timerLocked} onChange={(event) => configure({ subject: subjects.find((item) => item.id === Number(event.target.value)) || null })} className="w-full rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#102326] disabled:bg-[#ECEAE7]">
              <option value="">Choose a subject</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · Semester {subject.semester}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="focus-topic" className="mb-2 block font-mono text-[10px] font-semibold uppercase text-[#666666]">Topic <span className="normal-case font-normal">(optional)</span></label>
            <input id="focus-topic" value={state.topic} disabled={timerLocked} onChange={(event) => configure({ topic: event.target.value })} placeholder="e.g. Virtual memory" className="w-full rounded-[4px] border border-[#D7D3CF] bg-white px-3 py-2.5 text-xs outline-none focus:border-[#102326] disabled:bg-[#ECEAE7]" />
          </div>

          <div>
            <span className="mb-2 block font-mono text-[10px] font-semibold uppercase text-[#666666]">Session length</span>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((minutes) => <button key={minutes} type="button" disabled={timerLocked} onClick={() => { configure({ focusMinutes: minutes }); setCustomMinutes(String(minutes)); }} className={`h-9 rounded-[4px] border font-mono text-xs font-semibold ${state.focusMinutes === minutes ? 'border-[#102326] bg-[#102326] text-white' : 'border-[#D7D3CF] bg-white text-[#111111]'} disabled:opacity-50`}>{minutes} min</button>)}
            </div>
            <form onSubmit={applyCustomTime} className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <label className="sr-only" htmlFor="custom-focus-minutes">Custom study time in minutes</label>
              <input id="custom-focus-minutes" type="number" min="1" max="240" value={customMinutes} disabled={timerLocked} onChange={(event) => setCustomMinutes(event.target.value)} placeholder="Custom minutes" className="h-9 min-w-0 rounded-[4px] border border-[#D7D3CF] bg-white px-3 font-mono text-xs outline-none focus:border-[#102326] disabled:bg-[#ECEAE7]" />
              <button type="submit" disabled={timerLocked || !customMinutes} className="h-9 rounded-[4px] border border-[#102326] px-3 font-mono text-[10px] font-semibold uppercase text-[#102326] disabled:opacity-40">Set time</button>
            </form>
            <p className="mt-1.5 text-[10px] text-[#666666]">Choose any study duration from 1 to 240 minutes.</p>
          </div>

          <div className="border-t border-[#D7D3CF] pt-4 text-[11px] text-[#666666]">
            <p className="flex items-start gap-2"><BookOpen size={14} className="mt-0.5 shrink-0" />Your recall question uses approved materials and syllabus context for this subject.</p>
          </div>
        </section>

        <section className="flex min-h-[430px] flex-col items-center justify-center bg-white p-6 text-center sm:p-10">
          {['recall', 'reviewed'].includes(state.status) ? (
            <div className="w-full max-w-xl text-left">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase text-[#666666]">Active recall</p>
              <h2 className="text-lg font-bold leading-7 text-[#111111]">{state.recall?.question || 'Preparing your recall question...'}</h2>
              {state.recall && !state.feedback && <form onSubmit={handleRecall} className="mt-5 space-y-3"><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} placeholder="Explain it in your own words..." className="w-full resize-y rounded-[4px] border border-[#D7D3CF] p-3 text-sm leading-6 outline-none focus:border-[#102326]" /><button disabled={submitting || answer.trim().length < 3} className="rounded-[4px] bg-[#102326] px-4 py-2.5 font-mono text-xs font-semibold uppercase text-white disabled:opacity-50">{submitting ? 'Checking' : 'Check recall'}</button></form>}
              {state.feedback && <div className="mt-5 border-l-2 border-[#102326] pl-4"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#185C28]" /><p className="text-sm font-bold">{state.feedback.score == null ? 'Recall checked' : `${Math.round(state.feedback.score)}% recall`}</p></div><p className="mt-2 text-sm leading-6 text-[#333333]">{recallFeedbackText}</p><p className="mt-2 text-xs text-[#666666]"><strong>Next:</strong> {state.feedback.next_step}</p></div>}
              {citationText.length > 0 && <div className="mt-5 border-t border-[#D7D3CF] pt-3"><p className="font-mono text-[9px] font-semibold uppercase text-[#666666]">Based on</p>{citationText.map((text) => <p key={text} className="mt-1 text-[10px] text-[#666666]">{text}</p>)}</div>}
              {state.feedback && <button type="button" onClick={() => { setAnswer(''); reset(); }} className="mt-6 inline-flex items-center gap-2 rounded-[4px] border border-[#D7D3CF] px-4 py-2 text-xs font-semibold"><RotateCcw size={14} /> New session</button>}
            </div>
          ) : (
            <>
              <div className="mb-3 font-mono text-[10px] font-semibold uppercase text-[#666666]">{state.running ? 'Focus in progress' : state.status === 'saving' ? 'Session complete' : 'Ready to focus'}</div>
              <div className="font-mono text-6xl font-bold tabular-nums text-[#111111] sm:text-7xl">{formatFocusTime(state.remainingSeconds)}</div>
              <div className="mt-6 h-1.5 w-full max-w-md overflow-hidden bg-[#ECEAE7]"><div className="h-full bg-[#102326] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
              <p className="mt-4 min-h-5 text-xs text-[#666666]">{state.subject?.name || 'Select a subject to begin'}{state.topic ? ` · ${state.topic}` : ''}</p>
              <div className="mt-7 flex items-center gap-3">
                <button type="button" onClick={state.running ? pause : start} disabled={state.status === 'saving'} className="inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#102326] px-6 font-mono text-xs font-semibold uppercase text-white disabled:opacity-50">{state.running ? <Pause size={16} /> : <Play size={16} />}{state.running ? 'Pause' : state.remainingSeconds < totalSeconds ? 'Resume' : 'Start'}</button>
                <button type="button" onClick={reset} title="Reset timer" className="grid h-11 w-11 place-items-center rounded-[4px] border border-[#D7D3CF] bg-white"><RotateCcw size={16} /></button>
              </div>
            </>
          )}
        </section>
      </main>

      {subjectManagerOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSubjectManagerOpen(false)}><section className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-[4px] bg-white shadow-xl"><header className="flex items-center justify-between border-b border-[#D7D3CF] p-4"><div><h2 className="text-sm font-bold">Additional subjects</h2><p className="mt-0.5 text-[10px] text-[#666666]">Choose up to four subjects outside your current semester · {additionalCount}/4 added</p></div><button onClick={() => setSubjectManagerOpen(false)} aria-label="Close"><X size={18} /></button></header><div className="flex gap-1 overflow-x-auto border-b border-[#D7D3CF] p-3">{[1,2,3,4,5,6,7,8].map((item) => <button key={item} onClick={() => setSemester(item)} className={`h-8 min-w-10 rounded-[4px] px-2 font-mono text-xs ${semester === item ? 'bg-[#102326] text-white' : 'bg-[#F7F5F2] text-[#333333]'}`}>S{item}</button>)}</div><div className="max-h-[55vh] divide-y divide-[#E7E4E0] overflow-y-auto p-3">{semesterSubjects.map((item) => { const active = activeCatalogKeys.has(item.id); const activeSubject = subjects.find((subject) => subject.catalog_key === item.id); return <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-xs font-semibold text-[#111111]">{item.name}</p><p className="mt-0.5 font-mono text-[9px] text-[#666666]">Semester {item.semester}</p></div>{active ? activeSubject?.is_backlog ? <button onClick={() => removeSubject(activeSubject)} className="grid h-8 w-8 place-items-center rounded-[4px] border border-[#D7D3CF] text-[#A24D23]" title="Remove additional subject"><Trash2 size={14} /></button> : <span className="text-[10px] font-semibold text-[#185C28]">Current</span> : <button disabled={additionalCount >= 4} onClick={() => addSubject(item.id)} className="rounded-[4px] border border-[#102326] px-3 py-1.5 text-[10px] font-semibold text-[#102326] disabled:opacity-35">Add</button>}</div>; })}</div></section></div>}
    </div>
  );
};

export default SmartFocusMode;
