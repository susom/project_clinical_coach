import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const StudentsContext = createContext();

// Custom hook to use the StudentsContext
export const useStudents = () => useContext(StudentsContext);

// Provider component to wrap the app
export const StudentsProvider = ({ children }) => {
    const defaultReflections = {
        strategy: { score: 'N/A', content: 'No data' },
        solution: { score: 'N/A', content: 'No data' },
        knowledge: { score: 'N/A', content: 'No data' },
        problem: { score: 'N/A', content: 'No data' },
        data: { score: 'N/A', content: 'No data' },
        mind: { score: 'N/A', content: 'No data' },
    };

// Ensure every student has default reflections
    const ensureDefaultReflections = (students) => {
        return students.map(student => ({
            ...student,
            reflections: student.reflections || { ...defaultReflections },
        }));
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
                { label: 'Solution', color: 'green' },
                { label: 'Knowledge', color: 'green' },
                { label: 'Problem', color: 'yellow' },
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
                {
                    category: 'Knowledge',
                    color: 'green',
                    prompts: [
                        'What methods could help you systematically evaluate whether a case requires simple or complex intervention?',
                    ],
                },
                {
                    category: 'Problem',
                    color: 'yellow',
                    prompts: [
                        'How might you reflect on the diagnostic considerations that were missed?',
                        'What additional signs or symptoms could you have considered?',
                    ],
                },
                {
                    category: 'Data',
                    color: 'yellow',
                    prompts: [
                        'How effectively did you leverage available lab data in your presentation?',
                    ],
                },
                {
                    category: 'Mind',
                    color: 'red',
                    prompts: [
                        'What techniques could improve your engagement with reflective thinking?',
                    ],
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



    const [selectedStudent, setSelectedStudent] = useState(students[1]);

    // Function to select a student
    const selectStudent = (studentId) => {
        const student = students.find((s) => s.id === studentId);

        // If student has no reflections, populate with dummy data
        if (!student.reflections || Object.keys(student.reflections).length === 0) {
            student.reflections = {
                strategy: { score: 'N/A', content: 'No data' },
                solution: { score: 'N/A', content: 'No data' },
                knowledge: { score: 'N/A', content: 'No data' },
                problem: { score: 'N/A', content: 'No data' },
                data: { score: 'N/A', content: 'No data' },
                mind: { score: 'N/A', content: 'No data' },
            };
        }

        setSelectedStudent(student);
    };

    const updateTranscription = (studentId, transcription) => {
        setStudents((prevStudents) =>
            prevStudents.map((student) =>
                student.id === studentId ? { ...student, transcription } : student
            )
        );
    };

    // Function to update AI reflections for the student
    const updateAIResponse = (studentId, reflectionResults) => {
        setStudents((prevStudents) =>
            prevStudents.map((student) =>
                student.id === studentId
                    ? {
                        ...student,
                        reflections: {
                            strategy: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 1")?.response.response.content || "No strategy content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 1")?.score || "No strategy score",
                            },
                            solution: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 2")?.response.response.content || "No solution content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 2")?.score || "No solution score",
                            },
                            knowledge: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 3")?.response.response.content || "No knowledge content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 3")?.score || "No knowledge score",
                            },
                            problem: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 4")?.response.response.content || "No problem content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 4")?.score || "No problem score",
                            },
                            data: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 5")?.response.response.content || "No data content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 5")?.score || "No data score",
                            },
                            mind: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 6")?.response.response.content || "No mind content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 6")?.score || "No mind score",
                            },
                        },
                    }
                    : student
            )
        );
    };

    // Sync selectedStudent with updated reflection data
    useEffect(() => {
        if (selectedStudent) {
            const updatedStudent = students.find((s) => s.id === selectedStudent.id);
            setSelectedStudent(updatedStudent);
        }
    }, [students]);

    return (
        <StudentsContext.Provider
            value={{
                students,
                selectedStudent,
                selectStudent,
                updateTranscription,
                updateAIResponse,
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};
