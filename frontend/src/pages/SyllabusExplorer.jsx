import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Book, Clock, ChevronRight, FileText, Layout, List } from 'lucide-react';
import syllabusData from '../data/unitwise.json';

const SyllabusExplorer = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(null);

    // Extract the main data object (since it has a nested structure)
    const allData = syllabusData["Pokhara University - Bachelor in Computer Engineering"] || syllabusData;
    const subjects = Object.keys(allData);

    const filteredSubjects = useMemo(() => {
        return subjects.filter(subject =>
            subject.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [subjects, searchTerm]);

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Syllabus Explorer</h1>
                <p className="text-slate-500">Explore the complete curriculum for Pokhara University Computer Engineering.</p>
            </div>

            {/* Search and Filter */}
            <div className="relative group max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Search subjects (e.g., Calculus, Data Structures...)"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-md placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Subjects List */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Subjects</h3>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{filteredSubjects.length} Found</span>
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
                                    <span className="font-semibold text-sm line-clamp-1">{subject}</span>
                                </div>
                                <ChevronRight size={18} className={selectedSubject === subject ? 'opacity-100' : 'opacity-30'} />
                            </button>
                        ))}

                        {filteredSubjects.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                <Search size={40} className="mb-2 opacity-50" />
                                <p>No subjects found for "{searchTerm}"</p>
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
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedSubject}</h2>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                                                    <Layout size={16} />
                                                    <span className="text-sm">Credits: {allData[selectedSubject].credits}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <List size={16} />
                                                    <span className="text-sm">{allData[selectedSubject].units.length} Units</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {allData[selectedSubject].units.map((unit, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={idx}
                                                className="group bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300"
                                            >
                                                <div className="p-5">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md uppercase">
                                                                {unit.unit}
                                                            </span>
                                                            <h4 className="font-bold text-slate-800">{unit.title}</h4>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                                                            <Clock size={12} />
                                                            <span>{unit.hours}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2 pl-2">
                                                        {unit.sub_topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-start gap-3 group/topic">
                                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/topic:bg-blue-500 transition-colors flex-shrink-0" />
                                                                <p className="text-sm text-slate-600 leading-relaxed font-medium group-hover/topic:text-slate-900 transition-colors">
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
                            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-200 border-dashed">
                                <div className="bg-blue-50 p-6 rounded-full mb-4">
                                    <FileText size={48} className="text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-600 mb-2">No Subject Selected</h3>
                                <p className="text-center max-w-sm px-6 text-slate-500">
                                    Select a subject from the left list to view its detailed unit-wise syllabus and learning objectives.
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
