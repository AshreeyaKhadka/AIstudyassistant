import { useMemo } from 'react';
import syllabusData from '../data/unitwise.json';

export const useFilteredSubjects = (userSemester) => {
    const allData = useMemo(() => {
        const flattened = {};
        Object.keys(syllabusData).forEach(key => {
            if (key === "Pokhara University - Bachelor in Computer Engineering") {
                Object.assign(flattened, syllabusData[key]);
            } else {
                flattened[key] = syllabusData[key];
            }
        });
        return flattened;
    }, []);

    const subjects = useMemo(() => Object.keys(allData), [allData]);

    const filteredSubjects = useMemo(() => {
        return subjects.filter(subject => {
            const subjectData = allData[subject];
            if (!subjectData) return false;
            const subjectSemester = String(subjectData.Semester || subjectData.semester || '').trim();
            const targetSem = String(userSemester || '').trim();
            return targetSem ? subjectSemester === targetSem : true;
        });
    }, [subjects, userSemester, allData]);

    return { subjects: filteredSubjects, allData };
};
