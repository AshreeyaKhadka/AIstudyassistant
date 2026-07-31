import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const StudyHistory = ({ sessions = [], loading = false }) => {
  return (
    <div className="bg-white border border-[#D7D3CF] rounded-[4px] p-5">
      <div className="pb-3 border-b border-[#D7D3CF] mb-4">
        <h3 className="text-base font-bold text-[#111111] tracking-tight">Session History</h3>
        <p className="text-[10px] font-mono uppercase text-[#666666] tracking-wider mt-0.5">Recorded study logs</p>
      </div>
      
      {loading ? (
        <div className="border border-dashed border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px] p-6 text-center text-xs font-mono text-[#666666]">
          Loading study sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-dashed border-[#D7D3CF] bg-[#FAF9F7] rounded-[4px] p-6 text-center text-xs font-mono text-[#666666]">
          No study sessions recorded yet.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto custom-scrollbar">
          {sessions.map(s => (
            <div key={s.id} className="p-3 rounded-[4px] border border-[#D7D3CF] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={s.completed ? 'text-[#102326]' : 'text-[#C96A32]'}>
                  {s.completed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#111111]">{s.subject}</h4>
                  <p className="text-[10px] font-mono text-[#666666] mt-0.5">
                    {s.topic || 'General'} • {s.duration_minutes} min
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-[#666666]">
                <div>{new Date(s.created_at).toLocaleDateString()}</div>
                <div>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyHistory;
