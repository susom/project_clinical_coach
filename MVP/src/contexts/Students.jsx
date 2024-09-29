import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const StudentsContext = createContext();

// Custom hook to use the StudentsContext
export const useStudents = () => useContext(StudentsContext);

// Provider component to wrap the app
export const StudentsProvider = ({ children }) => {
    const [students, setStudents] = useState([
        { id: 1, name: "John Wick" },
        { id: 2, name: "Selina Kyle" },
        { id: 3, name: "Brock Purdy" }
    ]);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [aiResponse, setAiResponse] = useState('');

    // Function to select a student
    const selectStudent = (studentId) => {
        const student = students.find((s) => s.id === studentId);
        setSelectedStudent(student);
    };

    const updateTranscription = (studentId, transcription) => {
        console.log("updateTranscription", studentId, transcription);
        setStudents((prevStudents) =>
            prevStudents.map((student) =>
                student.id === studentId ? { ...student, transcription } : student
            )
        );
    };

    const updateAIResponse = (response) => {
        setAiResponse(response);
    };

    // Sync selectedStudent with updated transcription
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
            aiResponse,
            updateAIResponse
        }}>
            {children}
        </StudentsContext.Provider>
    );
};
