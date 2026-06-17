import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp, Search, Eye, Download, Trash2, Loader2, CheckCircle2,
  AlertCircle, FileText, Info, HardDrive, Filter, MoreHorizontal, Plus
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
        setStatus({ type: 'success', message: 'File uploaded successfully!' });
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
                      <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm" title="Analyze with AI">
                        <SparklesIcon size={18} />
                      </button>
                      <button className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-auto">
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
                  </div>

                  <div className="pt-5 border-t border-slate-50/80 flex items-center justify-between group-hover:border-blue-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">AI Indexed</span>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
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
    </div>
  );
};

// Internal SVG Helper Components for Clean Code
const SparklesIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
);

const FileIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

export default UploadedMaterials;
