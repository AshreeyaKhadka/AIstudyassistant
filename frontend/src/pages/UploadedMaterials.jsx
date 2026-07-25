import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp, Search, Trash2, Loader2, CheckCircle2,
  AlertCircle, FileText, HardDrive, Filter, Plus,
  BrainCircuit, Target, Trophy, ChevronRight, X, RefreshCw, ChevronDown
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const FALLBACK_SUBJECTS = [
  { id: 'fb-1-1', name: 'Calculus I', semester: 1 },
  { id: 'fb-1-2', name: 'Digital Logic', semester: 1 },
  { id: 'fb-1-3', name: 'Programming in C', semester: 1 },
  { id: 'fb-1-4', name: 'Basic Electrical Engineering', semester: 1 },
  { id: 'fb-1-5', name: 'Computer Workshop', semester: 1 },
  { id: 'fb-1-6', name: 'Communication Technique', semester: 1 },
  { id: 'fb-1-7', name: 'Electronics Devices & Circuits', semester: 1 },
  { id: 'fb-2-1', name: 'Algebra & Geometry', semester: 2 },
  { id: 'fb-2-2', name: 'Applied Physics', semester: 2 },
  { id: 'fb-2-3', name: 'Applied Chemistry', semester: 2 },
  { id: 'fb-2-4', name: 'Basic Engineering Drawing', semester: 2 },
  { id: 'fb-2-5', name: 'Object Oriented Programming in C++', semester: 2 },
  { id: 'fb-2-6', name: 'Data Structure & Algorithm', semester: 2 },
  { id: 'fb-2-7', name: 'Instrumentation', semester: 2 },
  { id: 'fb-3-1', name: 'Calculus II', semester: 3 },
  { id: 'fb-3-2', name: 'Database Management System', semester: 3 },
  { id: 'fb-3-3', name: 'Operating Systems', semester: 3 },
  { id: 'fb-3-4', name: 'Microprocessor & Assembly Language Programming', semester: 3 },
  { id: 'fb-3-5', name: 'Computer Graphics', semester: 3 },
  { id: 'fb-3-6', name: 'Data Communication', semester: 3 },
  { id: 'fb-4-1', name: 'Applied Mathematics', semester: 4 },
  { id: 'fb-4-2', name: 'Numerical Methods', semester: 4 },
  { id: 'fb-4-3', name: 'Advanced Programming with Java', semester: 4 },
  { id: 'fb-4-4', name: 'Theory of Computation', semester: 4 },
  { id: 'fb-4-5', name: 'Computer Architecture', semester: 4 },
  { id: 'fb-4-6', name: 'Research Fundamentals', semester: 4 },
  { id: 'fb-5-1', name: 'Probability & Statistics', semester: 5 },
  { id: 'fb-5-2', name: 'Embedded System', semester: 5 },
  { id: 'fb-5-3', name: 'Engineering Management', semester: 5 },
  { id: 'fb-5-4', name: 'Artificial Intelligence', semester: 5 },
  { id: 'fb-5-5', name: 'Digital Signal Analysis Processing', semester: 5 },
  { id: 'fb-5-6', name: 'Software Engineering', semester: 5 },
  { id: 'fb-6-1', name: 'Image Processing & Pattern Recognition', semester: 6 },
  { id: 'fb-6-2', name: 'Machine Learning', semester: 6 },
  { id: 'fb-6-3', name: 'Data Science & Analytics', semester: 6 },
  { id: 'fb-6-4', name: 'Computer Networks', semester: 6 },
  { id: 'fb-6-5', name: 'Simulation & Modeling', semester: 6 },
  { id: 'fb-7-3', name: 'Network & Cyber Security', semester: 7 },
  { id: 'fb-7-4', name: 'Cloud Computing & Virtualization', semester: 7 },
  { id: 'fb-7-5', name: 'Compiler Design', semester: 7 },
];

const SubjectCombobox = ({ subjects, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSubject = subjects.find(s => String(s.id) === String(selectedId));

  const filtered = query.trim() === ''
    ? subjects
    : subjects.filter(s => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  const grouped = filtered.reduce((acc, s) => {
    const key = s.semester;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const semesterKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        if (!selectedId) setQuery('');
        else if (selectedSubject) setQuery(selectedSubject.name);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selectedId, selectedSubject]);

  const handleSelect = (subject) => {
    onSelect(String(subject.id));
    setQuery(subject.name);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect('');
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative min-w-[220px]">
      <div
        className={`flex items-center gap-1.5 px-3 py-2 bg-white border rounded-[4px] text-xs font-mono text-[#111111] cursor-text transition-colors ${
          open ? 'border-[#102326]' : 'border-[#D7D3CF] hover:border-[#102326]'
        }`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <Search size={13} className="shrink-0 text-[#666666]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selectedId) onSelect('');
          }}
          placeholder="Select subject..."
          className="flex-1 bg-transparent outline-none placeholder:text-[#666666] min-w-0"
        />
        {(query || selectedId) && (
          <button type="button" onClick={handleClear} className="shrink-0 text-[#666666] hover:text-[#111111]">
            <X size={12} />
          </button>
        )}
        <ChevronDown size={13} className={`shrink-0 text-[#666666] transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-[#D7D3CF] rounded-[4px] py-1 shadow-md">
            {semesterKeys.length === 0 && (
              <div className="px-3 py-2 text-xs font-mono text-[#666666]">No subjects found</div>
            )}
            {semesterKeys.map(sem => (
              <div key={sem}>
                <div className="px-3 pt-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#666666] bg-[#F7F5F2]">
                  SEMESTER {sem}
                </div>
                {grouped[sem].map(subject => {
                  const isSelected = String(subject.id) === String(selectedId);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(subject); }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                        isSelected ? 'bg-[#102326] text-white font-semibold' : 'text-[#111111] hover:bg-[#ECEAE7]'
                      }`}
                    >
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UploadedMaterials = () => {
  const { user } = useOutletContext();
  const userSemester = user?.semester || '';
  const [dbSubjects, setDbSubjects] = useState([]);
  const [selectedUploadSubjectId, setSelectedUploadSubjectId] = useState('');

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filterSubject, setFilterSubject] = useState('All');
  const [generating, setGenerating] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  const subjectsForCombobox = dbSubjects.length > 0 ? dbSubjects : FALLBACK_SUBJECTS;

  useEffect(() => {
    fetchMaterials();
    fetchDbSubjects();
  }, []);

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

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatus({ type: 'error', message: 'Only PDF files are allowed.' });
      return;
    }

    if (!selectedUploadSubjectId) {
      setStatus({ type: 'error', message: 'Select a subject before uploading study materials.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const matchedSub = dbSubjects.find(s => String(s.id) === String(selectedUploadSubjectId));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', selectedUploadSubjectId);
    if (matchedSub) {
      formData.append('subject', matchedSub.name);
    }

    try {
      setUploading(true);
      setStatus({ type: 'loading', message: 'Uploading and analyzing document...' });

      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'File uploaded successfully.' });
        fetchMaterials();
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to upload file.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          source: data.source_doc,
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Generation failed.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during generation.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (uploadId) => {
    setDeleting(uploadId);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/upload/${uploadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== uploadId));
        setStatus({ type: 'success', message: 'Document deleted successfully.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during deletion.' });
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMaterials = materials.filter(m =>
    filterSubject === 'All' || m.subject === filterSubject
  );

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
            ACADEMIC MATERIAL REPOSITORY
          </div>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Study Vault</h1>
          <p className="text-xs text-[#666666] mt-0.5">Upload PDFs and generate flashcards, MCQs, or exam questions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <SubjectCombobox
            subjects={subjectsForCombobox}
            selectedId={selectedUploadSubjectId}
            onSelect={setSelectedUploadSubjectId}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={14} /> : <FileUp size={14} />}
            <span>{uploading ? 'UPLOADING...' : 'UPLOAD PDF'}</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {status.message && (
        <div className={`p-3 rounded-[4px] text-xs font-mono flex items-center gap-2 border ${
          status.type === 'error' ? 'bg-[#FFFDFB] text-[#C96A32] border-[#D7D3CF]' :
          status.type === 'success' ? 'bg-white text-[#102326] border-[#102326]' :
          'bg-white text-[#111111] border-[#D7D3CF]'
        }`}>
          {status.type === 'loading' && <Loader2 className="animate-spin" size={14} />}
          {status.type === 'success' && <CheckCircle2 size={14} />}
          {status.type === 'error' && <AlertCircle size={14} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* Subject Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterSubject('All')}
          className={`px-3 py-1 rounded-[4px] border font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            filterSubject === 'All'
              ? 'bg-[#102326] text-white border-[#102326]'
              : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
          }`}
        >
          ALL MATERIALS ({materials.length})
        </button>
        {dbSubjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => setFilterSubject(subject.name)}
            className={`px-3 py-1 rounded-[4px] border font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              filterSubject === subject.name
                ? 'bg-[#102326] text-white border-[#102326]'
                : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
            }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {/* Grid of Uploaded Files */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-[#102326]" size={24} />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center">
          <FileText size={32} className="text-[#666666] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#111111] mb-1">No documents uploaded</h3>
          <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">Upload a course PDF to get started with material generation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-[4px] border border-[#D7D3CF] p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <button
                    onClick={() => setConfirmDelete(file.id)}
                    className="text-[#666666] hover:text-[#C96A32] transition-colors p-1"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-[#111111] truncate">{file.filename}</h4>
                <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-[#666666]">
                  <span>{formatSize(file.size_bytes)}</span>
                  <span>•</span>
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                </div>

                <div className="mt-3">
                  <span className="bg-[#ECEAE7] text-[#111111] font-mono text-[9px] uppercase px-2 py-0.5 rounded-[2px] font-semibold">
                    {file.subject || 'GENERAL'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#D7D3CF]">
                <p className="text-[9px] font-mono uppercase text-[#666666] font-semibold mb-2">GENERATE MATERIALS</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleGenerate(file.id, 'flashcards')}
                    disabled={!!generating}
                    className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <BrainCircuit size={13} />
                    <span>CARDS</span>
                  </button>
                  <button
                    onClick={() => handleGenerate(file.id, 'mcqs')}
                    disabled={!!generating}
                    className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <Target size={13} />
                    <span>MCQS</span>
                  </button>
                  <button
                    onClick={() => handleGenerate(file.id, 'exam-questions')}
                    disabled={!!generating}
                    className="p-1.5 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors font-mono text-[10px] font-semibold uppercase text-[#111111] flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <Trophy size={13} />
                    <span>EXAM</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-[#111111]">Delete Document?</h3>
            <p className="text-xs text-[#666666] leading-relaxed">
              This action will remove the document and its indexing from your vault.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 border border-[#D7D3CF] bg-white text-[#111111] rounded-[4px] text-xs font-mono uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-3 py-1.5 bg-[#C96A32] text-white rounded-[4px] text-xs font-mono uppercase font-semibold"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Content Modal */}
      {generatedContent && (
        <GeneratedContentModal
          content={generatedContent}
          onClose={() => setGeneratedContent(null)}
        />
      )}
    </div>
  );
};

const GeneratedContentModal = ({ content, onClose }) => {
  const { type, data, source } = content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[#102326] text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight uppercase font-mono">{type.toUpperCase()} GENERATION</h3>
            <p className="text-[10px] font-mono text-[#A0B0B3]">Source: {source}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-[#A0B0B3]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-[#F7F5F2]">
          {type === 'flashcards' && data.flashcards?.map((fc, i) => (
            <div key={i} className="p-3 bg-white border border-[#D7D3CF] rounded-[4px]">
              <div className="text-[10px] font-mono text-[#666666] font-semibold mb-1">CARD {i + 1}</div>
              <p className="text-xs font-bold text-[#111111]">{fc.front}</p>
              <p className="text-xs text-[#666666] mt-2 pt-2 border-t border-[#ECEAE7]">{fc.back}</p>
            </div>
          ))}

          {type === 'mcqs' && data.mcqs?.map((mcq, i) => (
            <div key={i} className="p-3 bg-white border border-[#D7D3CF] rounded-[4px] space-y-2">
              <p className="text-xs font-bold text-[#111111]">{i + 1}. {mcq.question}</p>
              <div className="space-y-1">
                {Object.entries(mcq.options || {}).map(([k, v]) => (
                  <div key={k} className={`text-xs p-1.5 rounded-[2px] font-mono ${k === mcq.correct ? 'bg-[#ECEAE7] font-bold text-[#102326]' : 'text-[#666666]'}`}>
                    {k}. {v}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {type === 'exam-questions' && data.exam_questions?.map((q, i) => (
            <div key={i} className="p-3 bg-white border border-[#D7D3CF] rounded-[4px]">
              <div className="text-[10px] font-mono text-[#666666] font-semibold mb-1">QUESTION {i + 1} ({q.marks} MARKS)</div>
              <p className="text-xs font-bold text-[#111111]">{q.question}</p>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[#D7D3CF] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadedMaterials;
