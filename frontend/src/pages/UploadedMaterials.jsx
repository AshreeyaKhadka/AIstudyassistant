import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp, Search, Trash2, Loader2, CheckCircle2,
  AlertCircle, FileText, Folder, FolderOpen, ChevronRight, X,
  BrainCircuit, Target, Trophy, AlertTriangle, UploadCloud, CornerLeftUp,
  Eye, RotateCcw, Pencil, Save, MessageSquare, XCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PDFViewerModal from '../components/PDFViewerModal';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SUPPORTED_UPLOAD_EXTENSIONS = ['.pdf', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];
const SUPPORTED_UPLOAD_ACCEPT = SUPPORTED_UPLOAD_EXTENSIONS.join(',');

const DEFAULT_SUBJECTS_BY_SEMESTER = {
  1: ['Calculus I', 'Digital Logic', 'Programming in C', 'Basic Electrical Engineering', 'Computer Workshop', 'Communication Technique', 'Electronics Devices & Circuits'],
  2: ['Algebra & Geometry', 'Applied Physics', 'Applied Chemistry', 'Basic Engineering Drawing', 'Object Oriented Programming in C++', 'Data Structure & Algorithm', 'Instrumentation'],
  3: ['Calculus II', 'Database Management System', 'Operating Systems', 'Microprocessor & Assembly Language Programming', 'Computer Graphics', 'Data Communication'],
  4: ['Applied Mathematics', 'Numerical Methods', 'Advanced Programming with Java', 'Theory of Computation', 'Computer Architecture', 'Research Fundamentals'],
  5: ['Probability & Statistics', 'Embedded System', 'Engineering Management', 'Artificial Intelligence', 'Digital Signal Analysis Processing', 'Software Engineering'],
  6: ['Image Processing & Pattern Recognition', 'Machine Learning', 'Data Science & Analytics', 'Computer Networks', 'Simulation & Modeling'],
  7: ['Network & Cyber Security', 'Cloud Computing & Virtualization', 'Compiler Design', 'Project Phase I'],
  8: ['Project Phase II', 'Engineering Ethics', 'Elective III']
};

const UploadedMaterials = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation State (Mac Finder hierarchy)
  const [currentSemester, setCurrentSemester] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);

  const [dbSubjects, setDbSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mastery, setMastery] = useState(null);
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [autoPlanning, setAutoPlanning] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSemester, setUploadSemester] = useState(1);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Document viewer modal state
  const [viewingFile, setViewingFile] = useState(null);

  // Status notification
  const [status, setStatus] = useState({ type: '', message: '' });

  // Action Modals
  const [generating, setGenerating] = useState(null);
  const [validatingUploadId, setValidatingUploadId] = useState(null);
  const [retryingUploadId, setRetryingUploadId] = useState(null);
  const [reassigningUploadId, setReassigningUploadId] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
    fetchDbSubjects();
  }, []);

  const hasActiveProcessing = materials.some((material) =>
    ['uploaded', 'screening', 'extracting', 'indexing', 'validating'].includes(material.processing_status)
  );

  useEffect(() => {
    if (!hasActiveProcessing) return undefined;
    const interval = window.setInterval(() => fetchMaterials(true), 2000);
    return () => window.clearInterval(interval);
  }, [hasActiveProcessing]);

  useEffect(() => {
    if (!currentSubject || !dbSubjects.length) {
      setMastery(null);
      return;
    }
    const matchedSub = dbSubjects.find(s => s.name.toLowerCase() === currentSubject.toLowerCase());
    if (!matchedSub) {
      setMastery(null);
      return;
    }
    fetchSubjectMastery(matchedSub.id);
  }, [currentSubject, dbSubjects]);

  // Handle location state redirection from Dashboard
  useEffect(() => {
    if (location.state?.search) {
      setSearchQuery(location.state.search);
    } else if (location.state?.subject) {
      const subj = location.state.subject;
      // Find semester for subject
      let semFound = 1;
      for (const [sem, subs] of Object.entries(DEFAULT_SUBJECTS_BY_SEMESTER)) {
        if (subs.some(s => s.toLowerCase() === subj.toLowerCase())) {
          semFound = Number(sem);
          break;
        }
      }
      setCurrentSemester(semFound);
      setCurrentSubject(subj);
    }
  }, [location.state]);

  const fetchDbSubjects = async () => {
    try {
      const res = await fetch('/api/syllabus/subjects', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load subjects.');
      setDbSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not load subjects.' });
    }
  };

  const fetchMaterials = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/upload/', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load study materials.');
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) setStatus({ type: 'error', message: err.message || 'Could not load study materials.' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchSubjectMastery = async (subjectId) => {
    try {
      setMasteryLoading(true);
      const res = await fetch(`/api/syllabus/${subjectId}/mastery`, { credentials: 'include' });
      if (res.ok) {
        setMastery(await res.json());
      } else {
        setMastery(null);
      }
    } catch {
      setMastery(null);
    } finally {
      setMasteryLoading(false);
    }
  };

  const getSubjectsForSemester = (sem) => {
    const fromDb = dbSubjects.filter(s => Number(s.semester) === Number(sem)).map(s => s.name);
    const defaults = DEFAULT_SUBJECTS_BY_SEMESTER[sem] || [];
    return Array.from(new Set([...fromDb, ...defaults]));
  };

  const getMaterialSemester = (m) => {
    if (!m.subject) return 1;
    const dbSub = dbSubjects.find(s => s.name.toLowerCase() === m.subject.toLowerCase());
    if (dbSub && dbSub.semester) return Number(dbSub.semester);
    for (const [sem, subs] of Object.entries(DEFAULT_SUBJECTS_BY_SEMESTER)) {
      if (subs.some(s => s.toLowerCase() === m.subject.toLowerCase())) {
        return Number(sem);
      }
    }
    return 1;
  };

  const handleOpenUpload = () => {
    setUploadSemester(currentSemester || 1);
    const availSubs = getSubjectsForSemester(currentSemester || 1);
    setUploadSubject(currentSubject || availSubs[0] || '');
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setStatus({ type: 'error', message: 'Please select a study material file.' });
      return;
    }

    const lowerName = uploadFile.name.toLowerCase();
    const supported = SUPPORTED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!supported) {
      setStatus({ type: 'error', message: 'Upload PDF/PPTX slides, TXT notes, or PNG/JPG/WEBP handwritten-note images.' });
      return;
    }

    if (!uploadSubject.trim()) {
      setStatus({ type: 'error', message: 'Please select or enter a subject.' });
      return;
    }

    try {
      setUploading(true);
      setStatus({ type: 'loading', message: 'Filing document into vault...' });

      let matchedSub = dbSubjects.find(s => s.name.toLowerCase() === uploadSubject.trim().toLowerCase());
      if (!matchedSub) {
        const subjectRes = await fetch('/api/syllabus/subjects', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: uploadSubject.trim(),
            semester: uploadSemester,
            credits: 3,
          }),
        });
        const subjectData = await subjectRes.json();
        if (!subjectRes.ok) throw new Error(subjectData.error || 'Could not create the selected subject.');
        matchedSub = subjectData;
        setDbSubjects((current) => [...current, subjectData]);
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('subject_id', matchedSub.id);
      formData.append('subject', matchedSub.name || uploadSubject.trim());

      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: `Screening "${uploadFile.name}" for relevance to ${uploadSubject}.` });
        setShowUploadModal(false);
        fetchMaterials();
        setCurrentSemester(uploadSemester);
        setCurrentSubject(matchedSub.name || uploadSubject.trim());
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to upload document.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Network error during upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async (uploadId) => {
    setValidatingUploadId(uploadId);
    try {
      const res = await fetch(`/api/upload/${uploadId}/validate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          type: 'success',
          message: data.message || 'Subject relevance screening restarted.',
        });
        fetchMaterials();
        if (currentSubject) {
          const matchedSub = dbSubjects.find(s => s.name.toLowerCase() === currentSubject.toLowerCase());
          if (matchedSub) fetchSubjectMastery(matchedSub.id);
        }
      } else {
        setStatus({ type: 'error', message: data.error || 'Could not validate this material.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error during validation.' });
    } finally {
      setValidatingUploadId(null);
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    }
  };

  const handleRetry = async (uploadId) => {
    setRetryingUploadId(uploadId);
    try {
      const res = await fetch(`/api/upload/${uploadId}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not restart document processing.');
      setStatus({ type: 'success', message: 'Document processing restarted.' });
      await fetchMaterials(true);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not restart document processing.' });
    } finally {
      setRetryingUploadId(null);
    }
  };

  const handleReassign = async (uploadId, subjectId) => {
    if (!subjectId) return;
    setReassigningUploadId(uploadId);
    try {
      const res = await fetch(`/api/upload/${uploadId}/subject`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_id: Number(subjectId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not change the document subject.');
      setStatus({ type: 'success', message: 'Subject changed. The document is being reindexed.' });
      await fetchMaterials(true);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not change the document subject.' });
    } finally {
      setReassigningUploadId(null);
    }
  };

  const handleRename = async (uploadId, filename) => {
    try {
      const res = await fetch(`/api/upload/${uploadId}/name`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not rename this document.');
      setMaterials((current) => current.map((material) => material.id === uploadId ? data.upload : material));
      setStatus({ type: 'success', message: 'Document renamed.' });
      return true;
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Could not rename this document.' });
      return false;
    }
  };

  const handleAutoPlan = async () => {
    const matchedSub = dbSubjects.find(s => currentSubject && s.name.toLowerCase() === currentSubject.toLowerCase());
    if (!matchedSub) return;
    setAutoPlanning(true);
    try {
      const res = await fetch(`/api/revision-plans/auto/${matchedSub.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Created ${data.count} revision task${data.count === 1 ? '' : 's'} from mastery gaps.` });
      } else {
        setStatus({ type: 'error', message: data.error || 'Could not create revision tasks.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error during revision planning.' });
    } finally {
      setAutoPlanning(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    }
  };

  const handleGenerate = async (uploadId, type) => {
    setGenerating({ uploadId, type });
    setGeneratedContent(null);

    const endpoints = {
      flashcards: '/api/generate/flashcards',
      mcqs: '/api/generate/mcqs',
      'exam-questions': '/api/generate/exam-questions',
    };

    try {
      const res = await fetch(endpoints[type], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          upload_id: uploadId,
          count: type === 'exam-questions' ? 8 : 10,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setGeneratedContent({
          type,
          data,
          source: data.source_doc || 'Uploaded material',
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Material generation failed.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error during generation.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } finally {
      setGenerating(null);
    }
  };

  const handleAskDocument = (file) => {
    const params = new URLSearchParams({
      study_mode: 'document',
      upload_id: String(file.id),
      filename: file.filename,
    });
    if (file.subject) params.set('subject', file.subject);
    navigate(`/dashboard/chat?${params.toString()}`);
  };

  const executeDelete = async () => {
    if (!confirmDeleteFile) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/upload/${confirmDeleteFile.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== confirmDeleteFile.id));
        setStatus({ type: 'success', message: `Removed "${confirmDeleteFile.filename}".` });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      } else {
        const data = await res.json().catch(() => null);
        setStatus({ type: 'error', message: data?.error || 'Could not delete this document.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error during deletion.' });
    } finally {
      setDeleting(false);
      setConfirmDeleteFile(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0.1 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSizeBytes = materials.reduce((acc, m) => acc + (m.size_bytes || 0), 0);
  const uniqueSubjectsCount = new Set(materials.map(m => m.subject).filter(Boolean)).size;

  const isSearching = searchQuery.trim() !== '';
  const isFiltering = isSearching || statusFilter !== 'all' || typeFilter !== 'all';

  const getSemesterFileCount = (sem) => {
    return materials.filter(m => getMaterialSemester(m) === sem).length;
  };

  const getSubjectFileCount = (sem, subj) => {
    return materials.filter(m => getMaterialSemester(m) === sem && m.subject?.toLowerCase() === subj.toLowerCase()).length;
  };

  const currentFiles = materials.filter(m => {
    const matchesQuery = !isSearching || m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'processing' && ['uploaded', 'screening', 'extracting', 'indexing', 'validating'].includes(m.processing_status)) ||
      (statusFilter === 'failed' && m.processing_status === 'failed') ||
      (statusFilter === 'approved' && m.validation_status === 'approved') ||
      (statusFilter === 'review' && m.processing_status === 'ready' && m.validation_status !== 'approved');
    const matchesType = typeFilter === 'all' || fileExtension(m.filename).toLowerCase() === typeFilter;
    const matchesFolder = isFiltering || (
      currentSemester && currentSubject &&
      getMaterialSemester(m) === currentSemester &&
      m.subject?.toLowerCase() === currentSubject.toLowerCase()
    );
    return matchesQuery && matchesStatus && matchesType && matchesFolder;
  });

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Header Card */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#102326]"></span>
            YOUR BRAIN'S EXTERNAL HARD DRIVE
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Study Vault</h1>
          <p className="text-xs text-[#666666] mt-0.5 max-w-xl">
            Drop PDFs, PPTX slide decks, typed notes, or handwritten-note images here. We'll validate them against the syllabus before using them for RAG.
          </p>
        </div>

        <button
          onClick={handleOpenUpload}
          className="px-4 py-2.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shrink-0 shadow-xs"
        >
          <FileUp size={15} />
          <span>UPLOAD MATERIAL</span>
        </button>
      </div>

      {/* 2. Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#D7D3CF] bg-white rounded-[4px] divide-y sm:divide-y-0 sm:divide-x divide-[#D7D3CF] overflow-hidden">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOTAL MATERIALS</span>
          <span className="text-xl font-bold font-mono text-[#111111] mt-1">{materials.length} Files</span>
        </div>
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">STORAGE USED</span>
          <span className="text-xl font-bold font-mono text-[#111111] mt-1">{formatSize(totalSizeBytes)}</span>
        </div>
        <div className="p-4 flex flex-col justify-between bg-[#FFFDFB]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#C96A32] font-semibold">COVERED SUBJECTS</span>
          <span className="text-xl font-bold font-mono text-[#C96A32] mt-1">{uniqueSubjectsCount} Subjects</span>
        </div>
      </div>

      {/* Status Alert */}
      {status.message && (
        <div role={status.type === 'error' ? 'alert' : 'status'} className={`p-3 rounded-[4px] text-xs font-mono flex items-start justify-between gap-3 border ${
          status.type === 'error' ? 'bg-[#FFFDFB] text-[#C96A32] border-[#D7D3CF]' :
          status.type === 'success' ? 'bg-white text-[#102326] border-[#102326]' :
          'bg-white text-[#111111] border-[#D7D3CF]'
        }`}>
          <div className="flex min-w-0 items-start gap-2">
            {status.type === 'loading' && <Loader2 className="animate-spin" size={14} />}
            {status.type === 'success' && <CheckCircle2 size={14} />}
            {status.type === 'info' && <AlertCircle size={14} />}
            {status.type === 'error' && <AlertCircle size={14} />}
            <span className="min-w-0 break-words">{status.message}</span>
          </div>
          <button onClick={() => setStatus({ type: '', message: '' })} className="underline text-[10px]">Dismiss</button>
        </div>
      )}

      {/* 3. Finder Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-[#D7D3CF] rounded-[4px]">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#111111] overflow-x-auto py-1">
          <button
            onClick={() => { setCurrentSemester(null); setCurrentSubject(null); setSearchQuery(''); }}
            className={`hover:text-[#C96A32] transition-colors flex items-center gap-1 ${
              !currentSemester && !isFiltering ? 'font-bold text-[#102326]' : 'text-[#666666]'
            }`}
          >
            <Folder size={14} className="text-[#102326]" />
            <span>Study Vault</span>
          </button>

          {currentSemester && (
            <>
              <ChevronRight size={13} className="text-[#666666] shrink-0" />
              <button
                onClick={() => { setCurrentSubject(null); setSearchQuery(''); }}
                className={`hover:text-[#C96A32] transition-colors whitespace-nowrap ${
                  !currentSubject && !isFiltering ? 'font-bold text-[#102326]' : 'text-[#666666]'
                }`}
              >
                Semester {currentSemester}
              </button>
            </>
          )}

          {currentSubject && (
            <>
              <ChevronRight size={13} className="text-[#666666] shrink-0" />
              <span className="font-bold text-[#102326] truncate max-w-[180px]">
                {currentSubject}
              </span>
            </>
          )}

          {isFiltering && (
            <>
              <ChevronRight size={13} className="text-[#666666] shrink-0" />
              <span className="font-bold text-[#C96A32]">Filtered Results</span>
            </>
          )}
        </div>

        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter documents by status"
            className="min-w-32 bg-[#F7F5F2] text-xs font-mono"
          >
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved</option>
            <option value="review">Needs review</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter documents by file type"
            className="min-w-28 bg-[#F7F5F2] text-xs font-mono"
          >
            <option value="all">All types</option>
            <option value="pdf">PDF</option>
            <option value="pptx">PPTX</option>
            <option value="txt">TXT</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WEBP</option>
          </select>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={14} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or subjects..."
              aria-label="Search files and subjects"
              className="w-full pl-9 pr-8 py-1.5 bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] text-xs font-mono text-[#111111] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#111111]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Mac Finder Style Grid Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-28 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
          ))}
        </div>
      ) : isFiltering ? (
        /* Search View */
        <div className="space-y-4">
          <div className="text-xs font-mono text-[#666666]">
            {searchQuery ? <>Showing results for <span className="font-bold text-[#111111]">"{searchQuery}"</span></> : 'Filtered materials'} ({currentFiles.length} found)
          </div>

          {currentFiles.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center">
              <FileText size={32} className="text-[#666666] mx-auto mb-2" />
              <p className="text-xs font-mono text-[#666666]">No materials match the current search and filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFiles.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  formatSize={formatSize}
                  onView={() => setViewingFile(file)}
                  onDelete={() => setConfirmDeleteFile(file)}
                  onGenerate={handleGenerate}
                  onAskAi={() => handleAskDocument(file)}
                  onValidate={handleValidate}
                  onRetry={handleRetry}
                  onReassign={handleReassign}
                  onRename={handleRename}
                  subjects={dbSubjects}
                  generating={generating}
                  validating={validatingUploadId === file.id}
                  retrying={retryingUploadId === file.id}
                  reassigning={reassigningUploadId === file.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : !currentSemester ? (
        /* Top Level View: Semester Folders 1..8 */
        <div>
          <div className="mb-3 text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
            SEMESTER DIRECTORIES
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SEMESTERS.map((sem) => {
              const fileCount = getSemesterFileCount(sem);
              const subjectCount = getSubjectsForSemester(sem).length;
              return (
                <button
                  key={sem}
                  onClick={() => setCurrentSemester(sem)}
                  className="bg-white hover:bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] p-4 text-left transition-all hover:border-[#102326] flex flex-col justify-between group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] group-hover:bg-[#102326] group-hover:text-white text-[#102326] flex items-center justify-center transition-colors">
                      <Folder size={20} strokeWidth={1.8} />
                    </div>
                    <span className="font-mono text-[10px] bg-[#F7F5F2] border border-[#D7D3CF] text-[#666666] px-1.5 py-0.5 rounded-[2px]">
                      SEM {sem}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111111] group-hover:text-[#102326]">
                      Semester {sem}
                    </h3>
                    <p className="text-[11px] font-mono text-[#666666] mt-1">
                      {subjectCount} Subjects • {fileCount} Files
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : !currentSubject ? (
        /* Inside Semester View: Subject Folders */
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              SEMESTER {currentSemester} SUBJECT DIRECTORIES
            </div>
            <button
              onClick={() => setCurrentSemester(null)}
              className="text-xs font-mono text-[#666666] hover:text-[#102326] flex items-center gap-1"
            >
              <CornerLeftUp size={13} />
              <span>Back to Semesters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {getSubjectsForSemester(currentSemester).map((subjName) => {
              const fileCount = getSubjectFileCount(currentSemester, subjName);
              return (
                <button
                  key={subjName}
                  onClick={() => setCurrentSubject(subjName)}
                  className="bg-white hover:bg-[#FAF9F7] border border-[#D7D3CF] rounded-[4px] p-4 text-left transition-all hover:border-[#102326] flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[4px] bg-[#ECEAE7] group-hover:bg-[#102326] group-hover:text-white text-[#102326] flex items-center justify-center shrink-0 transition-colors">
                      <FolderOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#111111] truncate group-hover:text-[#102326]">
                        {subjName}
                      </h4>
                      <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                        {fileCount} {fileCount === 1 ? 'File' : 'Files'} uploaded
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#666666] group-hover:text-[#102326] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Inside Subject View: Material List */
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
              FILES IN {currentSubject.toUpperCase()} ({currentFiles.length})
            </div>
            <button
              onClick={() => setCurrentSubject(null)}
              className="text-xs font-mono text-[#666666] hover:text-[#102326] flex items-center gap-1"
            >
              <CornerLeftUp size={13} />
              <span>Back to Subject List</span>
            </button>
          </div>

          <SubjectMasteryPanel
            mastery={mastery}
            loading={masteryLoading}
            onAutoPlan={handleAutoPlan}
            autoPlanning={autoPlanning}
          />

          {currentFiles.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center space-y-3">
              <FileText size={36} className="text-[#666666] mx-auto" />
              <h3 className="text-sm font-bold text-[#111111]">This folder is empty</h3>
              <p className="text-xs font-mono text-[#666666] max-w-sm mx-auto">
                No materials uploaded for {currentSubject} yet. Click below to add syllabus-aligned notes or slides.
              </p>
              <button
                onClick={handleOpenUpload}
                className="px-4 py-2 bg-[#102326] text-white rounded-[4px] font-mono text-xs font-semibold uppercase inline-flex items-center gap-2"
              >
                <FileUp size={14} />
                <span>UPLOAD TO {currentSubject.toUpperCase()}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFiles.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  formatSize={formatSize}
                  onView={() => setViewingFile(file)}
                  onDelete={() => setConfirmDeleteFile(file)}
                  onGenerate={handleGenerate}
                  onAskAi={() => handleAskDocument(file)}
                  onValidate={handleValidate}
                  onRetry={handleRetry}
                  onReassign={handleReassign}
                  onRename={handleRename}
                  subjects={dbSubjects}
                  generating={generating}
                  validating={validatingUploadId === file.id}
                  retrying={retryingUploadId === file.id}
                  reassigning={reassigningUploadId === file.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Document Viewer Popup Modal */}
      {viewingFile && (
        <PDFViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* 6. Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7D3CF] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#102326] text-white rounded-[4px] flex items-center justify-center">
                  <UploadCloud size={16} />
                </div>
                <h3 className="text-sm font-bold text-[#111111]">Upload Material to Study Vault</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-[#666666] hover:text-[#111111]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Semester Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold text-[#666666] mb-1">
                  1. SELECT SEMESTER
                </label>
                <select
                  value={uploadSemester}
                  onChange={(e) => {
                    const sem = Number(e.target.value);
                    setUploadSemester(sem);
                    const avail = getSubjectsForSemester(sem);
                    setUploadSubject(avail[0] || '');
                  }}
                  className="w-full bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                >
                  {SEMESTERS.map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold text-[#666666] mb-1">
                  2. SELECT SUBJECT
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs font-mono text-[#111111] outline-none"
                >
                  {getSubjectsForSemester(uploadSemester).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* File Selector */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-semibold text-[#666666] mb-1">
                  3. SELECT MATERIAL FILE
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D7D3CF] hover:border-[#102326] bg-[#F7F5F2] rounded-[4px] p-6 text-center cursor-pointer transition-colors"
                >
                  <FileText size={28} className="text-[#666666] mx-auto mb-2" />
                  {uploadFile ? (
                    <div>
                      <p className="text-xs font-bold text-[#102326] truncate">{uploadFile.name}</p>
                      <p className="text-[10px] font-mono text-[#666666] mt-0.5">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-[#111111]">Click to choose a file</p>
                      <p className="text-[10px] font-mono text-[#666666] mt-0.5">PDF, PPTX, TXT, PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={SUPPORTED_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D7D3CF]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile || !uploadSubject.trim()}
                  className="px-4 py-2 bg-[#102326] hover:bg-[#0b191c] text-white rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                  <span>{uploading ? 'UPLOADING...' : 'FILE INTO VAULT'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-sm w-full space-y-4 shadow-lg">
            <div className="flex items-center gap-3 text-[#C96A32]">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-[#111111]">Delete Document?</h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[#111111]">"{confirmDeleteFile.filename}"</span>? This will remove the source file and purge its index.
            </p>
            <div className="flex gap-2 justify-end pt-2 border-t border-[#D7D3CF]">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                disabled={deleting}
                className="px-3 py-1.5 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-[#C96A32] text-white hover:bg-[#a85222] rounded-[4px] text-xs font-mono font-semibold uppercase transition-colors inline-flex items-center gap-1.5"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>DELETE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Generated Content Modal */}
      {generatedContent && (
        <GeneratedContentModal
          content={generatedContent}
          onClose={() => setGeneratedContent(null)}
          onNavigate={(path) => { setGeneratedContent(null); navigate(path); }}
        />
      )}
    </div>
  );
};

const fileExtension = (filename = '') => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
};

const SubjectMasteryPanel = ({ mastery, loading, onAutoPlan, autoPlanning }) => {
  if (loading) {
    return (
      <div className="mb-4 border border-[#D7D3CF] bg-white rounded-[4px] p-4 text-xs font-mono text-[#666666] flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-[#102326]" />
        <span>Loading subject mastery...</span>
      </div>
    );
  }

  if (!mastery) return null;

  const summary = mastery.summary || {};
  const weakTopics = (mastery.topics || []).filter(topic => topic.weak).slice(0, 3);
  const uncoveredTopics = (mastery.topics || []).filter(topic => !topic.covered).slice(0, 3);
  const resources = (mastery.recommended_resources || []).slice(0, 3);

  return (
    <div className="mb-4 border border-[#D7D3CF] bg-white rounded-[4px] p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">Subject Mastery</p>
          <h3 className="text-sm font-bold text-[#111111]">{mastery.subject?.name}</h3>
        </div>
        <button
          onClick={onAutoPlan}
          disabled={autoPlanning}
          className="px-3 py-2 border border-[#102326] text-[#102326] hover:bg-[#102326] hover:text-white rounded-[4px] text-[10px] font-mono font-semibold uppercase inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {autoPlanning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          <span>Auto Plan Revision</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
        <MasteryMetric label="Covered" value={`${summary.coverage_percent || 0}%`} />
        <MasteryMetric label="Topics" value={summary.total_topics || 0} />
        <MasteryMetric label="Weak" value={summary.weak_topics || 0} />
        <MasteryMetric label="Approved" value={summary.approved_materials || 0} />
        <MasteryMetric label="Review" value={summary.review_materials || 0} />
        <MasteryMetric label="Rejected" value={summary.rejected_materials || 0} />
      </div>

      {(weakTopics.length > 0 || uncoveredTopics.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <TopicPreview title="Weak Topics" topics={weakTopics} empty="No weak topics detected yet." />
          <TopicPreview title="Uncovered Topics" topics={uncoveredTopics} empty="All seeded topics have coverage." />
        </div>
      )}
      {resources.length > 0 && (
        <div className="mt-3 border border-[#D7D3CF] rounded-[4px] p-3 bg-white">
          <p className="text-[10px] font-mono uppercase text-[#666666] font-semibold mb-2">Helpful Resources</p>
          <div className="flex flex-wrap gap-2">
            {resources.map(resource => (
              <div key={resource.topic_id} className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-[#666666] max-w-[180px] truncate">{resource.topic_title}</span>
                {resource.links?.map(link => (
                  <a
                    key={`${resource.topic_id}-${link.label}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 border border-[#D7D3CF] rounded-[4px] text-[#102326] hover:bg-[#102326] hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MasteryMetric = ({ label, value }) => (
  <div className="border border-[#D7D3CF] bg-[#F7F5F2] rounded-[4px] p-2">
    <p className="text-[9px] font-mono uppercase text-[#666666]">{label}</p>
    <p className="text-sm font-bold text-[#111111] mt-0.5">{value}</p>
  </div>
);

const TopicPreview = ({ title, topics, empty }) => (
  <div className="border border-[#D7D3CF] rounded-[4px] p-3 bg-[#FAF9F7]">
    <p className="text-[10px] font-mono uppercase text-[#666666] font-semibold mb-2">{title}</p>
    {topics.length === 0 ? (
      <p className="text-[11px] text-[#666666]">{empty}</p>
    ) : (
      <div className="space-y-1.5">
        {topics.map(topic => (
          <div key={topic.topic_id} className="flex items-center justify-between gap-2">
            <span className="truncate text-[#111111]">{topic.topic_title}</span>
            <span className="font-mono text-[10px] text-[#666666] shrink-0">{Math.round(topic.mastery_score || topic.coverage_score || 0)}%</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const documentStatusMeta = (file) => {
  const processing = file.processing_status || 'uploaded';
  const status = file.validation_status || 'pending';
  const stages = {
    uploaded: 'QUEUED',
    screening: 'SCREENING',
    extracting: 'EXTRACTING',
    indexing: 'INDEXING',
    validating: 'VALIDATING',
  };
  if (stages[processing]) {
    return { label: stages[processing], className: 'bg-[#F7F5F2] text-[#666666] border-[#D7D3CF]', icon: Loader2, spinning: true };
  }
  if (processing === 'failed') {
    return { label: 'FAILED', className: 'bg-[#FFFDFB] text-[#C96A32] border-[#C96A32]', icon: AlertCircle };
  }
  if (file.admission_status === 'rejected' || processing === 'rejected') {
    return { label: 'REJECTED', className: 'bg-[#FFFDFB] text-[#C96A32] border-[#C96A32]', icon: XCircle };
  }
  if (status === 'approved') {
    return { label: 'APPROVED', className: 'bg-white text-[#102326] border-[#102326]', icon: CheckCircle2 };
  }
  return { label: 'ADMITTED WITH WARNING', className: 'bg-[#FFFDFB] text-[#C96A32] border-[#D7D3CF]', icon: AlertCircle };
};

const extractionLabel = (method) => ({
  pdf_text: 'PDF Text',
  pdf_text_ocr: 'PDF + OCR',
  slide_text: 'Slides',
  typed_text: 'Text',
  ocr: 'OCR',
}[method] || 'Extracted');

const FileCard = ({
  file, formatSize, onView, onDelete, onGenerate, onAskAi, onValidate, onRetry, onReassign, onRename,
  subjects, generating, validating, retrying, reassigning,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(file.filename);
  const [savingName, setSavingName] = useState(false);
  const meta = documentStatusMeta(file);
  const StatusIcon = meta.icon;
  const isBusy = ['uploaded', 'screening', 'extracting', 'indexing', 'validating'].includes(file.processing_status);
  const approved = file.admission_status === 'admitted' && file.processing_status === 'ready' && file.embedding_status === 'embedded' && ['approved', 'needs_review'].includes(file.validation_status);
  const askAiReason = file.processing_status !== 'ready'
    ? (file.processing_error || 'Document extraction must finish before Ask AI is available')
    : file.embedding_status !== 'embedded'
      ? (file.embedding_error || 'Document indexing must finish before Ask AI is available')
      : file.admission_status !== 'admitted' || !['approved', 'needs_review'].includes(file.validation_status)
        ? (file.admission_error || file.validation_error || 'This document must pass subject relevance screening before Ask AI is available')
        : 'Ask questions using only this document';
  const validationPct = file.syllabus_match_coverage != null ? Math.round(file.syllabus_match_coverage * 100) : null;
  const validationDetails = file.validation_details || {};
  const matchedTopics = Array.isArray(validationDetails.matched_topics) ? validationDetails.matched_topics : [];
  const unmatchedSections = Array.isArray(validationDetails.unmatched_sections) ? validationDetails.unmatched_sections : [];

  const submitRename = async () => {
    if (!draftName.trim() || draftName.trim() === file.filename) {
      setDraftName(file.filename);
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const renamed = await onRename(file.id, draftName.trim());
    setSavingName(false);
    if (renamed) setEditingName(false);
  };

  return (
    <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5 flex flex-col justify-between hover:bg-[#FAF9F7] transition-colors shadow-2xs">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setDraftName(file.filename); setEditingName(true); }}
              disabled={isBusy}
              className="p-1 text-[#666666] hover:text-[#102326] hover:bg-[#ECEAE7] rounded-[2px] transition-colors"
              title="Rename document"
              aria-label={`Rename ${file.filename}`}
            >
              <Pencil size={14} />
            </button>
            <button
            onClick={onView}
            disabled={file.admission_status === 'rejected'}
              className="p-1 text-[#666666] hover:text-[#102326] hover:bg-[#ECEAE7] rounded-[2px] transition-colors"
              title="View document"
              aria-label={`View ${file.filename}`}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onDelete}
              disabled={isBusy}
              className="p-1 text-[#666666] hover:text-[#C96A32] hover:bg-[#ECEAE7] rounded-[2px] transition-colors"
              title={isBusy ? 'Wait for processing to finish' : 'Delete document'}
              aria-label={`Delete ${file.filename}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {editingName ? (
          <div className="flex items-center gap-1.5">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitRename();
                if (event.key === 'Escape') setEditingName(false);
              }}
              className="min-w-0 flex-1 px-2 py-1 text-xs font-mono"
              aria-label="Document filename"
              autoFocus
            />
            <button onClick={submitRename} disabled={savingName} className="p-1 text-[#102326]" aria-label="Save filename">
              {savingName ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            </button>
            <button onClick={() => setEditingName(false)} className="p-1 text-[#666666]" aria-label="Cancel rename"><X size={14} /></button>
          </div>
        ) : (
          <h4
            className={`text-xs font-bold truncate ${file.admission_status === 'rejected' ? 'text-[#666666]' : 'text-[#111111] cursor-pointer hover:text-[#102326]'}`}
            onClick={file.admission_status === 'rejected' ? undefined : onView}
            title={file.filename}
          >
            {file.filename}
          </h4>
        )}

        <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-[#666666]">
          <span>{formatSize(file.size_bytes)}</span>
          <span>•</span>
          <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Recent'}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={file.subject_id || ''}
            onChange={(event) => onReassign(file.id, event.target.value)}
            disabled={isBusy || reassigning || file.admission_status === 'rejected'}
            aria-label={`Subject for ${file.filename}`}
            className="max-w-[150px] px-2 py-0.5 bg-[#ECEAE7] text-[#111111] border-0 font-mono text-[9px] uppercase font-semibold"
          >
            {!file.subject_id && <option value="">General</option>}
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <span className="bg-[#F7F5F2] text-[#102326] border border-[#D7D3CF] font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[2px]">
            {fileExtension(file.filename)}
          </span>
          <span className={`border font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[2px] inline-flex items-center gap-1 ${meta.className}`}>
            <StatusIcon size={10} className={meta.spinning ? 'animate-spin' : ''} />
            {meta.label}
          </span>
        </div>
        {validationPct !== null && (
          <p className="mt-2 text-[10px] font-mono text-[#666666]">
            Syllabus match: {validationPct}%
          </p>
        )}
        {(file.extraction_method || file.extraction_quality) && (
          <p className="mt-1 text-[10px] font-mono text-[#666666]">
            Extraction: {extractionLabel(file.extraction_method)}{file.extraction_quality ? ` · ${file.extraction_quality.toUpperCase()}` : ''}
            {file.page_count ? ` · ${file.page_count} ${file.extraction_method === 'slide_text' ? 'slides' : 'pages'}` : ''}
            {file.native_text_pages ? ` · ${file.native_text_pages} native` : ''}
            {file.ocr_pages ? ` · ${file.ocr_pages} OCR` : ''}
          </p>
        )}
        {file.character_count ? (
          <p className="mt-1 text-[10px] font-mono text-[#666666]">{file.character_count.toLocaleString()} extracted characters</p>
        ) : null}
        {file.processing_warnings?.length > 0 && (
          <p className="mt-2 text-[10px] font-mono text-[#9A5B24] line-clamp-2" title={file.processing_warnings.join(' ')}>
            {file.processing_warnings.length} extraction warning{file.processing_warnings.length === 1 ? '' : 's'}: {file.processing_warnings[0]}
          </p>
        )}
        {file.processing_status === 'failed' && file.processing_error && (
          <p className="mt-2 text-[10px] font-mono text-[#C96A32] line-clamp-3" title={file.processing_error}>
            {file.processing_error}
          </p>
        )}
        {['rejected', 'needs_review', 'pending'].includes(file.validation_status) && file.validation_error && (
          <p className="mt-2 text-[10px] font-mono text-[#C96A32] line-clamp-2">
            {file.validation_error}
          </p>
        )}
        {(matchedTopics.length > 0 || unmatchedSections.length > 0) && (
          <details className="mt-3 border border-[#D7D3CF] rounded-[4px] bg-white">
            <summary className="cursor-pointer px-3 py-2 text-[10px] font-mono font-semibold uppercase text-[#102326]">
              Validation evidence
            </summary>
            <div className="border-t border-[#D7D3CF] px-3 py-2 space-y-3 text-[10px] text-[#555555]">
              {matchedTopics.length > 0 && (
                <div>
                  <p className="font-mono font-semibold uppercase text-[#185C28]">Matched syllabus topics</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {matchedTopics.slice(0, 6).map((topic) => (
                      <span key={topic.topic_id} className="border border-[#B9D8C0] bg-[#EEF7F0] px-1.5 py-1 rounded-[2px]">
                        {topic.topic_title} · {Math.round((topic.best_score || 0) * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {unmatchedSections.length > 0 && (
                <div>
                  <p className="font-mono font-semibold uppercase text-[#9A5B24]">Sections needing review</p>
                  {unmatchedSections.slice(0, 3).map((section, index) => (
                    <p key={`${section.page_number || 0}-${index}`} className="mt-1 line-clamp-2" title={section.excerpt}>
                      {section.page_number ? `Page ${section.page_number}: ` : ''}{section.heading || section.excerpt}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-[#D7D3CF]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[9px] font-mono uppercase text-[#666666] font-semibold">GENERATE STUDY TOOL</p>
          {file.processing_status === 'failed' ? (
            <button
              onClick={() => onRetry(file.id)}
              disabled={retrying}
              className="px-2 py-1 border border-[#C96A32] text-[#C96A32] rounded-[4px] bg-white hover:bg-[#FFFDFB] text-[9px] font-mono font-semibold uppercase inline-flex items-center gap-1 disabled:opacity-50"
              title="Retry extraction, indexing, and validation"
            >
              {retrying ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              <span>RETRY</span>
            </button>
          ) : file.processing_status === 'ready' && file.embedding_status === 'embedded' && file.validation_status === 'needs_review' && (
            <button
              onClick={() => onValidate(file.id)}
              disabled={validating}
              className="px-2 py-1 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white text-[9px] font-mono font-semibold uppercase inline-flex items-center gap-1 disabled:opacity-50"
              title="Run subject relevance screening again"
            >
              {validating ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              <span>CHECK</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            onClick={onAskAi}
            disabled={!approved}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title={askAiReason}
          >
            <MessageSquare size={13} />
            <span>ASK AI</span>
          </button>
          <button
            onClick={() => onGenerate(file.id, 'flashcards')}
            disabled={!approved || generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title={approved ? 'Generate Flashcards' : askAiReason}
          >
            {generating?.uploadId === file.id && generating?.type === 'flashcards' ? (
              <Loader2 size={13} className="animate-spin text-[#102326]" />
            ) : (
              <BrainCircuit size={13} />
            )}
            <span>CARDS</span>
          </button>

          <button
            onClick={() => onGenerate(file.id, 'mcqs')}
            disabled={!approved || generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title={approved ? 'Generate MCQs' : askAiReason}
          >
            {generating?.uploadId === file.id && generating?.type === 'mcqs' ? (
              <Loader2 size={13} className="animate-spin text-[#102326]" />
            ) : (
              <Target size={13} />
            )}
            <span>MCQS</span>
          </button>

          <button
            onClick={() => onGenerate(file.id, 'exam-questions')}
            disabled={!approved || generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title={approved ? 'Generate Exam Questions' : askAiReason}
          >
            {generating?.uploadId === file.id && generating?.type === 'exam-questions' ? (
              <Loader2 size={13} className="animate-spin text-[#102326]" />
            ) : (
              <Trophy size={13} />
            )}
            <span>EXAM</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const GeneratedContentModal = ({ content, onClose, onNavigate }) => {
  const { type, data, source } = content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 bg-[#102326] text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight uppercase font-mono">{type.toUpperCase()} GENERATED</h3>
            <p className="text-[10px] font-mono text-[#A0B0B3]">Source: {source}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-[#A0B0B3]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-[#F7F5F2]">
          {type === 'flashcards' && data.flashcards?.map((fc, i) => (
            <div key={i} className="p-4 bg-white border border-[#D7D3CF] rounded-[4px] space-y-2">
              <div className="text-[10px] font-mono text-[#666666] font-semibold uppercase">FLASHCARD {i + 1}</div>
              <p className="text-xs font-bold text-[#111111]">{fc.front}</p>
              <div className="pt-2 border-t border-[#ECEAE7] text-xs text-[#666666] leading-relaxed">
                <span className="font-mono text-[9px] uppercase font-bold text-[#C96A32] block mb-1">ANSWER:</span>
                {fc.back}
              </div>
            </div>
          ))}

          {type === 'mcqs' && data.mcqs?.map((mcq, i) => (
            <div key={i} className="p-4 bg-white border border-[#D7D3CF] rounded-[4px] space-y-2">
              <p className="text-xs font-bold text-[#111111]">{i + 1}. {mcq.question}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                {Object.entries(mcq.options || {}).map(([k, v]) => (
                  <div key={k} className={`text-xs p-2 rounded-[2px] font-mono border ${k === mcq.correct ? 'bg-[#ECEAE7] border-[#102326] font-bold text-[#102326]' : 'bg-white border-[#D7D3CF] text-[#666666]'}`}>
                    {k}. {v}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {type === 'exam-questions' && data.exam_questions?.map((q, i) => (
            <div key={i} className="p-4 bg-white border border-[#D7D3CF] rounded-[4px] space-y-1">
              <div className="text-[10px] font-mono text-[#666666] font-semibold uppercase">QUESTION {i + 1} • {q.marks || 5} MARKS</div>
              <p className="text-xs font-bold text-[#111111]">{q.question}</p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[#D7D3CF] bg-white flex justify-between items-center">
          <button
            onClick={() => {
              if (type === 'flashcards') onNavigate('/dashboard/flashcards');
              else if (type === 'mcqs') onNavigate('/dashboard/mcq');
              else onNavigate('/dashboard/exam-prep');
            }}
            className="px-3.5 py-1.5 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            <span>PRACTICE IN {type.toUpperCase()}</span>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-[#D7D3CF] text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadedMaterials;
