import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';

const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
};

const RevisionWidget = ({ items = [] }) => {
  const navigate = useNavigate();
  return (
    <section className="border border-[#D7D3CF] bg-white p-5">
      <button type="button" onClick={() => navigate('/dashboard/revision')} className="flex w-full items-center justify-between text-left">
        <div><h3 className="text-base font-bold text-[#111111]">Revision schedule</h3><p className="mt-0.5 text-xs text-[#666666]">Upcoming calendar items</p></div>
        <ChevronRight size={18} />
      </button>
      <div className="mt-4 border-t border-[#D7D3CF] pt-2">
        {items.length ? items.map((item) => (
          <button key={item.id} type="button" onClick={() => navigate('/dashboard/revision')} className="flex w-full items-start gap-3 border-b border-[#ECEAE7] py-2.5 text-left last:border-0">
            <div className="w-11 shrink-0 font-mono text-[10px] font-semibold text-[#102326]">{formatDate(item.date)}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#111111]">{item.title}</p><p className="mt-0.5 truncate text-[10px] text-[#666666]">{item.start_time || 'Any time'} · {item.subject}</p></div>
          </button>
        )) : <div className="py-5 text-center"><CalendarDays size={20} className="mx-auto text-[#9B948C]" /><p className="mt-2 text-xs text-[#666666]">No upcoming study plans</p></div>}
      </div>
    </section>
  );
};

export default RevisionWidget;
