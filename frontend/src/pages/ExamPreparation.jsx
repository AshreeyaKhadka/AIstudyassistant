import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, FileText, CheckSquare, Zap, BookOpen, Sparkles, Trophy,
  Calendar, ChevronLeft, Loader2, Download, X, Clock, AlertCircle,
  ArrowRight, Play, RotateCcw
} from 'lucide-react';
import { getSubjectStyle } from '../utils/subjectColors';

const INTENSITY_KEY = 'exam_prep_ai_intensity';
const INTENSITY_OPTIONS = [
  { id: 'low', label: 'Focused', desc: 'Fewer, easier suggestions' },
  { id: 'medium', label: 'Balanced', desc: 'Default exam prep depth' },
  { id: 'high', label: 'Aggressive', desc: 'More content, harder focus' },
];

const TOOLS = [
  { id: 'high-yield', icon: FileText, title: 'Exam Questions', desc: 'Pokhara University-style 5 and 8 mark practice' },
  { id: 'mock-battle', icon: Target, title: 'Mock Battles', desc: 'Timed exam simulation' },
  { id: 'blueprint', icon: CheckSquare, title: 'Blueprint Sheets', desc: 'One-page visual summary' },
  { id: 'rapid-revision', icon: Zap, title: 'Rapid Revision', desc: 'Fast key-term flip deck' },
];

const ExamPreparation = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedExamUploadId, setSelectedExamUploadId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState(null);
  const [toolResult, setToolResult] = useState(null);
  const [intensity, setIntensity] = useState(() => localStorage.getItem(INTENSITY_KEY) || 'medium');
  const [showIntensity, setShowIntensity] = useState(false);
  const [examDateModal, setExamDateModal] = useState(null);
  const [examDateValue, setExamDateValue] = useState('');
  const [savingExamDate, setSavingExamDate] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam-prep/overview', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load exam prep data');
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleIntensityChange = (value) => {
    setIntensity(value);
    localStorage.setItem(INTENSITY_KEY, value);
    setShowIntensity(false);
  };

  const openSubject = (subject) => {
    setSelectedSubject(subject);
    setSelectedExamUploadId(subject?.eligible_materials?.[0]?.id || null);
  };

  const openTool = (toolId, subject = null, uploadId = selectedExamUploadId) => {
    const sourcedSubject = subject ? { ...subject, primary_upload_id: uploadId } : subject;
    setActiveTool(toolId);
    setSelectedSubject(subject);
    setToolResult(null);
    setToolError(null);
    if (toolId !== 'mock-battle') {
      runTool(toolId, sourcedSubject);
    } else {
      loadMockBattle(sourcedSubject);
    }
  };

  const runTool = async (toolId, subject) => {
    if (!subject?.primary_upload_id) {
      setToolError('Choose one ready PDF before generating study material.');
      return;
    }

    setToolLoading(true);
    setToolError(null);
    const endpoints = {
      'high-yield': '/api/exam-prep/high-yield',
      blueprint: '/api/exam-prep/blueprint',
      'rapid-revision': '/api/exam-prep/rapid-revision',
    };

    try {
      const res = await fetch(endpoints[toolId], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject?.name,
          upload_id: subject?.primary_upload_id,
          intensity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tool failed');
      setToolResult(data);
    } catch (err) {
      setToolError(err.message);
    } finally {
      setToolLoading(false);
    }
  };

  const loadMockBattle = async (subject) => {
    if (!subject?.primary_upload_id) {
      setToolError('No approved indexed material found. Upload syllabus-aligned notes, slides, or PDFs in Study Vault first.');
      return;
    }
    setToolLoading(true);
    setToolError(null);
    try {
      const res = await fetch('/api/exam-prep/mock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject.name,
          upload_id: subject.primary_upload_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load mock exam');
      if (!data.mock_test?.sections?.length) {
        setToolError('Mock test generation returned no exam sections.');
        return;
      }
      setToolResult({
        type: 'mock-test',
        ...data.mock_test,
        assessment_id: data.assessment_id,
        source_doc: data.source_doc,
        subject: data.subject || subject.name,
      });
    } catch (err) {
      setToolError(err.message);
    } finally {
      setToolLoading(false);
    }
  };

  const saveExamDate = async () => {
    if (!examDateModal || !examDateValue) return;
    setSavingExamDate(true);
    try {
      const res = await fetch('/api/exam-prep/exam-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject: examDateModal.name, exam_date: examDateValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setOverview(data.overview);
      setExamDateModal(null);
      setExamDateValue('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingExamDate(false);
    }
  };

  const downloadGuide = () => {
    if (!overview?.subjects?.length) return;
    const rows = overview.subjects.map((s) =>
      `<tr><td>${s.name}</td><td>${s.materials_count}</td><td>${s.weak_topics}</td><td>${s.days_until_exam ?? '—'}</td><td>${s.status_label}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Exam Prep Guide</title>
      <style>body{font-family:Georgia,serif;padding:40px;color:#111}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#102326;color:#fff}</style></head>
      <body><h1>Exam Preparation Guide</h1>
      <p>Generated ${new Date().toLocaleDateString()}. Subjects sorted by urgency.</p>
      <table><thead><tr><th>Subject</th><th>Ready PDFs</th><th>Weak Areas</th><th>Days Left</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam-prep-guide.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBlueprint = (blueprint, subject) => {
    const sections = (blueprint?.sections || []).map((sec) =>
      `<h3>${sec.heading}</h3><ul>${(sec.items || []).map((i) => `<li>${i}</li>`).join('')}</ul>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject} Blueprint</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#111}
      h1{border-bottom:2px solid #102326;padding-bottom:8px}h3{color:#102326;margin-top:24px}ul{line-height:1.6}</style></head>
      <body><h1>${blueprint?.title || subject + ' Blueprint'}</h1>${sections}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.replace(/\s+/g, '-').toLowerCase()}-blueprint.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#102326]" size={28} />
      </div>
    );
  }

  if (selectedSubject && !activeTool) {
    return (
      <SubjectDetailView
        subject={selectedSubject}
        intensity={intensity}
        selectedUploadId={selectedExamUploadId}
        onSelectUpload={setSelectedExamUploadId}
        onBack={() => { setSelectedSubject(null); setSelectedExamUploadId(null); }}
        onSetExamDate={(s) => { setExamDateModal(s); setExamDateValue(s.exam?.exam_date || ''); }}
        onOpenTool={(toolId) => openTool(toolId, selectedSubject, selectedExamUploadId)}
      />
    );
  }

  const subjects = overview?.subjects || [];
  const nearest = overview?.nearest_exam;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            EXAM STRATEGY & REVISION
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Exam Preparation</h1>
          <p className="text-xs text-[#666666] mt-0.5">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} with ready PDFs · sorted by urgency
          </p>
          {nearest && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-[#FFFDFB] border border-[#C96A32] rounded-[4px]">
              <Clock size={14} className="text-[#C96A32]" />
              <span className="text-xs font-mono font-semibold text-[#C96A32]">
                {nearest.subject}: {nearest.days_left} day{nearest.days_left !== 1 ? 's' : ''} left
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={downloadGuide}
            disabled={!subjects.length}
            className="px-4 py-2 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download size={14} />
            <span>Download Guide</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowIntensity((v) => !v)}
              className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>AI Intensity: {INTENSITY_OPTIONS.find((o) => o.id === intensity)?.label}</span>
            </button>
            {showIntensity && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#D7D3CF] rounded-[4px] shadow-lg w-56 p-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleIntensityChange(opt.id)}
                    className={`w-full text-left px-3 py-2 rounded-[4px] text-xs hover:bg-[#FAF9F7] ${intensity === opt.id ? 'bg-[#ECEAE7]' : ''}`}
                  >
                    <div className="font-bold text-[#111111]">{opt.label}</div>
                    <div className="text-[#666666] font-mono text-[10px]">{opt.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FFFDFB] border border-[#C96A32] rounded-[4px] flex items-center gap-2 text-xs font-mono text-[#C96A32]">
          <AlertCircle size={16} />
          {error}
          <button onClick={fetchOverview} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool) => (
          <PrepCard
            key={tool.id}
            icon={tool.icon}
            title={tool.title}
            desc={tool.desc}
            onClick={() => {
              const topSubject = subjects[0];
              if (topSubject) openSubject(topSubject);
              else setToolError('Add subjects and materials to use this tool.');
            }}
          />
        ))}
      </div>

      {/* Subject Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">
            Subject-Specific Tactics · Priority Order
          </h4>
          <span className="text-[10px] font-mono text-[#666666]">{subjects.length} subjects</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => openSubject(subject)}
              onSetExamDate={(e) => {
                e.stopPropagation();
                setExamDateModal(subject);
                setExamDateValue(subject.exam?.exam_date || '');
              }}
            />
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[4px] border border-dashed border-[#D7D3CF] p-8">
              <Trophy size={32} className="text-[#666666] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#111111]">No exam-ready PDFs yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#666666]">Upload a subject PDF in Uploaded Materials and wait for validation and indexing. It will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {/* Exam Date Modal */}
      {examDateModal && (
        <Modal onClose={() => setExamDateModal(null)} title={`Set exam date — ${examDateModal.name}`}>
          <label className="text-[10px] font-mono uppercase text-[#666666] font-semibold">Exam date</label>
          <input
            type="date"
            value={examDateValue}
            onChange={(e) => setExamDateValue(e.target.value)}
            className="w-full mt-1 mb-4 px-3 py-2 border border-[#D7D3CF] rounded-[4px] text-sm font-mono"
          />
          <button
            onClick={saveExamDate}
            disabled={!examDateValue || savingExamDate}
            className="w-full py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase disabled:opacity-50"
          >
            {savingExamDate ? 'Saving…' : 'Save exam date'}
          </button>
        </Modal>
      )}

      {/* Tool Modal */}
      {activeTool && (
        <ToolModal
          toolId={activeTool}
          subject={selectedSubject}
          loading={toolLoading}
          error={toolError}
          result={toolResult}
          intensity={intensity}
          onClose={() => { setActiveTool(null); setToolResult(null); setToolError(null); }}
          onDownloadBlueprint={downloadBlueprint}
          onRetry={() => {
            const sourcedSubject = { ...selectedSubject, primary_upload_id: selectedExamUploadId };
            return activeTool === 'mock-battle' ? loadMockBattle(sourcedSubject) : runTool(activeTool, sourcedSubject);
          }}
        />
      )}
    </div>
  );
};

const SubjectCard = ({ subject, onClick, onSetExamDate }) => {
  const style = getSubjectStyle(subject.name);
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[4px] p-5 border ${style.border} flex flex-col gap-3 hover:border-[#102326] transition-colors cursor-pointer`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${style.bg} ${style.text} rounded-[4px] flex items-center justify-center shrink-0`}>
          <BookOpen size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#111111] truncate">{subject.name}</p>
          <span className={`inline-block mt-1 text-[9px] font-mono uppercase px-2 py-0.5 rounded-[2px] ${style.bg} ${style.text} font-semibold`}>
            {subject.status_label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-[#666666]">
        <span>{subject.materials_count} ready PDF{subject.materials_count !== 1 ? 's' : ''}</span>
        {subject.days_until_exam != null ? (
          <span className="text-[#C96A32] font-semibold">{subject.days_until_exam}d left</span>
        ) : (
          <button
            onClick={onSetExamDate}
            className="text-[#102326] hover:underline inline-flex items-center gap-0.5"
          >
            <Calendar size={11} /> Set date
          </button>
        )}
      </div>
    </div>
  );
};

const SubjectDetailView = ({ subject, selectedUploadId, onSelectUpload, onBack, onSetExamDate, onOpenTool }) => {
  const style = getSubjectStyle(subject.name);
  return (
    <div className="flex flex-col gap-6 pb-12">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-xs font-mono text-[#666666] hover:text-[#111111] w-fit">
        <ChevronLeft size={14} /> Back to all subjects
      </button>

      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-[2px] ${style.bg} ${style.text} font-semibold`}>
              {subject.name}
            </span>
            <h2 className="text-xl font-bold text-[#111111] mt-2">{subject.status_label}</h2>
            <div className="flex gap-4 mt-2 text-xs font-mono text-[#666666]">
              <span>{subject.materials_count} ready PDF{subject.materials_count !== 1 ? 's' : ''}</span>
              <span>{subject.weak_topics} weak area{subject.weak_topics !== 1 ? 's' : ''}</span>
              {subject.last_practiced && <span>Last: {subject.last_practiced}</span>}
            </div>
          </div>
          <button
            onClick={() => onSetExamDate(subject)}
            className="px-4 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono font-semibold uppercase inline-flex items-center gap-1.5 hover:bg-[#FAF9F7]"
          >
            <Calendar size={14} />
            {subject.days_until_exam != null ? `${subject.days_until_exam} days left · Edit` : 'Set exam date'}
          </button>
        </div>
      </div>

      <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-[#111111]">Choose the source PDF</h3>
          <p className="mt-1 text-xs text-[#666666]">Questions are generated from one selected PDF only.</p>
        </div>
        {subject.eligible_materials?.length ? (
          <div className="space-y-2">
            {subject.eligible_materials.map((material) => (
              <label key={material.id} className={`flex cursor-pointer items-center gap-3 rounded-[4px] border p-3 ${selectedUploadId === material.id ? 'border-[#102326] bg-[#F1F5F4]' : 'border-[#D7D3CF] hover:bg-[#FAF9F7]'}`}>
                <input type="radio" name="exam-source" checked={selectedUploadId === material.id} onChange={() => onSelectUpload(material.id)} className="accent-[#102326]" />
                <FileText size={16} className="shrink-0 text-[#102326]" />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{material.filename}</span><span className="block text-[10px] font-mono text-[#666666]">{material.page_count ? `${material.page_count} pages` : 'Ready PDF'}</span></span>
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-[4px] border border-dashed border-[#D7D3CF] p-4 text-xs text-[#666666]">No approved, indexed PDF is available for this subject.</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <PrepCard
            key={tool.id}
            icon={tool.icon}
            title={tool.title}
            desc={tool.desc}
            onClick={() => selectedUploadId && onOpenTool(tool.id)}
            disabled={!selectedUploadId}
            large
          />
        ))}
      </div>
    </div>
  );
};

const PrepCard = ({ icon, title, desc, onClick, large, disabled = false }) => {
  const ToolIcon = icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-white p-5 rounded-[4px] border border-[#D7D3CF] space-y-2 text-left hover:border-[#102326] transition-colors w-full disabled:cursor-not-allowed disabled:opacity-50 ${large ? '' : ''}`}
    >
      <div className="w-8 h-8 rounded-[4px] bg-[#ECEAE7] text-[#102326] flex items-center justify-center">
        <ToolIcon size={18} />
      </div>
      <div>
        <h5 className="text-xs font-bold text-[#111111]">{title}</h5>
        <p className="text-[10px] font-mono text-[#666666] mt-0.5">{desc}</p>
      </div>
    </button>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-[4px] border border-[#D7D3CF] w-full max-w-md p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#111111]">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-[#ECEAE7] rounded-[4px]"><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
);

const ToolModal = ({ toolId, subject, loading, error, result, onClose, onDownloadBlueprint, onRetry }) => {
  const toolMeta = TOOLS.find((t) => t.id === toolId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-[4px] border border-[#D7D3CF] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[#D7D3CF] shrink-0">
          <div>
            <h3 className="text-sm font-bold text-[#111111]">{toolMeta?.title}</h3>
            {subject && <p className="text-[10px] font-mono text-[#666666] mt-0.5">{subject.name}</p>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#ECEAE7] rounded-[4px]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="animate-spin text-[#102326]" size={28} />
              <p className="text-xs font-mono text-[#666666]">Generating…</p>
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-8 space-y-3">
              <AlertCircle size={28} className="text-[#C96A32] mx-auto" />
              <p className="text-xs font-mono text-[#666666]">{error}</p>
              <button onClick={onRetry} className="text-xs font-mono underline text-[#102326]">Retry</button>
            </div>
          )}
          {!loading && !error && result && toolId === 'high-yield' && (
            <HighYieldView questions={result.questions} source={result.source_doc} disclaimer={result.disclaimer} />
          )}
          {!loading && !error && result && toolId === 'blueprint' && (
            <BlueprintView
              blueprint={result.blueprint}
              onDownload={() => onDownloadBlueprint(result.blueprint, result.subject)}
            />
          )}
          {!loading && !error && result && toolId === 'rapid-revision' && (
            <RapidRevisionView cards={result.cards} />
          )}
          {!loading && !error && result && toolId === 'mock-battle' && (
            result.sections ? (
              <MockTestView test={result} />
            ) : (
              <MockBattleView quizSet={result} onClose={onClose} />
            )
          )}
        </div>
      </div>
    </div>
  );
};

const HighYieldView = ({ questions, source, disclaimer }) => (
  <div className="space-y-4">
    <div className="rounded-[4px] border border-[#D7A17E] bg-[#FFF8F3] p-3 text-xs leading-5 text-[#6B432B]">
      <span className="font-semibold">AI-generated suggestion:</span> {disclaimer}
    </div>
    <p className="text-[10px] font-mono text-[#666666] uppercase">Only source: {source}</p>
    {questions?.map((q, i) => (
      <div key={i} className="border border-[#D7D3CF] rounded-[4px] p-4">
        <div className="flex gap-2 mb-2">
          <span className="text-[10px] font-mono bg-[#ECEAE7] px-2 py-0.5 rounded-[2px] uppercase">{q.type?.replace('_', ' ')}</span>
          <span className="text-[10px] font-mono text-[#666666]">{q.marks} marks</span>
          <span className="text-[10px] font-mono text-[#666666]">Page {q.source_page}</span>
        </div>
        <p className="text-sm font-medium text-[#111111]">{q.question}</p>
        {q.key_points?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {q.key_points.map((kp, j) => (
              <li key={j} className="text-xs text-[#666666] flex gap-1.5"><span className="text-[#C96A32]">•</span>{kp}</li>
            ))}
          </ul>
        )}
        {q.source_basis && (
          <p className="mt-3 border-t border-[#D7D3CF] pt-2 text-[10px] leading-4 text-[#777777]">
            Grounding from page {q.source_page}: &quot;{q.source_basis}&quot;
          </p>
        )}
      </div>
    ))}
  </div>
);

const BlueprintView = ({ blueprint, onDownload }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-bold text-[#111111]">{blueprint?.title}</h4>
      <button onClick={onDownload} className="px-3 py-1.5 border border-[#102326] text-[#102326] rounded-[4px] text-[10px] font-mono font-semibold uppercase inline-flex items-center gap-1 hover:bg-[#102326] hover:text-white transition-colors">
        <Download size={12} /> Download
      </button>
    </div>
    {blueprint?.sections?.map((sec, i) => (
      <div key={i} className="border border-[#D7D3CF] rounded-[4px] p-4">
        <h5 className="text-xs font-bold text-[#102326] mb-2">{sec.heading}</h5>
        <ul className="space-y-1">
          {(sec.items || []).map((item, j) => (
            <li key={j} className="text-xs text-[#666666]">{item}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const RapidRevisionView = ({ cards }) => {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = cards?.[index];
  if (!card) return <p className="text-xs font-mono text-[#666666]">No cards generated.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-[10px] font-mono text-[#666666]">
        <span>Card {index + 1} of {cards.length}</span>
        <button onClick={() => { setIndex(0); setRevealed(false); }} className="inline-flex items-center gap-1 hover:text-[#111111]"><RotateCcw size={11} /> Reset</button>
      </div>
      <div
        onClick={() => setRevealed((v) => !v)}
        className="min-h-[160px] border border-[#D7D3CF] rounded-[4px] p-6 flex items-center justify-center text-center cursor-pointer hover:bg-[#FAF9F7] transition-colors"
      >
        <p className="text-sm font-medium text-[#111111]">{revealed ? card.definition : card.term}</p>
      </div>
      <p className="text-[10px] font-mono text-[#666666] text-center">Tap to {revealed ? 'hide' : 'reveal'}</p>
      <div className="flex gap-2">
        <button disabled={index === 0} onClick={() => { setIndex((i) => i - 1); setRevealed(false); }} className="flex-1 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono disabled:opacity-30">Prev</button>
        <button disabled={index >= cards.length - 1} onClick={() => { setIndex((i) => i + 1); setRevealed(false); }} className="flex-1 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono disabled:opacity-30">Next</button>
      </div>
    </div>
  );
};

const MockTestView = ({ test }) => {
  const sections = test.sections || [];
  return (
    <div className="space-y-4">
      <div className="border border-[#D7D3CF] rounded-[4px] p-4 bg-[#FAF9F7]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-[#111111]">{test.title || `${test.subject} Mock Test`}</h4>
            <p className="text-[10px] font-mono text-[#666666] mt-0.5">Source: {test.source_doc || 'Approved study material'}</p>
          </div>
          <div className="flex gap-2 text-[10px] font-mono">
            <span className="px-2 py-1 border border-[#D7D3CF] bg-white rounded-[2px]">{test.duration_minutes || 120} min</span>
            <span className="px-2 py-1 border border-[#D7D3CF] bg-white rounded-[2px]">{test.total_marks || 50} marks</span>
          </div>
        </div>
      </div>

      {sections.map((section, sectionIndex) => (
        <div key={`${section.name || 'section'}-${sectionIndex}`} className="border border-[#D7D3CF] rounded-[4px] overflow-hidden">
          <div className="px-4 py-3 bg-[#102326] text-white flex items-center justify-between gap-2">
            <h5 className="text-xs font-bold">{section.name || `Section ${sectionIndex + 1}`}</h5>
            <span className="text-[10px] font-mono">{section.marks_each || '?'} mark each</span>
          </div>
          <div className="divide-y divide-[#D7D3CF]">
            {(section.questions || []).map((q, qIndex) => (
              <div key={qIndex} className="p-4 space-y-2">
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#666666]">
                  <span>Q{qIndex + 1}</span>
                  <span>{q.marks || section.marks_each || '?'} marks</span>
                  {q.question_style && <span>{String(q.question_style).replace('_', ' ')}</span>}
                  {q.difficulty && <span>{q.difficulty}</span>}
                  {q.topic_title && <span>{q.topic_title}</span>}
                  {q.page_number ? <span>Page {q.page_number}</span> : null}
                </div>
                <p className="text-sm font-medium text-[#111111]">{q.question}</p>
                {q.answer_points?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Expected points</p>
                    <ul className="space-y-1">
                      {q.answer_points.map((point, pointIndex) => (
                        <li key={pointIndex} className="text-xs text-[#666666] flex gap-1.5">
                          <span className="text-[#C96A32]">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const MockBattleView = ({ quizSet, onClose }) => {
  const questions = quizSet.questions || [];
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60);

  useEffect(() => {
    if (!started || finished) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setFinished(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, finished]);

  const q = questions[index];
  const options = q?.options;
  const optionEntries = options && typeof options === 'object' && !Array.isArray(options)
    ? Object.entries(options)
    : Array.isArray(options) ? options.map((o, i) => [String.fromCharCode(65 + i), o]) : [];

  const scoreQuiz = () => {
    let score = 0;
    questions.forEach((question, i) => {
      const selected = answers[i];
      const correct = question.correct || question.correct_answer;
      if (selected === correct) score += 1;
    });
    return score;
  };

  const submitBattle = async () => {
    setFinished(true);
    if (quizSet.id) {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quiz_set_id: quizSet.id, answers }),
      });
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (!started) {
    return (
      <div className="text-center py-8 space-y-4">
        <Target size={32} className="text-[#102326] mx-auto" />
        <p className="text-sm font-bold text-[#111111]">{questions.length} questions · 20 minute timer</p>
        <p className="text-xs font-mono text-[#666666]">{quizSet.topic}</p>
        <button onClick={() => setStarted(true)} className="px-6 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase inline-flex items-center gap-1.5">
          <Play size={14} /> Start mock battle
        </button>
      </div>
    );
  }

  if (finished) {
    const score = scoreQuiz();
    return (
      <div className="text-center py-8 space-y-3">
        <Trophy size={32} className="text-[#C96A32] mx-auto" />
        <p className="text-2xl font-bold font-mono text-[#111111]">{score}/{questions.length}</p>
        <p className="text-xs font-mono text-[#666666]">Mock battle complete</p>
        <button onClick={onClose} className="px-4 py-2 border border-[#102326] rounded-[4px] text-xs font-mono uppercase">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-[10px] font-mono text-[#666666]">
        <span>Q{index + 1}/{questions.length}</span>
        <span className={timeLeft < 120 ? 'text-[#C96A32] font-bold' : ''}>{mins}:{secs.toString().padStart(2, '0')}</span>
      </div>
      <div className="w-full h-1 bg-[#ECEAE7]"><div className="h-full bg-[#102326] transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      <p className="text-sm font-medium text-[#111111]">{q?.question}</p>
      <div className="space-y-2">
        {optionEntries.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAnswers((prev) => ({ ...prev, [index]: key }))}
            className={`w-full text-left p-3 border rounded-[4px] text-xs transition-colors ${
              answers[index] === key ? 'border-[#102326] bg-[#ECEAE7]' : 'border-[#D7D3CF] hover:bg-[#FAF9F7]'
            }`}
          >
            <span className="font-mono font-bold mr-2">{key}.</span>{label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="flex-1 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono disabled:opacity-30">Prev</button>
        {index < questions.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="flex-1 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono">Next</button>
        ) : (
          <button onClick={submitBattle} className="flex-1 py-2 bg-[#C96A32] text-white rounded-[4px] text-xs font-mono uppercase">Submit</button>
        )}
      </div>
    </div>
  );
};

export default ExamPreparation;
