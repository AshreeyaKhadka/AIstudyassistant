import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Layers, FileSignature, CheckCircle } from 'lucide-react';

const ExamTools = () => {
  const navigate = useNavigate();

  const tools = [
    { name: 'Generate MCQs', icon: CheckCircle, path: '/dashboard/mcq' },
    { name: 'Mock Tests', icon: FileSignature, path: '/dashboard/exam-prep' },
    { name: 'Important Qs', icon: FileQuestion, path: '/dashboard/exam-prep' },
    { name: 'Revision Sheets', icon: Layers, path: '/dashboard/syllabus' },
  ];

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] p-5">
      <div className="pb-3 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">Exam Prep Tools</h3>
        <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Quick Shortcuts</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <button
              key={idx}
              onClick={() => navigate(tool.path)}
              className="flex flex-col items-center justify-center p-3 border border-[#D7D3CF] rounded-[4px] bg-white hover:bg-[#102326] hover:text-white transition-colors group text-center"
            >
              <Icon size={16} className="mb-1 text-[#102326] group-hover:text-white transition-colors" />
              <span className="text-[11px] font-mono font-semibold tracking-tight">{tool.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExamTools;
