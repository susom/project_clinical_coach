import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const StudentsContext = createContext();

// Custom hook to use the StudentsContext
export const useStudents = () => useContext(StudentsContext);

// Provider component to wrap the app
export const StudentsProvider = ({ children }) => {
    const [students, setStudents] = useState([
        { id: 1, name: "John Wick", reflections: {} },
        { id: 2, name: "Selina Kyle", reflections: {} },
        { id: 3, name: "Brock Purdy", reflections: {} }
    ]);

    const [selectedStudent, setSelectedStudent] = useState(null);

    // Function to select a student
    const selectStudent = (studentId) => {
        const student = students.find((s) => s.id === studentId);
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
        console.log("updateAIResponse - studentId:", studentId);
        console.log("updateAIResponse - reflectionResults:", reflectionResults);

        setStudents((prevStudents) => {
            const updatedStudents = prevStudents.map((student) =>
                student.id === studentId
                    ? {
                        ...student,
                        reflections: {
                            strategy: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 1")?.response.response.content || "No strategy content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 1")?.score || "No strategy score"
                            },
                            solution: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 2")?.response.response.content || "No solution content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 2")?.score || "No solution score"
                            },
                            knowledge: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 3")?.response.response.content || "No knowledge content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 3")?.score || "No knowledge score"
                            },
                            problem: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 4")?.response.response.content || "No problem content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 4")?.score || "No problem score"
                            },
                            data: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 5")?.response.response.content || "No data content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 5")?.score || "No data score"
                            },
                            mind: {
                                content: reflectionResults.find((r) => r.reflection_context === "Reflection 6")?.response.response.content || "No mind content",
                                score: reflectionResults.find((r) => r.reflection_context === "Reflection 6")?.score || "No mind score"
                            }
                        }
                    }
                    : student
            );

            console.log("updateAIResponse - updatedStudents:", updatedStudents);

            return updatedStudents;
        });
    };


    // Sync selectedStudent with updated reflection data
    useEffect(() => {
        if (selectedStudent) {
            const updatedStudent = students.find((s) => s.id === selectedStudent.id);
            setSelectedStudent(updatedStudent); // Re-sync selectedStudent with the updated students array
        }
    }, [students]);

    return (
        <StudentsContext.Provider value={{
            students,
            selectedStudent,
            selectStudent,
            updateTranscription,
            updateAIResponse
        }}>
            {children}
        </StudentsContext.Provider>
    );
};
