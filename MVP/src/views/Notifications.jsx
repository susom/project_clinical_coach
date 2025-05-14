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
    const { students, callAIAnalysis, setSelectedStudent, setSelectedSession, refetchStudents, notifications, updateNotificationStatus } = useStudents();
    const [processedSessions, setProcessedSessions] = useState(new Set());
    const [completedSessions, setCompletedSessions] = useState(new Set());

    useEffect(() => {
        notifications.forEach(async (notification) => {
          const isRealSessionId = !notification.session_id.startsWith("temp-");
          const isPending = notification.status === "pending";
      
          if (isPending && isRealSessionId) {
            try {
              console.log("🚀 Initiating AI Analysis for Session", notification.session_id);
              await callAIAnalysis(notification.session_id, coach.record_id);
              await refetchStudents();
              updateNotificationStatus(notification.session_id, "complete");
            } catch (error) {
              console.error(`AI Analysis Failed for ${notification.session_id}:`, error);
            }
          }
        });
      }, [notifications]);


      const handleSessionClick = (staleStudent, session_id) => {
        if (session_id) {
            const freshStudent = students.find(s => s.id === staleStudent.id);
            if (!freshStudent) {
                console.warn("⚠️ Could not find updated student. Redirecting.");
                return;
            }
    
            console.log("✅ Using fresh student:", freshStudent);
            setSelectedStudent(freshStudent);
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
                    {notifications.length === 0 ? (
                        <p className="empty-notifications">No new notifications</p>
                    ) : (
                        notifications.map((notification) => (
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
                                        <pre className="srt-transcript">
                                            <SummaryExpandable text={notification.transcript} />
                                        </pre>
                                    )}

                                    {notification.status == "complete" ? (
                                        <button 
                                            className="view-report-button"
                                            onClick={() => handleSessionClick(notification.student, notification.session_id)}
                                        >
                                            View Coaching Report <i className="fas fa-check-circle"></i>
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
