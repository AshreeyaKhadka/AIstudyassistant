import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Book, Clock, ChevronRight, FileText, Layout, List,
    MessageSquare, Plus, Trash2, Upload, AlertCircle, RefreshCw,
    FolderOpen, Calendar, HelpCircle, ShieldAlert
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const SyllabusExplorer = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    // User profile semesters
    const userSemester = user?.semester ? parseInt(user.semester) : 1;

    // UI states
    const [selectedSemester, setSelectedSemester] = useState(userSemester);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Syllabus state
    const [syllabusMeta, setSyllabusMeta] = useState(null);
    const [loadingSyllabus, setLoadingSyllabus] = useState(false);

    // Material uploads for selected subject
    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    // Subject Form state (Drawer/Modal)
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectSem, setSubjectSem] = useState(userSemester);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Active upload parameters
    const [uploadProgress, setUploadProgress] = useState(null);
    const [replaceConfirm, setReplaceConfirm] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Fetch subjects from the backend
    const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
            const res = await fetch('/api/syllabus/subjects', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSubjects(data);
            }
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
        } finally {
            setLoadingSubjects(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    // Count current backlog subjects (subjects where is_backlog = true)
    const backlogCount = useMemo(() => {
        return subjects.filter(s => s.is_backlog).length;
    }, [subjects]);

    // Fetch syllabus metadata for selected subject
    const fetchSyllabusMeta = async (subjectId) => {
        setLoadingSyllabus(true);
        setSyllabusMeta(null);
        setUploadError('');
        setReplaceConfirm(false);
        try {
            const res = await fetch(`/api/syllabus/${subjectId}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setSyllabusMeta(data);
            } else if (res.status === 404) {
                setSyllabusMeta(null);
            }
        } catch (err) {
            console.error("Failed to fetch syllabus meta:", err);
        } finally {
            setLoadingSyllabus(false);
        }
    };

    // Fetch materials for selected subject
    const fetchMaterials = async (subjectId) => {
        setLoadingMaterials(true);
        try {
            const res = await fetch('/api/upload/', { credentials: 'include' });
            if (res.ok) {
                const allFiles = await res.json();
                // Filter files belonging to this subject
                setMaterials(allFiles.filter(item => item.subject_id === subjectId || item.subject === selectedSubject?.name));
            }
        } catch (err) {
            console.error("Failed to fetch materials:", err);
        } finally {
            setLoadingMaterials(false);
        }
    };

    // Whenever selectedSubject changes, load its syllabus meta & materials
    useEffect(() => {
        if (selectedSubject) {
            fetchSyllabusMeta(selectedSubject.id);
            fetchMaterials(selectedSubject.id);
        } else {
            setSyllabusMeta(null);
            setMaterials([]);
        }
    }, [selectedSubject]);

    // Filtered subjects listed on left sidebar panel
    const filteredSubjects = useMemo(() => {
        return subjects.filter(sub => {
            const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (sub.code && sub.code.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesSemester = sub.semester === selectedSemester;
            return matchesSearch && matchesSemester;
        });
    }, [subjects, selectedSemester, searchTerm]);

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitLoading(true);

        const isBacklog = subjectSem !== userSemester;
        if (isBacklog && backlogCount >= 4) {
            setErrorMessage("Backlog limit reached (4/4). You cannot add more backlog subjects.");
            setIsSubmitLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/syllabus/subjects', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: subjectName,
                    code: subjectCode,
                    semester: subjectSem,
                    is_backlog: isBacklog
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSubjects(prev => [data, ...prev]);
                setSubjectName('');
                setSubjectCode('');
                setIsAddOpen(false);
                // Switch semester view if necessary to show the newly added subject
                setSelectedSemester(subjectSem);
            } else {
                setErrorMessage(data.error || "Failed to create subject");
            }
        } catch (err) {
            setErrorMessage("Failed to submit request.");
        } finally {
            setIsSubmitLoading(false);
        }
    };

    const handleDeleteSubject = async (subjectId, event) => {
        event.stopPropagation();
        if (!confirm("Are you sure you want to delete this subject? All associated syllabus files, materials, and search embeddings will be lost.")) return;

        try {
            const res = await fetch(`/api/syllabus/subjects/${subjectId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setSubjects(prev => prev.filter(s => s.id !== subjectId));
                if (selectedSubject && selectedSubject.id === subjectId) {
                    setSelectedSubject(null);
                }
            }
        } catch (err) {
            console.error("Failed to delete subject:", err);
        }
    };

    const handleUploadSyllabus = async (e, forceReplace = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setUploadError('Only PDF files are supported.');
            return;
        }

        setUploadProgress('Uploading and parsing syllabus...');
        setUploadError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', selectedSubject.id);
        if (forceReplace) {
            formData.append('replace', 'true');
        }

        try {
            const res = await fetch('/api/syllabus/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setUploadProgress('Indexing syllabus contents for search...');
                // Wait briefly for background RAG ingestion trigger to load
                setTimeout(() => {
                    fetchSyllabusMeta(selectedSubject.id);
                    setUploadProgress(null);
                }, 2000);
            } else if (res.status === 409) {
                setReplaceConfirm(true);
                setUploadProgress(null);
            } else {
                setUploadError(data.error || 'Failed to upload syllabus.');
                setUploadProgress(null);
            }
        } catch (err) {
            setUploadError('Network error uploading file.');
            setUploadProgress(null);
        }
    };

    const handleUploadMaterial = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadProgress('Uploading study material...');
        setUploadError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject_id', selectedSubject.id);
        formData.append('subject', selectedSubject.name);

        try {
            const res = await fetch('/api/upload/', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                setTimeout(() => {
                    fetchMaterials(selectedSubject.id);
                    setUploadProgress(null);
                }, 2000);
            } else {
                const data = await res.json();
                setUploadError(data.error || 'Failed to upload material.');
                setUploadProgress(null);
            }
        } catch (err) {
            setUploadError('Network error uploading file.');
            setUploadProgress(null);
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (!confirm("Delete this document?")) return;
        try {
            const res = await fetch(`/api/upload/files/${materialId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setMaterials(prev => prev.filter(m => m.id !== materialId));
            }
        } catch (err) {
            console.error("Failed to delete document:", err);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Elegant Curriculum Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        Syllabus & Course Manager
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Select subjects, upload official syllabi, and organize reference study materials.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Search Field */}
                    <div className="relative flex-1 xl:w-72 xl:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Find subject..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Add Subject Button */}
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        Add Subject
                    </button>
                </div>
            </div>

            {/* Split layout: Selector list vs Subject Detail View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Panel: Subject list grouped by semester */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Semester tab selectors */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Semester Selection</span>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                <button
                                    key={sem}
                                    onClick={() => setSelectedSemester(sem)}
                                    className={`py-2 text-xs font-extrabold rounded-lg transition-all ${selectedSemester === sem
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    S{sem}
                                    {sem === userSemester && (
                                        <span className="ml-1 text-[8px] bg-white/20 text-white px-1 py-0.5 rounded-full font-bold">Ref</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject list */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between pl-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Semester {selectedSemester} Subjects
                            </h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {filteredSubjects.length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                            {filteredSubjects.map((sub) => (
                                <div
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub)}
                                    className={`group flex items-center justify-between p-4 rounded-2xl text-left border cursor-pointer swap-indicator transition-all duration-200 ${selectedSubject?.id === sub.id
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${selectedSubject?.id === sub.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            <Book size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-sm line-clamp-1 leading-snug">{sub.name}</span>
                                            <p className={`text-[10px] uppercase font-semibold mt-0.5 tracking-wider ${selectedSubject?.id === sub.id ? 'text-white/70' : 'text-slate-400'
                                                }`}>
                                                {sub.code || 'No Code'} {sub.is_backlog ? '· Backlog' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleDeleteSubject(sub.id, e)}
                                            className={`p-1.5 rounded-lg transition-colors ${selectedSubject?.id === sub.id
                                                    ? 'hover:bg-white/10 text-white/80 hover:text-white'
                                                    : 'hover:bg-slate-100 text-slate-400 hover:text-rose-500'
                                                }`}
                                            title="Delete Subject"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            ))}

                            {filteredSubjects.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200/60 border-dashed">
                                    <FolderOpen size={36} className="mb-2 text-slate-300" />
                                    <p className="font-bold text-xs uppercase tracking-wider text-slate-400">No subjects here</p>
                                    <button
                                        onClick={() => {
                                            setSubjectSem(selectedSemester);
                                            setIsAddOpen(true);
                                        }}
                                        className="text-xs text-blue-600 font-bold hover:underline mt-1.5"
                                    >
                                        Add a subject to Semester {selectedSemester}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Backlogs limits summary indicator */}
                        <div className="bg-slate-50 border border-slate-200/50 p-3.5 rounded-2xl mt-1 text-slate-600 text-xs">
                            <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1.5">
                                    <AlertCircle size={14} className="text-blue-500" />
                                    Backlog Subjects Capacity
                                </span>
                                <span className={backlogCount >= 4 ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full" : "text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full"}>
                                    {backlogCount} / 4 Allowed
                                </span>
                            </div>
                            <p className="text-slate-400 font-medium mt-1 leading-relaxed">
                                Backlog subjects occupy previous sem tags. You can add them in S1-S8 dropdown.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Detailed view for Selected Subject */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {selectedSubject ? (
                            <motion.div
                                key={selectedSubject.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-8">

                                    {/* Subject Main Identity Card */}
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                    Semester {selectedSubject.semester}
                                                </span>
                                                {selectedSubject.is_backlog && (
                                                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                        Backlog
                                                    </span>
                                                )}
                                                {selectedSubject.code && (
                                                    <span className="text-[10px] font-extrabold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                                        {selectedSubject.code}
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                                                {selectedSubject.name}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* SECTION 1: ONE SYLLABUS CONSTRAINT PANEL */}
                                    <div className="bg-slate-50/70 border border-slate-150 p-6 rounded-3xl flex flex-col gap-5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <Layout size={16} className="text-blue-600" />
                                                Official Course Syllabus
                                            </h3>
                                            <span className="text-xs font-bold text-slate-400">Limit: 1 PDF per Subject</span>
                                        </div>

                                        {loadingSyllabus ? (
                                            <div className="flex items-center gap-2.5 py-4 text-xs font-bold text-slate-400 justify-center">
                                                <RefreshCw className="animate-spin text-blue-500" size={16} />
                                                Loading official syllabus data...
                                            </div>
                                        ) : syllabusMeta ? (
                                            /* Active Syllabus File Display */
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-3.5 w-full md:w-auto">
                                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-sm truncate">{syllabusMeta.filename}</p>
                                                        <p className="text-[11px] text-slate-400 font-semibold mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(syllabusMeta.uploaded_at).toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span>{(syllabusMeta.size_bytes / 1024).toFixed(1)} KB</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                                    <button
                                                        onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}&doc_type=syllabus`)}
                                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all w-full md:w-auto justify-center"
                                                    >
                                                        <MessageSquare size={14} />
                                                        Chat Syllabus
                                                    </button>

                                                    {/* Overwrite Trigger Input */}
                                                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer active:scale-95 transition-all text-center w-full md:w-auto justify-center">
                                                        <Upload size={14} />
                                                        Replace
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleUploadSyllabus(e, true)}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Active Syllabus Empty State (Prompt Upload) */
                                            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                                                    <Upload size={22} />
                                                </div>
                                                <h4 className="font-bold text-slate-700 text-sm">No Syllabus Uploaded</h4>
                                                <p className="text-slate-400 text-xs mt-1.5 max-w-sm mb-4 leading-relaxed">
                                                    Upload the official curriculum PDF/syllabus for this subject to run scoped AI study and chapter planning.
                                                </p>

                                                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-500/10 transition-all select-none">
                                                    <Upload size={14} />
                                                    Upload Syllabus
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={(e) => handleUploadSyllabus(e, false)}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        {/* Status notifications / indicators */}
                                        {uploadProgress && (
                                            <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2.5">
                                                <RefreshCw size={14} className="animate-spin text-blue-500" />
                                                {uploadProgress}
                                            </div>
                                        )}

                                        {uploadError && (
                                            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                                                <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
                                                {uploadError}
                                            </div>
                                        )}

                                        {replaceConfirm && (
                                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-3">
                                                <div className="flex gap-2 text-amber-800 text-xs font-bold">
                                                    <ShieldAlert size={16} className="text-amber-600 flex-shrink-0" />
                                                    <span>A syllabus file already exists for this subject. Replacing it will overwrite old search index embeddings. Continue?</span>
                                                </div>
                                                <div className="flex gap-2 self-end">
                                                    <button
                                                        onClick={() => setReplaceConfirm(false)}
                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 text-[11px] font-bold"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <label className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer select-none">
                                                        Yes, Overwrite
                                                        <input
                                                            type="file"
                                                            accept=".pdf"
                                                            className="hidden"
                                                            onChange={(e) => handleUploadSyllabus(e, true)}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECTION 2: SUBJECT REFERENCE MATERIALS */}
                                    <div className="flex flex-col gap-5">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                    <Book size={16} className="text-blue-600" />
                                                    Reference Study Materials
                                                </h3>
                                                <p className="text-slate-400 text-xs mt-1">Files uploaded here are isolated specifically for RAG chat under this subject.</p>
                                            </div>

                                            <label className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-all flex-shrink-0">
                                                <Plus size={14} />
                                                Add Material
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    className="hidden"
                                                    onChange={handleUploadMaterial}
                                                />
                                            </label>
                                        </div>

                                        {loadingMaterials ? (
                                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400 font-bold">
                                                <RefreshCw size={14} className="animate-spin text-blue-500" />
                                                Loading materials count...
                                            </div>
                                        ) : materials.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {materials.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="group bg-white p-4.5 rounded-2xl border border-slate-150 hover:shadow-lg hover:shadow-slate-100 hover:border-blue-200 transition-all flex justify-between items-center gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-800 text-xs truncate leading-snug">{file.filename}</p>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                                                    {new Date(file.created_at).toLocaleDateString()} · {(file.size_bytes / 1024).toFixed(0)} KB
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}&doc_type=material`)}
                                                                className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-colors border border-blue-100/50"
                                                                title="Chat focusing on this material"
                                                            >
                                                                <MessageSquare size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMaterial(file.id)}
                                                                className="p-2 hover:bg-rose-50 text-slate-350 hover:text-rose-600 rounded-lg transition-colors"
                                                                title="Delete file"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 bg-slate-50/60 rounded-2xl border border-slate-200/60 border-dashed text-slate-400">
                                                <FileText size={24} className="mb-1.5 text-slate-300" />
                                                <p className="font-bold text-xs uppercase tracking-wider">No materials uploaded yet</p>
                                                <label className="text-[11px] text-blue-600 font-bold hover:underline mt-1 cursor-pointer">
                                                    Upload reference PDF
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={handleUploadMaterial}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scoped Chat Box */}
                                    <div className="mt-4 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-blue-50/30 p-5 rounded-2xl">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/10">
                                                <MessageSquare size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">Focus AI Chat on Subject</h4>
                                                <p className="text-xs text-slate-500 leading-snug mt-0.5">
                                                    Chat with the study assistant scope-limited to references and/or syllabus.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}`)}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all w-full md:w-auto"
                                        >
                                            Open Chat (All Subject Docs)
                                        </button>
                                    </div>

                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 border-dashed shadow-sm">
                                <div className="bg-slate-50 p-8 rounded-full mb-6">
                                    <FileText size={48} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Workspace & Subject details</h3>
                                <p className="text-center max-w-sm px-6 text-slate-400 font-medium text-sm leading-relaxed">
                                    Select or create a subject in the left column. From there you can manage the official syllabus mapping and index materials for testing.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* MODAL: ADD SUBJECT DRAWER */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-extrabold text-slate-800">Add New Subject</h3>
                            <button
                                onClick={() => { setIsAddOpen(false); setErrorMessage(''); }}
                                className="text-slate-450 hover:text-slate-700 font-bold p-1 hover:bg-slate-50 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Subject Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mathematics IV"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Semester</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                        value={subjectSem}
                                        onChange={(e) => setSubjectSem(parseInt(e.target.value))}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                            <option key={s} value={s}>Semester {s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-450 uppercase mb-2">Code (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MTH211"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                        value={subjectCode}
                                        onChange={(e) => setSubjectCode(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Backlog alerts */}
                            {subjectSem !== userSemester && (
                                <div className="bg-amber-50 text-amber-800 border border-amber-200/50 p-3 rounded-xl text-xs flex gap-2.5 font-bold">
                                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                                    <div>
                                        Adding as Backlog subject (allocated sem different than user current sem {userSemester}).
                                        <span className="block mt-0.5 text-slate-400">Backlog subjects count: {backlogCount}/4</span>
                                    </div>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                                    <AlertCircle size={15} />
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitLoading || (subjectSem !== userSemester && backlogCount >= 4)}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-[98] transition-all disabled:opacity-50"
                            >
                                {isSubmitLoading ? 'Submitting...' : 'Save Subject'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default SyllabusExplorer;
