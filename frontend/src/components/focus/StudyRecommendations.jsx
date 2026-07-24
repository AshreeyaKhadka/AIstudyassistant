import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

const StudyRecommendations = ({ recommendations }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900 rounded-[2.5rem] shadow-xl border border-indigo-500/20 p-8 h-full text-white relative overflow-hidden">
      <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-extrabold flex items-center gap-2 mb-6 text-indigo-100">
          <Lightbulb className="text-amber-300" />
          AI Coach Insights
        </h3>
        
        {recommendations.length === 0 ? (
          <div className="text-indigo-200/60 font-medium italic">
            Start logging sessions for AI insights.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              let Icon = Lightbulb;
              let bg = "bg-white/10";
              let border = "border-white/10";
              let textColor = "text-white";
              
              if (rec.priority === 'high') {
                Icon = AlertTriangle;
                bg = "bg-rose-500/20";
                border = "border-rose-500/30";
                textColor = "text-rose-100";
              } else if (rec.type === 'revision') {
                Icon = CheckCircle2;
                bg = "bg-emerald-500/20";
                border = "border-emerald-500/30";
                textColor = "text-emerald-100";
              } else if (rec.type === 'quiz_review') {
                Icon = TrendingUp;
                bg = "bg-blue-500/20";
                border = "border-blue-500/30";
                textColor = "text-blue-100";
              }
              
              return (
                <div key={idx} className={`p-4 rounded-2xl border ${bg} ${border} flex items-start gap-3 backdrop-blur-sm`}>
                  <Icon size={18} className={`mt-0.5 shrink-0 ${textColor}`} />
                  <div>
                    <p className={`font-semibold text-sm ${textColor}`}>{rec.message}</p>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-2 block">
                      {rec.subject}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyRecommendations;
