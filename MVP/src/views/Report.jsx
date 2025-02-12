import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudents } from '../contexts/Students';
import { useCoach } from '../contexts/Coach';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import CaseSummary from "../components/CaseSummary";
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Report.css';

export default function Report() {
    const navigate = useNavigate();
    const { coach } = useCoach();
    const { students, selectedStudent, selectedSession } = useStudents();
    const [showCaseSummary, setShowCaseSummary] = useState(false);

    const the_session = selectedStudent.sessions.find(s => String(s.session_id) === String(selectedSession));
    console.log("the_session", the_session);

    if (!the_session) {
        return <div className="error-message">⚠️ No session data found. Please go back and try again.</div>;
    }

    // 🛠 Define constants for readability
    const studentName = selectedStudent?.name || "Unknown Student";
    const profilePic = selectedStudent?.profilePicture || null;

    const sessionDate = the_session?.session_date || "Unknown Time";
    const reflections = the_session?.reflections || [];

    // ✅ Ensure summary and thinking habits report are objects, not strings
    const parsedSummary = typeof the_session.summary === "string" 
    ? JSON.parse(the_session.summary || '{}') 
    : the_session.summary || {};

    const parsedThmReport = typeof the_session.thm_report === "string" 
    ? JSON.parse(the_session.thm_report || '{}') 
    : the_session.thm_report || {};

    // Extract key data
    const oneSentenceSummary = parsedSummary.one_sentence_summary || "No summary available.";
    const thm_casefeedback = parsedThmReport.caseOrganizationFeedback || "No case organization feedback available.";
console.log("parsed thm_report", parsedThmReport);
    // ✅ Parse reflections safely
    function cleanAndParseJSON(jsonString, fallback = {}) {
        try {
            // MAYBE DO SOME CLEANING HERE? BUT SINCE WE PRECHECK BEFORE SAVING SHOUULD BE OK?
            
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("🚨 JSON Parsing Failed:", error, "\n🔹 Original String:", jsonString);
            return fallback;
        }
    }

    let parsedReflections = Object.fromEntries(
        Object.entries(the_session.reflections || {}).map(([key, reflection]) => {
            const parsedContent = typeof reflection.content === "string" 
            ? JSON.parse(reflection.content || '{}') 
            : reflection.content || {};
          return [
            key,
            {
              ...parsedContent,
              hasError: Object.keys(parsedContent).length === 0,
              category: key  // Store the key as the category
            }
          ];
        })
      );
      
    console.log("parsedReflections", parsedReflections);

    // ✅ Extract Coaching Prompts from Reflections
    const promptsData = Object.entries(parsedReflections).map(([key, reflection]) => ({
        title: reflection.report_title || key.charAt(0).toUpperCase() + key.slice(1),
        category : key.charAt(0).toUpperCase() + key.slice(1),
        color: reflection.hasError ? 'red' : 'gray', // Highlight errors
        prompts: reflection.hasError ? [] : reflection.coaching_insights?.coaching_questions || [],
        hasError: reflection.hasError, // Pass error flag for UI adjustments
        reflectionVar: `sess_reflect_${key.toLowerCase()}` // Format reflectionVar
    }));

    // ✅ Extract Strengths from Reflections
    // Assuming parsedThmReport is already parsed from the_session.thm_report
    let strengths = [];
    if (parsedThmReport && Array.isArray(parsedThmReport.positiveFeedback)) {
    strengths = parsedThmReport.positiveFeedback.reduce((acc, feedbackStr) => {
        const parts = feedbackStr.split(':');
        if (parts.length >= 2) {
        const cat = parts[0].trim();
        const desc = parts.slice(1).join(':').trim();
        const existing = acc.find(item => item.category === cat);
        if (existing) {
            existing.descriptions.push(desc);
        } else {
            acc.push({ category: cat, descriptions: [desc] });
        }
        }
        return acc;
    }, []);
    }


    const toggleAnalysis = () => {
        setShowCaseSummary(!showCaseSummary);
    };

    if (!the_session) {
        return <div>Please select a session to view the report.</div>;
    }

    const handleAIAnalysis = () => {
        if (!selectedSession?.session_id || !coach?.record_id) {
            console.warn("🚨 Missing session_id or coach_id.");
            return;
        }

        const payload = {
            session_id: selectedSession.session_id,
            coach_id: coach.record_id
        };

        console.log("🛠️ Triggering AI Analysis with:", payload);

        window.clinical_coach_jsmo_module.callAI(
            JSON.stringify(payload),
            (response) => console.log("✅ AI Analysis Triggered Successfully:", response),
            (error) => console.error("🚨 AI Analysis Error:", error)
        );
    };

    const handleSingleReflection = (reflectionVar) => {
        if (!selectedSession?.session_id || !coach?.record_id) {
            console.warn("🚨 Missing session_id or coach_id.");
            return;
        }

        const payload = {
            session_id: selectedSession.session_id,
            coach_id: coach.record_id,
            reflection_var: reflectionVar // 🔥 Pass only the targeted reflection
        };

        console.log("🔄 Re-evaluating Single Reflection:", reflectionVar, "with payload:", payload);

        window.clinical_coach_jsmo_module.callAI(
            JSON.stringify(payload),
            (response) => console.log("✅ Reflection Re-evaluated Successfully:", response),
            (error) => console.error("🚨 AI Reflection Error:", error)
        );
    };

    const handleFullTranscript = () => {
        navigate('/full-transcript');
    };
    

    return (
        <>
            <Header showBack={true} />
            <main id="report">
                {/* <button onClick={handleAIAnalysis}>Trigger AI Analysis</button>
                <br/><br/> */}

                <section className="report-header">
                    <div className="profile-picture">
                        {profilePic ? (
                            <img src={profilePic} alt={studentName}/>
                        ) : (
                            <i className="fas fa-user-circle"></i>
                        )}
                    </div>
                    <div className="profile-details">
                        <h2 className="student-name">{studentName}</h2>
                        <p className="conversation-time">
                            Conversation @ {sessionDate}
                        </p>
                        <p className="report-description">
                            {oneSentenceSummary}
                        </p>
                    </div>
                </section>

                <section className="thinking-habits-container">
                    <h3>Thinking Habits Report</h3>
                    <ThinkingHabitsOverview reflections={reflections}/>

                    <button 
                        className="detailed-analysis-btn" 
                        onClick={() => navigate(`/full-transcript/${selectedSession}`)}
                    >
                        + Transcript
                    </button>



                    <div className="report-summary">
                        <p className="summary-text">{thm_casefeedback}</p>
                        <div className="summary-buttons">
                            <button className="expandable-button" onClick={toggleAnalysis}>
                                {showCaseSummary ? '- HIDE SUMMARY' : '+ IN-DEPTH CASE PRESENTATION SUMMARY'}
                            </button>
                        </div>
                    </div>
                </section>

                {strengths.length > 0 && (
                <section className="report-strengths">
                    <h3>{studentName}’s Strengths</h3>
                    <div className="strength-tags">
                    {strengths.map((strength, index) => (
                        <div key={index} className="strength-item">
                        <span className="strength-category">{strength.category}</span>
                        {strength.descriptions.map((desc, idx) => (
                            <div key={idx} className="strength-description">{desc}</div>
                        ))}
                        </div>
                    ))}
                    </div>
                </section>
                )}

                {/* Coaching Prompts Section */}
                {promptsData.length > 0 && (
                    <section className="report-analysis">
                        <h3 className="analysis-title">Coaching Prompts & Thinking Habits Analysis</h3>
                        {promptsData.map((habit, index) => {
                            const hasError = habit.hasError;  // Only trust the real error flag
                            return (
                                <div key={index} className="habit">
                                    <div className="report-carousel">
                                        {hasError ? (
                                            <div className="report-carousel-item error-message">
                                                ⚠️ There was an error, try re-evaluating the AI reflection.
                                            </div>
                                        ) : habit.prompts.length > 0 ? (
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
                                            <span>{habit.title}</span>
                                        </div>
                                        <div className="action-right">
                                            {hasError ? (
                                                <button className="re-evaluate-btn" onClick={() => handleSingleReflection(habit.reflectionVar)}>
                                                    🔄 Re-Evaluate
                                                </button>
                                            ) : (
                                                <button 
                                                    className="detailed-analysis-btn" 
                                                    onClick={() => navigate(`/detail-analysis/${habit.category.toLowerCase()}`)}
                                                >
                                                    + DETAILED ANALYSIS
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}
            </main>
            {/* Insert CaseSummary Component */}
            {showCaseSummary && <CaseSummary casePresentationSummary={parsedSummary} organizationFeedback={parsedThmReport.caseOrganizationFeedback} onClose={() => setShowCaseSummary(false)} />}
            <Footer/>
        </>
    );
}

