import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, TrendingUp, Compass } from 'lucide-react';

const WelcomeSection = ({ data, user }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-8 md:p-10 shadow-xl border border-white/5 text-white"
    >
      {/* 3D Glowing Ambient Spheres */}
      <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-gradient-to-br from-blue-500/15 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-40%] left-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        
        {/* Left Focus Room Brand Message */}
        <div className="flex flex-col gap-5 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-md shadow-sm w-fit"
          >
            <Calendar size={14} className="text-indigo-400" />
            {currentDate}
          </motion.div>
          
          <div className="space-y-2">
            <motion.h2 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight"
            >
              Welcome back, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-amber-200 drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                {user?.username || data.name.split(' ')[0]}!
              </span>
            </motion.h2>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-wrap items-center gap-3 mt-1"
          >
            <span className="px-4 py-2 rounded-2xl bg-white/5 backdrop-blur-md text-xs font-bold text-slate-300 border border-white/5 flex items-center gap-2 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
              {user?.semester || data.semester}
            </span>
            
            <span className="px-4 py-2 rounded-2xl bg-white/5 backdrop-blur-md text-xs font-bold text-slate-300 border border-white/5 shadow-sm">
              {user?.department || data.department || 'Computer Engineering'}
            </span>

            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-300 px-4 py-2 rounded-2xl text-xs font-extrabold border border-amber-500/20 shadow-md">
              <TrendingUp size={14} className="text-amber-400 animate-bounce" />
              {data.streak} Day Streak! Keep it up 🔥
            </div>
          </motion.div>
        </div>
        
        {/* Right Dynamic Focus Quote Console */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, duration: 0.8, type: 'spring' }}
          className="relative group perspective-1000 w-full lg:w-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-60"></div>
          <div className="relative bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl max-w-sm ml-auto transform transition-all duration-500 hover:-translate-y-1 hover:border-white/20">
            <Sparkles className="absolute -top-3 -right-3 text-amber-300 w-8 h-8 opacity-80 animate-pulse" />
            <p className="text-base font-semibold text-slate-200 leading-relaxed relative z-10 italic">
              "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice."
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"></div>
              <p className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase">— Brian Herbert</p>
            </div>
          </div>
        </motion.div>
        
      </div>
    </motion.div>
  );
};

export default WelcomeSection;
