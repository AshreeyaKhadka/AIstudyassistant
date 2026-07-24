import React from 'react';
import { Clock, Book, CheckCircle, XCircle } from 'lucide-react';

const StudyHistory = ({ sessions }) => {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
      <h3 className="text-xl font-extrabold text-slate-800 mb-6">Session History</h3>
      
      {sessions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 font-medium">No study sessions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {sessions.map(s => (
            <div key={s.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${s.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {s.completed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-700">{s.subject}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1"><Book size={12} /> {s.topic || 'General'}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {s.duration_minutes} min</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyHistory;
