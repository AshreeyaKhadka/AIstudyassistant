import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  X
} from 'lucide-react';

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

const SyllabusExplorer = () => {
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
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSem, setSelectedSem] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const activeKind = useMemo(() => {
    if (activeUploadId && official?.id === activeUploadId) return 'official';
    if (activeUploadId && personal?.id === activeUploadId) return 'personal';
    return null;
  }, [activeUploadId, official, personal]);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      const [workspaceRes, subjectsRes] = await Promise.all([
        fetch('/api/syllabus/workspace', { credentials: 'include' }),
        fetch('/api/syllabus/subjects', { credentials: 'include' })
      ]);

      if (workspaceRes.ok) {
        const data = await parseResponse(workspaceRes);
        setOfficial(data.official || null);
        setPersonal(data.personal || null);
        setActiveUploadId(data.active_upload_id || data.official?.id || data.personal?.id || null);
      }

      if (subjectsRes.ok) {
        const data = await parseResponse(subjectsRes);
        setSubjects(Array.isArray(data) ? data : []);
        if (!selectedSubject && Array.isArray(data) && data.length > 0) {
          const first = data.find((subject) => Number(subject.semester) === selectedSem) || data[0];
          setSelectedSubject(first);
          setSelectedSem(Number(first.semester) || 1);
        }
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
    const handler = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

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

    setSaving(true);
    try {
      const body = new FormData();
      if (personalText.trim()) body.append('text', personalText.trim());
      if (personalFile) body.append('file', personalFile);
      if (personal?.id) body.append('replace_id', personal.id);
      body.append('set_active', 'true');

      const res = await fetch('/api/syllabus/workspace/personal', {
        method: 'POST',
        credentials: 'include',
        body
      });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(data.error || 'Could not save syllabus.');
      setPersonal(data);
      setActiveUploadId(data.id);
      setDirty(false);
      setEditingPersonal(false);
      setPersonalFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setStatus('Your syllabus was saved.');
      await loadWorkspace();
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

  const backHome = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this page?')) return;
    setScreen('home');
    setEditingPersonal(false);
    setDirty(false);
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
          <ChoiceCard
            title="Official Syllabus"
            description="Use the syllabus added by your college or admin."
            active={activeKind === 'official'}
            ready={Boolean(official)}
            empty="No official syllabus has been added yet."
            onGo={() => setScreen('official')}
          />
          <ChoiceCard
            title="My Syllabus"
            description="Add your own syllabus and study from it."
            active={activeKind === 'personal'}
            ready={Boolean(personal)}
            empty="You have not added your syllabus yet."
            onGo={() => {
              setScreen('personal');
              if (!personal) setEditingPersonal(true);
            }}
          />
        </div>
      ) : screen === 'official' ? (
        <OfficialDetail
          upload={official}
          active={activeKind === 'official'}
          subjects={subjects}
          selectedSem={selectedSem}
          setSelectedSem={setSelectedSem}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          onBack={backHome}
          onView={openView}
          onDownload={download}
          onSetActive={setActive}
        />
      ) : (
        <PersonalDetail
          personal={personal}
          active={activeKind === 'personal'}
          subjects={subjects}
          selectedSem={selectedSem}
          setSelectedSem={setSelectedSem}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          editing={editingPersonal}
          setEditing={setEditingPersonal}
          text={personalText}
          setText={(value) => { setPersonalText(value); setDirty(true); }}
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
    </div>
  );
};

const ChoiceCard = ({ title, description, active, ready, empty, onGo }) => (
  <section className="bg-white border border-[#D7D3CF] rounded-[8px] p-7 min-h-[460px] flex flex-col shadow-sm">
    <div className="text-center pt-4">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-xl font-bold text-[#111111]">{title}</h2>
        {active && <span className="text-[10px] font-mono uppercase text-[#185C28] bg-[#DDEFE2] border border-[#3E8B4E] px-2 py-1 rounded-[3px]">Selected</span>}
      </div>
      <p className="text-sm text-[#444444] mt-2 max-w-xs mx-auto">{description}</p>
    </div>
    <div className="flex-1 flex items-center justify-center">
      {ready ? (
        <div className="text-center">
          <FileText size={28} className="mx-auto text-[#102326] mb-3" />
          <p className="text-sm font-bold text-[#111111]">Ready to open</p>
        </div>
      ) : (
        <div className="text-center border border-dashed border-[#D7D3CF] rounded-[4px] p-8 w-full bg-[#FAF9F7]">
          <FileText size={26} className="mx-auto text-[#666666] mb-2" />
          <p className="text-sm font-bold text-[#111111]">{empty}</p>
        </div>
      )}
    </div>
    <button onClick={onGo} className="mx-auto mb-5 w-36 bg-[#102326] text-white rounded-[4px] px-4 py-2 text-xs font-mono font-semibold uppercase">
      Go
    </button>
  </section>
);

const OfficialDetail = ({ upload, active, subjects, selectedSem, setSelectedSem, selectedSubject, setSelectedSubject, onBack, onView, onDownload, onSetActive }) => (
  <SyllabusStudyShell
    title="Official Syllabus"
    subtitle="Choose a semester and open the syllabus for that subject."
    subjects={subjects}
    selectedSem={selectedSem}
    setSelectedSem={setSelectedSem}
    selectedSubject={selectedSubject}
    setSelectedSubject={setSelectedSubject}
    onBack={onBack}
  >
    {upload ? (
      <>
        <div className="mb-4">
          <p className="text-xs font-mono uppercase text-[#666666]">Selected subject</p>
          <h3 className="text-lg font-bold text-[#111111] mt-1">{selectedSubject?.name || 'Choose a subject'}</h3>
        </div>
        <DocumentSummary upload={upload} />
        <div className="flex flex-wrap gap-2 mt-4">
          <ActionButton onClick={() => onView(upload)} icon={Eye} label="View" />
          <ActionButton onClick={() => onDownload(upload)} icon={Download} label="Download" />
          <ActionButton onClick={() => onSetActive(upload)} icon={CheckCircle2} label="Use This" disabled={active} primary />
        </div>
      </>
    ) : (
      <EmptyPanel text="No official syllabus has been added yet." />
    )}
  </SyllabusStudyShell>
);

const PersonalDetail = ({
  personal,
  active,
  subjects,
  selectedSem,
  setSelectedSem,
  selectedSubject,
  setSelectedSubject,
  editing,
  setEditing,
  text,
  setText,
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
  onSetActive
}) => (
  <SyllabusStudyShell
    title="My Syllabus"
    subtitle="Choose a semester, then add or open your syllabus."
    subjects={subjects}
    selectedSem={selectedSem}
    setSelectedSem={setSelectedSem}
    selectedSubject={selectedSubject}
    setSelectedSubject={setSelectedSubject}
    onBack={onBack}
  >
    {personal && !editing ? (
      <>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase text-[#666666]">Selected subject</p>
            <h3 className="text-lg font-bold text-[#111111] mt-1">{selectedSubject?.name || 'Choose a subject'}</h3>
          </div>
          {active && <span className="text-[10px] font-mono uppercase text-[#185C28] bg-[#DDEFE2] border border-[#3E8B4E] px-2 py-1 rounded-[3px]">Selected</span>}
        </div>
        <DocumentSummary upload={personal} />
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => onView(personal)} icon={Eye} label="View" />
          <ActionButton onClick={() => onDownload(personal)} icon={Download} label="Download" />
          <ActionButton onClick={onEdit} icon={Edit3} label="Edit" />
          <ActionButton onClick={onDelete} icon={Trash2} label="Delete" danger />
          <ActionButton onClick={() => onSetActive(personal)} icon={CheckCircle2} label="Use This" disabled={active} primary />
        </div>
      </>
    ) : (
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Paste syllabus text</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className={`${inputClass} resize-y`}
            placeholder="Paste your syllabus here..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Or choose a file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className={inputClass}
          />
          {selectedFile && <p className="text-[10px] font-mono text-[#666666] mt-1">{selectedFile.name}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#D7D3CF] pt-4">
          {personal && (
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 border border-[#D7D3CF] rounded-[4px] text-xs font-mono uppercase">Cancel</button>
          )}
          <button type="submit" disabled={saving || (!text.trim() && !selectedFile)} className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono uppercase inline-flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </form>
    )}
  </SyllabusStudyShell>
);

const SyllabusStudyShell = ({ title, subtitle, subjects, selectedSem, setSelectedSem, selectedSubject, setSelectedSubject, onBack, children }) => {
  const semesterSubjects = subjects.filter((subject) => Number(subject.semester) === Number(selectedSem));

  const chooseSemester = (sem) => {
    setSelectedSem(sem);
    const nextSubject = subjects.find((subject) => Number(subject.semester) === Number(sem));
    setSelectedSubject(nextSubject || null);
  };

  return (
    <section className="bg-white border border-[#D7D3CF] rounded-[8px] p-6 space-y-6 min-h-[520px]">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#D7D3CF] pb-4">
        <div>
          <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-mono text-[#666666] hover:text-[#111111]">
            <ArrowLeft size={13} /> Back
          </button>
          <h2 className="text-xl font-bold text-[#111111]">{title}</h2>
          <p className="text-xs text-[#666666] mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
          <button
            key={sem}
            onClick={() => chooseSemester(sem)}
            className={`px-5 py-2 rounded-[6px] border text-xs font-mono font-semibold ${Number(selectedSem) === sem ? 'bg-[#102326] text-white border-[#102326]' : 'bg-white border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7]'}`}
          >
            Sem {sem}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        <div className="space-y-3">
          {semesterSubjects.length > 0 ? semesterSubjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject)}
              className={`w-full text-left border rounded-[6px] px-4 py-3 text-sm font-semibold ${selectedSubject?.id === subject.id ? 'border-[#102326] bg-[#F7F5F2] text-[#111111]' : 'border-[#D7D3CF] bg-white text-[#444444] hover:bg-[#FAF9F7]'}`}
            >
              {subject.name}
            </button>
          )) : (
            <EmptyPanel text={`No subjects found for Semester ${selectedSem}.`} compact />
          )}
        </div>

        <div className="border border-[#D7D3CF] rounded-[6px] p-5 bg-[#FAF9F7] min-h-[300px]">
          {children}
        </div>
      </div>
    </section>
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
    className={`px-3 py-2 rounded-[4px] border text-xs font-mono uppercase inline-flex items-center gap-2 disabled:opacity-50 ${
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

export default SyllabusExplorer;
