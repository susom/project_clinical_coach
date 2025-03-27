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
    const [selectedSession, setSelectedSession] = useState();
    const [lastFetchedCoachId, setLastFetchedCoachId] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);


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

    const callAIAnalysis = async (session_id, coach_id, updateUI = () => {}) => {
        console.log(`🚀 Initiating AI Analysis for Session ${session_id}...`);
    
        setIsProcessing(true);
        const payload = { session_id, coach_id };
    
        return new Promise((resolve) => {
            window.clinical_coach_jsmo_module.callAI(
                JSON.stringify(payload),
                (response) => {
                    console.log(`✅ AI Response for Session ${session_id}:`, response);
    
                    try {
                        setIsProcessing(false);
                        setHasNewNotifications(true);
                        updateStudentFromAIResponse(session_id, response); // ✅ Use existing update function
    
                        updateUI(session_id); // ✅ Mark session complete in UI
    
                        resolve("✅ AI Analysis Completed");
                    } catch (error) {
                        console.error(`Failed to process AI response for Session ${session_id}:`, error);
                        resolve("✅ UI updated, but AI data processing failed");
                    }
                },
                (error) => {
                    console.error(`AI Analysis Error for Session ${session_id}:`, error);
                    setIsProcessing(false);
                    setHasNewNotifications(true);
                    updateUI(session_id); // ✅ Ensure UI still updates
                    resolve("AI Error - Session marked complete in UI");
                }
            );
        });
    };

    const updateStudentFromAIResponse = (session_id, aiResponse, singleReflectionKey = null) => {
        // const reflectionKeyFieldMap = ["mind", "knowledge", "problem", "strategy", "solution", "data"];
        // TODO: Remove this once we have the new reflection key field map
        const reflectionKeyFieldMap = {
            "mind": "Frame of Mind Reflection Report",
            "knowledge": "Knowledge Reflection Report",
            "problem": "Problem Definition & Assumptions Reflection Report",
            "strategy": "Reflection on Clinical Strategy Thinking Habits Report",
            "solution": "Reflection on Clinical Solution Thinking Habits Report",
            "data": "Reflection on Data Thinking Habits Report"
        };

        console.log("🔍 Updating session with AI data:", session_id, reflectionKeyFieldMap , aiResponse);
        
        setStudents((prevStudents) => {
            return prevStudents.map((student) => {
                if (student.sessions.some(session => session.session_id === session_id)) {
                    console.log("🔍 Updating session with AI data:", session_id, `Single Reflection: ${singleReflectionKey || "All"}`);

                    return {
                        ...student,
                        sessions: student.sessions.map(session => {
                            if (session.session_id !== session_id) return session;

                            const updatedReflections = { ...session.reflections };

                            Object.entries(aiResponse.reflections).forEach(([key, ref]) => {
                                if (!ref.content || !ref.content.report_title) return;

                                // 🔥 Find the mapped reflection key
                                const title = ref.content.report_title;
                                const mappedKey = Object.keys(reflectionKeyFieldMap).find(k => reflectionKeyFieldMap[k] === title) || `reflection_${key}`;

                                // 🔥 If singleReflectionKey is set, update only that one
                                if (singleReflectionKey) {
                                    // Remove 'sess_reflect_' prefix if present
                                    const cleanKey = singleReflectionKey.replace('sess_reflect_', '');
                                    if (mappedKey !== cleanKey) return;
                                }
                                
                                updatedReflections[mappedKey] = {
                                    content: ref.content,
                                    score: ref.content.thm_overall_score || 0
                                };
                            });

                            return {
                                ...session,
                                reflections: updatedReflections, // ✅ Keep all existing reflections, only updating the relevant one
                                status: "complete"
                            };
                        })
                    };
                }
                return student;
            });
        });
    };


    return (
        <StudentsContext.Provider
            value={{
                students,
                selectedStudent,
                setSelectedStudent,
                selectStudent,
                updateStudent,
                updateStudentFromAIResponse,
                createNewSession,
                callAIAnalysis,
                selectedSession,
                setSelectedSession,
                notifications,
                isProcessing,
                hasNewNotifications,
                setIsProcessing,
                setHasNewNotifications
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};
