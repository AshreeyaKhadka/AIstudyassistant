import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileUp, 
  Search, 
  FileText, 
  File, 
  Trash2, 
  Loader2, 
  Calendar, 
  HardDrive, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Clock
} from 'lucide-react';

const UploadedMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drag and drop state
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Upload configurations
  const [selectedSubject, setSelectedSubject] = useState('Operating Systems');
  const [customSubject, setCustomSubject] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fileInputRef = useRef(null);
  
  // Progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  
  // Toast notifications
  const [notification, setNotification] = useState(null);

  const subjects = [
    'Operating Systems',
    'Database Management',
    'Computer Networks',
    'General'
  ];

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/upload', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      } else {
        showToast('Failed to fetch uploaded files', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFilesUpload(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  // File Upload Logic
  const handleFilesUpload = async (file) => {
    // Validate Extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'pptx'].includes(ext)) {
      showToast('Only PDF, DOCX, and PPTX formats are allowed.', 'error');
      return;
    }

    // Validate size (15MB limit)
    const limit = 15 * 1024 * 1024;
    if (file.size > limit) {
      showToast('File size exceeds the 15 MB threshold.', 'error');
      return;
    }

    // Set Subject
    const uploadSubject = showCustomInput && customSubject.trim() ? customSubject.trim() : selectedSubject;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusMsg('Sending file metadata...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', uploadSubject);

    // Simulate smoother progress transitions
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 70) return prev + 12;
        if (prev < 90) {
          setUploadStatusMsg('AI is extracting knowledge and indexing texts...');
          return prev + 3;
        }
        return prev;
      });
    }, 450);

    try {
      const res = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatusMsg('Finalizing indexing...');

      if (res.ok) {
        const responseData = await res.json();
        setMaterials(prev => [responseData.upload, ...prev]);
        showToast(`"${file.name}" uploaded and parsed successfully!`, 'success');
        
        // Reset custom input
        if (showCustomInput) {
          setCustomSubject('');
          setShowCustomInput(false);
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to complete material upload', 'error');
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      showToast('Server connection failed during upload', 'error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusMsg('');
      }, 800);
    }
  };

  // Delete Material
  const handleDeleteMaterial = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will remove all AI indexed knowledge from your workspace.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/upload/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
        showToast('Study material successfully deleted.');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to delete file', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection failed during deletion', 'error');
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="text-rose-500" size={24} />;
      case 'docx': return <File className="text-blue-500" size={24} />;
      case 'pptx': return <BookOpen className="text-amber-500" size={24} />;
      default: return <File className="text-slate-400" size={24} />;
    }
  };

  const getFileBadge = (type) => {
    switch (type) {
      case 'pdf': return 'bg-rose-50 text-rose-600 border-rose-100/30';
      case 'docx': return 'bg-blue-50 text-blue-600 border-blue-100/30';
      case 'pptx': return 'bg-amber-50 text-amber-600 border-amber-100/30';
      default: return 'bg-slate-50 text-slate-600 border-slate-100/30';
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter lists based on Search & Selectors
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === 'All' || m.subject === subjectFilter;
    const matchesType = typeFilter === 'All' || m.file_type === typeFilter;
    return matchesSearch && matchesSubject && matchesType;
  });

  // Extract unique subjects for the filter dropdown
  const uniqueSubjects = ['All', ...new Set(materials.map(m => m.subject))];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10 relative">
      
      {/* Toast Alert System */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-xl backdrop-blur-xl ${
              notification.type === 'error' 
                ? 'bg-rose-50/95 text-rose-800 border-rose-100/60 shadow-rose-200/10' 
                : 'bg-emerald-50/95 text-emerald-800 border-emerald-100/60 shadow-emerald-200/10'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="text-sm font-semibold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Personal Library</h2>
          <p className="text-sm text-slate-500 mt-1">Upload course slides, books, or notes to build your customized AI study model.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200/60 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-sm text-xs font-semibold text-slate-600">
            <HardDrive size={15} className="text-indigo-500" />
            <span>Storage: {materials.length} / 15 documents</span>
          </div>
        </div>
      </div>

      {/* Upload Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Drag/Drop & Subject Selector (Takes 1/3) */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">Upload Center</h3>
              <p className="text-xs text-slate-400 mt-0.5">Assign a subject & drop a syllabus doc.</p>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Target Subject</label>
              
              {!showCustomInput ? (
                <div className="flex gap-2">
                  <select 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  >
                    {subjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setShowCustomInput(true)}
                    className="p-2.5 bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100 hover:text-indigo-700 text-indigo-600 rounded-xl transition-all shadow-sm"
                    title="Add Custom Subject"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input 
                    type="text"
                    placeholder="Enter custom subject name..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setShowCustomInput(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (customSubject.trim()) {
                          setSelectedSubject(customSubject.trim());
                        }
                        setShowCustomInput(false);
                      }}
                      className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors font-bold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Drag & Drop Box */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-[0_12px_32px_rgba(99,102,241,0.06)]' 
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx"
                onChange={handleFileInput}
              />
              
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 border border-indigo-100/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 shadow-sm relative z-10">
                <FileUp size={24} />
              </div>
              
              <h4 className="text-sm font-bold text-slate-800 mb-1 relative z-10">Drag and drop slides, notes, or books</h4>
              <p className="text-xs text-slate-400 mb-3 relative z-10">Only PDF, DOCX, PPTX (Max 15MB)</p>
              
              <span className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50 rounded-xl text-xs font-bold transition-colors shadow-sm relative z-10">
                Browse Files
              </span>

              {/* Decorative light gradient inside drop box */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>

            {/* Uploading Status Progress Block */}
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4.5 flex flex-col gap-3"
              >
                <div className="flex justify-between items-center text-xs font-bold text-indigo-700">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-indigo-600" />
                    {uploadStatusMsg}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  ></motion.div>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Right Uploaded List & Filter Dashboard (Takes 2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col gap-6 h-full min-h-[450px]">
            
            {/* Toolbar and Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="relative flex-1 max-w-sm group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name or subject..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Filters dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mr-1">
                  <Filter size={13} /> Filters:
                </div>
                
                {/* Subject filter */}
                <select 
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Subjects</option>
                  {uniqueSubjects.filter(s => s !== 'All').map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>

                {/* File extension filter */}
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">All Formats</option>
                  <option value="pdf">PDF Docs</option>
                  <option value="docx">Word Files</option>
                  <option value="pptx">PowerPoint</option>
                </select>
              </div>
            </div>

            {/* Documents Listing */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 py-16">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
                <p className="text-xs font-semibold">Loading documents from your storage...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                  <File size={22} className="text-slate-300" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No study materials found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                  {searchQuery || subjectFilter !== 'All' || typeFilter !== 'All' 
                    ? "Try adjusting your search keywords or filter dropdown options." 
                    : "Your personal library is empty. Upload some files to start generating AI study materials."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <AnimatePresence>
                  {filteredMaterials.map((file) => (
                    <motion.div 
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      whileHover={{ y: -2 }}
                      className="bg-slate-50/50 rounded-2xl border border-slate-200/50 p-4 flex flex-col justify-between hover:bg-white hover:border-indigo-100/70 hover:shadow-[0_8px_24px_rgba(99,102,241,0.02)] transition-all group relative overflow-hidden"
                    >
                      <div>
                        {/* Header details */}
                        <div className="flex justify-between items-start gap-2 mb-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${getFileBadge(file.file_type)} flex items-center justify-center`}>
                              {getFileIcon(file.file_type)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-700 truncate max-w-[170px]" title={file.original_filename}>
                                {file.original_filename}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                {file.file_type}
                              </p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleDeleteMaterial(file.id, file.original_filename)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 rounded-lg border border-transparent hover:border-rose-100/20 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Subject Chip */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-4">
                          <span className="inline-block px-2.5 py-0.5 bg-indigo-50/60 text-indigo-600 rounded-md text-[9px] font-bold uppercase tracking-wider border border-indigo-100/10">
                            {file.subject}
                          </span>
                        </div>
                      </div>

                      {/* Footer metrics */}
                      <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <HardDrive size={11} /> {formatSize(file.file_size)}
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {new Date(file.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default UploadedMaterials;
