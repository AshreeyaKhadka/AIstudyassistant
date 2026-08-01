import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, X, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PDFViewerModal = ({ file, onClose }) => {
  const extension = (file.filename?.split('.').pop() || '').toLowerCase();
  const canPreviewFile = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt'].includes(extension);
  const [viewMode, setViewMode] = useState(canPreviewFile ? 'file' : 'text');
  const [fileDetails, setFileDetails] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [filePreviewError, setFilePreviewError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const extractedSections = useMemo(() => {
    const text = fileDetails?.parsed_text || '';
    const parts = text.split(/\[(Page|OCR Page|Slide)\s+(\d+)\]\s*\n/);
    if (parts.length < 4) return text ? [{ label: 'Document', text }] : [];
    const sections = [];
    for (let index = 1; index < parts.length; index += 3) {
      const kind = parts[index] === 'Slide' ? 'Slide' : 'Page';
      const number = parts[index + 1];
      const content = parts[index + 2]?.trim();
      if (content) sections.push({ label: `${kind} ${number}`, text: content });
    }
    return sections;
  }, [fileDetails?.parsed_text]);

  useEffect(() => {
    let createdBlobUrl = null;
    const loadFileData = async () => {
      try {
        setLoading(true);
        setError('');
        // 1. Fetch file details for text preview
        const resDetail = await fetch(`/api/upload/${file.id}`, { credentials: 'include' });
        const detailData = await resDetail.json();
        if (!resDetail.ok) throw new Error(detailData.error || 'Could not load document details.');
        setFileDetails(detailData);

        // 2. Fetch source file blob with credentials
        const resPdf = await fetch(`/api/upload/${file.id}/file`, { credentials: 'include' });
        if (resPdf.ok) {
          const blob = await resPdf.blob();
          createdBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(createdBlobUrl);
        } else if (canPreviewFile) {
          setFilePreviewError(true);
          setViewMode('text');
        }
      } catch (err) {
        setError(err.message || 'Could not load the document preview.');
        setFilePreviewError(true);
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
  }, [file.id, canPreviewFile]);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.filename || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-xs">
      <div className="bg-white border border-[#D7D3CF] rounded-[4px] max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 bg-[#102326] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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
                onClick={() => setViewMode('file')}
                disabled={filePreviewError || !canPreviewFile}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  viewMode === 'file' ? 'bg-white text-[#102326]' : 'text-white/80 hover:text-white disabled:opacity-40'
                }`}
              >
                FILE VIEW
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
              disabled={!blobUrl}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-[4px] text-white transition-colors"
              title="Download source file"
              aria-label="Download source file"
            >
              <Download size={16} />
            </button>

            <button onClick={onClose} className="p-1.5 hover:text-[#A0B0B3] transition-colors" aria-label="Close document viewer">
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
          ) : error ? (
            <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-xs font-mono text-[#C96A32]">
              {error}
            </div>
          ) : viewMode === 'file' && blobUrl ? (
            <iframe
              src={blobUrl}
              title={file.filename}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="h-full flex flex-col bg-white">
              {fileDetails && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[#D7D3CF] bg-[#F7F5F2] px-4 py-2 text-[10px] font-mono text-[#666666]">
                  <span>{fileDetails.extraction_quality?.toUpperCase() || 'PENDING'} extraction</span>
                  {fileDetails.page_count ? <span>{fileDetails.page_count} {fileDetails.extraction_method === 'slide_text' ? 'slides' : 'pages'}</span> : null}
                  {fileDetails.character_count ? <span>{fileDetails.character_count.toLocaleString()} characters</span> : null}
                  <span>{(fileDetails.processing_status || 'uploaded').toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto font-mono text-xs text-[#111111] leading-relaxed">
              {filePreviewError && (
                <div className="p-3 mb-4 bg-[#FFFDFB] border border-[#D7D3CF] text-[#C96A32] rounded-[4px] text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>Direct file preview unavailable. Displaying extracted text content below.</span>
                </div>
              )}
              {fileDetails?.processing_warnings?.length > 0 && (
                <div className="p-3 mb-4 bg-[#FFFBF4] border border-[#D7D3CF] text-[#9A5B24] rounded-[4px] text-xs font-mono">
                  <p className="font-semibold mb-1">Extraction warnings</p>
                  {fileDetails.processing_warnings.map((warning) => <p key={warning}>- {warning}</p>)}
                </div>
              )}
              {extractedSections.length ? (
                <div className="whitespace-pre-wrap break-words max-w-none prose prose-xs">
                  {extractedSections[pageIndex]?.text}
                </div>
              ) : (
                <div className="text-center text-[#666666] py-12 font-mono text-xs">
                  No text content extracted for this document.
                </div>
              )}
              </div>
              {extractedSections.length > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-[#D7D3CF] px-4 py-2 text-xs font-mono">
                  <button
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                    disabled={pageIndex === 0}
                    className="p-1.5 border border-[#D7D3CF] rounded-[4px] disabled:opacity-40"
                    aria-label="Previous extracted page"
                  ><ChevronLeft size={14} /></button>
                  <select
                    value={pageIndex}
                    onChange={(event) => setPageIndex(Number(event.target.value))}
                    aria-label="Choose extracted page"
                    className="max-w-48 text-xs font-mono"
                  >
                    {extractedSections.map((section, index) => <option key={`${section.label}-${index}`} value={index}>{section.label}</option>)}
                  </select>
                  <button
                    onClick={() => setPageIndex((current) => Math.min(extractedSections.length - 1, current + 1))}
                    disabled={pageIndex === extractedSections.length - 1}
                    className="p-1.5 border border-[#D7D3CF] rounded-[4px] disabled:opacity-40"
                    aria-label="Next extracted page"
                  ><ChevronRight size={14} /></button>
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
