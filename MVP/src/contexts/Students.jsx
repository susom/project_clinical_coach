import React, { createContext, useState, useContext, useEffect } from 'react';
import { useCoach } from './Coach';

// Create the context
const StudentsContext = createContext();

// Custom hook to use the StudentsContext
export const useStudents = () => useContext(StudentsContext);

// Provider component to wrap the app
export const StudentsProvider = ({ children }) => {
    const { coach } = useCoach();
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [lastFetchedCoachId, setLastFetchedCoachId] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // If there's a valid coach AND we haven't fetched for this coach yet
        if (coach?.record_id && coach.record_id !== lastFetchedCoachId) {
            (async () => {
                try {
                    const studentList = await window.ExternalModules.Stanford.ClinicalCoach.fetchStudentsData(coach.record_id);
                    // console.log("Fetched Students from backend:", studentList);

                    if (Array.isArray(studentList) && studentList.length > 0) {
                        setStudents(studentList);
                    } else {
                        console.warn("No students found for coach:", coach.record_id);
                    }
                    // Update lastFetchedCoachId so we don't fetch again for the same coach
                    setLastFetchedCoachId(coach.record_id);
                } catch (err) {
                    console.error("Failed to fetch students:", err);
                }
            })();
        }
    }, [coach?.record_id, lastFetchedCoachId]);

    useEffect(() => {
        if (selectedStudent) {
            const updatedStudent = students.find((s) => s.id === selectedStudent.id);
            setSelectedStudent({ ...updatedStudent }); // Update selectedStudent from the updated array
        }
    }, [students]);

    const selectStudent = (studentId) => {
        const student = students.find((s) => s.id === studentId);
        setSelectedStudent({ ...student }); // Create a new object to avoid mutating state
    };

    const updateStudent = (studentId, updateFn) => {
        setStudents((prevStudents) => {
            return prevStudents.map((student) => {
                if (String(student.id) === String(studentId)) {
                    console.log("🔍Found student Updating Student:", student);

                    const updatedSessions = student.sessions.map(session => {
                        const updatedSession = updateFn(session);
                        return updatedSession;
                    });

                    return {
                        ...student,
                        sessions: updatedSessions
                    };
                }
                return student;
            });
        });
    };


    const createNewSession = (studentId) => {
        const tempSessionId = `temp-${Date.now()}`; // Generate a unique temporary ID
        setStudents((prevStudents) =>
            prevStudents.map((student) =>
                student.id === studentId
                    ? {
                        ...student,
                        sessions: [
                            ...(student.sessions || []),
                            {
                                session_id: tempSessionId, // Use the temporary ID
                                session_date: new Date().toISOString().split('T')[0] + " 12:30 PM",
                                transcript: "",
                                reflections: {},
                                summary: "",
                                status: "incomplete",
                            },
                        ],
                    }
                    : student
            )
        );
        return tempSessionId; // Return the temporary ID for later use
    };

    return (
        <StudentsContext.Provider
            value={{
                students,
                selectedStudent,
                selectStudent,
                updateStudent,
                createNewSession,
                notifications,
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};
