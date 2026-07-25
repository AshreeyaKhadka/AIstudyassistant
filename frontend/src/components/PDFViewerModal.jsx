import React, { useState, useEffect } from 'react';
import { FileText, Download, X, Loader2, AlertCircle } from 'lucide-react';

const PDFViewerModal = ({ file, onClose }) => {
  const [viewMode, setViewMode] = useState('pdf'); // 'pdf' | 'text'
  const [fileDetails, setFileDetails] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [pdfError, setPdfError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let createdBlobUrl = null;
    const loadFileData = async () => {
      try {
        setLoading(true);
        // 1. Fetch file details for text preview
        const resDetail = await fetch(`/api/upload/${file.id}`, { credentials: 'include' });
        if (resDetail.ok) {
          const data = await resDetail.json();
          setFileDetails(data);
        }

        // 2. Fetch PDF file blob with credentials
        const resPdf = await fetch(`/api/upload/${file.id}/file`, { credentials: 'include' });
        if (resPdf.ok) {
          const blob = await resPdf.blob();
          createdBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(createdBlobUrl);
        } else {
          setPdfError(true);
          setViewMode('text');
        }
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
        setPdfError(true);
        setViewMode('text');
      } finally {
        setLoading(false);
      }
    };

    loadFileData();

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [file.id]);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-xs">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 bg-[#102326] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-[4px] bg-white/10 text-white flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{file.filename}</h3>
              <p className="text-[10px] font-mono text-[#A0B0B3] truncate">
                Subject: {file.subject || 'General'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex bg-[#0b191c] border border-white/20 rounded-[4px] p-0.5 text-[10px] font-mono font-semibold">
              <button
                onClick={() => setViewMode('pdf')}
                disabled={pdfError}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  viewMode === 'pdf' ? 'bg-white text-[#102326]' : 'text-white/80 hover:text-white disabled:opacity-40'
                }`}
              >
                PDF VIEW
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  viewMode === 'text' ? 'bg-white text-[#102326]' : 'text-white/80 hover:text-white'
                }`}
              >
                TEXT PREVIEW
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-[4px] text-white transition-colors"
              title="Download PDF"
            >
              <Download size={16} />
            </button>

            <button onClick={onClose} className="p-1.5 hover:text-[#A0B0B3] transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 bg-[#F7F5F2] overflow-hidden relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[#666666] font-mono text-xs">
              <Loader2 className="animate-spin text-[#102326]" size={28} />
              <span>Loading document viewer...</span>
            </div>
          ) : viewMode === 'pdf' && blobUrl ? (
            <iframe
              src={blobUrl}
              title={file.filename}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="h-full p-6 overflow-y-auto font-mono text-xs text-[#111111] leading-relaxed bg-white">
              {pdfError && (
                <div className="p-3 mb-4 bg-[#FFFDFB] border border-[#D7D3CF] text-[#C96A32] rounded-[4px] text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>Direct PDF streaming unavailable. Displaying extracted text content below.</span>
                </div>
              )}
              {fileDetails?.parsed_text ? (
                <div className="whitespace-pre-wrap max-w-none prose prose-xs">
                  {fileDetails.parsed_text}
                </div>
              ) : (
                <div className="text-center text-[#666666] py-12 font-mono text-xs">
                  No text content extracted for this document.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#D7D3CF] bg-white flex justify-between items-center text-xs font-mono text-[#666666] shrink-0">
          <span className="truncate max-w-md">{file.filename}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase hover:bg-[#0b191c] transition-colors"
          >
            CLOSE VIEWER
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewerModal;
