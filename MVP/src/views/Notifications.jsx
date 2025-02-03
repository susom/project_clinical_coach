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
    const { students, callAIAnalysis, setSelectedSession } = useStudents();

    const [processedSessions, setProcessedSessions] = useState(new Set());
    const [completedSessions, setCompletedSessions] = useState(new Set());

    // ✅ Extract only "incomplete" sessions
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
                studentId: student.id, // 🔥 Needed for callAIAnalysis
                fullSession: session // 🔥 Store full session for navigation
            })) || []
    );

    useEffect(() => {
        console.log("🚀 Auto-triggering AI analysis for pending notifications...");

        pendingNotifications.forEach(async (notification) => {
            if (!processedSessions.has(notification.session_id)) {
                console.log(`⚡ Sending Session ${notification.session_id} to AI Analysis...`);

                try {
                    await callAIAnalysis(notification.session_id, coach.record_id, (sessionId) => {
                        setCompletedSessions(prev => new Set([...prev, sessionId])); // ✅ Flip UI to complete
                    });

                    setProcessedSessions(prev => new Set([...prev, notification.session_id]));
                } catch (error) {
                    console.error(`❌ AI Analysis Failed:`, error);
                }
            }
        });
    }, [pendingNotifications, processedSessions]);


    const handleSessionClick = (session_id) => {
        const fullSession = students
            .flatMap(student => student.sessions || [])
            .find(session => session.session_id === session_id);

        if (fullSession) {
            setSelectedSession(fullSession);
            navigate(`/report`);
        } else {
            console.warn("⚠️ No session found for ID:", session_id);
        }
    };


    return (
        <>
            <Header showBack={false} showFilter={true} />
            <main id="notifications">
                <div className="notifications-list">
                    {pendingNotifications.length === 0 ? (
                        <p className="empty-notifications">No new notifications</p>
                    ) : (
                        pendingNotifications.map((notification) => (
                            <div
                                key={notification.session_id}
                                className={`notification ${completedSessions.has(notification.session_id) ? 'clickable' : ''}`}
                                onClick={() => completedSessions.has(notification.session_id) && handleSessionClick(notification.fullSession)}
                            >
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
                                        {completedSessions.has(notification.session_id) ? (
                                            <span className="status-badge complete">
                                            Complete
                                        </span>
                                        ) : (
                                            <span className="status-badge pending">
                                            <i className="fas fa-sync-alt fa-spin"></i> Pending
                                        </span>
                                        )}
                                        <SummaryExpandable text={notification.transcript}/>
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
