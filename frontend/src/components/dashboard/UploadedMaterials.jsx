import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, File, FileImage, FileDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadedMaterials = ({ materials }) => {
  const navigate = useNavigate();

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <FileText className="text-rose-500" size={20} />;
      case 'doc':
      case 'docx': return <File className="text-blue-500" size={20} />;
      case 'slide':
      case 'pptx': return <FileImage className="text-amber-500" size={20} />;
      default: return <File className="text-slate-500" size={20} />;
    }
  };

  const getFileBadge = (type) => {
    switch(type) {
      case 'pdf': return 'bg-rose-50 text-rose-600 border-rose-100/30';
      case 'doc':
      case 'docx': return 'bg-blue-50 text-blue-600 border-blue-100/30';
      case 'slide':
      case 'pptx': return 'bg-amber-50 text-amber-600 border-amber-100/30';
      default: return 'bg-slate-50 text-slate-600 border-slate-100/30';
    }
  };

  const formatSize = (bytes) => {
    if (typeof bytes === 'string') return bytes;
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-[2.25rem] border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.015)] flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 border-b border-slate-100/80 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Uploaded Materials</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Files uploaded for analysis</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/upload')}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100/50 transition-colors shadow-sm"
        >
          Upload New
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <th className="px-6 py-4">File Name</th>
              <th className="px-6 py-4 hidden sm:table-cell">Subject</th>
              <th className="px-6 py-4 hidden md:table-cell">Size</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {materials.map((file) => {
              const name = file.original_filename || file.filename;
              const type = file.file_type || file.type;
              const sizeStr = file.file_size ? formatSize(file.file_size) : (file.size || 'N/A');
              
              return (
                <tr key={file.id} className="hover:bg-slate-50/20 transition-all group">
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 rounded-xl border flex items-center justify-center ${getFileBadge(type)} group-hover:scale-105 transition-transform duration-300`}>
                        {getFileIcon(type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-[200px] group-hover:text-slate-800 transition-colors">{name}</p>
                        <p className="text-[11px] text-slate-400 font-bold sm:hidden mt-0.5">{file.subject}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4.5 hidden sm:table-cell">
                    <span className="inline-block px-2.5 py-1 bg-slate-100/50 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/20">
                      {file.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4.5 hidden md:table-cell text-slate-400 font-bold text-xs">{sizeStr}</td>
                  <td className="px-6 py-4.5 text-right">
                    <div className="flex justify-end gap-2 relative z-10">
                      <button 
                        onClick={() => navigate('/dashboard/upload')}
                        className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100/30 transition-all shadow-sm" 
                        title="Manage in Library"
                      >
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default UploadedMaterials;
