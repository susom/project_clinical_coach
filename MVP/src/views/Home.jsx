import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import SummaryExpandable from '../components/SummaryExpandable';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(2);
  const { students, setSelectedStudent, setSelectedSession } = useStudents();

  // Flatten and transform sessions for display
  const allSessions = students.flatMap(student => {
    const sessions = student.sessions?.filter(s => s.status === "complete" || !s.status) || [];
    return sessions.map(sesh => {
        let parsedSummary = null;
        if (sesh.summary && sesh.summary.trim() !== "") {
            try {
            parsedSummary = JSON.parse(sesh.summary);
            } catch (error) {
            console.error("Invalid JSON in session summary:", sesh.summary, error);
            }
        }
      return {
        session_id: sesh.session_id,
        sessionDate: sesh.session_date || "",
        summary: parsedSummary?.one_sentence_summary,
        reflections: sesh.reflections,
        student, // Attach the full student object
      };
    });
  }).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

  // Show message if no sessions are available
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

  // Group sessions by date
  const groupedSessions = allSessions.reduce((acc, session) => {
    const dateKey = session.sessionDate.split(" ")[0] || "Unknown Date";
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {});

  // Sort groups in reverse chronological order
  const dateGroups = Object.keys(groupedSessions)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(date => ({
      date,
      sessions: groupedSessions[date],
    }));

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
                      {session.student.profilePicture ? (
                        <img src={session.student.profilePicture} alt={session.student.name} />
                      ) : (
                        <i className="fas fa-user-circle"></i>
                      )}
                    </div>
                    <div className="report-right-content">
                      <div
                        className="report-status clickable"
                        onClick={() => {
                          setSelectedStudent(session.student);
                          setSelectedSession(session.session_id);
                          navigate(`/report`);
                        }}
                      >
                        <div className="report-status-text">COMPLETE {session.student.id} {session.session_id}</div>
                      </div>
                      <ThinkingHabitsOverview reflections={session.reflections} />
                    </div>
                  </div>
                  <div className="report-details">
                    <div className="report-student-name">{session.student.name}</div>
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
