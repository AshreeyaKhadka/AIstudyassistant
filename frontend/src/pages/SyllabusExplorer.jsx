import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X
} from 'lucide-react';
import syllabusData from '../data/syllabus.json';

const inputClass = 'w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none';

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'Could not load this page. Please try again.' };
  }
};

const semesterFromUploadPath = (path) => {
  const match = String(path || '').match(/(?:^|[/\\])sem-(\d+)(?:[/\\]|$)/);
  return match ? Number(match[1]) : null;
};

const normalizePersonalUpload = (upload, fallbackSemester = null) => ({
  ...upload,
  semester: upload.semester || semesterFromUploadPath(upload.file_url) || fallbackSemester,
  credits: upload.credits || 3,
  code: upload.code || null
});

const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const structuredToChapters = (structured) => {
  if (!structured || !Array.isArray(structured.chapters)) return [];
  return structured.chapters.map((ch, index) => {
    const units = Array.isArray(ch.units) ? ch.units : [];
    const topics = units.flatMap((u) => Array.isArray(u.subtopics) ? u.subtopics : []);
    const unitLabel = units.length === 1 ? units[0].unit_name : `Unit ${romanNumerals[index] || index + 1}`;
    return {
      id: `ch-${index}`,
      title: ch.chapter_name || `Chapter ${index + 1}`,
      summary: topics.slice(0, 5).join('; '),
      unit: unitLabel,
      hours: '',
      topics
    };
  });
};

const SyllabusExplorer = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [screen, setScreen] = useState('home');
  const [official, setOfficial] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalText, setPersonalText] = useState('');
  const [personalFile, setPersonalFile] = useState(null);
  const [personalUploads, setPersonalUploads] = useState([]);
  const [personalForm, setPersonalForm] = useState({
    semester: 1,
    subject: '',
    code: '',
    credits: 3
  });
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [pdfToView, setPdfToView] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [dirty, setDirty] = useState(false);
  const semesters = syllabusData.semesters || [];
  const [selectedSem, setSelectedSem] = useState(semesters[0]?.semester || 1);
  const [selectedSubject, setSelectedSubject] = useState(semesters[0]?.subjects?.[0] || null);
  const syllabusStats = useMemo(() => {
    const subjects = semesters.flatMap((semester) => semester.subjects || []);
    return {
      semesters: semesters.length,
      subjects: subjects.length,
      units: subjects.reduce((total, subject) => total + (subject.chapters?.length || 0), 0),
      pdfs: subjects.filter((subject) => subject.sourcePdf).length
    };
  }, [semesters]);

  const activeKind = useMemo(() => {
    if (activeUploadId && official?.id === activeUploadId) return 'official';
    if (activeUploadId && personal?.id === activeUploadId) return 'personal';
    return null;
  }, [activeUploadId, official, personal]);

  const loadWorkspace = async (subject = selectedSubject, sem = selectedSem) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (subject?.name) params.set('subject', subject.name);
      if (sem) params.set('semester', String(sem));
      const workspaceRes = await fetch(`/api/syllabus/workspace?${params.toString()}`, { credentials: 'include' });

      if (workspaceRes.ok) {
        const data = await parseResponse(workspaceRes);
        setOfficial(data.official || null);
        if (screen !== 'personal') {
          setPersonal(data.personal ? normalizePersonalUpload(data.personal, sem) : null);
        }
        setActiveUploadId(data.active_upload_id || data.official?.id || data.personal?.id || null);
      }
      const personalRes = await fetch('/api/syllabus/workspace/personal', { credentials: 'include' });
      if (personalRes.ok) {
        const personalData = await parseResponse(personalRes);
        setPersonalUploads(Array.isArray(personalData) ? personalData.map((item) => normalizePersonalUpload(item)) : []);
      }
    } catch (err) {
      setOfficial(null);
      setPersonal(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (screen === 'personal') {
      loadWorkspace(selectedSubject, selectedSem);
    }
  }, [selectedSubject?.id, selectedSem, screen]);

  useEffect(() => {
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    if (screen !== 'personal' || !selectedSubject?.uploadId) return;
    const fresh = personalUploads.find((u) => u.id === selectedSubject.uploadId);
    if (!fresh) return;
    const chapters = structuredToChapters(fresh.structured_syllabus);
    const sameChapters = JSON.stringify(chapters) === JSON.stringify(selectedSubject.chapters || []);
    const sameStatus = fresh.structure_status === (selectedSubject.upload?.structure_status || 'processing');
    if (!sameChapters || !sameStatus) {
      setSelectedSubject((prev) => ({ ...prev, chapters, upload: { ...prev.upload, structure_status: fresh.structure_status, structured_syllabus: fresh.structured_syllabus } }));
    }
  }, [personalUploads, screen, selectedSubject?.uploadId]);

  useEffect(() => () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
  }, [pdfBlobUrl]);

  const currentUploadId = selectedSubject?.uploadId || selectedSubject?.upload?.id;
  const currentUploadFresh = currentUploadId
    ? personalUploads.find((u) => u.id === currentUploadId)
    : null;
  const isStructureProcessing = currentUploadFresh
    ? currentUploadFresh.structure_status === 'processing'
    : false;

  useEffect(() => {
    if (!currentUploadId || !isStructureProcessing) return;
    const timer = setInterval(() => {
      loadWorkspace(selectedSubject, selectedSem);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentUploadId, isStructureProcessing]);

  const setActive = async (upload) => {
    setError('');
    try {
      const res = await fetch(`/api/syllabus/workspace/${upload.id}/active`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not choose this syllabus.');
      setActiveUploadId(data.active_upload_id);
      setStatus('This syllabus will be used for study help.');
      await loadWorkspace();
    } catch (err) {
      setError(err.message || 'Could not choose this syllabus.');
    }
  };

  const openView = async (upload) => {
    setViewLoading(true);
    setViewing({ ...upload, parsed_text: '' });
    setError('');
    try {
      const res = await fetch(`/api/syllabus/workspace/${upload.id}`, { credentials: 'include' });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not open syllabus.');
      setViewing(data);
    } catch (err) {
      setError(err.message || 'Could not open syllabus.');
    } finally {
      setViewLoading(false);
    }
  };

  const startEdit = async () => {
    if (personal?.id) {
      const res = await fetch(`/api/syllabus/workspace/${personal.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await parseResponse(res);
        setPersonalText(data.parsed_text || '');
        setPersonalForm((current) => ({
          ...current,
          semester: personal.semester || selectedSem,
          subject: personal.subject || selectedSubject?.name || '',
          code: personal.code || '',
          credits: personal.credits || 3
        }));
      }
    }
    setEditingPersonal(true);
    setDirty(false);
  };

  const savePersonal = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!personalText.trim() && !personalFile) {
      setError('Paste syllabus text or choose a file first.');
      return;
    }
    const subjectName = personalForm.subject.trim();
    if (!subjectName) {
      setError('Write the subject name first.');
      return;
    }

    setSaving(true);
    try {
      let subjectId = personal?.subject_id || null;
      let sem = Number(personalForm.semester || selectedSem || 1);
      if (!subjectId) {
        const subjectRes = await fetch('/api/syllabus/subjects', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: subjectName,
            semester: sem,
            code: personalForm.code.trim() || undefined,
            credits: Number(personalForm.credits || 3)
          })
        });
        const subjectData = await parseResponse(subjectRes);
        if (!subjectRes.ok) throw new Error(subjectData.error || 'Could not add subject.');
        subjectId = subjectData.id;
        sem = subjectData.semester;
      }

      const body = new FormData();
      if (personalText.trim()) body.append('text', personalText.trim());
      if (personalFile) body.append('file', personalFile);
      if (personal?.id) body.append('replace_id', personal.id);
      body.append('set_active', 'true');
      body.append('semester', String(sem));
      body.append('subject', subjectName);
      body.append('subject_id', String(subjectId));

      const res = await fetch('/api/syllabus/workspace/personal', {
        method: 'POST',
        credentials: 'include',
        body
      });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not save syllabus.');
      const savedUpload = {
        ...normalizePersonalUpload(data, sem),
        semester: data.semester || sem,
        subject: data.subject || subjectName,
        code: data.code || personalForm.code.trim() || null,
        credits: data.credits || Number(personalForm.credits || 3)
      };
      setPersonal(savedUpload);
      setActiveUploadId(savedUpload.id);
      setPersonalUploads((current) => {
        const withoutSaved = current.filter((item) => Number(item.id) !== Number(savedUpload.id));
        return [savedUpload, ...withoutSaved];
      });
      setDirty(false);
      setEditingPersonal(false);
      setPersonalFile(null);
      setSelectedSem(sem);
      setSelectedSubject({
        id: `personal-${savedUpload.id}`,
        uploadId: savedUpload.id,
        name: subjectName,
        code: savedUpload.code || 'Course',
        credit: savedUpload.credits || 3,
        credits: savedUpload.credits || 3,
        chapters: structuredToChapters(savedUpload.structured_syllabus),
        sourcePdf: savedUpload.filename?.toLowerCase().endsWith('.pdf') ? `/api/syllabus/workspace/${savedUpload.id}/file` : null,
        upload: savedUpload
      });
      if (fileRef.current) fileRef.current.value = '';
      setStatus('Your syllabus was saved.');
      await loadWorkspace({ name: subjectName }, sem);
    } catch (err) {
      setError(err.message || 'Could not save syllabus.');
    } finally {
      setSaving(false);
    }
  };

  const deletePersonal = async () => {
    if (!personal) return;
    if (!window.confirm(`Delete "${personal.filename}"?`)) return;
    const previous = personal;
    setPersonal(null);
    setError('');
    try {
      const res = await fetch(`/api/syllabus/workspace/personal/${previous.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not delete syllabus.');
      setPersonalText('');
      setDirty(false);
      setStatus('Your syllabus was deleted.');
      await loadWorkspace();
    } catch (err) {
      setPersonal(previous);
      setError(err.message || 'Could not delete syllabus.');
    }
  };

  const download = (upload) => {
    window.open(`/api/syllabus/workspace/${upload.id}/file`, '_blank', 'noopener,noreferrer');
  };

  const openPdf = async (subject) => {
    if (!subject?.sourcePdf) return;
    setPdfToView(subject);
    setPdfLoading(true);
    setPdfError('');
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl('');
    }

    try {
      const response = await fetch(subject.sourcePdf, { credentials: 'include' });
      if (!response.ok) throw new Error('Could not open this PDF.');
      const blob = await response.blob();
      if (!blob.type.includes('pdf')) throw new Error('This file is not available as a PDF.');
      setPdfBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      setPdfError(err.message || 'Could not open this PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const closePdf = () => {
    setPdfToView(null);
    setPdfError('');
    setPdfLoading(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl('');
    }
  };

  const backHome = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this page?')) return;
    setScreen('home');
    setEditingPersonal(false);
    setDirty(false);
  };

  const goAiMode = (subject, chapter = null) => {
    const params = new URLSearchParams({
      subject: subject.name,
      syllabusContext: chapter?.id || subject.id,
      contextType: chapter ? 'chapter' : 'subject'
    });
    if (chapter?.title) params.set('unit', chapter.title);
    navigate(`/dashboard/chat?${params.toString()}`);
  };

  const startAddPersonal = (sem = selectedSem) => {
    setPersonal(null);
    setPersonalText('');
    setPersonalFile(null);
    setPersonalForm({ semester: Number(sem || 1), subject: '', code: '', credits: 3 });
    setEditingPersonal(true);
    setDirty(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const openPersonalUpload = (upload) => {
    const normalized = normalizePersonalUpload(upload, selectedSem);
    setPersonal(normalized);
    setEditingPersonal(false);
    setSelectedSem(normalized.semester || selectedSem);
    setSelectedSubject({
      id: `personal-${normalized.id}`,
      uploadId: normalized.id,
      name: normalized.subject || normalized.filename,
      code: normalized.code || 'Course',
      credit: normalized.credits || 3,
      credits: normalized.credits || 3,
      chapters: structuredToChapters(normalized.structured_syllabus),
      sourcePdf: normalized.filename?.toLowerCase().endsWith('.pdf') ? `/api/syllabus/workspace/${normalized.id}/file` : null,
      upload: normalized
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">Syllabus</div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Official Syllabus</h1>
          <p className="text-xs text-[#666666] mt-1">Choose the syllabus you want to study from.</p>
        </div>
        <button onClick={loadWorkspace} className="px-3 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono uppercase inline-flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {(error || status) && (
        <div className={`border rounded-[4px] p-3 text-xs font-mono flex items-center justify-between gap-3 ${error ? 'bg-[#FFFDFB] border-[#D7D3CF] text-[#C96A32]' : 'bg-white border-[#102326] text-[#102326]'}`}>
          <span>{error || status}</span>
          <button onClick={() => { setError(''); setStatus(''); }} className="underline">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-10 text-xs font-mono text-[#666666] flex items-center justify-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Loading syllabus...
        </div>
      ) : screen === 'home' ? (
        <SyllabusHome
          stats={syllabusStats}
          officialActive={activeKind === 'official'}
          personalActive={activeKind === 'personal'}
          hasOfficial={semesters.some((semester) => semester.subjects?.length)}
          hasPersonal={personalUploads.length > 0}
          onOfficial={() => setScreen('official')}
          onPersonal={() => {
            setScreen('personal');
            if (personalUploads.length) {
              openPersonalUpload(personalUploads[0]);
            } else {
              startAddPersonal(selectedSem);
            }
          }}
        />
      ) : screen === 'official' ? (
        <OfficialDetail
          upload={official}
          active={activeKind === 'official'}
          semesters={semesters}
          selectedSem={selectedSem}
          setSelectedSem={setSelectedSem}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          onBack={backHome}
          onView={openView}
          onDownload={download}
          onSetActive={setActive}
          onAiMode={goAiMode}
          onOpenPdf={openPdf}
        />
      ) : (
        <PersonalDetail
          personal={personal}
          uploads={personalUploads}
          active={activeKind === 'personal'}
          selectedSem={selectedSem}
          setSelectedSem={setSelectedSem}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          editing={editingPersonal}
          setEditing={setEditingPersonal}
          text={personalText}
          setText={(value) => { setPersonalText(value); setDirty(true); }}
          form={personalForm}
          setForm={(updater) => {
            setPersonalForm((current) => typeof updater === 'function' ? updater(current) : updater);
            setDirty(true);
          }}
          fileRef={fileRef}
          setFile={(file) => { setPersonalFile(file); setDirty(true); }}
          selectedFile={personalFile}
          saving={saving}
          onBack={backHome}
          onSave={savePersonal}
          onView={openView}
          onDownload={download}
          onEdit={startEdit}
          onDelete={deletePersonal}
          onSetActive={setActive}
          onAiMode={goAiMode}
          onOpenPdf={openPdf}
          onAdd={startAddPersonal}
          onOpenUpload={openPersonalUpload}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/30 p-4 flex items-center justify-center">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D7D3CF] p-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#111111] truncate">{viewing.filename}</h3>
                <p className="text-[10px] font-mono text-[#666666]">Syllabus text</p>
              </div>
              <button onClick={() => setViewing(null)}><X size={16} /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              {viewLoading ? (
                <div className="text-xs font-mono text-[#666666] flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Opening...</div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-[#111111] font-mono">{viewing.parsed_text || 'No text is available.'}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {pdfToView?.sourcePdf && (
        <OfficialPdfModal
          subject={pdfToView}
          blobUrl={pdfBlobUrl}
          loading={pdfLoading}
          error={pdfError}
          onClose={closePdf}
        />
      )}
    </div>
  );
};

const SyllabusHome = ({ stats, officialActive, personalActive, hasOfficial, hasPersonal, onOfficial, onPersonal }) => (
  <div className="max-w-6xl mx-auto w-full space-y-6">
    <section className="overflow-hidden rounded-[12px] border border-[#D7D3CF] bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-7 md:p-9">
          <h2 className="max-w-2xl text-3xl md:text-4xl font-bold tracking-tight text-[#111111]">
            Keep one clear syllabus beside you, especially on the hard days.
          </h2>
          <p className="mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#555555]">
            Use the college syllabus for a steady path, or add your own if your teacher follows a different plan. AiStudy will use the one you choose when helping you revise.
          </p>
        </div>
        <div className="border-t lg:border-t-0 lg:border-l border-[#D7D3CF] bg-[#FAF9F7] p-6 md:p-8 flex items-center">
          <div className="grid grid-cols-2 gap-3 w-full">
            <HomeStat label="Semesters" value={stats.semesters} />
            <HomeStat label="Subjects" value={stats.subjects} />
            <HomeStat label="Units" value={stats.units} />
            <HomeStat label="PDFs" value={stats.pdfs} />
          </div>
        </div>
      </div>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <ChoiceCard
        icon={GraduationCap}
        title="Official Syllabus"
        description="Follow the syllabus added by your college or admin."
        note="Best when you want the safe, standard path for exams and revision."
        active={officialActive}
        ready={hasOfficial}
        empty="No official syllabus has been added yet."
        stats={`${stats.subjects} subjects - ${stats.units} units`}
        buttonLabel="Open Official Syllabus"
        onGo={onOfficial}
      />
      <ChoiceCard
        icon={NotebookPen}
        title="My Syllabus"
        description="Add your own syllabus and study from it."
        note={hasPersonal ? 'Your own syllabus is ready whenever you want a personal study plan.' : 'No one should feel lost before exams. Add your syllabus once, and keep your study path in one place.'}
        active={personalActive}
        ready={hasPersonal}
        empty="You have not added your syllabus yet."
        stats={hasPersonal ? 'Saved and ready' : 'Paste text or upload a PDF'}
        buttonLabel={hasPersonal ? 'Open My Syllabus' : 'Add My Syllabus'}
        onGo={onPersonal}
      />
    </div>
  </div>
);

const HomeStat = ({ label, value }) => (
  <div className="rounded-[8px] border border-[#D7D3CF] bg-white p-4">
    <p className="text-2xl font-bold text-[#111111]">{value}</p>
    <p className="mt-1 text-xs text-[#666666]">{label}</p>
  </div>
);

const ChoiceCard = ({ icon: Icon, title, description, note, active, ready, empty, stats, buttonLabel, onGo }) => (
  <section className="group bg-white border border-[#D7D3CF] rounded-[12px] p-6 md:p-7 min-h-[360px] flex flex-col shadow-sm transition-colors hover:border-[#102326]">
    <div className="flex items-start justify-between gap-4">
      <div className="w-12 h-12 rounded-[10px] bg-[#102326] text-white flex items-center justify-center shrink-0">
        <Icon size={23} />
      </div>
      {active && <span className="text-[10px] uppercase text-[#185C28] bg-[#DDEFE2] border border-[#3E8B4E] px-2 py-1 rounded-full">Selected</span>}
    </div>

    <div className="mt-6">
      <h2 className="text-2xl font-bold text-[#111111] tracking-tight">{title}</h2>
      <p className="text-sm text-[#444444] mt-2 leading-relaxed">{description}</p>
      <p className="text-sm text-[#666666] mt-4 leading-relaxed">{note}</p>
    </div>

    <div className="mt-6 rounded-[8px] border border-[#D7D3CF] bg-[#FAF9F7] p-4">
      {ready ? (
        <div className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-[#2F7D42] shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#111111]">Ready to study</p>
            <p className="text-xs text-[#666666] mt-0.5">{stats}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-[#666666] shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#111111]">{empty}</p>
            <p className="text-xs text-[#666666] mt-0.5">{stats}</p>
          </div>
        </div>
      )}
    </div>

    <button onClick={onGo} className="mt-auto w-full bg-[#102326] text-white rounded-[6px] px-4 py-3 text-xs font-semibold uppercase tracking-wide inline-flex items-center justify-center gap-2 hover:bg-[#0b191c]">
      {buttonLabel}
      <ChevronRight size={15} />
    </button>
  </section>
);

const OfficialDetail = ({ upload, active, semesters, selectedSem, setSelectedSem, selectedSubject, setSelectedSubject, onBack, onView, onDownload, onSetActive, onAiMode, onOpenPdf }) => (
  <SyllabusStudyShell
    title="Official Syllabus"
    subtitle="Choose a semester and open the syllabus for that subject."
    semesters={semesters}
    selectedSem={selectedSem}
    setSelectedSem={setSelectedSem}
    selectedSubject={selectedSubject}
    setSelectedSubject={setSelectedSubject}
    onBack={onBack}
    onAiMode={onAiMode}
  >
    <>
      <SubjectContent subject={selectedSubject} onAiMode={onAiMode} onOpenPdf={onOpenPdf} />
      {upload ? (
        <>
        <DocumentSummary upload={upload} />
        <div className="flex flex-wrap gap-2 mt-4">
          <ActionButton onClick={() => onView(upload)} icon={Eye} label="View" />
          <ActionButton onClick={() => onDownload(upload)} icon={Download} label="Download" />
          <ActionButton onClick={() => onSetActive(upload)} icon={CheckCircle2} label="Use This" disabled={active} primary />
        </div>
        </>
      ) : (
        <p className="mt-4 text-xs text-[#666666]">College file is not added yet. You can still study from the subject list and units shown here.</p>
      )}
    </>
  </SyllabusStudyShell>
);

const PersonalDetail = ({
  personal,
  uploads,
  active,
  selectedSem,
  setSelectedSem,
  selectedSubject,
  setSelectedSubject,
  editing,
  setEditing,
  text,
  setText,
  form,
  setForm,
  fileRef,
  setFile,
  selectedFile,
  saving,
  onBack,
  onSave,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onSetActive,
  onAiMode,
  onOpenPdf,
  onAdd,
  onOpenUpload
}) => {
  const semesterNumbers = Array.from({ length: 8 }, (_, index) => index + 1);
  const personalSemesters = semesterNumbers.map((semester) => {
    const subjects = uploads
      .filter((upload) => Number(upload.semester) === semester)
      .map((upload) => ({
        id: `personal-${upload.id}`,
        uploadId: upload.id,
        name: upload.subject || upload.filename || 'Untitled subject',
        code: upload.code || 'Course',
        credit: upload.credits || 3,
        credits: upload.credits || 3,
        chapters: structuredToChapters(upload.structured_syllabus),
        sourcePdf: upload.filename?.toLowerCase().endsWith('.pdf') ? `/api/syllabus/workspace/${upload.id}/file` : null,
        upload
      }));
    return { semester, subjects };
  });
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const selectedUpload = selectedSubject?.upload || null;
  const visiblePersonal = personal && selectedUpload && Number(selectedUpload.id) === Number(personal.id) && Number(selectedUpload.semester) === Number(selectedSem);
  const personalSubject = visiblePersonal ? {
    ...selectedSubject,
    sourcePdf: personal?.filename?.toLowerCase().endsWith('.pdf') ? `/api/syllabus/workspace/${personal.id}/file` : selectedSubject.sourcePdf
  } : null;
  const openSubject = (subject) => {
    if (subject?.upload) onOpenUpload(subject.upload);
  };

  return (
    <SyllabusStudyShell
      title="My Syllabus"
      subtitle="Choose a semester and open your own syllabus."
      semesters={personalSemesters}
      selectedSem={selectedSem}
      setSelectedSem={setSelectedSem}
      selectedSubject={selectedSubject}
      setSelectedSubject={setSelectedSubject}
      onBack={onBack}
      onSubjectSelect={openSubject}
      emptySubjectText={`No syllabus in Semester ${selectedSem} yet.`}
      headerAction={(
        <button onClick={() => onAdd(selectedSem)} className="px-4 py-2 bg-[#102326] text-white rounded-[6px] text-xs font-semibold inline-flex items-center gap-2 w-fit">
          <Plus size={14} /> Add Subject & Syllabus
        </button>
      )}
    >

      {visiblePersonal ? (
        <>
          <SubjectContent subject={personalSubject} onAiMode={onAiMode} onOpenPdf={onOpenPdf} />
          {active && <span className="mb-3 inline-flex text-[10px] uppercase text-[#185C28] bg-[#DDEFE2] border border-[#3E8B4E] px-2 py-1 rounded-[3px]">Selected for study help</span>}
          <DocumentSummary upload={personal} />
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => personal.filename?.toLowerCase().endsWith('.pdf') ? onOpenPdf(personalSubject) : onView(personal)} icon={Eye} label="View" />
            <ActionButton onClick={() => onDownload(personal)} icon={Download} label="Download" />
            <ActionButton onClick={onEdit} icon={Edit3} label="Edit" />
            <ActionButton onClick={onDelete} icon={Trash2} label="Delete" danger />
            <ActionButton onClick={() => onSetActive(personal)} icon={CheckCircle2} label="Use This" disabled={active} primary />
          </div>
        </>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[#D7D3CF] bg-[#FAF9F7] p-8 text-center">
          <NotebookPen size={30} className="mx-auto text-[#102326] mb-3" />
          <h3 className="text-lg font-bold text-[#111111]">No syllabus in Sem {selectedSem} yet</h3>
          <p className="text-sm text-[#666666] mt-2">Add a subject and upload the syllabus you actually follow.</p>
          <button onClick={() => onAdd(selectedSem)} className="mt-5 px-4 py-2 bg-[#102326] text-white rounded-[6px] text-xs font-semibold inline-flex items-center gap-2">
            <Plus size={14} /> Add Subject & Syllabus
          </button>
        </div>
      )}

      {editing && (
        <PersonalSyllabusModal
          form={form}
          updateForm={updateForm}
          text={text}
          setText={setText}
          fileRef={fileRef}
          setFile={setFile}
          selectedFile={selectedFile}
          saving={saving}
          onSave={onSave}
          onClose={() => setEditing(false)}
          semesterNumbers={semesterNumbers}
        />
      )}
    </SyllabusStudyShell>
  );
};

const PersonalSyllabusModal = ({
  form,
  updateForm,
  text,
  setText,
  fileRef,
  setFile,
  selectedFile,
  saving,
  onSave,
  onClose,
  semesterNumbers
}) => (
  <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
    <form onSubmit={onSave} className="bg-white border border-[#D7D3CF] rounded-[10px] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
      <div className="p-5 border-b border-[#D7D3CF] flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#666666] font-semibold">My syllabus</p>
          <h3 className="text-xl font-bold text-[#111111] mt-1">Add subject</h3>
          <p className="text-sm text-[#666666] mt-1">Choose the semester, write the subject, then add the syllabus file or text.</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 border border-[#D7D3CF] rounded-[4px] hover:bg-[#ECEAE7]" aria-label="Close add syllabus">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_120px] gap-3">
          <div>
            <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Semester</label>
            <select value={form.semester} onChange={(event) => updateForm('semester', Number(event.target.value))} className={inputClass}>
              {semesterNumbers.map((sem) => <option key={sem} value={sem}>Sem {sem}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Subject name</label>
            <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} className={inputClass} placeholder="Digital Logic" required />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Credits</label>
            <input type="number" min="1" max="6" value={form.credits} onChange={(event) => updateForm('credits', event.target.value)} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Code</label>
          <input value={form.code} onChange={(event) => updateForm('code', event.target.value)} className={inputClass} placeholder="Optional" />
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Paste syllabus text</label>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={7} className={`${inputClass} resize-y`} placeholder="Paste your syllabus here..." />
        </div>

        <div>
          <label className="block text-[10px] uppercase text-[#666666] font-semibold mb-1">Or choose a file</label>
          <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} className={inputClass} />
          {selectedFile && <p className="text-xs text-[#666666] mt-1">{selectedFile.name}</p>}
        </div>
      </div>

      <div className="p-5 border-t border-[#D7D3CF] flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-semibold">Cancel</button>
        <button type="submit" disabled={saving || !form.subject.trim() || (!text.trim() && !selectedFile)} className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </div>
    </form>
  </div>
);

const SyllabusStudyShell = ({
  title,
  subtitle,
  semesters,
  selectedSem,
  setSelectedSem,
  selectedSubject,
  setSelectedSubject,
  onBack,
  children,
  headerAction = null,
  onSubjectSelect = null,
  emptySubjectText = null
}) => {
  const currentSemester = semesters.find((semester) => Number(semester.semester) === Number(selectedSem));
  const semesterSubjects = currentSemester?.subjects || [];

  const chooseSemester = (sem) => {
    setSelectedSem(sem);
    const nextSubject = semesters.find((semester) => Number(semester.semester) === Number(sem))?.subjects?.[0];
    setSelectedSubject(nextSubject || null);
    if (onSubjectSelect) onSubjectSelect(nextSubject || null);
  };

  const chooseSubject = (subject) => {
    setSelectedSubject(subject);
    if (onSubjectSelect) onSubjectSelect(subject);
  };

  return (
    <section className="bg-white border border-[#D7D3CF] rounded-[8px] p-5 md:p-6 space-y-5 min-h-[520px]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#D7D3CF] pb-5">
        <div>
          <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs text-[#666666] hover:text-[#111111]">
            <ArrowLeft size={13} /> Back
          </button>
          <h2 className="text-xl font-bold text-[#111111]">{title}</h2>
          <p className="text-xs text-[#666666] mt-1">{subtitle}</p>
        </div>
        {headerAction}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {semesters.map((semester) => (
          <button
            key={semester.semester}
            onClick={() => chooseSemester(semester.semester)}
            className={`px-5 py-2 rounded-[6px] border text-xs font-semibold whitespace-nowrap ${Number(selectedSem) === Number(semester.semester) ? 'bg-[#102326] text-white border-[#102326]' : 'bg-white border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7]'}`}
          >
            Sem {semester.semester}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
        <aside className="rounded-[8px] border border-[#D7D3CF] bg-[#FAF9F7] p-3 max-h-[70vh] overflow-y-auto">
          <div className="mb-3 px-1">
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-semibold">Semester {selectedSem}</p>
            <p className="text-xs text-[#666666] mt-1">{semesterSubjects.length} subjects</p>
          </div>
          <div className="space-y-2">
          {semesterSubjects.length > 0 ? semesterSubjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => chooseSubject(subject)}
              className={`group w-full text-left border rounded-[8px] px-4 py-3 transition-colors ${selectedSubject?.id === subject.id ? 'border-[#102326] bg-white text-[#111111] shadow-sm' : 'border-transparent bg-white/70 text-[#444444] hover:bg-white hover:border-[#D7D3CF]'}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold leading-snug">{subject.name}</span>
                <ChevronRight size={15} className={`mt-0.5 shrink-0 ${selectedSubject?.id === subject.id ? 'text-[#102326]' : 'text-[#999999] group-hover:text-[#102326]'}`} />
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#666666]">
                <span>{subject.code || 'Course'}</span>
                <span>{subject.credit} credits</span>
                <span>{subject.chapters?.length || 0} units</span>
                {subject.sourcePdf && <span className="rounded-full border border-[#D7D3CF] bg-[#F7F5F2] px-2 py-0.5">PDF</span>}
              </span>
            </button>
          )) : (
            <EmptyPanel text={emptySubjectText || `No subjects found for Semester ${selectedSem}.`} compact />
          )}
          </div>
        </aside>

        <div className="min-h-[420px]">
          {children}
        </div>
      </div>
    </section>
  );
};

const SubjectContent = ({ subject, onAiMode, onOpenPdf }) => {
  if (!subject) {
    return <EmptyPanel text="Choose a subject first." compact />;
  }

  const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];

  const totalTopics = chapters.reduce((count, chapter) => count + (Array.isArray(chapter.topics) ? chapter.topics.length : 0), 0);

  const structureStatus = subject.upload?.structure_status;
  const isProcessing = structureStatus === 'processing' && chapters.length === 0;

  return (
    <div className="mb-4 overflow-hidden rounded-[10px] border border-[#D7D3CF] bg-white shadow-sm">
      <div className="border-b border-[#D7D3CF] bg-white p-5 md:p-6">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-semibold">Selected subject</p>
            <h3 className="text-2xl md:text-3xl font-bold text-[#111111] mt-1 tracking-tight">{subject.name}</h3>
            <div className="mt-4 grid grid-cols-3 max-w-md rounded-[8px] border border-[#D7D3CF] bg-[#FAF9F7] overflow-hidden">
              <Metric label="Code" value={subject.code || 'Course'} />
              <Metric label="Credits" value={subject.credit} />
              <Metric label="Units" value={chapters.length} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subject.sourcePdf && (
              <ActionButton onClick={() => onOpenPdf(subject)} icon={FileText} label="View PDF" />
            )}
            <ActionButton onClick={() => onAiMode(subject)} icon={CheckCircle2} label="Go AI Mode" primary />
          </div>
        </div>
      </div>

      <div className="bg-[#FAF9F7] p-5 md:p-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-semibold">Study plan</p>
            <h4 className="text-lg font-bold text-[#111111]">Units and topics</h4>
          </div>
          {chapters.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D7D3CF] bg-white px-3 py-1.5 text-xs text-[#444444] w-fit">
              <BookOpen size={14} className="text-[#102326]" />
              {totalTopics} topics
            </div>
          )}
        </div>

        {isProcessing ? (
          <div className="flex items-center justify-center gap-3 py-10 text-xs font-mono text-[#666666]">
            <Loader2 size={16} className="animate-spin" />
            Parsing syllabus structure...
          </div>
        ) : chapters.length > 0 ? (
          <div className="relative space-y-4">
            {chapters.map((chapter, index) => (
              <UnitCard
                key={chapter.id}
                chapter={chapter}
                number={chapter.unit?.replace(/[^0-9]/g, '') || index + 1}
                onAiMode={() => onAiMode(subject, chapter)}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel text="Unit details are not available yet. You can still use AI Mode for this subject." compact />
        )}
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="border-r border-[#D7D3CF] last:border-r-0 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-[#777777] font-semibold">{label}</p>
    <p className="text-sm font-bold text-[#111111] mt-0.5">{value}</p>
  </div>
);

const UnitCard = ({ chapter, number, onAiMode }) => {
  const topics = Array.isArray(chapter.topics) ? chapter.topics : [];
  const previewTopics = topics.slice(0, 4);
  const remaining = topics.length - previewTopics.length;

  return (
    <article className="group rounded-[10px] border border-[#D7D3CF] bg-white p-4 md:p-5 transition-colors hover:border-[#102326]">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0 flex gap-4">
          <div className="w-11 h-11 rounded-full bg-[#102326] text-white flex items-center justify-center text-sm font-bold shrink-0">
            {number}
          </div>
          <div className="min-w-0">
            <h5 className="text-lg font-bold text-[#111111] leading-snug">{chapter.title}</h5>
            {chapter.summary && <p className="text-sm text-[#555555] leading-relaxed mt-1 max-w-3xl">{chapter.summary}</p>}
            {previewTopics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previewTopics.map((topic, index) => (
                  <span key={`${chapter.id}-preview-${index}`} className="rounded-full border border-[#D7D3CF] bg-[#FAF9F7] px-3 py-1 text-xs text-[#444444]">
                    {topic}
                  </span>
                ))}
                {remaining > 0 && (
                  <span className="rounded-full bg-[#ECEAE7] px-3 py-1 text-xs font-semibold text-[#444444]">
                    +{remaining} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <ActionButton onClick={onAiMode} icon={CheckCircle2} label="Go AI Mode" />
      </div>

      {topics.length > previewTopics.length && (
        <details className="mt-4 rounded-[8px] border border-[#D7D3CF] bg-[#FAF9F7]">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[#102326]">Show all topics</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t border-[#D7D3CF] p-3">
            {topics.map((topic, index) => (
              <div key={`${chapter.id}-${index}`} className="rounded-[6px] bg-white px-3 py-2 text-xs leading-relaxed text-[#444444]">
                {topic}
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
};

const EmptyPanel = ({ text, compact = false }) => (
  <div className={`border border-dashed border-[#D7D3CF] bg-white rounded-[4px] text-center ${compact ? 'p-5' : 'p-10'}`}>
    <FileText size={compact ? 20 : 28} className="mx-auto text-[#666666] mb-2" />
    <p className="text-sm font-bold text-[#111111]">{text}</p>
  </div>
);

const DocumentSummary = ({ upload }) => (
  <div className="border border-[#D7D3CF] rounded-[4px] p-4 flex items-start gap-3">
    <FileText size={20} className="text-[#102326] shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-[#111111] truncate">{upload.filename}</p>
      <p className="text-[10px] font-mono text-[#666666] mt-1">
        {(upload.size_bytes / 1024).toFixed(0)} KB
        {upload.created_at ? ` - ${new Date(upload.created_at).toLocaleDateString()}` : ''}
      </p>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, onClick, disabled = false, primary = false, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-2 rounded-[4px] border text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 ${
      primary
        ? 'bg-[#102326] border-[#102326] text-white'
        : danger
          ? 'bg-white border-[#D7D3CF] text-[#C96A32]'
          : 'bg-white border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7]'
    }`}
  >
    <Icon size={13} />
    {label}
  </button>
);

const OfficialPdfModal = ({ subject, blobUrl, loading, error, onClose }) => {
  const filename = decodeURIComponent((subject.sourcePdf || '').split('/').pop() || `${subject.name}.pdf`);
  const downloadPdf = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-3 md:p-5 flex items-center justify-center">
      <div className="bg-white border border-[#D7D3CF] rounded-[8px] w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#D7D3CF] p-4 bg-[#FAF9F7]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#666666] font-semibold">PDF view</p>
            <h3 className="text-base font-bold text-[#111111] truncate">{subject.name}</h3>
            <p className="text-xs text-[#666666] truncate">{filename}</p>
          </div>
          <div className="flex items-center gap-2">
            <ActionButton onClick={downloadPdf} icon={Download} label="Download" disabled={!blobUrl} />
            <button onClick={onClose} className="p-2 border border-[#D7D3CF] rounded-[4px] hover:bg-[#ECEAE7]" aria-label="Close PDF">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#ECEAE7]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-[#666666] gap-2">
              <Loader2 size={18} className="animate-spin" /> Opening PDF...
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-md rounded-[6px] border border-[#D7D3CF] bg-white p-6 text-center">
                <FileText size={28} className="mx-auto text-[#666666] mb-3" />
                <h4 className="text-base font-bold text-[#111111]">PDF could not open</h4>
                <p className="text-sm text-[#666666] mt-2">{error}</p>
              </div>
            </div>
          ) : blobUrl ? (
            <iframe
              title={`${subject.name} PDF`}
              src={blobUrl}
              className="w-full h-full bg-white"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SyllabusExplorer;
