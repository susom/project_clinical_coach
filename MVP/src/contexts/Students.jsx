import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const StudentsContext = createContext();

// Custom hook to use the StudentsContext
export const useStudents = () => useContext(StudentsContext);

// Provider component to wrap the app
export const StudentsProvider = ({ children }) => {
    const [selectedStudent, setSelectedStudent] = useState(null);

    const defaultReflections = {
        strategy: { score: 'N/A', content: 'No data' },
        solution: { score: 'N/A', content: 'No data' },
        knowledge: { score: 'N/A', content: 'No data' },
        problem: { score: 'N/A', content: 'No data' },
        data: { score: 'N/A', content: 'No data' },
        mind: { score: 'N/A', content: 'No data' },
    };

    const [students, setStudents] = useState([
        {
            id: 1,
            name: "Yaseem Amellal",
            reflections: {},
            profilePicture: null,
            transcription: "",
            description: '15-minute case presentation regarding 8-year-old patient in ICU.',
            time: '1:05 PM',
            thm_summary: "No summary available.",
            strengths: [],
            habitsData: [
                { label: 'Strategy', color: 'green' },
                { label: 'Solution', color: 'green' },
                { label: 'Knowledge', color: 'green' },
                { label: 'Problem', color: 'yellow' },
                { label: 'Data', color: 'yellow' },
                { label: 'Mind', color: 'red' },
            ],
            promptsData: [],
            notifications: [
                { id: 1, time: '1:00PM Thursday, December 12, 2024', timeAgo: '10 Mins Ago', status: 'processing', isNew: false },
            ],
        },
        {
            id: 2,
            name: "Jasmine Machado",
            reflections: {},
            profilePicture: null,
            transcription: "",
            description: '20-minute case presentation regarding 10-year-old patient with group-A strep.',
            time: '12:45 PM',
            thm_summary: "Jasmine demonstrated a solid grasp of the clinical complexity involved in the patient, particularly in recognizing and questioning the initial diagnosis of mastoiditis.",
            strengths: [
                { category: "Strategy", description: "Recognized knowledge gaps" },
                { category: "Knowledge", description: "Thoughtful therapeutic plan" },
                { category: "Solution", description: "Correctly questioned initial diagnosis" },
            ],
            habitsData: [
                { label: 'Strategy', color: 'green' },
                { label: 'Solution', color: 'yellow' },
                { label: 'Knowledge', color: 'green' },
                { label: 'Problem', color: 'red' },
                { label: 'Data', color: 'yellow' },
                { label: 'Mind', color: 'red' },
            ],
            promptsData: [
                {
                    category: 'Strategy',
                    color: 'green',
                    prompts: [
                        'Your case presentation didn’t include a clear rationale for stopping vancomycin...',
                        'How might you articulate your reasoning more clearly?',
                    ],
                },
                {
                    category: 'Solution',
                    color: 'green',
                    prompts: ['How could you approach prioritizing between chronic and acute issues?'],
                },
            ],
            notifications: [
                { id: 2, time: '1:21PM Thursday, December 12, 2024', timeAgo: '1 Hr Ago', status: 'complete', isNew: true },
            ],
        },
        {
            id: 3,
            name: "Dennis Johnson",
            reflections: {},
            profilePicture: null,
            transcription: "",
            description: '8-minute case presentation patient with mastoiditis and complications.',
            time: '12:00 PM',
            thm_summary: "No summary available.",
            strengths: [],
            habitsData: [
                { label: 'Strategy', color: 'gray' },
                { label: 'Solution', color: 'gray' },
                { label: 'Knowledge', color: 'gray' },
                { label: 'Problem', color: 'gray' },
                { label: 'Data', color: 'gray' },
                { label: 'Mind', color: 'gray' },
            ],
            promptsData: [],
            notifications: [],
        },
    ]);

    const selectStudent = (studentId) => {
        const student = students.find((s) => s.id === studentId);
        setSelectedStudent({ ...student }); // Create a new object to avoid mutating state
    };

    const updateStudent = (studentId, updatedData) => {
        if (!studentId || !updatedData || typeof updatedData !== "object") {
            console.error("Invalid arguments passed to updateStudent:", { studentId, updatedData });
            return;
        }

        console.log("Updating student:", { studentId, updatedData });

        // Update the main `students` array
        setStudents((prevStudents) => {
            const updatedStudents = prevStudents.map((student) =>
                student.id === studentId
                    ? { ...student, ...updatedData } // Merge updates for the matched student
                    : student
            );
            console.log("Updated students array:", updatedStudents);
            return updatedStudents;
        });

        // Update the currently `selectedStudent` if it matches the updated student
        if (selectedStudent?.id === studentId) {
            const updatedSelected = { ...selectedStudent, ...updatedData };
            console.log("Updated selectedStudent:", updatedSelected);
            setSelectedStudent(updatedSelected);
        }
    };


    useEffect(() => {
        if (selectedStudent) {
            const updatedStudent = students.find((s) => s.id === selectedStudent.id);
            setSelectedStudent({ ...updatedStudent }); // Update selectedStudent from the updated array
        }
    }, [students]);

    return (
        <StudentsContext.Provider
            value={{
                students,
                selectedStudent,
                selectStudent,
                updateStudent,
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};
