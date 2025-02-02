import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Notifications.css';
import { useStudents } from '../contexts/Students';
import SummaryExpandable from '../components/SummaryExpandable';

export default function Notifications() {
    const { students, updateStudent } = useStudents();
    const [processedSessions, setProcessedSessions] = useState(new Set()); // Track processed sessions

    useEffect(() => {
        students.forEach(student => {
            console.log("students sessions", student.sessions.length, student.sessions);
        });
    }, [students]);

    useEffect(() => {
        console.log("🚀 Checking for incomplete sessions to send to AI...");


        // students.forEach(student => {
        //     student.sessions?.forEach(session => {
        //         if (session.status === "incomplete" && !processedSessions.has(session.session_id)) {
        //             console.log(`⚡ Sending Session ${session.session_id} to AI Analysis...`);
        //
        //             const payload = {
        //                 session_id: session.session_id, // ✅ Pass session ID
        //                 transcription: session.transcript, // ✅ Pass transcription
        //             };
        //
        //             window.clinical_coach_jsmo_module.callAI(
        //                 JSON.stringify(payload),
        //                 (response) => {
        //                     console.log(`✅ AI Response for Session ${session.session_id}:`, response);
        //
        //                     if (!response?.summary || !response?.final) {
        //                         console.error("❌ AI returned an invalid response:", response);
        //                         return;
        //                     }
        //
        //                     const { summary, reflections, final } = response;
        //
        //                     // Format final output
        //                     const thm_summary = summary.long_summary || "No summary available.";
        //                     const strengths = final.positiveFeedback.map(feedback => {
        //                         const [category, description] = feedback.split(': ');
        //                         return { category, description };
        //                     });
        //
        //                     const habitsData = final.thinkingHabitsScore.split('|').map(habitScore => {
        //                         const [label, colorEmoji] = habitScore.split(' ');
        //                         const colorMap = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
        //                         return { label: label.trim(), color: colorMap[colorEmoji.trim()] || 'gray' };
        //                     });
        //
        //                     const promptsData = reflections.map(reflection => ({
        //                         category: reflection.reflection_context.replace("Reflection on ", ""),
        //                         color: habitsData.find(habit => habit.label === reflection.reflection_context)?.color || 'gray',
        //                         prompts: [
        //                             ...reflection.coaching_insights.positive_feedback,
        //                             ...reflection.coaching_insights.coaching_questions,
        //                         ],
        //                     }));
        //
        //                     // ✅ Update session in student data
        //                     updateStudent(student.id, (prevStudent) => ({
        //                         sessions: prevStudent.sessions.map(s =>
        //                             s.session_id === session.session_id
        //                                 ? { ...s, status: "complete", summary: thm_summary, reflections, strengths, habitsData, promptsData }
        //                                 : s
        //                         ),
        //                     }));
        //
        //                     // ✅ Mark session as processed
        //                     setProcessedSessions(prev => new Set(prev).add(session.session_id));
        //                 },
        //                 (error) => {
        //                     console.error(`❌ AI Analysis Error for Session ${session.session_id}:`, error);
        //                 }
        //             );
        //         }
        //     });
        // });
    }, [students, processedSessions]); // ✅ Only runs when students change

    // ✅ Extract only "incomplete" sessions (waiting for feedback from REDCap)
    const pendingNotifications = students.flatMap((student) =>
        student.sessions
            ?.filter(session => session.status) // ✅ Only include sessions with a status
            .map(session => ({
                studentName: student.name,
                profilePicture: student.profilePicture || null,
                sessionDate: session.session_date || "Unknown Date",
                transcript: session.transcript || "No transcript available.",
                session_id: session.session_id || "No ID",
                status: session.status, // ✅ Keep status for debugging visibility
            })) || []
    );

    return (
        <>
            <Header showBack={false} showFilter={true} />
            <main id="notifications">
                <div className="notifications-list">
                    {pendingNotifications.length === 0 ? (
                        <p className="empty-notifications">No new notifications</p>
                    ) : (
                        pendingNotifications.map((notification) => (
                            <div key={notification.sessionId} className="notification">
                                <div className="profile-icon">
                                    {notification.profilePicture ? (
                                        <img src={notification.profilePicture} alt={notification.studentName} />
                                    ) : (
                                        <i className="fas fa-user-circle profile-icon"></i>
                                    )}
                                </div>
                                <div className="notification-details">
                                    <div className="notification-name">{notification.studentName}</div>
                                    <div className="notification-time">{notification.sessionDate}</div>
                                    <div className="notification-status">
                                        <b>{notification.status}</b>
                                        <SummaryExpandable text={notification.transcript} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
