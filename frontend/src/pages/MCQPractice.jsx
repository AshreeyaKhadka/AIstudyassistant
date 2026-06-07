import React from 'react';
import { Library } from 'lucide-react';

const MCQPractice = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">MCQ Practice</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          Start New Quiz
        </button>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
          <Library size={32} />
        </div>
        <h4 className="text-lg font-bold text-slate-800 mb-2">Select a subject</h4>
        <p className="text-slate-500 max-w-sm mb-6">
          Choose a subject to start practicing multiple choice questions generated from your materials.
        </p>
      </div>
    </div>
  );
};

export default MCQPractice;
