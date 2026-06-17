import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, Clock, ChevronRight, FileText, Layout, List } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useFilteredSubjects } from '../hooks/useFilteredSubjects';

const SyllabusExplorer = () => {
    const { user } = useOutletContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Get user semester from context (ensure it's a string for comparison)
    const userSemester = user?.semester ? String(user.semester) : '';

    const { subjects, allData } = useFilteredSubjects(userSemester);

    const filteredSubjects = useMemo(() => {
        const result = subjects.filter(subject => {
            const subjectData = allData[subject];
            if (!subjectData) return false;
            const matchesSearch = subject.toLowerCase().includes(searchTerm.toLowerCase());
            const subjectSemester = String(subjectData.Semester || subjectData.semester || '').trim();
            const userSem = String(userSemester || '').trim();
            const matchesSemester = userSem ? subjectSemester === userSem : true;
            return matchesSearch && matchesSemester;
        });
        return result;
    }, [subjects, searchTerm, userSemester, allData]);

    return (
        <div className="flex flex-col gap-8 pb-12">
            {/* Premium Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Curriculum Explorer</h1>
                    <p className="text-slate-500 font-medium">Browse subjects and syllabus units for Semester {userSemester}</p>
                </div>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search for subjects or units..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Subjects List */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Subjects</h3>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-bold">{filteredSubjects.length} Found</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredSubjects.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => setSelectedSubject(subject)}
                                className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all duration-200 border ${selectedSubject === subject
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${selectedSubject === subject ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                                        <Book size={20} />
                                    </div>
                                    <span className="font-bold text-sm line-clamp-1">{subject}</span>
                                </div>
                                <ChevronRight size={18} className={selectedSubject === subject ? 'opacity-100' : 'opacity-30'} />
                            </button>
                        ))}

                        {filteredSubjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <Search size={40} className="mb-2 opacity-30" />
                                <p className="font-bold text-sm uppercase tracking-wide">No subjects found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Units Display */}
                <div className="lg:col-span-7">
                    <AnimatePresence mode="wait">
                        {selectedSubject ? (
                            <motion.div
                                key={selectedSubject}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{selectedSubject}</h2>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-xs">
                                                    <Layout size={14} />
                                                    <span>Credits: {allData[selectedSubject].credits}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 font-bold px-3 py-1 text-xs">
                                                    <List size={14} />
                                                    <span>{allData[selectedSubject].units.length} Units</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        {allData[selectedSubject].units.map((unit, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={idx}
                                                className="group bg-slate-50/10 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-300"
                                            >
                                                <div className="p-6">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-[10px] font-extrabold text-white bg-blue-600 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm">
                                                                {unit.unit}
                                                            </div>
                                                            <h4 className="font-bold text-slate-800">{unit.title}</h4>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                                                            <Clock size={12} />
                                                            <span>{unit.hours}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3 pl-2">
                                                        {unit.sub_topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-start gap-4 group/topic">
                                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/topic:bg-blue-500 transition-colors flex-shrink-0" />
                                                                <p className="text-[13px] text-slate-500 leading-relaxed font-medium group-hover/topic:text-slate-800 transition-colors">
                                                                    {topic}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                                <div className="bg-slate-50 p-8 rounded-full mb-6">
                                    <FileText size={48} className="text-slate-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Detailed Syllabus</h3>
                                <p className="text-center max-w-sm px-6 text-slate-400 font-medium text-sm">
                                    Select a subject from the left panel to explore its learning objectives, units, and resource depth.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SyllabusExplorer;
