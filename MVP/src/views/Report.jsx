import React, { useState } from 'react';
import { useStudents } from '../contexts/Students';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Report.css';

export default function Report() {
    const { selectedStudent } = useStudents();
    const [expandedAnalysis, setExpandedAnalysis] = useState(false);

    if (!selectedStudent) return <div>Please select a student to view their report.</div>;

    const toggleAnalysis = () => {
        setExpandedAnalysis(!expandedAnalysis);
    };

    return (
        <>
            <Header showBack={true} />
            <main id="report">
                {/* Profile Header */}
                <section className="report-header">
                    <div className="profile-picture">
                        {selectedStudent.profilePicture ? (
                            <img src={selectedStudent.profilePicture} alt={selectedStudent.name}/>
                        ) : (
                            <i className="fas fa-user-circle"></i>
                        )}
                    </div>
                    <div className="profile-details">
                        <h2 className="student-name">{selectedStudent.name}</h2>
                        <p className="conversation-time">Conversation @ {selectedStudent.time || 'Unknown Time'}</p>
                        <p className="report-description">{selectedStudent.description || 'No description available.'}</p>
                    </div>
                </section>

                {/* Thinking Habits Overview */}
                <section className="thinking-habits-container">
                    <h3>Thinking Habits Report</h3>
                    <p className="at-a-glance">At A Glance:</p>
                    <ThinkingHabitsOverview habits={selectedStudent.habitsData} />
                    <div className="report-summary">
                        <p className="summary-text">{selectedStudent.thm_summary || 'No summary available.'}</p>
                        <div className="summary-buttons">
                            <button className="expandable-button" onClick={toggleAnalysis}>
                                {expandedAnalysis ? '- HIDE SUMMARY' : '+ IN-DEPTH CASE PRESENTATION SUMMARY'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Strengths */}
                {selectedStudent.strengths && (
                    <section className="report-strengths">
                        <h3>{selectedStudent.name}’s Strengths</h3>
                        <div className="strength-tags">
                            {selectedStudent.strengths.map((strength, index) => (
                                <div key={index} className="strength-item">
                                    <span className="strength-category">{strength.category}</span>
                                    <span className="strength-description">{strength.description}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Coaching Prompts */}
                {selectedStudent.promptsData && (
                    <section className="report-analysis">
                        <h3 className="analysis-title">Coaching Prompts & Thinking Habits Analysis</h3>
                        {selectedStudent.promptsData.map((habit, habitIndex) => (
                            <div key={habitIndex} className="habit">
                                <div className="carousel">
                                    {habit.prompts.map((prompt, promptIndex) => (
                                        <div key={promptIndex} className="carousel-item">
                                            <p className="prompt-text">{prompt}</p>
                                            <div className="feedback-buttons">
                                                <button className="thumb-up"><i className="fas fa-thumbs-up"></i></button>
                                                <button className="thumb-down"><i className="fas fa-thumbs-down"></i></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="action-buttons">
                                    <div className="action-left">
                                        <span>Reflection On {habit.category}</span>
                                    </div>
                                    <div className="action-right">
                                        <button
                                            className="detailed-analysis-btn"
                                            style={{
                                                backgroundColor:
                                                    habit.color === 'green'
                                                        ? '#5cb85c'
                                                        : habit.color === 'yellow'
                                                            ? '#f0ad4e'
                                                            : '#d9534f',
                                                borderBottomColor:
                                                    habit.color === 'green'
                                                        ? '#4cae4c'
                                                        : habit.color === 'yellow'
                                                            ? '#d98c2a'
                                                            : '#b52b27',
                                            }}
                                        >
                                            + DETAILED ANALYSIS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </main>
            <Footer />
        </>
    );
}
