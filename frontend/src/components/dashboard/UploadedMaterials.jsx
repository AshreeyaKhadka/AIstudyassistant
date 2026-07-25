import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import PDFViewerModal from '../PDFViewerModal';

const UploadedMaterials = ({ materials = [] }) => {
  const navigate = useNavigate();
  const [viewingFile, setViewingFile] = useState(null);

  const handleTitleClick = (file) => {
    navigate('/dashboard/upload', {
      state: {
        search: file.filename,
        subject: file.subject
      }
    });
  };

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-4 border-b border-[#D7D3CF] mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111111] tracking-tight">Uploaded Materials</h3>
          <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Files uploaded for analysis</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard/upload')}
          className="border border-[#102326] bg-white text-[#102326] hover:bg-[#102326] hover:text-white transition-colors rounded-[4px] px-3 py-1.5 text-[10px] font-mono font-semibold tracking-wider uppercase"
        >
          UPLOAD NEW
        </button>
      </div>

      <div className="overflow-x-auto">
        {materials.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-[#666666] border border-dashed border-[#D7D3CF] rounded-[4px] bg-[#FAF9F7]">
            No uploaded materials yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F5F2] border-b border-[#D7D3CF] text-[10px] font-mono uppercase text-[#666666]">
                <th className="p-3">FILE NAME</th>
                <th className="p-3 hidden sm:table-cell">SUBJECT</th>
                <th className="p-3 hidden md:table-cell">SIZE</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7D3CF]">
              {materials.map((file) => (
                <tr key={file.id} className="hover:bg-[#FAF9F7] transition-colors">
                  <td className="p-3">
                    <div 
                      onClick={() => handleTitleClick(file)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                      title={`Go to ${file.filename} in Study Vault`}
                    >
                      <FileText size={15} className="text-[#102326] shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-[#111111] group-hover:text-[#C96A32] group-hover:underline transition-colors truncate max-w-[180px] sm:max-w-[240px]">
                        {file.filename}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell font-mono text-[10px] text-[#666666]">
                    {file.subject || 'GENERAL'}
                  </td>
                  <td className="p-3 hidden md:table-cell font-mono text-[10px] text-[#666666]">
                    {file.size || '0.5 MB'}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => setViewingFile(file)}
                        className="p-1.5 text-[#111111] hover:bg-[#102326] hover:text-white rounded-[4px] border border-[#D7D3CF] transition-colors" 
                        title="View PDF Document"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PDF Viewer Popup Modal */}
      {viewingFile && (
        <PDFViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
};

export default UploadedMaterials;
