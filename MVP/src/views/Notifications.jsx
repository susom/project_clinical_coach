import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Notifications.css';

import { useStudents } from '../contexts/Students';

export default function Notifications() {
    const { students } = useStudents();

    //TODO THIS IS STUBBED IN THE Students Context
    const notifications = students.flatMap((student) =>
        student.notifications.map((notification) => ({
            ...notification,
            studentName: student.name, // Attach the student's name
        }))
    );

    return (
        <>
            <Header showBack={false} showFilter={true} />
            <main id="notifications">
                <div className="notifications-list">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`notification ${notification.isNew ? 'new' : ''}`}
                        >
                            <i className="fas fa-user-circle profile-icon"></i>
                            <div className="notification-details">
                                <div className="notification-name">{notification.studentName}</div>
                                <div className="notification-time">{notification.time}</div>
                                {
                                    notification.status === 'processing' ? (
                                        <>
                                            <div className="button-with-icon">
                                                <button className="processing-button" disabled>
                                                    Processing...
                                                </button>
                                                <i className="fas fa-sync-alt spin-icon"></i>
                                            </div>
                                            <div className="processing-description">
                                                Processing cannot be clicked
                                            </div>
                                        </>
                                    ) : (
                                        <div className="button-with-icon">
                                            <button className="view-report-button">
                                                View Report
                                            </button>
                                            <i className="fas fa-check-circle"></i>
                                        </div>
                                    )
                                }
                            </div>
                            <div className="notification-time-ago">{notification.timeAgo}</div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
        </>
    );
}
