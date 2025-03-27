import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ For navigation
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Notifications.css';
import { useStudents } from '../contexts/Students';
import { useCoach } from '../contexts/Coach';
import SummaryExpandable from '../components/SummaryExpandable';

export default function Notifications() {
    const navigate = useNavigate();
    const { coach } = useCoach();
    const { students, callAIAnalysis, setSelectedStudent, setSelectedSession } = useStudents();
    const [processedSessions, setProcessedSessions] = useState(new Set());
    const [completedSessions, setCompletedSessions] = useState(new Set());

    // ✅ Extract only "incomplete" sessions
    const pendingNotifications = students.flatMap((student) => {
        console.log("sesssions, get example here and tell it ot make it same in callAI", student.sessions);
        
        return student.sessions
            ?.filter(session => session.status) // ✅ Only include sessions with a status 
            .map(session => ({
                student: student, 
                studentName: student.name,
                profilePicture: student.profilePicture || null,
                sessionDate: session.session_date || "Unknown Date",
                transcript: session.transcript || "No transcript available.",
                session_id: session.session_id || "No ID",
                status: session.status, // ✅ Keep status for debugging visibility
                studentId: student.id, // 🔥 Needed for callAIAnalysis
                fullSession: session // 🔥 Store full session for navigation
            })) || [];
    });

    useEffect(() => {
        pendingNotifications.forEach(async (notification) => {
            if (!processedSessions.has(notification.session_id) && notification.status == "pending") {
                console.log("Auto-triggering AI analysis for pending notifications...");
                console.log(`⚡ Sending Session to AI Analysis...`);

                try {
                    await callAIAnalysis(notification.session_id, coach.record_id, (sessionId) => {
                        setCompletedSessions(prev => new Set([...prev, sessionId])); // ✅ Flip UI to complete
                    });

                    setProcessedSessions(prev => new Set([...prev, notification.session_id]));
                } catch (error) {
                    console.error(`AI Analysis Failed:`, error);
                }
            }
        });
    }, [pendingNotifications, processedSessions]);


    const handleSessionClick = (student, session_id) => {
        if (session_id) {
            setSelectedStudent(student);
            setSelectedSession(session_id);

            navigate(`/report`);
        } else {
            console.warn("⚠️ No session found for ID:", session_id);
        }
    };

    return (
        <>
            <Header showBack={false}  />
            <main id="notifications">
                <h1 className="center-title">Notifications</h1>
                <div className="notifications-list">
                    {pendingNotifications.length === 0 ? (
                        <p className="empty-notifications">No new notifications</p>
                    ) : (
                        pendingNotifications.map((notification) => (
                            <div
                                key={notification.session_id}
                                className={`notification ${completedSessions.has(notification.session_id) ? 'clickable' : ''}`}
                                onClick={() => completedSessions.has(notification.session_id) && handleSessionClick(notification.student , notification.session_id)}
                            >
                                <div className="notification-top">
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
                                    </div>
                                </div>
                                <div className="notification-status">
                                    {!notification.transcript ? (
                                        <p>Conversation is being processed...</p>
                                    ) : (
                                        <SummaryExpandable text={notification.transcript} />
                                    )}

                                    {(notification.status == "complete") ? (
                                        <button 
                                            className="view-report-button"
                                            onClick={() => handleSessionClick(notification.student, notification.session_id)}
                                        >
                                            View Report <i className="fas fa-check-circle"></i>
                                        </button>
                                    ) : (
                                        <button className="processing-button">
                                            <i className="fas fa-sync-alt fa-spin"></i> Processing...
                                        </button>
                                    )}
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
