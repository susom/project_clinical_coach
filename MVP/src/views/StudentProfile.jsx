import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import SummaryExpandable from '../components/SummaryExpandable';
import './StudentProfile.css';
import ReflectionScoreChart from '../components/ReflectionScoreChart';

export default function StudentProfile() {
    const navigate = useNavigate();
    const [stage, setStage] = useState(2);
    const { selectedStudent, setSelectedSession, aggregateReflections } = useStudents();

    if (!selectedStudent) {
        return (
            <>
                <Header />
                <main id="student-profile">
                    <h1 className="center-title">Student Profile</h1>
                    <div className="no-data-message">
                        <em>No student selected.</em>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const sessions = selectedStudent.sessions?.filter(s => s.status === "complete" || !s.status) || [];

    const getParsedSummary = (summary) => {
        if (!summary) return "Summary unavailable";
    
        if (typeof summary === "object") {
            return summary.one_sentence_summary || "No summary available";
        }
    
        try {
            const parsed = JSON.parse(summary);
            return parsed?.one_sentence_summary || "No summary available";
        } catch (error) {
            console.error("🚨 Error parsing session summary:", summary, error);
            return "Summary unavailable";
        }
    };
    
    

    // Group sessions by date
    const groupedSessions = sessions.reduce((acc, session) => {
        const dateKey = session.session_date.split(" ")[0] || "Unknown Date";
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(session);
        return acc;
    }, {});

    // Function to format date with special cases
    const formatDate = (dateString) => {
        const date = parseISO(dateString);

        if (isToday(date)) {
            return `Today, ${format(date, 'MMMM d, yyyy')}`;
        } else if (isYesterday(date)) {
            return `Yesterday, ${format(date, 'MMMM d, yyyy')}`;
        }

        return format(date, 'MMMM d, yyyy');
    };
    
    // Sort groups in reverse chronological order
    const dateGroups = Object.keys(groupedSessions)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({
            date: formatDate(date), 
            sessions: groupedSessions[date],
        }));

    return (
        <>
            <Header showBack={true} />
            <main id="student-profile">
                <header className="student-profile-header">
                    <div className="profile-container">
                        <div className="profile-picture">
                            {selectedStudent.profilePicture ? (
                                <img src={selectedStudent.profilePicture} alt={selectedStudent.name} />
                            ) : (
                                <i className="fas fa-user-circle default-avatar"></i>
                            )}
                        </div>
                        <h1 className="student-name">{selectedStudent.name}</h1>
                    </div>
                    <h3>Overall Thinking Habits Performance</h3>
                    <ThinkingHabitsOverview reflections={aggregateReflections(selectedStudent)} />
                    <ReflectionScoreChart sessions={selectedStudent.sessions} />
                </header>
                {dateGroups.map((group, groupIndex) => (
                    <section key={groupIndex} className="report-group">
                        <div className="group-header">
                            <span className="group-title">{groupIndex === 0 ? "Coaching Reports" : ""}</span>
                            <span className="group-date">{group.date}</span>
                        </div>
                        <div className="report-list">
                            {group.sessions.map((session, idx) => (
                                <div 
                                    className={`session-card ${session.status ? 'pending' : ''}`} 
                                    key={idx}
                                >
                                    <div className="session-header">
                                        <p className="session-time">{session.session_date}</p>
                                    </div>

                                    <div className="session-details">
                                        <p className="session-summary">
                                            {session.status ? (
                                                <>
                                                    <i className="fas fa-sync-alt spin-icon"></i> CONVERSATION PROCESSING...
                                                </>
                                            ) : (
                                                getParsedSummary(session.summary)
                                            )}
                                        </p>
                                        <ThinkingHabitsOverview reflections={session.status ? undefined : session.reflections} />
                                    </div>
                                    
                                    {!session.status && (
                                        <button
                                            className="review-insights-button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent triggering parent div click
                                                setSelectedSession(session.session_id);
                                                navigate(`/report`);
                                            }}
                                        >
                                            Review Insights
                                        </button>
                                    )}
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
