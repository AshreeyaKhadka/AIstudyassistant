import React from 'react';
import { BookOpen, Layers, UploadCloud, Clock, Target, AlertCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, type }) => {
  const getStyle = () => {
    switch(type) {
      case 'primary': return 'from-blue-500 to-indigo-600 text-blue-600 bg-blue-50';
      case 'success': return 'from-emerald-400 to-teal-500 text-emerald-600 bg-emerald-50';
      case 'warning': return 'from-amber-400 to-orange-500 text-amber-600 bg-amber-50';
      case 'danger': return 'from-rose-400 to-red-500 text-rose-600 bg-rose-50';
      default: return 'from-slate-400 to-slate-500 text-slate-600 bg-slate-50';
    }
  };

  const style = getStyle();
  const gradientClass = style.split(' ').slice(0, 2).join(' ');
  const textClass = style.split(' ')[2];
  const bgClass = style.split(' ')[3];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
      {/* Decorative gradient blur in background */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${gradientClass} rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass} ${textClass} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-extrabold text-slate-800 mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
    </div>
  );
};

const StatCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
      <StatCard 
        title="Total Notes" 
        value={stats.totalNotes} 
        icon={BookOpen} 
        type="primary"
      />
      <StatCard 
        title="Flashcards" 
        value={stats.flashcardsCompleted} 
        icon={Layers} 
        type="success"
      />
      <StatCard 
        title="Uploaded PDFs" 
        value={stats.uploadedPDFs} 
        icon={UploadCloud} 
        type="primary"
      />
      <StatCard 
        title="Study Hours" 
        value={`${stats.weeklyStudyHours}h`} 
        icon={Clock} 
        type="warning"
      />
      <StatCard 
        title="Quiz Accuracy" 
        value={`${stats.quizAccuracy}%`} 
        icon={Target} 
        type="success"
      />
      <StatCard 
        title="Pending Revision" 
        value={stats.pendingRevision} 
        icon={AlertCircle} 
        type="danger"
      />
    </div>
  );
};

export default StatCards;
