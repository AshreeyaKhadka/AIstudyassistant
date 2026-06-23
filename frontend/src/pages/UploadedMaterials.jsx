import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp, Search, Trash2, Loader2, CheckCircle2,
  AlertCircle, FileText, HardDrive, Filter, Plus,
  Sparkles, BrainCircuit, Target, Trophy, ChevronRight, X, RefreshCw
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFilteredSubjects } from '../hooks/useFilteredSubjects';
import { motion, AnimatePresence } from 'framer-motion';

const UploadedMaterials = () => {
  const { user } = useOutletContext();
  const userSemester = user?.semester || '';
  const { subjects } = useFilteredSubjects(userSemester);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [filterSubject, setFilterSubject] = useState('All');
  const [generating, setGenerating] = useState(null); // { uploadId, type }
  const [generatedContent, setGeneratedContent] = useState(null); // { type, data, source }
  const [retrying, setRetrying] = useState(null); // uploadId being retried
  const [deleting, setDeleting] = useState(null); // uploadId being deleted
  const [confirmDelete, setConfirmDelete] = useState(null); // uploadId to confirm delete
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

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

    const formData = new FormData();
    formData.append('file', file);
    if (filterSubject !== 'All') {
      formData.append('subject', filterSubject);
    }

    try {
      setUploading(true);
      setStatus({ type: 'loading', message: 'Uploading and analyzing your document...' });

      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'File uploaded successfully! AI indexing in background...' });
        fetchMaterials();
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
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
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during generation.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } finally {
      setGenerating(null);
    }
  };

  const handleRetryEmbedding = async (uploadId) => {
    setRetrying(uploadId);
    try {
      const res = await fetch('/api/upload/retry-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ upload_id: uploadId }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: 'Re-indexing started...' });
        setTimeout(() => {
          fetchMaterials();
          setStatus({ type: '', message: '' });
        }, 2000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Retry failed.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during retry.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } finally {
      setRetrying(null);
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

      const data = await res.json();

      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== uploadId));
        setStatus({ type: 'success', message: 'Document deleted successfully.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to delete.' });
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error during deletion.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateSubject = async (uploadId, newSubject) => {
    try {
      const res = await fetch(`/api/upload/${uploadId}/subject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject: newSubject }),
      });

      if (res.ok) {
        setMaterials(prev => prev.map(m => m.id === uploadId ? { ...m, subject: newSubject } : m));
        setStatus({ type: 'success', message: `Subject updated to ${newSubject}` });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      console.error("Failed to update subject:", err);
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

  const UPLOAD_LIMIT = 10;
  const usagePercentage = (materials.length / UPLOAD_LIMIT) * 100;

  return (
    <div className="flex flex-col min-h-full gap-12 pb-12">
      {/* Dynamic Header with Animated Quota */}
      <div className="relative overflow-hidden bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">Study Vault</h3>
            <p className="text-slate-500 font-medium max-w-md">Your personalized AI-ready repository of study materials and insights.</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="hidden lg:flex flex-col items-end gap-2 pr-4 border-r border-slate-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <HardDrive size={12} /> Storage Usage
              </div>
              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercentage}%` }}
                  className={`h-full ${usagePercentage > 80 ? 'bg-rose-500' : 'bg-blue-600'}`}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-600">{materials.length} / {UPLOAD_LIMIT} PDFs</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              onChange={handleUpload}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={`flex-1 md:flex-none px-7 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
              {uploading ? 'Processing Architecture...' : 'Upload New Material'}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Real-time Status Inbox */}
      <AnimatePresence>
        {status.message && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-sm font-bold border-2 ${status.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                'bg-blue-50/50 text-blue-800 border-blue-100 backdrop-blur-sm'
              }`}
          >
            <div className={`p-2 rounded-xl ${status.type === 'error' ? 'bg-red-100' :
              status.type === 'success' ? 'bg-emerald-100' : 'bg-blue-100'
              }`}>
              {status.type === 'error' && <AlertCircle size={20} />}
              {status.type === 'success' && <CheckCircle2 size={20} />}
              {status.type === 'loading' && <Loader2 className="animate-spin text-blue-600" size={20} />}
            </div>
            <div className="flex-1">
              <p>{status.message}</p>
              {status.type === 'loading' && (
                <div className="w-full h-1 bg-blue-200/50 rounded-full mt-2 overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1/2 h-full bg-blue-600"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Subject Filter Ribbon */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Filter size={14} /> Filter Curriculum
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">
            Semester {userSemester}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
          <button
            onClick={() => setFilterSubject('All')}
            className={`px-6 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${filterSubject === 'All'
              ? 'bg-blue-600 text-white shadow-blue-200'
              : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200'
              }`}
          >
            Full Collection
          </button>
          {subjects.map(subject => (
            <button
              key={subject}
              onClick={() => setFilterSubject(subject)}
              className={`px-6 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${filterSubject === subject
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200'
                }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            Your Documents
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full font-mono text-[11px] text-slate-500">
              <FileIcon size={12} /> {materials.length}
            </div>
          </h4>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <HardDrive size={24} className="text-slate-300" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-slate-800 font-extrabold text-sm uppercase tracking-widest">Accessing Vault</p>
              <p className="text-slate-400 text-xs font-medium">Encrypting local connection...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Functional Upload Trigger */}
            <motion.div
              whileHover={{ scale: 1.02, borderColor: '#3b82f6' }}
              onClick={() => fileInputRef.current?.click()}
              className="h-full min-h-[220px] bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 cursor-pointer group transition-all"
            >
              <div className="w-14 h-14 bg-white text-slate-300 group-hover:text-blue-500 group-hover:shadow-blue-100 rounded-2xl flex items-center justify-center mb-4 transition-all shadow-sm">
                <Plus size={32} />
              </div>
              <p className="text-sm font-bold text-slate-400 group-hover:text-slate-600">Add Source</p>
            </motion.div>

            <AnimatePresence mode="popLayout">
              {filteredMaterials.map((file) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={file.id}
                  className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-col gap-5 hover:shadow-[0_20px_50px_rgba(37,99,235,0.08)] hover:border-blue-100 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-[1.25rem] flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-500 shadow-sm">
                      <FileText size={28} />
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(file.id); }}
                        disabled={deleting === file.id}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === file.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[15px] font-extrabold text-slate-800 truncate leading-tight" title={file.filename}>
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-slate-400">{formatSize(file.size_bytes)}</span>
                      <span className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(file.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${file.subject ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        {file.subject || 'No Subject'}
                      </span>
                      <select
                        value={file.subject || ''}
                        onChange={(e) => handleUpdateSubject(file.id, e.target.value)}
                        className="text-[10px] bg-slate-50 border-none rounded-lg px-2 py-1 font-bold text-slate-500 focus:ring-0 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <option value="">Move to...</option>
                        {subjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${(file.mcq_generation_count || 0) >= 2
                        ? 'bg-rose-50 text-rose-600'
                        : (file.mcq_generation_count || 0) >= 1
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-slate-50 text-slate-400'
                        }`}>
                        MCQs: {file.mcq_generation_count || 0}/2 used
                      </span>
                    </div>
                  </div>

                  {/* Embedding Status */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {file.embedding_status === 'embedded' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">AI Indexed</span>
                        </>
                      )}
                      {file.embedding_status === 'indexing' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Indexing...</span>
                        </>
                      )}
                      {file.embedding_status === 'pending' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Pending</span>
                        </>
                      )}
                      {file.embedding_status === 'failed' && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Failed</span>
                        </>
                      )}
                    </div>
                    {file.embedding_status === 'failed' && file.embedding_error && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Error</p>
                        <p className="text-[11px] text-red-700 leading-relaxed line-clamp-2">{file.embedding_error}</p>
                        <button
                          onClick={() => handleRetryEmbedding(file.id)}
                          disabled={retrying === file.id}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {retrying === file.id ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          {retrying === file.id ? 'Retrying...' : 'Retry Indexing'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Generate Study Materials Buttons */}
                  <div className="pt-4 border-t border-slate-50/80 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Generate from this doc</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <GenerateButton
                        icon={<BrainCircuit size={14} />}
                        label="Cards"
                        color="orange"
                        loading={generating?.uploadId === file.id && generating?.type === 'flashcards'}
                        onClick={() => handleGenerate(file.id, 'flashcards')}
                        disabled={!!generating}
                      />
                      <GenerateButton
                        icon={<Target size={14} />}
                        label="MCQs"
                        color="blue"
                        loading={generating?.uploadId === file.id && generating?.type === 'mcqs'}
                        onClick={() => handleGenerate(file.id, 'mcqs')}
                        disabled={!!generating}
                      />
                      <GenerateButton
                        icon={<Trophy size={14} />}
                        label="Exam"
                        color="indigo"
                        loading={generating?.uploadId === file.id && generating?.type === 'exam-questions'}
                        onClick={() => handleGenerate(file.id, 'exam-questions')}
                        disabled={!!generating}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredMaterials.length === 0 && !loading && (
              <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-100 rounded-[3.5rem] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Search size={32} className="text-slate-200" />
                </div>
                <p className="text-slate-800 font-extrabold text-lg mb-1">No documents found</p>
                <p className="text-slate-400 text-sm font-medium max-w-xs px-6">We couldn't find any documents matching your current filters. Try selecting "Full Collection".</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={28} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Delete Document?</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                This will permanently remove the file and all its AI embeddings. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deleting === confirmDelete}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {deleting === confirmDelete ? (
                    <><Loader2 className="animate-spin" size={16} /> Deleting...</>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Content Modal */}
      <AnimatePresence>
        {generatedContent && (
          <GeneratedContentModal
            content={generatedContent}
            onClose={() => setGeneratedContent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const GenerateButton = ({ icon, label, color, loading, onClick, disabled }) => {
  const colors = {
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-[10px] font-bold border transition-all ${colors[color]} ${disabled && !loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? <Loader2 className="animate-spin" size={14} /> : icon}
      {label}
    </button>
  );
};

const GeneratedContentModal = ({ content, onClose }) => {
  const { type, data, source } = content;

  const titles = {
    flashcards: 'Generated Flashcards',
    mcqs: 'Generated MCQs',
    'exam-questions': 'Probable Exam Questions',
  };

  const icons = {
    flashcards: <BrainCircuit size={24} />,
    mcqs: <Target size={24} />,
    'exam-questions': <Trophy size={24} />,
  };

  const colorClasses = {
    flashcards: 'from-orange-500 to-amber-500',
    mcqs: 'from-blue-500 to-indigo-500',
    'exam-questions': 'from-indigo-500 to-purple-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${colorClasses[type]} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">{icons[type]}</div>
            <div>
              <h2 className="text-xl font-extrabold">{titles[type]}</h2>
              <p className="text-sm opacity-80 font-medium">From: {source}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {type === 'flashcards' && data.flashcards?.map((fc, i) => (
            <FlashcardItem key={i} index={i} front={fc.front} back={fc.back} />
          ))}

          {type === 'mcqs' && data.mcqs?.map((mcq, i) => (
            <MCQItem key={i} index={i} {...mcq} />
          ))}

          {type === 'exam-questions' && data.exam_questions?.map((q, i) => (
            <ExamQuestionItem key={i} index={i} {...q} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-400">
            {data.count || 0} items • {data.chunks_used || 0} context sections used
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const FlashcardItem = ({ index, front, back }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => setFlipped(!flipped)}
      className="bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:border-blue-100 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-relaxed">{front}</p>
          <AnimatePresence>
            {flipped && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-slate-100"
              >
                <p className="text-slate-600 text-sm leading-relaxed">{back}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!flipped && (
            <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Click to reveal answer
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MCQItem = ({ index, question, options, correct, explanation }) => {
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (key) => {
    setSelected(key);
    setShowExplanation(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-slate-100 rounded-2xl p-5"
    >
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800 text-sm leading-relaxed mb-4">{question}</p>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(options || {}).map(([key, val]) => {
              const isCorrect = key === correct;
              const isSelected = key === selected;
              let btnClass = 'bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-200';

              if (selected) {
                if (isCorrect) btnClass = 'bg-emerald-50 border-emerald-300 text-emerald-800';
                else if (isSelected && !isCorrect) btnClass = 'bg-rose-50 border-rose-300 text-rose-800';
                else btnClass = 'bg-slate-50 border-slate-100 text-slate-400';
              }

              return (
                <button
                  key={key}
                  onClick={() => !selected && handleSelect(key)}
                  disabled={!!selected}
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${btnClass}`}
                >
                  <span className="font-bold mr-2">{key}.</span> {val}
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {showExplanation && explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100"
              >
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Explanation</p>
                <p className="text-sm text-blue-800 leading-relaxed">{explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const ExamQuestionItem = ({ index, question, type, marks, key_points }) => {
  const [expanded, setExpanded] = useState(false);

  const typeColors = {
    short_answer: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    long_answer: 'bg-blue-50 text-blue-600 border-blue-100',
    problem_solving: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-slate-100 rounded-2xl p-5"
    >
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border ${typeColors[type] || typeColors.short_answer}`}>
              {(type || 'short_answer').replace('_', ' ')}
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              {marks || 5} marks
            </span>
          </div>
          <p className="font-bold text-slate-800 text-sm leading-relaxed">{question}</p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            {expanded ? 'Hide' : 'Show'} Key Points ({key_points?.length || 0})
          </button>

          <AnimatePresence>
            {expanded && key_points?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100"
              >
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Key points for a perfect answer:</p>
                <ul className="space-y-1.5">
                  {key_points.map((kp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                      <CheckCircle2 size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      {kp}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// Internal SVG Helper Components
const SparklesIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
);

const FileIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

export default UploadedMaterials;
