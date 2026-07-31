import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  GraduationCap,
  Plus,
  Sparkles,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';

const EVENT_TYPES = ['Exam', 'Study Session', 'Assignment', 'Reminder', 'Personal'];
const TYPE_STYLES = {
  Exam: 'bg-[#DDEFE2] border-[#3E8B4E] text-[#185C28]',
  'Study Session': 'bg-[#E8EEF2] border-[#7B97A8] text-[#24485B]',
  Assignment: 'bg-[#FFF0DC] border-[#C96A32] text-[#9A4D1F]',
  Reminder: 'bg-[#F0E8F5] border-[#8B6AA3] text-[#5D3F75]',
  Personal: 'bg-[#F3F1ED] border-[#9B948C] text-[#5C554E]'
};
const DOT_STYLES = {
  'Study Session': 'bg-[#24485B]',
  Assignment: 'bg-[#C96A32]',
  Reminder: 'bg-[#8B6AA3]',
  Personal: 'bg-[#5C554E]'
};
const EXAM_TYPE_TO_LABEL = { ut: 'Exam', assessment: 'Exam', final: 'Exam' };
const FIELD_CLASS = 'w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none';

const yearProgress = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  const total = end - start;
  const elapsed = now - start;
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  return {
    daysLeft,
    percent: Math.min(100, Math.round((elapsed / total) * 100)),
    year: now.getFullYear()
  };
};

const emptyForm = (date = new Date().toISOString().slice(0, 10)) => ({
  title: '',
  type: 'Study Session',
  date,
  start_time: '10:00',
  end_time: '',
  subject: '',
  notes: '',
  reminder: false,
  conflictAccepted: false
});

const toDateKey = (date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const normalizePlan = (plan) => ({
  id: `plan-${plan.id}`,
  source: 'plan',
  rawId: plan.id,
  title: plan.title,
  type: plan.event_type || 'Study Session',
  date: plan.revision_date,
  start_time: plan.start_time || '',
  end_time: plan.end_time || '',
  subject: plan.subject || '',
  notes: plan.description || '',
  reminder: Boolean(plan.reminder),
  status: plan.status
});

const normalizeExam = (exam) => ({
  id: `exam-${exam.id}`,
  source: 'exam',
  rawId: exam.id,
  title: exam.title,
  type: EXAM_TYPE_TO_LABEL[exam.exam_type] || 'Exam',
  exam_type: exam.exam_type || 'final',
  date: exam.exam_date,
  start_time: exam.start_time || '',
  end_time: exam.end_time || '',
  subject: exam.subject || '',
  notes: exam.description || '',
  reminder: Boolean(exam.reminder)
});

const RevisionPlanner = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [plans, setPlans] = useState([]);
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});

  const events = useMemo(() => [...plans.map(normalizePlan), ...exams.map(normalizeExam)], [plans, exams]);
  const subjectOptions = useMemo(() => {
    const names = subjects.map((subject) => subject.name).filter(Boolean);
    events.forEach((event) => event.subject && names.push(event.subject));
    return [...new Set(names)].sort();
  }, [subjects, events]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, examsRes, subjectsRes] = await Promise.all([
        fetch('/api/revision-plans', { credentials: 'include' }),
        fetch('/api/exams', { credentials: 'include' }),
        fetch('/api/syllabus/subjects', { credentials: 'include' })
      ]);
      if (!plansRes.ok || !examsRes.ok) throw new Error('Failed to load calendar data');
      setPlans(await plansRes.json());
      setExams(await examsRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validate = (nextForm) => {
    const errors = {};
    if (!nextForm.title.trim()) errors.title = 'Title is required.';
    if (!nextForm.date) errors.date = 'Date is required.';
    if (!nextForm.start_time) errors.start_time = 'Start time is required.';
    if (nextForm.end_time && nextForm.end_time <= nextForm.start_time) {
      errors.end_time = 'End time must be after start time.';
    }
    const duplicate = events.find((event) => (
      event.id !== editingEvent?.id &&
      event.date === nextForm.date &&
      event.start_time === nextForm.start_time &&
      event.title.trim().toLowerCase() === nextForm.title.trim().toLowerCase()
    ));
    if (duplicate && !nextForm.conflictAccepted) {
      errors.conflict = 'You already have the same plan at this time. Tick the box if you still want to save it.';
    }
    return errors;
  };

  useEffect(() => {
    if (formOpen) setFormErrors(validate(form));
  }, [form, formOpen]);

  const openCreate = (date = selectedDay, type = 'Study Session') => {
    setEditingEvent(null);
    setForm(emptyForm(date));
    setForm((current) => ({ ...current, type, subject: subjectOptions[0] || '' }));
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      type: event.type,
      date: event.date,
      start_time: event.start_time || '10:00',
      end_time: event.end_time || '',
      subject: event.subject || '',
      notes: event.notes || '',
      reminder: Boolean(event.reminder),
      conflictAccepted: false
    });
    setFormOpen(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    const errors = validate(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError('');
    try {
      if (form.type === 'Exam') {
        const payload = {
          title: form.title.trim(),
          exam_type: 'final',
          subject: form.subject.trim() || 'General',
          exam_date: form.date,
          start_time: form.start_time,
          end_time: form.end_time || null,
          reminder: form.reminder,
          description: form.notes
        };
        const url = editingEvent?.source === 'exam' ? `/api/exams/${editingEvent.rawId}` : '/api/exams';
        const res = await fetch(url, {
          method: editingEvent?.source === 'exam' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save exam');
      } else {
        const payload = {
          title: form.title.trim(),
          event_type: form.type,
          subject: form.subject.trim() || 'General',
          revision_date: form.date,
          start_time: form.start_time,
          end_time: form.end_time || null,
          reminder: form.reminder,
          description: form.notes,
          priority: form.type === 'Assignment' ? 'high' : 'medium',
          status: 'pending'
        };
        const url = editingEvent?.source === 'plan' ? `/api/revision-plans/${editingEvent.rawId}` : '/api/revision-plans';
        const res = await fetch(url, {
          method: editingEvent?.source === 'plan' ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save entry');
      }
      setStatus(editingEvent ? 'Entry updated.' : 'Entry added.');
      setSelectedDay(form.date);
      setFormOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const previousPlans = plans;
    const previousExams = exams;
    if (event.source === 'exam') setExams((items) => items.filter((item) => item.id !== event.rawId));
    else setPlans((items) => items.filter((item) => item.id !== event.rawId));
    try {
      const res = await fetch(event.source === 'exam' ? `/api/exams/${event.rawId}` : `/api/revision-plans/${event.rawId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      setStatus('Entry deleted.');
    } catch (err) {
      setPlans(previousPlans);
      setExams(previousExams);
      setError(err.message || 'Failed to delete entry');
    }
  };

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return { date, currentMonth: true };
      });
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const count = new Date(year, month + 1, 0).getDate();
    const padded = [];
    for (let i = first.getDay() - 1; i >= 0; i--) padded.push({ date: new Date(year, month, -i), currentMonth: false });
    for (let day = 1; day <= count; day++) padded.push({ date: new Date(year, month, day), currentMonth: true });
    return padded;
  }, [currentDate, viewMode]);

  const selectedEvents = events
    .filter((event) => event.date === selectedDay)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const todayKey = toDateKey(new Date());
  const selectedExam = selectedEvents.find((event) => event.type === 'Exam');
  const upcomingExam = useMemo(() => {
    const today = toDateKey(new Date());
    return events
      .filter((event) => event.type === 'Exam' && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }, [events]);
  const examForBanner = selectedExam || upcomingExam;
  const examDaysLeft = examForBanner
    ? Math.max(0, Math.ceil((new Date(`${examForBanner.date}T00:00:00`) - new Date(`${todayKey}T00:00:00`)) / 86400000))
    : null;
  const progress = yearProgress();

  const move = (direction) => {
    const next = new Date(currentDate);
    if (viewMode === 'week') next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setCurrentDate(next);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">Plan your days</div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight flex items-center gap-2"><CalendarCheck size={20} /> Calendar</h1>
          <p className="text-xs text-[#666666] mt-1">Add exams, study time, assignments, reminders, and personal plans.</p>
        </div>
        <button onClick={() => openCreate()} className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase inline-flex items-center gap-2">
          <Plus size={14} /> Add Plan
        </button>
      </div>

      <div className="bg-white border border-[#D7D3CF] rounded-[10px] p-4 shadow-sm">
        {examForBanner ? (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#666666] font-semibold">Next exam</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-[#111111]">{examDaysLeft}</span>
                  <span className="text-xs font-mono text-[#666666]">{examDaysLeft === 1 ? 'day left' : 'days left'}</span>
                </div>
                <p className="mt-1 text-xs text-[#666666]">{examForBanner.title} - {examForBanner.subject || 'General'} - {examForBanner.date}</p>
              </div>
              <span className="rounded-full bg-[#DDEFE2] px-3 py-1 text-[10px] font-mono font-semibold text-[#185C28]">Exam day</span>
            </div>
            <div className="grid grid-cols-[repeat(36,minmax(0,1fr))] gap-1">
              {Array.from({ length: 36 }).map((_, index) => {
                const filled = examDaysLeft === 0 ? 36 : Math.max(1, 36 - Math.min(36, Math.ceil(examDaysLeft / 2)));
                return <span key={index} className={`h-2 rounded-[2px] ${index < filled ? 'bg-[#6FCF97]' : 'bg-[#E1E1E1]'}`} />;
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#666666] font-semibold">Any exam coming up?</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-[#111111]">{progress.daysLeft}</span>
                  <span className="text-xs font-mono text-[#666666]">days left this year</span>
                </div>
                <p className="mt-1 text-xs text-[#666666]">Add your exam date to see a countdown here.</p>
              </div>
              <button onClick={() => openCreate(selectedDay, 'Exam')} className="rounded-[4px] bg-[#102326] px-3 py-2 text-xs font-mono font-semibold uppercase text-white inline-flex items-center gap-2">
                <GraduationCap size={14} /> Add Exam
              </button>
            </div>
            <div className="grid grid-cols-[repeat(36,minmax(0,1fr))] gap-1">
              {Array.from({ length: 36 }).map((_, index) => (
                <span key={index} className={`h-2 rounded-[2px] ${index < Math.round(progress.percent / 100 * 36) ? 'bg-[#6FCF97]' : 'bg-[#E1E1E1]'}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {(error || status) && (
        <div className={`border rounded-[4px] p-3 text-xs font-mono flex items-center justify-between gap-3 ${error ? 'bg-[#FFFDFB] border-[#D7D3CF] text-[#C96A32]' : 'bg-white border-[#102326] text-[#102326]'}`}>
          <span>{error || status}</span>
          <button onClick={() => { setError(''); setStatus(''); }} className="underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => move(-1)} className="p-2 border border-[#D7D3CF] rounded-[4px]"><ChevronLeft size={14} /></button>
          <button onClick={() => move(1)} className="p-2 border border-[#D7D3CF] rounded-[4px]"><ChevronRight size={14} /></button>
          <h2 className="text-sm font-bold font-mono uppercase">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="flex gap-2">
          {['month', 'week'].map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 rounded-[4px] border text-xs font-mono uppercase ${viewMode === mode ? 'bg-[#102326] text-white border-[#102326]' : 'border-[#D7D3CF]'}`}>
              {mode}
            </button>
          ))}
          <button onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDay(toDateKey(now)); }} className="px-3 py-1.5 rounded-[4px] border border-[#D7D3CF] text-xs font-mono uppercase">Today</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-white border border-[#D7D3CF] rounded-[4px] overflow-hidden">
          <div className="grid grid-cols-7 bg-[#FAF9F7] border-b border-[#D7D3CF]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="p-2 text-center text-[10px] font-mono uppercase text-[#666666]">{day}</div>)}
          </div>
          {loading ? (
            <div className="p-10 text-center text-xs font-mono text-[#666666] flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-[#D7D3CF]">
              {days.map(({ date, currentMonth }, index) => {
                const dateKey = toDateKey(date);
                const dayEvents = events.filter((event) => event.date === dateKey);
                const hasExam = dayEvents.some((event) => event.type === 'Exam');
                const isSelected = selectedDay === dateKey;
                const isToday = todayKey === dateKey;
                return (
                  <button
                    key={`${dateKey}-${index}`}
                    type="button"
                    onClick={() => setSelectedDay(dateKey)}
                    className={`min-h-[112px] p-2 text-left flex flex-col gap-1 ${hasExam ? 'bg-[#DDEFE2]' : currentMonth ? 'bg-white' : 'bg-[#FAF9F7]'} ${isSelected ? 'ring-2 ring-inset ring-[#102326]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${isToday ? 'bg-[#102326] text-white rounded-[3px] px-1.5 py-0.5' : currentMonth ? 'text-[#111111]' : 'text-[#777]'}`}>{date.getDate()}</span>
                      <Plus size={11} className="text-[#666666]" onClick={(e) => { e.stopPropagation(); openCreate(dateKey); }} />
                    </div>
                    <div className="flex gap-1 min-h-2">
                      {[...new Set(dayEvents.filter((event) => event.type !== 'Exam').map((event) => event.type))].map((type) => <span key={type} className={`w-2 h-2 rounded-full ${DOT_STYLES[type]}`} />)}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className={`truncate rounded-[3px] border px-1.5 py-0.5 text-[9px] font-mono ${TYPE_STYLES[event.type]}`}>
                          {event.start_time || '--:--'} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[9px] font-mono text-[#666666]">+{dayEvents.length - 3} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="bg-white border border-[#D7D3CF] rounded-[4px] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D7D3CF] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#111111]">This Day</h3>
              <p className="text-[10px] font-mono text-[#666666]">{selectedDay}</p>
            </div>
            <button onClick={() => openCreate(selectedDay)} className="p-2 bg-[#102326] text-white rounded-[4px]"><Plus size={14} /></button>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="border border-dashed border-[#D7D3CF] rounded-[4px] p-5 text-center text-xs font-mono text-[#666666]">Nothing planned for this day.</div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto">
              {selectedEvents.map((event) => (
                <div key={event.id} className={`border rounded-[4px] p-3 ${TYPE_STYLES[event.type]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{event.title}</p>
                      <p className="text-[10px] font-mono mt-1 flex items-center gap-1"><Clock size={11} /> {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</p>
                      <p className="text-[10px] font-mono mt-1">{event.type} - {event.subject || 'General'}</p>
                      {event.reminder && <p className="text-[10px] font-mono mt-1 flex items-center gap-1"><Bell size={11} /> 1 day before</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(event)} className="p-1 bg-white/70 rounded-[3px]" title="Edit"><Edit3 size={12} /></button>
                      <button onClick={() => deleteEvent(event)} className="p-1 bg-white/70 rounded-[3px]" title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {event.notes && <p className="text-[10px] mt-2 leading-relaxed">{event.notes}</p>}
                </div>
              ))}
            </div>
          )}
          {selectedEvents.length === 0 && (
            <button onClick={() => openCreate(selectedDay, 'Exam')} className="w-full border-t border-[#D7D3CF] pt-3 text-xs font-mono text-[#102326] inline-flex items-center justify-center gap-2">
              <Sparkles size={13} /> Add something for this day
            </button>
          )}
        </aside>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 p-4 flex items-center justify-center">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D7D3CF] pb-3 mb-4">
              <h3 className="text-sm font-bold font-mono uppercase">{editingEvent ? 'Edit Plan' : form.type === 'Exam' ? 'Add Exam' : 'Add Plan'}</h3>
              <button onClick={() => setFormOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={saveEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Title" error={formErrors.title}>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={FIELD_CLASS} />
                </Field>
                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    disabled={Boolean(editingEvent)}
                    className={`${FIELD_CLASS} disabled:bg-[#F7F5F2] disabled:text-[#666666]`}
                  >
                    {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label={form.type === 'Exam' ? 'First exam date' : 'Date'} error={formErrors.date}>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={FIELD_CLASS} />
                </Field>
                <Field label="Subject/Course">
                  <input list="calendar-subjects" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={FIELD_CLASS} placeholder="General" />
                  <datalist id="calendar-subjects">{subjectOptions.map((subject) => <option key={subject} value={subject} />)}</datalist>
                </Field>
                <Field label={form.type === 'Exam' ? 'Starts at' : 'Start Time'} error={formErrors.start_time}>
                  <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={FIELD_CLASS} />
                </Field>
                <Field label={form.type === 'Exam' ? 'Ends at' : 'End Time'} error={formErrors.end_time}>
                  <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={FIELD_CLASS} />
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className={`${FIELD_CLASS} resize-none`} />
              </Field>
              <label className="flex items-center gap-2 text-xs font-mono text-[#111111]">
                <input type="checkbox" checked={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.checked })} />
                Notify 1 day before
              </label>
              {formErrors.conflict && (
                <label className="flex items-start gap-2 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] p-3 text-xs font-mono text-[#C96A32]">
                  <input type="checkbox" checked={form.conflictAccepted} onChange={(e) => setForm({ ...form, conflictAccepted: e.target.checked })} />
                  <span>{formErrors.conflict}</span>
                </label>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#D7D3CF]">
                <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono uppercase">Cancel</button>
                <button type="submit" disabled={saving || Object.keys(formErrors).length > 0} className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono uppercase disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">{label}</span>
    {children}
    {error && <span className="block text-[10px] font-mono text-[#C96A32] mt-1">{error}</span>}
  </label>
);

export default RevisionPlanner;
