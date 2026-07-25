import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Book, ChevronRight, FileText, Layout,
    MessageSquare, Plus, Trash2, Upload, AlertCircle, RefreshCw,
    FolderOpen, Calendar, ShieldAlert
} from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const SyllabusExplorer = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();

    const userSemester = user?.semester ? parseInt(user.semester) : 1;

    const [selectedSemester, setSelectedSemester] = useState(userSemester);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [syllabusMeta, setSyllabusMeta] = useState(null);
    const [loadingSyllabus, setLoadingSyllabus] = useState(false);

    const [materials, setMaterials] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectSem, setSubjectSem] = useState(userSemester);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [uploadProgress, setUploadProgress] = useState(null);
    const [replaceConfirm, setReplaceConfirm] = useState(false);
    const [uploadError, setUploadError] = useState('');

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

    const backlogCount = useMemo(() => {
        return subjects.filter(s => s.is_backlog).length;
    }, [subjects]);

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

    const fetchMaterials = async (subjectId) => {
        setLoadingMaterials(true);
        try {
            const res = await fetch('/api/upload/', { credentials: 'include' });
            if (res.ok) {
                const allFiles = await res.json();
                setMaterials(allFiles.filter(item => item.subject_id === subjectId || item.subject === selectedSubject?.name));
            }
        } catch (err) {
            console.error("Failed to fetch materials:", err);
        } finally {
            setLoadingMaterials(false);
        }
    };

    useEffect(() => {
        if (selectedSubject) {
            fetchSyllabusMeta(selectedSubject.id);
            fetchMaterials(selectedSubject.id);
        } else {
            setSyllabusMeta(null);
            setMaterials([]);
        }
    }, [selectedSubject]);

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
            setErrorMessage("Backlog limit reached (4/4). Cannot add more backlog subjects.");
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
        if (!confirm("Are you sure you want to delete this subject?")) return;

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
                setUploadProgress('Indexing syllabus contents...');
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
        <div className="flex flex-col gap-6 pb-12">
            {/* Curriculum Header */}
            <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1">
                        COURSE & SYLLABUS MANAGEMENT
                    </div>
                    <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Syllabus Explorer</h1>
                    <p className="text-xs text-[#666666] mt-0.5">Organize official syllabi and study materials by semester.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="relative flex-1 xl:w-64 xl:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={14} />
                        <input
                            type="text"
                            placeholder="Search subject..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] text-xs font-mono text-[#111111] outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                        <span>ADD SUBJECT</span>
                    </button>
                </div>
            </div>

            {/* Main Content Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Semester tabs and subject list */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Semester Selectors */}
                    <div className="bg-white p-4 border border-[#D7D3CF] rounded-[4px]">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold block mb-2">
                            SEMESTER SELECTOR
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                <button
                                    key={sem}
                                    onClick={() => setSelectedSemester(sem)}
                                    className={`py-1.5 text-xs font-mono font-semibold rounded-[4px] border transition-colors ${
                                        selectedSemester === sem
                                            ? 'bg-[#102326] text-white border-[#102326]'
                                            : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#ECEAE7]'
                                    }`}
                                >
                                    S{sem}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject List */}
                    <div className="bg-white p-4 border border-[#D7D3CF] rounded-[4px] space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
                            <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold">
                                SEMESTER {selectedSemester} SUBJECTS
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-[#111111] bg-[#ECEAE7] px-1.5 py-0.5 rounded-[2px]">
                                {filteredSubjects.length}
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                            {filteredSubjects.map((sub) => (
                                <div
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub)}
                                    className={`p-3 rounded-[4px] border cursor-pointer flex items-center justify-between transition-colors ${
                                        selectedSubject?.id === sub.id
                                            ? 'bg-[#102326] text-white border-[#102326]'
                                            : 'bg-white text-[#111111] border-[#D7D3CF] hover:bg-[#FAF9F7]'
                                    }`}
                                >
                                    <div className="min-w-0 pr-2">
                                        <h4 className="text-xs font-bold truncate">{sub.name}</h4>
                                        <p className={`text-[9px] font-mono uppercase mt-0.5 ${selectedSubject?.id === sub.id ? 'text-[#A0B0B3]' : 'text-[#666666]'}`}>
                                            {sub.code || 'NO CODE'} {sub.is_backlog ? '• BACKLOG' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={(e) => handleDeleteSubject(sub.id, e)}
                                            className={`p-1 rounded-[2px] transition-colors ${
                                                selectedSubject?.id === sub.id ? 'hover:text-[#C96A32]' : 'text-[#666666] hover:text-[#C96A32]'
                                            }`}
                                            title="Delete Subject"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <ChevronRight size={14} />
                                    </div>
                                </div>
                            ))}

                            {filteredSubjects.length === 0 && (
                                <div className="p-6 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px]">
                                    No subjects listed for Semester {selectedSemester}.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed View */}
                <div className="lg:col-span-8">
                    {selectedSubject ? (
                        <div className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] space-y-6">
                            {/* Subject Header */}
                            <div className="pb-4 border-b border-[#D7D3CF]">
                                <div className="flex items-center gap-2 mb-1 text-[10px] font-mono uppercase font-semibold text-[#666666]">
                                    <span className="bg-[#ECEAE7] text-[#111111] px-2 py-0.5 rounded-[2px]">
                                        SEMESTER {selectedSubject.semester}
                                    </span>
                                    {selectedSubject.is_backlog && (
                                        <span className="bg-[#C96A32] text-white px-2 py-0.5 rounded-[2px]">
                                            BACKLOG
                                        </span>
                                    )}
                                    {selectedSubject.code && (
                                        <span>CODE: {selectedSubject.code}</span>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-[#111111] tracking-tight">{selectedSubject.name}</h2>
                            </div>

                            {/* Section 1: Syllabus Panel */}
                            <div className="border border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px] p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-[#D7D3CF]">
                                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#111111] font-semibold flex items-center gap-2">
                                        <Layout size={14} className="text-[#102326]" />
                                        Official Course Syllabus
                                    </h3>
                                    <span className="text-[10px] font-mono text-[#666666]">1 PDF per subject</span>
                                </div>

                                {loadingSyllabus ? (
                                    <div className="py-4 text-center text-xs font-mono text-[#666666] flex items-center justify-center gap-2">
                                        <RefreshCw size={14} className="animate-spin text-[#102326]" />
                                        Loading syllabus metadata...
                                    </div>
                                ) : syllabusMeta ? (
                                    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText size={20} className="text-[#102326] shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-[#111111] truncate">{syllabusMeta.filename}</p>
                                                <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                                                    Uploaded {new Date(syllabusMeta.uploaded_at).toLocaleDateString()} • {(syllabusMeta.size_bytes / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}&doc_type=syllabus`)}
                                                className="px-3 py-1.5 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5"
                                            >
                                                <MessageSquare size={13} />
                                                <span>CHAT SYLLABUS</span>
                                            </button>
                                            <label className="px-3 py-1.5 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1.5">
                                                <Upload size={13} />
                                                <span>REPLACE</span>
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
                                    <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-6 text-center">
                                        <Upload size={24} className="text-[#666666] mx-auto mb-2" />
                                        <h4 className="text-xs font-bold text-[#111111]">No Syllabus Uploaded</h4>
                                        <p className="text-xs font-mono text-[#666666] mt-1 max-w-sm mx-auto mb-3">
                                            Upload the official curriculum PDF to enable chapter planning and scoped AI assistance.
                                        </p>
                                        <label className="px-4 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5">
                                            <Upload size={14} />
                                            <span>UPLOAD SYLLABUS</span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                className="hidden"
                                                onChange={(e) => handleUploadSyllabus(e, false)}
                                            />
                                        </label>
                                    </div>
                                )}

                                {uploadProgress && (
                                    <div className="p-3 bg-white border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#102326] flex items-center gap-2">
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>{uploadProgress}</span>
                                    </div>
                                )}

                                {uploadError && (
                                    <div className="p-3 bg-[#FFFDFB] border border-[#D7D3CF] rounded-[4px] text-xs font-mono text-[#C96A32] flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        <span>{uploadError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Reference Materials */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-[#D7D3CF]">
                                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#111111] font-semibold flex items-center gap-2">
                                        <Book size={14} className="text-[#102326]" />
                                        Reference Study Materials
                                    </h3>
                                    <label className="px-3 py-1.5 border border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1">
                                        <Plus size={13} />
                                        <span>ADD MATERIAL</span>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={handleUploadMaterial}
                                        />
                                    </label>
                                </div>

                                {materials.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {materials.map((file) => (
                                            <div
                                                key={file.id}
                                                className="p-3.5 bg-white border border-[#D7D3CF] rounded-[4px] flex justify-between items-center"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-xs font-bold text-[#111111] truncate">{file.filename}</p>
                                                    <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                                                        {new Date(file.created_at).toLocaleDateString()} • {(file.size_bytes / 1024).toFixed(0)} KB
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}&doc_type=material`)}
                                                        className="p-1.5 bg-[#F7F5F2] border border-[#D7D3CF] text-[#102326] rounded-[4px] hover:bg-[#102326] hover:text-white transition-colors"
                                                        title="Chat Material"
                                                    >
                                                        <MessageSquare size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaterial(file.id)}
                                                        className="p-1.5 border border-[#D7D3CF] text-[#666666] hover:text-[#C96A32] rounded-[4px] transition-colors"
                                                        title="Delete File"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px]">
                                        No reference materials uploaded yet.
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Scoped Chat Prompt */}
                            <div className="p-4 bg-[#102326] text-white rounded-[4px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider font-mono">Focus AI Chat on Subject</h4>
                                    <p className="text-xs text-[#A0B0B3] mt-0.5">Scope queries exclusively to syllabus and study documents of {selectedSubject.name}.</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/dashboard/chat?subject=${encodeURIComponent(selectedSubject.name)}&subject_id=${selectedSubject.id}`)}
                                    className="px-4 py-2 bg-white text-[#102326] hover:bg-[#ECEAE7] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider shrink-0"
                                >
                                    OPEN CHAT
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-dashed border-[#D7D3CF] rounded-[4px] p-12 text-center">
                            <FileText size={32} className="text-[#666666] mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-[#111111] mb-1">Select a Subject</h3>
                            <p className="text-xs font-mono text-[#666666] max-w-xs mx-auto">
                                Choose a subject from the left panel to manage syllabus files and view study materials.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add Subject */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
                    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-6 max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-[#D7D3CF]">
                            <h3 className="text-sm font-bold text-[#111111] uppercase font-mono">Add New Subject</h3>
                            <button
                                onClick={() => { setIsAddOpen(false); setErrorMessage(''); }}
                                className="text-[#666666] hover:text-[#111111]"
                            >
                                CANCEL
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubject} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Subject Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Operating Systems"
                                    className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs text-[#111111] outline-none"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Semester</label>
                                    <select
                                        className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs text-[#111111] outline-none"
                                        value={subjectSem}
                                        onChange={(e) => setSubjectSem(parseInt(e.target.value))}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                            <option key={s} value={s}>Semester {s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono uppercase text-[#666666] font-semibold mb-1">Code (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CMP321"
                                        className="w-full bg-white border border-[#D7D3CF] focus:border-[#102326] rounded-[4px] px-3 py-2 text-xs text-[#111111] outline-none"
                                        value={subjectCode}
                                        onChange={(e) => setSubjectCode(e.target.value)}
                                    />
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="p-2.5 bg-[#FFFDFB] border border-[#D7D3CF] text-[#C96A32] text-xs font-mono rounded-[4px]">
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitLoading}
                                className="w-full py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                                {isSubmitLoading ? 'SAVING...' : 'SAVE SUBJECT'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SyllabusExplorer;
