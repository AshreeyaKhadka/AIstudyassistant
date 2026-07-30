import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp, Search, Trash2, Loader2, CheckCircle2,
  AlertCircle, FileText, Folder, FolderOpen, ChevronRight, X,
  BrainCircuit, Target, Trophy, AlertTriangle, UploadCloud, CornerLeftUp,
  Eye
} from 'lucide-react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import PDFViewerModal from '../components/PDFViewerModal';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

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
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation State (Mac Finder hierarchy)
  const [currentSemester, setCurrentSemester] = useState(null);
  const [currentSubject, setCurrentSubject] = useState(null);

  const [dbSubjects, setDbSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSemester, setUploadSemester] = useState(1);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // PDF Viewer Modal State
  const [viewingFile, setViewingFile] = useState(null);

  // Status notification
  const [status, setStatus] = useState({ type: '', message: '' });

  // Action Modals
  const [generating, setGenerating] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
    fetchDbSubjects();
  }, []);

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
      if (res.ok) {
        const data = await res.json();
        setDbSubjects(data);
      }
    } catch (err) {
      console.error("Failed to load subjects:", err);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/upload/', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error("Failed to fetch materials:", err);
    } finally {
      setLoading(false);
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
      setStatus({ type: 'error', message: 'Please select a PDF file.' });
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ type: 'error', message: 'Only PDF documents are allowed.' });
      return;
    }

    if (!uploadSubject.trim()) {
      setStatus({ type: 'error', message: 'Please select or enter a subject.' });
      return;
    }

    const matchedSub = dbSubjects.find(s => s.name.toLowerCase() === uploadSubject.trim().toLowerCase());
    const formData = new FormData();
    formData.append('file', uploadFile);
    if (matchedSub) {
      formData.append('subject_id', matchedSub.id);
    }
    formData.append('subject', uploadSubject.trim());

    try {
      setUploading(true);
      setStatus({ type: 'loading', message: 'Filing document into vault...' });

      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: `Filed "${uploadFile.name}" into ${uploadSubject}.` });
        setShowUploadModal(false);
        fetchMaterials();
        setCurrentSemester(uploadSemester);
        setCurrentSubject(uploadSubject.trim());
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to upload document.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during upload.' });
    } finally {
      setUploading(false);
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
          source: data.source_doc || 'Uploaded PDF',
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Material generation failed.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during generation.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } finally {
      setGenerating(null);
    }
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
      }
    } catch (err) {
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

  const getSemesterFileCount = (sem) => {
    return materials.filter(m => getMaterialSemester(m) === sem).length;
  };

  const getSubjectFileCount = (sem, subj) => {
    return materials.filter(m => getMaterialSemester(m) === sem && m.subject?.toLowerCase() === subj.toLowerCase()).length;
  };

  const currentFiles = materials.filter(m => {
    if (isSearching) {
      return m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (currentSemester && currentSubject) {
      return getMaterialSemester(m) === currentSemester && m.subject?.toLowerCase() === currentSubject.toLowerCase();
    }
    return false;
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
            Drop your course PDFs here. We'll turn dense textbooks into exam-ready flashcards, MCQs, and summaries so you don't lose sleep.
          </p>
        </div>

        <button
          onClick={handleOpenUpload}
          className="px-4 py-2.5 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shrink-0 shadow-xs"
        >
          <FileUp size={15} />
          <span>UPLOAD PDF</span>
        </button>
      </div>

      {/* 2. Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#D7D3CF] bg-white rounded-[4px] divide-y sm:divide-y-0 sm:divide-x divide-[#D7D3CF] overflow-hidden">
        <div className="p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">TOTAL MATERIALS</span>
          <span className="text-xl font-bold font-mono text-[#111111] mt-1">{materials.length} PDFs</span>
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
        <div className={`p-3 rounded-[4px] text-xs font-mono flex items-center justify-between border ${
          status.type === 'error' ? 'bg-[#FFFDFB] text-[#C96A32] border-[#D7D3CF]' :
          status.type === 'success' ? 'bg-white text-[#102326] border-[#102326]' :
          'bg-white text-[#111111] border-[#D7D3CF]'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'loading' && <Loader2 className="animate-spin" size={14} />}
            {status.type === 'success' && <CheckCircle2 size={14} />}
            {status.type === 'error' && <AlertCircle size={14} />}
            <span>{status.message}</span>
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
              !currentSemester && !isSearching ? 'font-bold text-[#102326]' : 'text-[#666666]'
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
                  !currentSubject && !isSearching ? 'font-bold text-[#102326]' : 'text-[#666666]'
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

          {isSearching && (
            <>
              <ChevronRight size={13} className="text-[#666666] shrink-0" />
              <span className="font-bold text-[#C96A32]">Search Results</span>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all files or subjects..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#F7F5F2] border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] text-xs font-mono text-[#111111] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#111111]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Mac Finder Style Grid Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-28 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
          ))}
        </div>
      ) : isSearching ? (
        /* Search View */
        <div className="space-y-4">
          <div className="text-xs font-mono text-[#666666]">
            Showing results for <span className="font-bold text-[#111111]">"{searchQuery}"</span> ({currentFiles.length} found)
          </div>

          {currentFiles.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center">
              <FileText size={32} className="text-[#666666] mx-auto mb-2" />
              <p className="text-xs font-mono text-[#666666]">No files found matching "{searchQuery}".</p>
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
                  generating={generating}
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
                      {subjectCount} Subjects • {fileCount} PDFs
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
                        {fileCount} {fileCount === 1 ? 'PDF' : 'PDFs'} uploaded
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
        /* Inside Subject View: PDF Document List */
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

          {currentFiles.length === 0 ? (
            <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center space-y-3">
              <FileText size={36} className="text-[#666666] mx-auto" />
              <h3 className="text-sm font-bold text-[#111111]">This folder is empty</h3>
              <p className="text-xs font-mono text-[#666666] max-w-sm mx-auto">
                No PDFs uploaded for {currentSubject} yet. Click below to add syllabus notes.
              </p>
              <button
                onClick={handleOpenUpload}
                className="px-4 py-2 bg-[#102326] text-white rounded-[4px] font-mono text-xs font-semibold uppercase inline-flex items-center gap-2"
              >
                <FileUp size={14} />
                <span>UPLOAD PDF TO {currentSubject.toUpperCase()}</span>
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
                  generating={generating}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PDF Document Viewer Popup Modal */}
      {viewingFile && (
        <PDFViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* 6. Upload PDF Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7D3CF] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#102326] text-white rounded-[4px] flex items-center justify-center">
                  <UploadCloud size={16} />
                </div>
                <h3 className="text-sm font-bold text-[#111111]">Upload PDF to Study Vault</h3>
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
                  3. SELECT PDF DOCUMENT
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
                      <p className="text-xs font-semibold text-[#111111]">Click to choose PDF file</p>
                      <p className="text-[10px] font-mono text-[#666666] mt-0.5">PDF documents up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
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
                  disabled={uploading || !uploadFile}
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
            <div className="flex items-center gap-[#C96A32]">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-[#111111]">Delete Document?</h3>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[#111111]">"{confirmDeleteFile.filename}"</span>? This will remove the PDF file and purge its index.
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

const FileCard = ({ file, formatSize, onView, onDelete, onGenerate, generating }) => {
  return (
    <div className="bg-white rounded-[4px] border border-[#D7D3CF] p-5 flex flex-col justify-between hover:bg-[#FAF9F7] transition-colors shadow-2xs">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center shrink-0">
            <FileText size={16} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onView}
              className="p-1 text-[#666666] hover:text-[#102326] hover:bg-[#ECEAE7] rounded-[2px] transition-colors"
              title="View PDF Document"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-[#666666] hover:text-[#C96A32] hover:bg-[#ECEAE7] rounded-[2px] transition-colors"
              title="Delete Document"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <h4 className="text-xs font-bold text-[#111111] truncate cursor-pointer hover:text-[#102326]" onClick={onView} title={file.filename}>
          {file.filename}
        </h4>

        <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-[#666666]">
          <span>{formatSize(file.size_bytes)}</span>
          <span>•</span>
          <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Recent'}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="bg-[#ECEAE7] text-[#111111] font-mono text-[9px] uppercase px-2 py-0.5 rounded-[2px] font-semibold">
            {file.subject || 'GENERAL'}
          </span>
          <span className="bg-[#F7F5F2] text-[#102326] border border-[#D7D3CF] font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[2px]">
            PDF
          </span>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-[#D7D3CF]">
        <p className="text-[9px] font-mono uppercase text-[#666666] font-semibold mb-2">GENERATE STUDY TOOL</p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onGenerate(file.id, 'flashcards')}
            disabled={generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title="Generate Flashcards"
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
            disabled={generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title="Generate MCQs"
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
            disabled={generating?.uploadId === file.id}
            className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
            title="Generate Exam Questions"
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
