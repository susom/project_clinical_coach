import React, { useState, useEffect } from 'react';
import { useStudents } from '../contexts/Students';
import { useCoach } from '../contexts/Coach';
import ThinkingHabitsOverview from '../components/ThinkingHabitsOverview';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Report.css';

export default function Report() {
    const { coach } = useCoach();
    const { students, selectedSession } = useStudents();
    const [expandedAnalysis, setExpandedAnalysis] = useState(false);

    // 🔥 Retrieve the full session data from students array
    const the_session = students
        .find(student => student.id === selectedSession?.learner_id)
        ?.sessions?.find(session => session.session_id === selectedSession?.session_id);

    console.log("selectedSEssion", selectedSession, "coach", coach);
    console.log("the_session", the_session);

    if (!selectedSession || !the_session) {
        return <div className="error-message">⚠️ No session data found. Please go back and try again.</div>;
    }


    // 🛠 Define constants for readability
    const studentName = selectedSession?.studentName || "Unknown Student";
    const profilePic = selectedSession?.profilePicture || null;
    const sessionDate = selectedSession?.sessionDate || "Unknown Time";
    const habits = selectedSession?.habits || [];


    // ✅ Parse summary JSON safely
    let parsedSummary = {};
    try {
        parsedSummary = JSON.parse(the_session.summary || '{}');
    } catch (error) {
        console.error("Invalid JSON in session summary:", error);
    }

    // ✅ Parse Thinking Habits Report JSON safely
    let parsedThmReport = {};
    try {
        parsedThmReport = JSON.parse(the_session.thm_report || '{}');
    } catch (error) {
        console.error("Invalid JSON in Thinking Habits Report:", error);
    }

    // Extract key data
    const oneSentenceSummary = parsedSummary.one_sentence_summary || "No summary available.";
    const summaryText = parsedSummary.long_summary || "No summary available.";

    // ✅ Parse reflections safely
    function cleanAndParseJSON(jsonString, fallback = {}) {
        try {
            // Remove (Line XX) references
            // jsonString = jsonString.replace(/\(Line\s\d+\)/g, "");
            //
            // // Remove trailing commas before closing brackets
            // jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
            //
            // // Fix improperly escaped quotes (e.g., `patient"s` → `patient's`)
            // jsonString = jsonString.replace(/(\w)"(\w)/g, '$1\'$2');
            //
            // // Ensure keys are properly quoted (e.g., `{question: "text"}` → `{"question": "text"}`)
            // jsonString = jsonString.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            //
            // // Convert single quotes inside JSON strings to double quotes for proper parsing
            // jsonString = jsonString.replace(/"\s*([^"]*?)\s*"\s*([\]}])/g, '"$1"$2');
            //
            // // Ensure arrays are properly formatted (["Text" , "Text" ,] → ["Text", "Text"])
            // jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
            //
            // // Strip out ` ``` ` markdown artifacts
            // jsonString = jsonString.replace(/```/g, "");

            return JSON.parse(jsonString);
        } catch (error) {
            console.error("🚨 JSON Parsing Failed:", error, "\n🔹 Original String:", jsonString);
            return fallback;
        }
    }

    let parsedReflections = Object.fromEntries(
        Object.entries(the_session.reflections || {}).map(([key, reflection]) => {
            const parsedContent = cleanAndParseJSON(reflection.content || "{}", {});

            console.log("parsedContent", key, parsedContent);
            return [
                key,
                {
                    ...parsedContent,
                    hasError: Object.keys(parsedContent).length === 0  // True if parsedContent is empty
                }
            ];
        })
    );

    // ✅ Extract Coaching Prompts from Reflections
    const promptsData = Object.entries(parsedReflections).map(([key, reflection]) => ({
        category: reflection.report_title || key.charAt(0).toUpperCase() + key.slice(1),
        color: reflection.hasError ? 'red' : 'gray', // Highlight errors
        prompts: reflection.hasError ? [] : reflection.coaching_insights?.coaching_questions || [],
        hasError: reflection.hasError, // Pass error flag for UI adjustments
        reflectionVar: `sess_reflect_${key.toLowerCase()}` // Format reflectionVar
    }));

    console.log("promptsData",promptsData);

    // ✅ Extract Strengths from Reflections
    const strengths = Object.values(parsedReflections)
        .flatMap(reflection => reflection.hasError ? [] : reflection.coaching_insights?.positive_feedback || [])
        .map(feedback => {
            const [category, description] = feedback.split(': ');
            return { category, description };
        });



    const toggleAnalysis = () => {
        setExpandedAnalysis(!expandedAnalysis);
    };

    if (!selectedSession || !the_session) {
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

    return (
        <>
            <Header showBack={true} />
            <main id="report">
                <button onClick={handleAIAnalysis}>Trigger AI Analysis</button>

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
                    <ThinkingHabitsOverview habits={habits}/>

                    <div className="report-summary">
                        <p className="summary-text">{summaryText}</p>
                        <div className="summary-buttons">
                            <button className="expandable-button" onClick={toggleAnalysis}>
                                {expandedAnalysis ? '- HIDE SUMMARY' : '+ IN-DEPTH CASE PRESENTATION SUMMARY'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Strengths Section */}
                {strengths.length > 0 && (
                    <section className="report-strengths">
                        <h3>{studentName}’s Strengths</h3>
                        <div className="strength-tags">
                            {strengths.map((strength, index) => (
                                <div key={index} className="strength-item">
                                    <span className="strength-category">{strength.category}</span>
                                    <span className="strength-description">{strength.description}</span>
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
                                            <span>{habit.category}</span>
                                        </div>
                                        <div className="action-right">
                                            {hasError ? (
                                                <button className="re-evaluate-btn" onClick={() => handleSingleReflection(habit.reflectionVar)}>
                                                    🔄 Re-Evaluate
                                                </button>
                                            ) : (
                                                <button className="detailed-analysis-btn">
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
            <Footer/>
        </>
    );
}

