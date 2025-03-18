import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useStudents } from '../contexts/Students';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useConfirmModal } from '../contexts/ConfirmModal';
import './DetailAnalysis.css';

export default function DetailAnalysis() {
    const navigate = useNavigate();
    const { category } = useParams();
    const { showConfirmModal } = useConfirmModal();
    const { selectedStudent, selectedSession } = useStudents();

    if (!selectedStudent || !selectedSession) {
        console.warn("MISSING STUDENT OR SESSION, REDIRECTING TO HOME");
        navigate('/');
        return null; // Prevent render
    }

    const the_session = selectedStudent.sessions.find(s => String(s.session_id) === String(selectedSession));

    // Find the reflection data for the selected category
    const reflection = the_session?.reflections?.[category] || {};

    // ✅ Parse JSON safely
    let parsedContent = {};
    try {
        parsedContent = typeof reflection.content === "string" 
            ? JSON.parse(reflection.content || '{}') 
            : reflection.content || {};
    } catch (error) {
        console.error("🚨 JSON Parsing Failed in DetailAnalysis:", error);
    }

    // Extract key values with safe defaults
    const {
        report_title = "Unknown Report",
        coaching_insights = {},
        detailed_analysis = []
    } = parsedContent;
    
    const { positive_feedback = [], coaching_questions = [] } = coaching_insights;

    if (!parsedContent || Object.keys(parsedContent).length === 0) {
        return (
            <>
                <Header showBack={true} />
                <main id="detail_analysis">
                    <div className="error-message">⚠️ No data found for {category}. Please go back.</div>
                </main>
                <Footer />
            </>
        );
    }

    const showInfo = async () => {
        await showConfirmModal({
            title: 'What the Emojis mean:',
            message: `
                🌱 <strong>Needs improvement</strong><br/>
                🌼 <strong>Good performance</strong><br/>
                🤔 <strong>Low AI Certainty</strong><br/>
                🤓 <strong>High AI Certainty</strong><br/>
                ❓ <strong>AI is uncertain</strong>
            `,
            showConfirm: true,
            confirmText: 'OK',
        });
    };
    
    

    return (
        <>
            <Header showBack={true} />
            <main id="detail_analysis">
                <div className="analysis-header">
                    <h2 className="analysis-title">
                        Detailed Analysis for {selectedStudent.name}’s Self-Reflection on {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h2>
                    <button className="info-button" onClick={showInfo}>
                        <i className="fas fa-question-circle"></i>
                    </button>
                </div>

                {/* Positive Feedback */}
                {positive_feedback.length > 0 && (
                    <section className="analysis-section">
                        <h3>Positive Feedback</h3>
                        <ul>
                            {positive_feedback.map((feedback, idx) => (
                                <li key={idx}>{feedback}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Coaching Questions */}
                {coaching_questions.length > 0 && (
                    <section className="analysis-section">
                        <h3>Coaching Questions</h3>
                        <ul>
                            {coaching_questions.map((question, idx) => (
                                <li key={idx}>{question}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Detailed Analysis */}
                {detailed_analysis.length > 0 && (
                    <section className="analysis-section">
                        <h3>Detailed Analysis</h3>
                        {detailed_analysis.map((analysisItem, idx) => (
                            <div key={idx} className="analysis-item">
                                <h5>
                                    {analysisItem.emoji} {analysisItem.question}
                                </h5>
                                <p>{analysisItem.analysis}</p>
                                <p className="certainty-score">{analysisItem.ai_certainty_score}</p>

                                {/* Supporting Citations */}
                                {analysisItem.supporting_citations?.primary?.length > 0 && (
                                    <div className="supporting-citations">
                                        <h5>Supporting Citations:</h5>
                                        <ul>
                                            {analysisItem.supporting_citations.primary.map((citation, cid) => (
                                                <li key={cid}>{citation}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>
                )}
            </main>
        </>
    );
}
