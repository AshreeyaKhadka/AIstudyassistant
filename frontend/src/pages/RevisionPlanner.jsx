import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Trash2, 
  AlertCircle, 
  Flame, 
  Target, 
  SlidersHorizontal,
  X,
  CheckCircle2,
  CalendarCheck,
  GraduationCap
} from 'lucide-react';

const EXAM_TYPES = [
  { value: 'ut', label: 'Unit Test', color: 'bg-[#C96A32]', textColor: 'text-[#C96A32]', bgLight: 'bg-[#FAF9F7]', border: 'border-[#D7D3CF]' },
  { value: 'assessment', label: 'Assessment', color: 'bg-[#102326]', textColor: 'text-[#102326]', bgLight: 'bg-[#ECEAE7]', border: 'border-[#D7D3CF]' },
  { value: 'final', label: 'Final Board', color: 'bg-[#111111]', textColor: 'text-[#111111]', bgLight: 'bg-[#ECEAE7]', border: 'border-[#111111]' },
];

const getExamStyle = (type) => EXAM_TYPES.find(e => e.value === type) || EXAM_TYPES[0];

const RevisionPlanner = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [activePlan, setActivePlan] = useState(null);
  const [toast, setToast] = useState(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    title: '',
    exam_type: 'ut',
    subject: 'Operating Systems',
    exam_date: '',
    description: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: 'Operating Systems',
    revision_date: '',
    start_time: '10:00',
    end_time: '11:30',
    priority: 'medium',
    status: 'pending'
  });

  const [draggedPlanId, setDraggedPlanId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/revision-plans', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load revision plans');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      const res = await fetch('/api/exams', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load exams');
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setExamsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchExams();
  }, []);

  const handleOpenCreateModal = (dateStr = '') => {
    const defaultDate = dateStr || new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      subject: 'Operating Systems',
      revision_date: defaultDate,
      start_time: '10:00',
      end_time: '11:30',
      priority: 'medium',
      status: 'pending'
    });
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    setFormData({
      title: plan.title,
      description: plan.description || '',
      subject: plan.subject || 'Operating Systems',
      revision_date: plan.revision_date,
      start_time: plan.start_time || '10:00',
      end_time: plan.end_time || '11:30',
      priority: plan.priority || 'medium',
      status: plan.status || 'pending'
    });
    setActivePlan(plan);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.revision_date) {
      showToast('Title and Date are required.', 'error');
      return;
    }

    const tempId = Math.random();
    const optimisticPlan = {
      id: modalMode === 'edit' ? activePlan.id : tempId,
      ...formData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (modalMode === 'create') {
      setPlans(prev => [...prev, optimisticPlan]);
    } else {
      setPlans(prev => prev.map(p => p.id === activePlan.id ? optimisticPlan : p));
    }
    
    setIsModalOpen(false);

    try {
      const url = modalMode === 'create' ? '/api/revision-plans' : `/api/revision-plans/${activePlan.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to save revision task');
      const savedPlan = await res.json();

      setPlans(prev => prev.map(p => (p.id === tempId || p.id === activePlan?.id) ? savedPlan : p));
      showToast(modalMode === 'create' ? 'Task created.' : 'Task updated.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save task.', 'error');
      fetchPlans();
    }
  };

  const handleToggleStatus = async (plan) => {
    const nextStatus = plan.status === 'completed' ? 'pending' : 'completed';
    
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: nextStatus } : p));
    showToast(nextStatus === 'completed' ? 'Task completed.' : 'Task pending.');

    try {
      const res = await fetch(`/api/revision-plans/${plan.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.id === plan.id ? updated : p));
    } catch (err) {
      console.error(err);
      showToast('Failed to update status.', 'error');
      fetchPlans();
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Delete this revision task?')) return;

    const planToDelete = plans.find(p => p.id === id);
    setPlans(prev => prev.filter(p => p.id !== id));
    showToast('Task deleted.');

    try {
      const res = await fetch(`/api/revision-plans/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to delete task');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete task.', 'error');
      setPlans(prev => [...prev, planToDelete]);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examForm.title || !examForm.exam_date || !examForm.subject) {
      showToast('Title, subject, and date are required.', 'error');
      return;
    }

    const tempId = Math.random();
    const optimisticExam = {
      id: tempId,
      ...examForm,
      created_at: new Date().toISOString(),
    };
    setExams(prev => [...prev, optimisticExam]);
    setIsExamModalOpen(false);
    setExamForm({ title: '', exam_type: 'ut', subject: 'Operating Systems', exam_date: '', description: '' });

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examForm),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to create exam');
      const saved = await res.json();
      setExams(prev => prev.map(e => e.id === tempId ? saved : e));
      showToast('Exam added.');
    } catch (err) {
      console.error(err);
      showToast('Failed to add exam.', 'error');
      fetchExams();
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Remove this exam from calendar?')) return;

    const examToDelete = exams.find(e => e.id === id);
    setExams(prev => prev.filter(e => e.id !== id));
    showToast('Exam removed.');

    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove exam.', 'error');
      setExams(prev => [...prev, examToDelete]);
    }
  };

  const handleDragStart = (id) => {
    setDraggedPlanId(id);
  };

  const handleDrop = async (dateStr) => {
    if (!draggedPlanId) return;
    const plan = plans.find(p => p.id === draggedPlanId);
    if (!plan || plan.revision_date === dateStr) return;

    setPlans(prev => prev.map(p => p.id === draggedPlanId ? { ...p, revision_date: dateStr } : p));
    showToast(`Task rescheduled to ${dateStr}`);

    try {
      const res = await fetch(`/api/revision-plans/${draggedPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...plan, revision_date: dateStr }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to reschedule');
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.id === draggedPlanId ? updated : p));
    } catch (err) {
      console.error(err);
      showToast('Rescheduling failed.', 'error');
      fetchPlans();
    } finally {
      setDraggedPlanId(null);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startPadding = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    return days;
  };

  const getDaysInWeek = (date) => {
    const currentDayOfWeek = date.getDay();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - currentDayOfWeek);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const subjects = ['Operating Systems', 'Computer Networks', 'Database Management', 'General'];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-[#FAF9F7] border-[#C96A32] text-[#C96A32] border';
      case 'medium': return 'bg-white border-[#D7D3CF] text-[#102326] border';
      case 'low': return 'bg-[#FAF9F7] border-[#D7D3CF] text-[#666666] border';
      default: return 'bg-white border-[#D7D3CF] text-[#666666] border';
    }
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSubject = subjectFilter === 'All' || plan.subject === subjectFilter;
    const matchesStatus = statusFilter === 'All' || plan.status === statusFilter;
    return matchesSubject && matchesStatus;
  });

  const completedCount = plans.filter(p => p.status === 'completed').length;
  const totalStudyHours = plans.reduce((acc, p) => {
    if (p.status === 'completed' && p.start_time && p.end_time) {
      const [sh, sm] = p.start_time.split(':').map(Number);
      const [eh, em] = p.end_time.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60;
      return acc + (diffMins / 60);
    }
    return acc;
  }, 0);

  const getExamsForDate = (dateStr) => exams.filter(e => e.exam_date === dateStr);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-2.5 rounded-[4px] border text-xs font-mono flex items-center gap-2 ${
          toast.type === 'error' 
            ? 'bg-[#FFFDFB] border-[#D7D3CF] text-[#C96A32]' 
            : 'bg-white border-[#102326] text-[#102326]'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            REVISION & EXAM SCHEDULER
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight flex items-center gap-2">
            <CalendarCheck size={20} className="text-[#102326]" />
            Revision Planner
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">Plan revision sessions and track upcoming exams.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setExamForm({ title: '', exam_type: 'ut', subject: 'Operating Systems', exam_date: new Date().toISOString().split('T')[0], description: '' }); setIsExamModalOpen(true); }}
            className="px-4 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <GraduationCap size={14} />
            <span>ADD EXAM</span>
          </button>
          <button 
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>SCHEDULE SESSION</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[4px] p-4 border border-[#D7D3CF] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] text-[#102326] flex items-center justify-center font-mono">
            <Target size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111111] font-mono">{completedCount}</h3>
            <p className="text-[10px] font-mono text-[#666666] uppercase">COMPLETED SESSIONS</p>
          </div>
        </div>

        <div className="bg-white rounded-[4px] p-4 border border-[#D7D3CF] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] text-[#102326] flex items-center justify-center font-mono">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111111] font-mono">{totalStudyHours.toFixed(1)}h</h3>
            <p className="text-[10px] font-mono text-[#666666] uppercase">TOTAL STUDY HOURS</p>
          </div>
        </div>

        <div className="bg-white rounded-[4px] p-4 border border-[#D7D3CF] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] text-[#C96A32] flex items-center justify-center font-mono">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111111] font-mono">14 Days</h3>
            <p className="text-[10px] font-mono text-[#666666] uppercase">ACTIVE STREAK</p>
          </div>
        </div>

        <div className="bg-white rounded-[4px] p-4 border border-[#D7D3CF] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] text-[#102326] flex items-center justify-center font-mono">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111111] font-mono">{exams.length}</h3>
            <p className="text-[10px] font-mono text-[#666666] uppercase">UPCOMING EXAMS</p>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white rounded-[4px] p-4 border border-[#D7D3CF] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex bg-[#ECEAE7] border border-[#D7D3CF] p-0.5 rounded-[4px]">
            <button onClick={handlePrev} className="p-1.5 text-[#111111] hover:bg-white rounded-[2px] transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={handleNext} className="p-1.5 text-[#111111] hover:bg-white rounded-[2px] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
          <h3 className="text-sm font-bold font-mono text-[#111111] uppercase tracking-wider">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex bg-[#ECEAE7] border border-[#D7D3CF] p-0.5 rounded-[4px]">
            {['month', 'week', 'day'].map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-[2px] text-xs font-mono uppercase font-semibold transition-colors ${
                  viewMode === mode ? 'bg-[#102326] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white border border-[#D7D3CF] px-2 py-1 rounded-[4px]">
            <SlidersHorizontal size={12} className="text-[#666666]" />
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-[#111111] outline-none cursor-pointer"
            >
              <option value="All">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-[#D7D3CF] px-2 py-1 rounded-[4px]">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-[#111111] outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-white rounded-[4px] border border-[#D7D3CF] overflow-hidden flex flex-col min-h-[500px]">
          <div className="grid grid-cols-7 border-b border-[#D7D3CF] bg-[#FAF9F7]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-mono uppercase text-[#666666] font-semibold">{d}</div>
            ))}
          </div>

          {viewMode === 'month' && (
            <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-[#D7D3CF]">
              {getDaysInMonth(currentDate).map((dayObj, index) => {
                const dateStr = dayObj.date.toISOString().split('T')[0];
                const dayPlans = filteredPlans.filter(p => p.revision_date === dateStr);
                const dayExams = getExamsForDate(dateStr);
                const isToday = new Date().toDateString() === dayObj.date.toDateString();

                return (
                  <div 
                    key={index} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(dateStr)}
                    className={`min-h-[90px] p-2 flex flex-col gap-1 relative ${
                      dayObj.isCurrentMonth ? 'bg-white' : 'bg-[#FAF9F7]'
                    } ${isToday ? 'bg-[#ECEAE7]' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-mono font-bold ${
                        isToday 
                          ? 'w-5 h-5 rounded-[2px] bg-[#102326] text-white flex items-center justify-center text-[10px]' 
                          : dayObj.isCurrentMonth ? 'text-[#111111]' : 'text-[#666666]'
                      }`}>
                        {dayObj.date.getDate()}
                      </span>
                      <button 
                        onClick={() => handleOpenCreateModal(dateStr)}
                        className="text-[#666666] hover:text-[#111111]"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {dayExams.length > 0 && (
                      <div className="flex flex-col gap-0.5 mb-1">
                        {dayExams.map(exam => {
                          const style = getExamStyle(exam.exam_type);
                          return (
                            <div 
                              key={exam.id}
                              className={`px-1 py-0.5 rounded-[2px] text-[8px] font-mono uppercase tracking-wider truncate ${style.bgLight} ${style.textColor} border ${style.border}`}
                            >
                              {exam.exam_type === 'ut' ? 'UT' : 'EXAM'}: {exam.subject.substring(0, 10)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[75px]">
                      {dayPlans.map(plan => (
                        <div 
                          key={plan.id}
                          draggable
                          onDragStart={() => handleDragStart(plan.id)}
                          onClick={() => handleOpenEditModal(plan)}
                          className={`p-1 rounded-[2px] text-[9px] font-mono truncate cursor-pointer flex items-center gap-1 border ${
                            plan.status === 'completed'
                              ? 'bg-[#FAF9F7] border-[#D7D3CF] text-[#666666] line-through'
                              : getPriorityColor(plan.priority)
                          }`}
                        >
                          <span className="truncate">{plan.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-7 flex-1 divide-x divide-[#D7D3CF] min-h-[400px]">
              {getDaysInWeek(currentDate).map((day, idx) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayPlans = filteredPlans.filter(p => p.revision_date === dateStr);
                const dayExams = getExamsForDate(dateStr);
                const isToday = new Date().toDateString() === day.toDateString();

                return (
                  <div key={idx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(dateStr)}
                    className={`p-3 flex flex-col gap-2 min-h-[350px] ${isToday ? 'bg-[#ECEAE7]' : ''}`}
                  >
                    <div className="text-center pb-2 border-b border-[#D7D3CF]">
                      <span className="block text-[9px] font-mono text-[#666666] uppercase">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className={`inline-block mt-0.5 text-xs font-mono font-bold ${isToday ? 'bg-[#102326] text-white px-1.5 rounded-[2px]' : 'text-[#111111]'}`}>{day.getDate()}</span>
                    </div>

                    {dayExams.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {dayExams.map(exam => {
                          const style = getExamStyle(exam.exam_type);
                          return (
                            <div key={exam.id} className={`px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono uppercase ${style.bgLight} ${style.textColor} border ${style.border}`}>
                              {exam.title}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
                      {dayPlans.map(plan => (
                        <div key={plan.id}
                          draggable
                          onDragStart={() => handleDragStart(plan.id)}
                          onClick={() => handleOpenEditModal(plan)}
                          className={`p-2 rounded-[2px] border cursor-pointer flex flex-col gap-1 font-mono ${
                            plan.status === 'completed'
                              ? 'bg-[#FAF9F7] border-[#D7D3CF] text-[#666666] line-through'
                              : getPriorityColor(plan.priority)
                          }`}
                        >
                          <span className="font-bold text-xs truncate">{plan.title}</span>
                          {plan.start_time && (
                            <span className="text-[9px] text-[#666666] flex items-center gap-1">
                              <Clock size={9} /> {plan.start_time} - {plan.end_time}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#D7D3CF] pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-[#111111]">{currentDate.getDate()}</span>
                  <div>
                    <h4 className="font-bold text-xs text-[#111111]">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</h4>
                    <p className="text-[10px] font-mono text-[#666666] uppercase">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenCreateModal(currentDate.toISOString().split('T')[0])}
                  className="px-3 py-1.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono uppercase"
                >
                  SCHEDULE SESSION
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#D7D3CF]">
                {filteredPlans.filter(p => p.revision_date === currentDate.toISOString().split('T')[0]).map(plan => (
                  <div key={plan.id}
                    onClick={() => handleOpenEditModal(plan)}
                    className="py-3 flex justify-between items-center gap-3 cursor-pointer hover:bg-[#FAF9F7] px-2 rounded-[4px]"
                  >
                    <div className="flex gap-3 items-center">
                      <input type="checkbox" checked={plan.status === 'completed'}
                        onChange={(e) => { e.stopPropagation(); handleToggleStatus(plan); }}
                        className="w-4 h-4 rounded-[2px] border-[#D7D3CF] text-[#102326] cursor-pointer"
                      />
                      <div>
                        <h4 className={`font-bold text-xs ${plan.status === 'completed' ? 'text-[#666666] line-through' : 'text-[#111111]'}`}>{plan.title}</h4>
                        <p className="text-[10px] font-mono text-[#666666]">{plan.subject} {plan.start_time ? `• ${plan.start_time} - ${plan.end_time}` : ''}</p>
                      </div>
                    </div>
                    
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                      className="p-1 text-[#666666] hover:text-[#C96A32]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-4 space-y-2">
            <h3 className="text-[10px] font-mono uppercase text-[#666666] font-semibold pb-2 border-b border-[#D7D3CF]">EXAM TYPES</h3>
            <div className="space-y-1.5">
              {EXAM_TYPES.map(type => (
                <div key={type.value} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-[2px] ${type.color}`}></span>
                  <span className="text-xs font-mono text-[#111111]">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-4 space-y-3 flex-1">
            <h3 className="text-[10px] font-mono uppercase text-[#666666] font-semibold pb-2 border-b border-[#D7D3CF]">UPCOMING EXAMS</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {exams.map(exam => {
                const style = getExamStyle(exam.exam_type);
                return (
                  <div key={exam.id} className={`p-2.5 rounded-[4px] border ${style.bgLight} ${style.border} flex items-center justify-between`}>
                    <div>
                      <p className={`text-xs font-bold ${style.textColor}`}>{exam.title}</p>
                      <p className="text-[9px] font-mono text-[#666666]">{exam.subject} • {exam.exam_date}</p>
                    </div>
                    <button onClick={() => handleDeleteExam(exam.id)} className="text-[#666666] hover:text-[#C96A32]">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
              {exams.length === 0 && (
                <p className="text-xs font-mono text-[#666666] text-center py-4">No exams scheduled.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Task Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#D7D3CF]">
              <h3 className="text-sm font-bold text-[#111111] uppercase font-mono">
                {modalMode === 'create' ? 'Schedule Revision' : 'Edit Revision'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Title</label>
                <input type="text" required placeholder="e.g. Memory Management" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Subject</label>
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Date</label>
                <input type="date" value={formData.revision_date}
                  onChange={(e) => setFormData({ ...formData, revision_date: e.target.value })}
                  className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase">
                {modalMode === 'create' ? 'SAVE SESSION' : 'UPDATE SESSION'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exam Form */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#D7D3CF]">
              <h3 className="text-sm font-bold text-[#111111] uppercase font-mono">Add Exam</h3>
              <button onClick={() => setIsExamModalOpen(false)} className="text-[#666666] hover:text-[#111111]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Exam Title</label>
                <input type="text" required placeholder="e.g. Midterm Exam" value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Type</label>
                  <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                    className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                  >
                    {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Subject</label>
                  <select value={examForm.subject} onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                    className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Date</label>
                <input type="date" value={examForm.exam_date}
                  onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                  className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase">
                ADD EXAM
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionPlanner;
