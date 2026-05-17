import React from 'react';
import { Sparkles, Calendar, TrendingUp } from 'lucide-react';

const WelcomeSection = ({ data }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 md:p-10 shadow-2xl shadow-blue-900/20 text-white border border-white/10">
      {/* Abstract Background Patterns */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        
        {/* Left Content */}
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-50 text-sm font-medium backdrop-blur-md shadow-sm w-fit">
            <Calendar size={16} className="text-blue-200" />
            {currentDate}
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Ready to excel today, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">
              {data.name.split(' ')[0]}?
            </span>
          </h2>
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-4 py-1.5 rounded-xl bg-black/20 backdrop-blur-sm text-sm font-semibold text-white/90 border border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              {data.semester}
            </span>
            <span className="px-4 py-1.5 rounded-xl bg-black/20 backdrop-blur-sm text-sm font-semibold text-white/90 border border-white/10">
              {data.department}
            </span>
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 px-4 py-1.5 rounded-xl text-sm font-bold border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <TrendingUp size={16} className="text-amber-400" />
              {data.streak} Day Streak! Keep it up 🔥
            </div>
          </div>
        </div>
        
        {/* Right Content / Quote Card */}
        <div className="relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50"></div>
          <div className="relative bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 shadow-2xl max-w-sm transform transition-all duration-500 group-hover:-translate-y-2 group-hover:rotate-1">
            <Sparkles className="absolute -top-3 -right-3 text-amber-300 w-8 h-8 opacity-80" />
            <p className="text-lg font-medium text-white/95 leading-relaxed relative z-10 italic">
              "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice."
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"></div>
              <p className="text-sm font-bold text-blue-100 tracking-wide uppercase">— Brian Herbert</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default WelcomeSection;
