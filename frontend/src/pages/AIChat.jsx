import React from 'react';
import { MessageSquare } from 'lucide-react';

const AIChat = () => {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">AI Chat Assistant</h3>
        <p className="text-slate-500 max-w-md">
          Ask questions, get explanations, and interact with your AI tutor based on your uploaded materials and global syllabus.
        </p>
        <button className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
          Start New Conversation
        </button>
      </div>
    </div>
  );
};

export default AIChat;
