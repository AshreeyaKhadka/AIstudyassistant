import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Layers, UploadCloud, Clock, Target, AlertCircle } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const StatCard = ({ title, value, icon: Icon, type }) => {
  const getStyle = () => {
    switch(type) {
      case 'primary': return 'from-blue-500 to-indigo-600 text-blue-500 bg-blue-50/50 border-blue-100/50 glow-blue';
      case 'success': return 'from-emerald-400 to-teal-500 text-emerald-500 bg-emerald-50/50 border-emerald-100/50 glow-emerald';
      case 'warning': return 'from-amber-400 to-orange-500 text-amber-500 bg-amber-50/50 border-amber-100/50 glow-amber';
      case 'danger': return 'from-rose-400 to-red-500 text-rose-500 bg-rose-50/50 border-rose-100/50 glow-rose';
      default: return 'from-slate-400 to-slate-500 text-slate-500 bg-slate-50/50 border-slate-100/50 glow-slate';
    }
  };

  const style = getStyle();
  const gradientClass = style.split(' ').slice(0, 2).join(' ');
  const textClass = style.split(' ')[2];
  const bgClass = style.split(' ')[3];
  const borderClass = style.split(' ')[4];

  return (
    <motion.div 
      variants={cardVariants}
      whileHover={{ y: -5, scale: 1.01 }}
      className={`bg-white rounded-3xl p-5 border border-slate-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.015)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.04)] hover:border-slate-200/50 transition-all duration-300 group relative overflow-hidden`}
    >
      {/* Dynamic ambient hover glow in back */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${gradientClass} rounded-full blur-[30px] opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
      
      <div className="flex justify-between items-start mb-3.5 relative z-10">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bgClass} ${textClass} border ${borderClass} group-hover:scale-105 transition-transform duration-300`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight group-hover:text-slate-900 transition-colors">
          {value}
        </h3>
        <p className="text-xs font-semibold text-slate-400 tracking-wide mt-0.5">{title}</p>
      </div>
    </motion.div>
  );
};

const StatCards = ({ stats }) => {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5"
    >
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
    </motion.div>
  );
};

export default StatCards;
