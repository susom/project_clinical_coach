import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import './Home.css';

export default function Home() {
    const { students } = useStudents();
    const [stage, setStage] = useState(2);

    // 1) Flatten all sessions from all students
    const allSessions = students.flatMap((student) => {
        const sessions = student.sessions?.filter(s => s.status === "complete" || !s.status) || [];
        return sessions.map((sesh) => {
            const colorMap = { '1': 'red', '2': 'yellow', '3': 'green' };
            const habits = [
                { label: 'Mind', color: colorMap[sesh.reflections?.mind?.score] || 'gray' },
                { label: 'Knowledge', color: colorMap[sesh.reflections?.knowledge?.score] || 'gray' },
                { label: 'Problem', color: colorMap[sesh.reflections?.problem?.score] || 'gray' },
                { label: 'Strategy', color: colorMap[sesh.reflections?.strategy?.score] || 'gray' },
                { label: 'Solution', color: colorMap[sesh.reflections?.solution?.score] || 'gray' },
                { label: 'Data', color: colorMap[sesh.reflections?.data?.score] || 'gray' },
            ];

            return {
                learner_id: student.id,
                studentName: student.name || "Unknown",
                profilePicture: student.profilePicture || null,
                sessionDate: sesh.session_date || "",
                transcript: sesh.transcript || "",
                summary: sesh.summary || "",
                habits,
            };
        });
    });

    // If no sessions, show a single "no data" message
    if (allSessions.length === 0) {
        return (
            <>
                <Header />
                <main id="home">
                    <h1 className="center-title">Clinical Coach</h1>
                    <section className="report-group">
                        <div className="group-header">
                            <span className="group-title">Coaching Reports</span>
                        </div>
                        <div className="no-data-message" style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <em>No Learner Session Data Available</em>
                        </div>
                    </section>
                </main>
                <Footer stage={stage} setStage={setStage} />
            </>
        );
    }

    // 2) Group sessions by date
    const groupedSessions = allSessions.reduce((acc, session) => {
        // for instance, if sessionDate = "2025-02-01 10:35",
        // you might split on space or T to isolate date portion
        const dateKey = session.sessionDate.split(" ")[0] || "Unknown Date";

        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(session);
        return acc;
    }, {});

    // Convert to array
    const dateGroups = Object.keys(groupedSessions).map((date) => ({
        date,
        sessions: groupedSessions[date],
    }));

    // 3) Render grouped sessions, one <section> per date
    return (
        <>
            <Header />
            <main id="home">
                <h1 className="center-title">Clinical Coach</h1>

                {dateGroups.map((group, groupIndex) => (
                <section key={groupIndex} className="report-group">
                        <div className="group-header">
                            <span className="group-title">{groupIndex === 0 ? "Coaching Reports" : ""}</span>
                            <span className="group-date">{group.date}</span>
                        </div>
                        <div className="report-list">
                            {group.sessions.map((session, idx) => (
                                <div className="report-card" key={idx}>
                                    <div className="report-card-header">
                                        <div className="profile-picture">
                                            {session.profilePicture ? (
                                                <img src={session.profilePicture} alt={session.studentName} />
                                            ) : (
                                                <i className="fas fa-user-circle"></i>
                                            )}
                                        </div>
                                        <div className="report-right-content">
                                            <div className="report-status">
                                                <div className="report-status-text">COMPLETE</div>
                                            </div>
                                            <ThinkingHabitsOverview habits={session.habits} />
                                        </div>
                                    </div>
                                    <div className="report-details">
                                        <div className="report-student-name">{session.studentName}</div>
                                        <div className="report-meta">
                                            <p className="report-time">{session.sessionDate}</p>
                                            <SummaryExpandable text={session.summary} />
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

function SummaryExpandable({ text }) {
    const [expanded, setExpanded] = useState(false);
    const TRUNCATE_THRESHOLD = 120;
    const isTruncated = !expanded && text.length > TRUNCATE_THRESHOLD;
    const displayText = isTruncated ? text.substring(0, TRUNCATE_THRESHOLD) + "..." : text;

    return (
        <div className="report-description" style={{ marginTop: '0.5rem' }}>
            <div>{displayText}</div>
            {text.length > TRUNCATE_THRESHOLD && (
                <a onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', color: '#646cff', fontWeight: 'bold' }}>
                    {expanded ? ' Show Less -' : ' Show More +' }
                </a>
            )}
        </div>
    );
}

