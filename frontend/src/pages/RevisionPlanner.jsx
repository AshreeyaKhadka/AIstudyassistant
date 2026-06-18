import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Trash2, 
  Edit3, 
  Sparkles, 
  AlertCircle, 
  Flame, 
  Target, 
  TrendingUp,
  SlidersHorizontal,
  X,
  CheckCircle2,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  FileText
} from 'lucide-react';

const EXAM_TYPES = [
  { value: 'ut', label: 'Unit Test', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'assessment', label: 'Assessment', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'final', label: 'Final Board', color: 'bg-rose-500', textColor: 'text-rose-600', bgLight: 'bg-rose-50', border: 'border-rose-200' },
];

const getExamStyle = (type) => EXAM_TYPES.find(e => e.value === type) || EXAM_TYPES[0];

const RevisionPlanner = () => {
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  
  // Plans & Data State
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Exams State
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  
  // Filters State
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals & Active Plan State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [activePlan, setActivePlan] = useState(null);
  const [toast, setToast] = useState(null);

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    title: '',
    exam_type: 'ut',
    subject: 'Operating Systems',
    exam_date: '',
    description: '',
  });

  // Form State
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

  // Drag and Drop State
  const [draggedPlanId, setDraggedPlanId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Revision Plans
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

  // Fetch Exams
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

  // Form Actions
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
      showToast('Title and Date are required!', 'error');
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
      showToast(modalMode === 'create' ? 'Revision task created!' : 'Revision task updated!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save revision task. Rolling back...', 'error');
      fetchPlans();
    }
  };

  const handleToggleStatus = async (plan) => {
    const nextStatus = plan.status === 'completed' ? 'pending' : 'completed';
    
    setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, status: nextStatus } : p));
    showToast(nextStatus === 'completed' ? 'Task marked complete!' : 'Task marked pending.');

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
      showToast('Failed to update status. Rolling back...', 'error');
      fetchPlans();
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Delete this revision task?')) return;

    const planToDelete = plans.find(p => p.id === id);
    setPlans(prev => prev.filter(p => p.id !== id));
    showToast('Revision task deleted.');

    try {
      const res = await fetch(`/api/revision-plans/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to delete task');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete task. Rolling back...', 'error');
      setPlans(prev => [...prev, planToDelete]);
    }
  };

  // Exam Handlers
  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examForm.title || !examForm.exam_date || !examForm.subject) {
      showToast('Title, subject, and date are required!', 'error');
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
      showToast('Exam added to calendar!');
    } catch (err) {
      console.error(err);
      showToast('Failed to add exam. Rolling back...', 'error');
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
      showToast('Failed to remove exam. Rolling back...', 'error');
      setExams(prev => [...prev, examToDelete]);
    }
  };

  // Drag and Drop Handlers
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
      showToast('Rescheduling failed. Rolling back...', 'error');
      fetchPlans();
    } finally {
      setDraggedPlanId(null);
    }
  };

  // Calendar Helpers
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
      case 'high': return 'bg-rose-50 border-rose-100 text-rose-600 border';
      case 'medium': return 'bg-blue-50 border-blue-100 text-blue-600 border';
      case 'low': return 'bg-slate-50 border-slate-100 text-slate-500 border';
      default: return 'bg-slate-50 border-slate-100 text-slate-500 border';
    }
  };

  const getPriorityDot = (priority) => {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-slate-400';
      default: return 'bg-slate-400';
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
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl border text-sm font-bold shadow-lg flex items-center gap-2.5 backdrop-blur-xl ${
              toast.type === 'error' 
                ? 'bg-rose-50/90 border-rose-100 text-rose-600 shadow-rose-500/5' 
                : 'bg-emerald-50/90 border-emerald-100 text-emerald-600 shadow-emerald-500/5'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="text-indigo-600" size={24} /> Calendar
          </h2>
          <p className="text-sm text-slate-500 mt-1">Plan revision sessions, track exams, and stay on top of your schedule.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setExamForm({ title: '', exam_type: 'ut', subject: 'Operating Systems', exam_date: new Date().toISOString().split('T')[0], description: '' }); setIsExamModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-200 text-indigo-700 rounded-2xl text-sm font-extrabold hover:bg-indigo-50 transition-all hover:scale-[1.01]"
          >
            <GraduationCap size={16} strokeWidth={2.5} />
            Add Exam
          </button>
          <button 
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-extrabold hover:bg-indigo-700 shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.01]"
          >
            <Plus size={16} strokeWidth={2.5} />
            Schedule Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/30 group-hover:scale-105 transition-transform duration-300">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{completedCount}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Sessions Completed</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/30 group-hover:scale-105 transition-transform duration-300">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{totalStudyHours.toFixed(1)}h</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Total Study Hours</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100/30 group-hover:scale-105 transition-transform duration-300">
            <Flame size={20} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">14 Days</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Active Study Streak</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex items-center gap-4 group">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/30 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap size={20} />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{exams.length}</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Upcoming Exams</p>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.012)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl shadow-sm">
            <button onClick={handlePrev} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={handleNext} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <h3 className="text-base font-extrabold text-slate-700 tracking-tight">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl shadow-sm">
            {['month', 'week', 'day'].map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  viewMode === mode ? 'bg-white text-indigo-600 shadow-sm border border-slate-100/50' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-100 hidden sm:block"></div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
            <SlidersHorizontal size={12} className="text-slate-400 ml-2" />
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none pr-3 cursor-pointer py-1"
            >
              <option value="All">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1 rounded-xl">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none pr-3 cursor-pointer py-1"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Calendar + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Calendar Grid */}
        <div className="xl:col-span-3 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col min-h-[600px]">
          
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Monthly View */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-slate-100">
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
                    className={`min-h-[100px] p-2 flex flex-col gap-1 transition-all relative ${
                      dayObj.isCurrentMonth ? 'bg-white' : 'bg-slate-50/30'
                    } ${isToday ? 'bg-indigo-50/20' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold ${
                        isToday 
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20' 
                          : dayObj.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {dayObj.date.getDate()}
                      </span>
                      <button 
                        onClick={() => handleOpenCreateModal(dateStr)}
                        className="opacity-0 hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Exam Markers */}
                    {dayExams.length > 0 && (
                      <div className="flex flex-col gap-0.5 mb-1">
                        {dayExams.map(exam => {
                          const style = getExamStyle(exam.exam_type);
                          return (
                            <div 
                              key={exam.id}
                              className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider truncate ${style.bgLight} ${style.textColor} border ${style.border}`}
                              title={`${exam.title} - ${exam.subject}`}
                            >
                              {exam.exam_type === 'ut' ? 'UT' : exam.exam_type === 'assessment' ? 'ASS' : 'FIN'}: {exam.subject.substring(0, 12)}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Revision Tasks */}
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                      {dayPlans.map(plan => (
                        <div 
                          key={plan.id}
                          draggable
                          onDragStart={() => handleDragStart(plan.id)}
                          onClick={() => handleOpenEditModal(plan)}
                          className={`p-1.5 rounded-lg text-[10px] font-bold truncate cursor-grab active:cursor-grabbing hover:translate-x-0.5 transition-transform flex items-center gap-1.5 border shadow-sm ${
                            plan.status === 'completed'
                              ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                              : getPriorityColor(plan.priority)
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            plan.status === 'completed' ? 'bg-slate-300' : getPriorityDot(plan.priority)
                          }`}></span>
                          <span className="truncate">{plan.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weekly View */}
          {viewMode === 'week' && (
            <div className="grid grid-cols-7 flex-1 divide-x divide-slate-100 min-h-[450px]">
              {getDaysInWeek(currentDate).map((day, idx) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayPlans = filteredPlans.filter(p => p.revision_date === dateStr);
                const dayExams = getExamsForDate(dateStr);
                const isToday = new Date().toDateString() === day.toDateString();

                return (
                  <div key={idx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(dateStr)}
                    className={`p-4 flex flex-col gap-3 min-h-[400px] transition-all ${isToday ? 'bg-indigo-50/20' : ''}`}
                  >
                    <div className="text-center pb-2 border-b border-slate-100">
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className={`inline-block mt-1 text-sm font-black w-7 h-7 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'
                      }`}>{day.getDate()}</span>
                    </div>

                    {/* Exam markers for week view */}
                    {dayExams.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {dayExams.map(exam => {
                          const style = getExamStyle(exam.exam_type);
                          return (
                            <div key={exam.id} className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase ${style.bgLight} ${style.textColor} border ${style.border}`}>
                              {exam.title}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[350px] custom-scrollbar">
                      {dayPlans.map(plan => (
                        <div key={plan.id}
                          draggable
                          onDragStart={() => handleDragStart(plan.id)}
                          onClick={() => handleOpenEditModal(plan)}
                          className={`p-3 rounded-xl border cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-all flex flex-col gap-1.5 shadow-sm ${
                            plan.status === 'completed'
                              ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                              : getPriorityColor(plan.priority)
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${plan.status === 'completed' ? 'bg-slate-300' : getPriorityDot(plan.priority)}`}></span>
                            <span className="font-bold text-xs truncate">{plan.title}</span>
                          </div>
                          {plan.start_time && (
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {plan.start_time} - {plan.end_time}
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

          {/* Daily View */}
          {viewMode === 'day' && (
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-800">{currentDate.getDate()}</span>
                  <div>
                    <h4 className="font-extrabold text-slate-700">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenCreateModal(currentDate.toISOString().split('T')[0])}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Schedule Session
                </button>
              </div>

              {/* Day's Exams */}
              {getExamsForDate(currentDate.toISOString().split('T')[0]).length > 0 && (
                <div className="space-y-2">
                  {getExamsForDate(currentDate.toISOString().split('T')[0]).map(exam => {
                    const style = getExamStyle(exam.exam_type);
                    return (
                      <div key={exam.id} className={`flex items-center justify-between p-3 rounded-xl border ${style.bgLight} ${style.border}`}>
                        <div className="flex items-center gap-3">
                          <GraduationCap size={18} className={style.textColor} />
                          <div>
                            <p className={`text-sm font-bold ${style.textColor}`}>{exam.title}</p>
                            <p className="text-xs text-slate-500">{exam.subject} &middot; {exam.exam_type.toUpperCase()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100">
                {filteredPlans.filter(p => p.revision_date === currentDate.toISOString().split('T')[0]).map(plan => (
                  <div key={plan.id}
                    onClick={() => handleOpenEditModal(plan)}
                    className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 group cursor-pointer hover:bg-slate-50/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex gap-3.5 items-start">
                      <div className="mt-1">
                        <input type="checkbox" checked={plan.status === 'completed'}
                          onChange={(e) => { e.stopPropagation(); handleToggleStatus(plan); }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 focus:ring-2 cursor-pointer transition-colors"
                        />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${plan.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{plan.title}</h4>
                        <p className="text-xs text-slate-400 mt-1">{plan.description || 'No description provided'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100/30">{plan.subject}</span>
                          {plan.start_time && (
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock size={11} /> {plan.start_time} - {plan.end_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-lg border tracking-wide ${getPriorityColor(plan.priority)}`}>
                        {plan.priority} Priority
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {filteredPlans.filter(p => p.revision_date === currentDate.toISOString().split('T')[0]).length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <CalendarIcon size={32} className="text-slate-300 mb-2.5" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No study slots scheduled</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          
          {/* Exam Legend */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] p-6">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-3">Exam Types</h3>
            <div className="space-y-2">
              {EXAM_TYPES.map(type => (
                <div key={type.value} className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${type.color}`}></span>
                  <span className="text-xs font-bold text-slate-600">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] p-6 flex flex-col min-h-[280px] max-h-[350px] overflow-hidden">
            <div className="border-b border-slate-100/80 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Upcoming Exams</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Next 30 Days</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
              {exams.filter(e => {
                const d = new Date(e.exam_date);
                const now = new Date();
                const limit = new Date();
                limit.setDate(limit.getDate() + 30);
                return d >= now && d <= limit;
              }).slice(0, 5).map(exam => {
                const style = getExamStyle(exam.exam_type);
                return (
                  <div key={exam.id} className={`p-3 rounded-xl border ${style.bgLight} ${style.border} flex items-center justify-between`}>
                    <div>
                      <p className={`text-xs font-bold ${style.textColor}`}>{exam.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{exam.subject}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteExam(exam.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
              {exams.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <GraduationCap size={28} className="text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No exams scheduled</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Revision */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] p-6 flex flex-col min-h-[320px] max-h-[420px] overflow-hidden">
            <div className="border-b border-slate-100/80 pb-4 mb-4">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Upcoming Revision</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pending Sessions</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1">
              {filteredPlans.filter(p => p.status === 'pending').slice(0, 5).map(plan => (
                <div key={plan.id}
                  onClick={() => handleOpenEditModal(plan)}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-[0_8px_20px_rgba(0,0,0,0.012)] transition-all cursor-pointer group flex justify-between items-start"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-slate-700 truncate pr-2 group-hover:text-indigo-600 transition-colors">{plan.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      {new Date(plan.revision_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {plan.start_time && ` • ${plan.start_time}`}
                    </p>
                    <span className="inline-block mt-2 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/20">
                      {plan.subject}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(plan); }}
                    className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-200/50 hover:border-emerald-100 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {filteredPlans.filter(p => p.status === 'pending').length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={32} className="text-emerald-500 mb-2.5 animate-pulse" />
                  <h4 className="text-xs font-bold text-slate-700">All Revisions Done</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Time for a break</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revision Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            ></motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl p-7 z-10 overflow-hidden"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
                <X size={16} />
              </button>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                <CalendarIcon size={18} className="text-indigo-600" />
                {modalMode === 'create' ? 'Schedule Revision' : 'Edit Revision'}
              </h3>
              <form onSubmit={handleSavePlan} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Revision Title</label>
                  <input type="text" placeholder="e.g. Process Synchronization rules" value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <textarea placeholder="e.g. Study Semaphores and Peterson's Solution." value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="2.5"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all placeholder:text-slate-400 resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Subject</label>
                    <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all"
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1.5">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                    <input type="date" value={formData.revision_date}
                      onChange={(e) => setFormData({ ...formData, revision_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Start</label>
                    <input type="time" value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">End</label>
                    <input type="time" value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex gap-3.5 pt-4">
                  {modalMode === 'edit' && (
                    <button type="button" onClick={() => handleDeletePlan(activePlan.id)}
                      className="flex-1 py-3 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                  <button type="submit"
                    className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} /> {modalMode === 'create' ? 'Schedule Session' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exam Modal */}
      <AnimatePresence>
        {isExamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExamModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            ></motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-7 z-10 overflow-hidden"
            >
              <button onClick={() => setIsExamModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
                <X size={16} />
              </button>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                <GraduationCap size={18} className="text-indigo-600" />
                Add Exam to Calendar
              </h3>
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Exam Title</label>
                  <input type="text" placeholder="e.g. Midterm Exam" value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Exam Type</label>
                    <select value={examForm.exam_type} onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all"
                    >
                      {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Subject</label>
                    <select value={examForm.subject} onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all"
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={examForm.exam_date}
                    onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                  <textarea placeholder="e.g. Chapters 1-5, focus on processes" value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-150 focus:border-indigo-500 focus:bg-white focus:outline-none rounded-xl text-sm font-semibold transition-all placeholder:text-slate-400 resize-none"
                  ></textarea>
                </div>
                <button type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-indigo-500/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <GraduationCap size={14} /> Add Exam
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #cbd5e1; }
      `}} />
    </div>
  );
};

export default RevisionPlanner;
