import React from 'react';
import { FileQuestion, Layers, FileSignature, CheckCircle, GraduationCap } from 'lucide-react';

const ExamTools = () => {
  const tools = [
    { name: 'Generate MCQs', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
    { name: 'Mock Tests', icon: FileSignature, color: 'text-purple-500', bg: 'bg-purple-100' },
    { name: 'Important Qs', icon: FileQuestion, color: 'text-rose-500', bg: 'bg-rose-100' },
    { name: 'Revision Sheets', icon: Layers, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="bg-surface-lowest rounded-xl border border-ghost-border shadow-ambient h-full">
      <div className="p-5 border-b border-ghost-border flex justify-between items-center">
        <div>
          <h3 className="font-editorial text-lg font-bold text-on-surface">Exam Prep Tools</h3>
          <p className="text-xs text-outline-variant">Quick shortcuts for exams</p>
        </div>
        <GraduationCap className="text-primary" size={24} />
      </div>
      
      <div className="p-5 grid grid-cols-2 gap-3">
        {tools.map((tool, idx) => (
          <button key={idx} className="flex flex-col items-center justify-center p-4 rounded-xl border border-ghost-border bg-surface-low hover:bg-white hover:border-primary/40 hover:shadow-md hover:-translate-y-1 transition-all group">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
              <tool.icon size={20} />
            </div>
            <span className="text-xs font-semibold text-on-surface text-center">{tool.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExamTools;
