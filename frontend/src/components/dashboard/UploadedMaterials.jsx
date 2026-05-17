import React from 'react';
import { FileText, Download, Eye, File, FileImage } from 'lucide-react';

const UploadedMaterials = ({ materials }) => {
  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <FileText className="text-red-500" size={24} />;
      case 'doc': return <File className="text-blue-500" size={24} />;
      case 'slide': return <FileImage className="text-orange-500" size={24} />;
      default: return <File className="text-gray-500" size={24} />;
    }
  };

  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient flex flex-col h-full">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center">
        <div>
          <h3 className="font-editorial text-lg font-bold text-on-surface">Your Uploaded Materials</h3>
          <p className="text-xs text-outline-variant">Files you've uploaded for analysis</p>
        </div>
        <button className="text-sm text-primary font-medium hover:underline">Upload New</button>
      </div>
      <div className="p-0 flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-low text-xs text-outline-variant uppercase font-semibold">
            <tr>
              <th className="px-5 py-3 rounded-tl-lg">File</th>
              <th className="px-5 py-3 hidden sm:table-cell">Subject</th>
              <th className="px-5 py-3 hidden md:table-cell">Size</th>
              <th className="px-5 py-3 rounded-tr-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ghost-border">
            {materials.map((file) => (
              <tr key={file.id} className="hover:bg-surface-low transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="font-medium text-on-surface truncate max-w-[150px] sm:max-w-[200px]">{file.filename}</p>
                      <p className="text-xs text-outline-variant sm:hidden">{file.subject}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell text-outline-variant">{file.subject}</td>
                <td className="px-5 py-4 hidden md:table-cell text-outline-variant">{file.size}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 text-outline-variant hover:text-primary bg-surface-container rounded-md hover:bg-secondary transition-colors" title="Preview">
                      <Eye size={16} />
                    </button>
                    <button className="p-1.5 text-outline-variant hover:text-primary bg-surface-container rounded-md hover:bg-secondary transition-colors" title="Download">
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UploadedMaterials;
