import React, { useState, useEffect } from 'react';
import { useStudents } from '../contexts/Students';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Report.css';

export default function Report() {
    const {students,  selectStudent, selectedStudent, updateStudent } = useStudents();
    const [expandedAnalysis, setExpandedAnalysis] = useState(false);

    useEffect(() => {
        console.log("Selected Student Updated:", selectedStudent);
    }, [selectedStudent]);

    useEffect(() => {
        selectStudent(3); // Only on mount
    }, []);

    useEffect(() => {
        if (selectedStudent?.transcription) {
            handleAIAnalysis();
        }
    }, []);

    // HandleAIAnalysis updates the correct student and persists changes
    const handleAIAnalysis = () => {
        if (!selectedStudent?.transcription) {
            console.warn("No transcription available for analysis.");
            return;
        }

        const payload = {
            transcription: selectedStudent.transcription,
        };

        console.log("Payload being sent:", payload);

        window.clinical_coach_jsmo_module.callAI(
            JSON.stringify(payload),
            (response) => {
                console.log("AI Analysis Response:", response);

                if (!response?.summary || !response?.final) {
                    console.error("Invalid response format:", response);
                    return;
                }

                const { summary, reflections, final } = response;

                // Map `thm_summary` from summary
                const thm_summary = summary.long_summary || "No summary available.";

                // Map strengths from `final.positiveFeedback`
                const strengths = final.positiveFeedback.map((feedback) => {
                    const [category, description] = feedback.split(': ');
                    return { category, description };
                });

                // Compute habitsData
                const habitsData = final.thinkingHabitsScore.split('|').map((habitScore) => {
                    const [label, colorEmoji] = habitScore.split(' ');
                    const colorMap = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
                    return {
                        label: label.trim(),
                        color: colorMap[colorEmoji.trim()] || 'gray',
                    };
                });

                // Map promptsData using reflections and habitsData
                const promptsData = reflections.map((reflection) => ({
                    category: reflection.reflection_context.replace("Reflection on ", ""),
                    color: habitsData.find((habit) => habit.label === reflection.reflection_context)?.color || 'gray',
                    prompts: [
                        ...reflection.coaching_insights.positive_feedback,
                        ...reflection.coaching_insights.coaching_questions,
                    ],
                }));

                // Add a new notification
                const notification = {
                    id: Date.now(),
                    time: new Date().toLocaleString(),
                    timeAgo: "Just Now",
                    status: 'complete',
                    isNew: true,
                };

                // Use `updateStudent` to update the context
                updateStudent(selectedStudent.id, {
                    thm_summary,
                    strengths,
                    habitsData,
                    promptsData,
                    notifications: [...selectedStudent.notifications, notification],
                });

                console.log("Updated Student Data:", {
                    thm_summary,
                    strengths,
                    habitsData,
                    promptsData,
                    notifications: [...selectedStudent.notifications, notification],
                });
            },
            (error) => {
                console.error("AI Analysis Error:", error);
            }
        );
    };


    if (!selectedStudent) {
        return <div>Please select a student to view their report.</div>;
    }

    const toggleAnalysis = () => {
        setExpandedAnalysis(!expandedAnalysis);
    };

    return (
        <>
            <Header showBack={true} />
            <main id="report">
                <button onClick={handleAIAnalysis}>Trigger AI Analysis</button>
                <section className="report-header">
                    <div className="profile-picture">
                        {selectedStudent.profilePicture ? (
                            <img src={selectedStudent.profilePicture} alt={selectedStudent.name} />
                        ) : (
                            <i className="fas fa-user-circle"></i>
                        )}
                    </div>
                    <div className="profile-details">
                        <h2 className="student-name">{selectedStudent.name}</h2>
                        <p className="conversation-time">
                            Conversation @ {selectedStudent.time || 'Unknown Time'}
                        </p>
                        <p className="report-description">
                            {selectedStudent.description || 'No description available.'}
                        </p>
                    </div>
                </section>
                <section className="thinking-habits-container">
                    <h3>Thinking Habits Report</h3>
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

                {/* Strengths Section */}
                {selectedStudent?.strengths?.length > 0 && (
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

                {/* Coaching Prompts Section */}
                {selectedStudent.promptsData.length > 0 && (
                    <section className="report-analysis">
                        <h3 className="analysis-title">Coaching Prompts & Thinking Habits Analysis</h3>
                        {selectedStudent.promptsData.map((habit, index) => (
                            <div key={index} className="habit">
                                <div className="report-carousel">
                                    {habit.prompts && habit.prompts.length > 0 ? (
                                        habit.prompts.map((prompt, idx) => (
                                            <div key={idx} className="report-carousel-item">
                                                <p>{prompt}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="report-carousel-item">
                                            <p>No prompts available.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <div className="action-left">
                                        <span>Reflection on {habit.category}</span>
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
