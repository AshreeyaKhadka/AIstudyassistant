import React from 'react';
import { FileUp, Search } from 'lucide-react';

const UploadedMaterials = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">Study Materials</h3>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            Shared Resources
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <FileUp size={16} /> Upload PDF
          </button>
        </div>
      </div>
      
      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center mb-8 hover:bg-blue-50 transition-colors cursor-pointer">
        <div className="w-16 h-16 bg-white shadow-sm text-blue-500 rounded-full flex items-center justify-center mb-4">
          <FileUp size={28} />
        </div>
        <h4 className="text-lg font-bold text-slate-800 mb-1">Drag and drop your PDFs here</h4>
        <p className="text-sm text-slate-500">or click to browse from your computer</p>
      </div>

      <h4 className="text-lg font-bold text-slate-800 mb-4">Recent Uploads</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder file card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
            PDF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">Chapter 4 - Operating Systems.pdf</p>
            <p className="text-xs text-slate-500 mt-1">2.4 MB • Uploaded today</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadedMaterials;
