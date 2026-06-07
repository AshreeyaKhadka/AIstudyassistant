export const studentData = {
  name: 'Alex Johnson',
  semester: '6th Semester',
  department: 'Computer Engineering',
  streak: 14,
  stats: {
    totalNotes: 42,
    flashcardsCompleted: 128,
    uploadedPDFs: 15,
    weeklyStudyHours: 24,
    quizAccuracy: 86,
    pendingRevision: 5
  }
};

export const recentQueries = [
  { id: 1, title: 'Explain CPU Scheduling algorithms', subject: 'Operating Systems', time: '2 hours ago' },
  { id: 2, title: 'Difference between TCP and UDP', subject: 'Computer Networks', time: 'Yesterday' },
  { id: 3, title: 'Normalization in DBMS (1NF to BCNF)', subject: 'Database Management', time: '2 days ago' }
];

export const uploadedMaterials = [
  { id: 1, filename: 'OS_Chapter4_Notes.pdf', subject: 'Operating Systems', date: 'May 10, 2026', size: '2.4 MB', type: 'pdf' },
  { id: 2, filename: 'Network_Topology_Slides.pptx', subject: 'Computer Networks', date: 'May 12, 2026', size: '5.1 MB', type: 'slide' },
  { id: 3, filename: 'DBMS_Lab_Manual.docx', subject: 'Database Management', date: 'May 14, 2026', size: '1.2 MB', type: 'doc' }
];

export const sharedResources = [
  { id: 1, title: 'PU Syllabus 2026 Update', category: 'Syllabus', date: 'Jan 15, 2026', type: 'pdf' },
  { id: 2, title: 'Past Questions (2018-2025)', category: 'Exam Prep', date: 'Mar 10, 2026', type: 'folder' },
  { id: 3, title: 'Data Structures Lab Manual', category: 'Lab', date: 'Feb 05, 2026', type: 'pdf' },
  { id: 4, title: 'Faculty Notes - Microprocessors', category: 'Notes', date: 'Apr 20, 2026', type: 'doc' }
];

export const flashcards = [
  { id: 1, question: 'What is a Semaphore?', answer: 'A variable or abstract data type used to control access to a common resource by multiple processes in a concurrent system.', subject: 'Operating Systems' },
  { id: 2, question: 'Define IP Subnetting.', answer: 'The practice of dividing a network into two or more smaller networks to improve security and performance.', subject: 'Computer Networks' },
  { id: 3, question: 'What is a Foreign Key?', answer: 'A field (or collection of fields) in one table that uniquely identifies a row of another table or the same table.', subject: 'Database Management' }
];

export const generatedNotes = [
  { id: 1, title: 'Process Synchronization', subject: 'Operating Systems', date: 'May 15, 2026', snippet: 'Process synchronization refers to the coordination of simultaneous threads or processes to complete a task...' },
  { id: 2, title: 'OSI Model Layers', subject: 'Computer Networks', date: 'May 12, 2026', snippet: 'The OSI model consists of 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application...' },
  { id: 3, title: 'SQL Joins Overview', subject: 'Database Management', date: 'May 10, 2026', snippet: 'INNER JOIN returns records that have matching values in both tables. LEFT JOIN returns all records from the left table...' }
];
