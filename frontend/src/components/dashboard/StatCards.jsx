import React from 'react';

const StatCards = ({ stats }) => {
  const statItems = [
    { label: 'TOTAL NOTES', value: stats?.totalNotes ?? 0 },
    { label: 'FLASHCARDS', value: stats?.flashcardsCompleted ?? 0 },
    { label: 'UPLOADED PDFS', value: stats?.uploadedPDFs ?? 0 },
    { label: 'STUDY HOURS', value: `${stats?.weeklyStudyHours ?? 0}h` },
    { label: 'QUIZ ACCURACY', value: `${stats?.quizAccuracy ?? 0}%` },
    { label: 'PENDING REVISION', value: stats?.pendingRevision ?? 0, isAccent: true },
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatCards;
