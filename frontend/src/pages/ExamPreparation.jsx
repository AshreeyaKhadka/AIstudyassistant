import React from 'react';
import { Target, FileText, CheckSquare, Zap } from 'lucide-react';

const ExamPreparation = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800">Exam Preparation</h3>
        <p className="text-sm text-slate-500">Tools and resources to help you ace your upcoming exams.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PrepCard icon={FileText} title="Important Questions" desc="AI-curated questions based on past papers" color="blue" />
        <PrepCard icon={Target} title="Mock Tests" desc="Simulated exam environment" color="indigo" />
        <PrepCard icon={CheckSquare} title="Revision Sheets" desc="Quick chapter summaries" color="emerald" />
        <PrepCard icon={Zap} title="Generate MCQs" desc="Quick practice generation" color="amber" />
      </div>
    </div>
  );
};

const PrepCard = ({ icon: Icon, title, desc, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center text-center cursor-pointer group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${colorMap[color]}`}>
        <Icon size={28} />
      </div>
      <h4 className="text-lg font-bold text-slate-800 mb-2">{title}</h4>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
};

export default ExamPreparation;
