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

        const payload = { session_id, coach_id };

        return new Promise((resolve) => {
            window.clinical_coach_jsmo_module.callAI(
                JSON.stringify(payload),
                (response) => {
                    console.log(`✅ AI Response for Session ${session_id}:`, response);

                    updateUI(session_id); // ✅ Update UI (e.g., mark session complete)
                    //
                    // if (!response?.summary || !response?.final || !Array.isArray(response?.reflections)) {
                    //     console.warn(`⚠️ AI Response missing key data. Session ${session_id} marked as complete, but no full update.`);
                    //     resolve("Partial AI response");
                    //     return;
                    // }
                    //
                    try {
                    //     const { summary, reflections, final } = response;
                    //     const thm_summary = summary.long_summary || "No summary available.";
                    //
                    //     const strengths = final.positiveFeedback?.map(feedback => {
                    //         const [category, description] = feedback.split(': ');
                    //         return { category, description };
                    //     }) || [];
                    //
                    //     const habitsData = final.thinkingHabitsScore
                    //         ? final.thinkingHabitsScore.split('|').map(habitScore => {
                    //             const [label, colorEmoji] = habitScore.trim().split(' ');
                    //             const colorMap = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
                    //             return { label, color: colorMap[colorEmoji?.trim()] || 'gray' };
                    //         })
                    //         : [];
                    //
                    //     const promptsData = reflections.map(reflection => ({
                    //         category: reflection.report_title || reflection.reflection_context.replace("Reflection on ", ""),
                    //         color: habitsData.find(habit => habit.label === reflection.reflection_context)?.color || 'gray',
                    //         prompts: [
                    //             ...(reflection.coaching_insights?.positive_feedback || []),
                    //             ...(reflection.coaching_insights?.coaching_questions || []),
                    //         ],
                    //         hasError: !reflection.coaching_insights,
                    //         reflectionVar: `sess_reflection_${reflection.reflection_context.toLowerCase().replace(/\s+/g, '_')}`
                    //     }));
                    //
                    //     updateStudent(session_id, (prevStudent) => ({
                    //         sessions: prevStudent.sessions.map(s =>
                    //             s.session_id === session_id
                    //                 ? { ...s, status: "complete", summary: thm_summary, reflections, strengths, habitsData, promptsData }
                    //                 : s
                    //         ),
                    //     }));

                        resolve("✅ AI Analysis Completed");
                    } catch (error) {
                        console.error(`❌ Failed to process AI response for Session ${session_id}:`, error);
                        resolve("✅ UI updated, but AI data processing failed");
                    }
                },
                (error) => {
                    console.error(`❌ AI Analysis Error for Session ${session_id}:`, error);
                    updateUI(session_id); // ✅ Ensure UI still updates
                    resolve("❌ AI Error - Session marked complete in UI");
                }
            );
        });
    };


    return (
        <StudentsContext.Provider
            value={{
                students,
                selectedStudent,
                selectStudent,
                updateStudent,
                createNewSession,
                callAIAnalysis,
                selectedSession,
                setSelectedSession,
                notifications,
            }}
        >
            {children}
        </StudentsContext.Provider>
    );
};
