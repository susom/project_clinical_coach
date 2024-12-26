import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import './Home.css';

export default function Home() {
    const { students } = useStudents(); // Pull student data from the context
    const [stage, setStage] = useState(2); // Default to stage 2 for the Home page

    // Group students by "date" for display
    const groupedStudents = students.reduce((groups, student) => {
        const dateKey = student.time.split(',')[0] || "Unknown Date"; // Extract date part
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(student);
        return groups;
    }, {});

    // Convert grouped students into a usable array
    const reportsData = Object.keys(groupedStudents).map((date) => ({
        date,
        reports: groupedStudents[date].map((student) => ({
            studentName: student.name,
            time: student.time,
            description: student.description,
            profilePicture: student.profilePicture,
            status: student.notifications?.[0]?.status || "no_status",
            statusColor:
                student.notifications?.[0]?.status === "conversation_processing"
                    ? "Yellow"
                    : student.notifications?.[0]?.status === "coaching_insights_available"
                        ? "#6C7CD7"
                        : "#28a745",
            isNew: student.notifications?.[0]?.isNew || false,
            habits: student.habitsData || [],
        })),
    }));

    return (
        <>
            <Header />
            <main id="home">
                <h1 className="center-title">Clinical Coach</h1>
                {reportsData.map((group, groupIndex) => (
                    <section key={groupIndex} className="report-group">
                        <div className="group-header">
                            <span className="group-title">
                                {groupIndex === 0 ? "Coaching Reports" : ""}
                            </span>
                            <span className="group-date">{group.date}</span>
                        </div>
                        <div className="report-list">
                            {group.reports.map((report, index) => (
                                <div className="report-card" key={`${groupIndex}-${index}`}>
                                    <div className="report-card-header">
                                        <div className="profile-picture">
                                            {report.profilePicture ? (
                                                <img src={report.profilePicture} alt={report.studentName} />
                                            ) : (
                                                <i className="fas fa-user-circle"></i>
                                            )}
                                        </div>
                                        <div className="report-right-content">
                                            <div
                                                className={`report-status ${report.status === 'processing' ? 'processing' : ''} ${
                                                    report.isNew ? 'new' : ''
                                                }`}
                                            >
                                                <div className="report-status-text">
                                                {report.status === 'processing' && <i className="fas fa-sync-alt spin-icon"></i>}
                                                {report.status.replace(/_/g, " ").toUpperCase()}
                                                </div>
                                            </div>
                                            <ThinkingHabitsOverview habits={report.habits} />
                                        </div>
                                    </div>
                                    <div className="report-details">
                                        <div className="report-student-name">{report.studentName}</div>
                                        <div className="report-meta">
                                            <p className="report-time">{report.time}</p>
                                            <p className="report-description">{report.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>
            <Footer stage={stage} setStage={setStage} />
        </>
    );
}
