import React from 'react';

const StatCards = ({ stats }) => {
  const formatQuizAccuracy = () => {
    if (stats?.quizAccuracy == null) return '—';
    return `${stats.quizAccuracy}%`;
  };

  const formatStudyHours = () => {
    const hours = stats?.weeklyStudyHours ?? 0;
    if (hours === 0) return '0h';
    return `${hours}h`;
  };

  const statItems = [
    { label: 'TOTAL NOTES', value: stats?.totalNotes ?? 0, emptyHint: stats?.totalNotes === 0 ? 'No notes yet' : null },
    { label: 'FLASHCARDS', value: stats?.flashcardsCompleted ?? 0, emptyHint: stats?.flashcardsCompleted === 0 ? 'None saved' : null },
    { label: 'UPLOADED PDFS', value: stats?.uploadedPDFs ?? 0, emptyHint: stats?.uploadedPDFs === 0 ? 'Upload a PDF' : null },
    { label: 'STUDY HOURS', value: formatStudyHours(), sublabel: 'This week', emptyHint: (stats?.weeklyStudyHours ?? 0) === 0 ? 'Log focus sessions' : null },
    { label: 'QUIZ ACCURACY', value: formatQuizAccuracy(), emptyHint: stats?.quizAccuracy == null ? 'No quizzes yet' : null },
    { label: 'PENDING REVISION', value: stats?.pendingRevision ?? 0, isAccent: true, emptyHint: stats?.pendingRevision === 0 ? 'All caught up' : null },
  ];

  return (
    <div className="border border-[#D7D3CF] bg-white rounded-[4px] overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-[#D7D3CF]">
        {statItems.map((item, idx) => (
          <div 
            key={idx} 
            className={`p-4 sm:p-5 flex flex-col justify-between ${item.isAccent ? 'bg-[#FFFDFB]' : 'bg-white'}`}
          >
            <div className={`text-[10px] font-mono tracking-wider uppercase font-semibold mb-3 ${item.isAccent ? 'text-[#C96A32]' : 'text-[#666666]'}`}>
              {item.label}
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono ${item.isAccent ? 'text-[#C96A32]' : 'text-[#111111]'}`}>
              {item.value}
            </div>
            {item.sublabel && (
              <div className="text-[9px] font-mono uppercase text-[#999999] mt-1 tracking-wider">{item.sublabel}</div>
            )}
            {item.emptyHint && (
              <div className="text-[9px] font-mono text-[#999999] mt-1">{item.emptyHint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatCards;
