import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Notifications.css';
import { useStudents } from '../contexts/Students';

export default function Notifications() {
    const { students } = useStudents();

    // ✅ Log current students and their sessions when the component mounts
    useEffect(() => {
        console.log("🔍 Current Coach's Students and Sessions:");
        students.forEach(student => {
            console.log(`👤 ${student.name} (ID: ${student.id})`);
            if (student.sessions?.length) {
                student.sessions.forEach(session => {
                    console.log(`  📄 Session ID: ${session.session_id} | Status: ${session.status} | Date: ${session.session_date}`);
                });
            } else {
                console.log("  ❌ No sessions found.");
            }
        });
    }, [students]); // ✅ Runs when students data updates

    // ✅ Extract only "incomplete" sessions (waiting for feedback from REDCap)
    const pendingNotifications = students.flatMap((student) =>
        student.sessions?.filter(s => s.status === "incomplete").map(session => ({
            studentName: student.name,
            profilePicture: student.profilePicture || null,
            sessionDate: session.session_date,
            status: session.status,
            sessionId: session.session_id,
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
                                        ⏳ In Progress (Waiting for REDCap)
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
