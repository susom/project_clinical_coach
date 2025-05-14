import React, { useRef, useState, useEffect } from 'react';
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
    const { students, selectedStudent, selectedSession, setSelectedSession, updateStudentFromAIResponse } = useStudents();
    const [showCaseSummary, setShowCaseSummary] = useState(false);
    const [loadingReflection, setLoadingReflection] = useState(null);
    const [promptsData, setPromptsData] = useState([]);
    const [promptRatings, setPromptRatings] = useState({});
    const [activeIndices, setActiveIndices] = useState({});
    const carouselRefs = useRef({});

    if (!selectedStudent || !selectedSession) {
        console.warn("MISSING STUDENT OR SESSION, REDIRECTING TO HOME");
        return null; // Prevent render
    }
    // 🧼 Prevent crashing when selectedStudent doesn't match selectedSession
    const isValidSession = selectedStudent?.sessions?.some(s => String(s.session_id) === String(selectedSession));
    if (!isValidSession) {
        console.warn("🧹 Invalid session for selected student — clearing and redirecting");
        setSelectedSession(null);
        navigate('/home');
        return null;
    }


    const the_session = selectedStudent.sessions.find(s => String(s.session_id) === String(selectedSession));
    // console.log("coach", coach);
    // console.log("selectedStudent", selectedStudent);
    console.log("the_session", the_session);

    if (!the_session) {
        return <div className="error-message">⚠️ No session data found. Please go back and try again.</div>;
    }

    // 🛠 Define constants for readability
    const studentName = selectedStudent?.name || "Unknown Student";
    const profilePic = selectedStudent?.profilePicture || null;

    const sessionDate = the_session?.session_date || "Unknown Time";
    const reflections = the_session?.reflections || [];

    // Ensure summary and thinking habits report are objects, not strings
    const parsedSummary = cleanAndParseJSON(the_session.summary, {});
    const parsedThmReport = cleanAndParseJSON(the_session.thm_report, {});

    // Extract key data
    const oneSentenceSummary = parsedSummary.one_sentence_summary || "No summary available.";
    const thm_casefeedback = parsedThmReport.caseOrganizationFeedback || "No case organization feedback available.";

    if (!the_session) {
        return <div>Please select a session to view the report.</div>;
    }

    // Parse reflections safely
    function cleanAndParseJSON(jsonString, fallback = {}) {
        try {
            const parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
            return parsed && typeof parsed === "object" ? parsed : fallback;
        } catch (error) {
            return fallback;
        }
    }

    // Safely parse reflections
    let parsedReflections = Object.fromEntries(
        Object.entries(the_session.reflections || {}).map(([key, reflection]) => {
            const parsedContent = cleanAndParseJSON(reflection.content, {});
            return [
                key,
                {
                    ...parsedContent,
                    report_title: parsedContent?.report_title
                        ? parsedContent.report_title.replace(/\b(report|thinking habits)\b/gi, '').trim()
                        : "Unknown",
                    hasError: Object.keys(parsedContent).length === 0 || parsedContent.error,
                    rating: reflection.rating || [],
                    category: key
                }
            ];
        })
    );
    
    // Extract Strengths from Reflections
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

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    useEffect(() => {
        const initialPrompts = Object.entries(parsedReflections).map(([key, reflection]) => ({
            title: key === 'data' ? 'Interpretation' : (reflection.report_title || capitalize(key)),
            category:capitalize(key),
            color: reflection.hasError ? 'red' : 'gray',
            prompts: reflection.hasError 
                ? [] 
                : (reflection.coaching_insights?.coaching_questions || []).map((prompt) => {
                    const matchedRating = reflection.rating?.find(r => r.prompt === prompt);
                    return {
                        text: prompt,
                        rating: matchedRating ? matchedRating.rating : null // ✅ Match by prompt text
                    };
                }),
            hasError: reflection.hasError,
            reflectionVar: `sess_reflect_${key.toLowerCase()}`,
            coach_id: coach?.record_id || null,  
            student_id: selectedStudent?.id || null,  
            sess_id: the_session?.session_id || null,
            thm_overall_score: reflection?.thm_overall_score || 0
        }));
    
        setPromptsData(initialPrompts);
    }, [the_session, coach]); 

    const toggleAnalysis = () => {
        setShowCaseSummary(!showCaseSummary);
    }; 

    const handleFullReevaluation = () => {
        if (!the_session?.session_id || !coach?.record_id) {
          console.warn("🚨 Missing session_id or coach_id for full reevaluation.");
          return;
        }
      
        setLoadingReflection("all");
      
        const payload = {
          session_id: the_session.session_id,
          coach_id: coach.record_id,
          reevaluate_all: true
        };
      
        console.log("🔁 Full Re-evaluation Triggered:", payload);
      
        window.clinical_coach_jsmo_module.callAI(
          JSON.stringify(payload),
          (response) => {
            console.log("✅ Full Re-evaluation Complete:", response);
            updateStudentFromAIResponse(the_session.session_id, response);
            setLoadingReflection(null);
          },
          (error) => {
            console.error("❌ Full Re-evaluation Error:", error);
            setLoadingReflection(null);
          }
        );
    };
      
    
    const handleSingleReflection = (reflectionVar) => {
        if (!the_session?.session_id || !coach?.record_id) {
            console.warn("🚨 Missing session_id or coach_id.");
            return;
        }
        
        setLoadingReflection(reflectionVar);

        const payload = {
            session_id: the_session.session_id,
            coach_id: coach.record_id,
            reflection_var: reflectionVar
        };
    
        console.log("🔄 Re-evaluating Single Reflection:", reflectionVar, "with payload:", payload);
    
        window.clinical_coach_jsmo_module.callAI(
            JSON.stringify(payload),
            (response) => {
                console.log("✅ Reflection Re-evaluated Successfully:", response);
    
                if (!response?.reflections) {
                    console.error("🚨 No reflections returned in response.");
                    setLoadingReflection(null);
                    return;
                }
    
                // 🔥 Use the function to update session data
                updateStudentFromAIResponse(the_session.session_id, response, reflectionVar);
                setLoadingReflection(null);
            },
            (error) => {
                console.error("🚨 AI Reflection Error:", error);
                setLoadingReflection(null);
            }
        );
    };

    const handleFeedback = (habit, promptIdx, type) => {
        if (!habit || !habit.prompts?.[promptIdx]) {
            console.error("Invalid habit or prompt index");
            return;
        }
    
        const newRating = habit.prompts[promptIdx].rating === type ? null : type;
    
        // Ensure habit.rating exists and correctly updates only the matched prompt
        const updatedRatings = habit.rating?.map(r =>
            r.prompt === habit.prompts[promptIdx].text ? { ...r, rating: newRating || "" } : r
        ) || [];
    
        const updatedPrompts = habit.prompts.map((prompt, idx) =>
            idx === promptIdx ? { ...prompt, rating: newRating || "" } : prompt
        );
    
        const updatedPromptsData = promptsData?.map(h =>
            h.category === habit.category ? { ...h, prompts: updatedPrompts, rating: updatedRatings } : h
        ) || [];
    
        // Payload with the exact rating string (no arrays)
        const payload = {
            coach_id: habit.coach_id,
            student_id: habit.student_id,
            sess_id: habit.sess_id,
            category: habit.category,
            prompt: habit.prompts[promptIdx].text,
            rating: newRating || ""  
        };
    
        window.clinical_coach_jsmo_module.savePromptRating(
            JSON.stringify(payload),
            (res) => {
                console.log("RATING SAVED SUCCESSFULLY:", res);
                setPromptsData(updatedPromptsData); 
            },
            (err) => {
                console.error("SAVE PROMPT RATING ERROR:", err);
            }
        );
    };
    
    const getScoreClass = (score) => {
        switch (score) {
            case 1: return 'red';
            case 2: return 'yellow';
            case 3: return 'green';
            default: return ''; // No extra class = default gray
        }
    };

    useEffect(() => {
        if (!carouselRefs.current) return;
    
        Object.keys(carouselRefs.current).forEach((habitKey) => {
            const carousel = carouselRefs.current[habitKey];
    
            if (!carousel) {
                console.warn(`🚨 No carousel found for habitKey: ${habitKey}`);
                return;
            }
    
            const handleScroll = () => {
                const items = carousel.children;
                if (!items.length) {
                    console.warn(`🚨 No items in carousel for habit: ${habitKey}`);
                    return;
                }
    
                let closestIndex = 0;
                let minDiff = Infinity;
    
                for (let i = 0; i < items.length; i++) {
                    const rect = items[i].getBoundingClientRect();
                    const diff = Math.abs(rect.left - carousel.getBoundingClientRect().left);
                    
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestIndex = i;
                    }
                }
    
                setActiveIndices((prev) => ({ ...prev, [habitKey]: closestIndex }));
            };
    
            carousel.addEventListener("scroll", handleScroll, { passive: true });
    
            return () => {
                carousel.removeEventListener("scroll", handleScroll);
            };
        });
    }, [promptsData]);

    const handleDotClick = (habitKey, index) => {
        setActiveIndices((prev) => ({ ...prev, [habitKey]: index }));
    
        const carousel = carouselRefs.current[habitKey];
    
        if (!carousel) {
            console.warn(`🚨 No carousel found for habitKey: ${habitKey}`);
            return;
        }
    
        const items = carousel.children;
        if (!items || !items[index]) {
            console.warn(`🚨 No carousel items found for habitKey: ${habitKey} at index: ${index}`);
            return;
        }
    
        carousel.scrollTo({
            left: items[index].offsetLeft - carousel.offsetLeft,
            behavior: "smooth",
        });
    };

    return (
        <>
            <Header showBack={true} />
            <main id="report">
                <section className="report-header">
                    <div className="profile-picture">
                        {profilePic ? (
                            <img src={profilePic} alt={studentName}/>
                        ) : (
                            <i className="fas fa-user-circle"></i>
                        )}
                    </div>
                    <div className="profile-details">
                        <div className="report-student-name clickable">{studentName}</div>
                        <p className="conversation-time">
                            Conversation @ {sessionDate}
                        </p>
                        <p className="report-description">
                            {oneSentenceSummary}
                        </p>
                    </div>
                </section>

                <section className="thinking-habits-container">
                    <div className="thinking-habits-header">
                        <h3>Thinking Habits Report</h3>
                        <div className="thinking-habits-actions">
                            <button 
                                className={`re-evaluate-all-btn re-evaluate-btn highlighted ${loadingReflection === 'all' ? 'loading' : ''}`} 
                                onClick={handleFullReevaluation}
                                title="Re-Evaluate All"
                                >
                                <i className={`fas fa-sync-alt ${loadingReflection === 'all' ? 'fa-spin' : ''}`}></i>
                            </button>
                            <button 
                            className="full-transcript-btn" 
                            onClick={() => navigate(`/full-transcript/${selectedSession}`)}
                            >
                            + Transcript
                            </button>
                        </div>
                    </div>

                    <ThinkingHabitsOverview reflections={reflections} />

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
                        <div className="strengths-container">
                            {strengths.map((strength, index) => (
                                <div key={index} className="strength-block">
                                    <div className={`strength-category ${strength.category.toLowerCase()}`}>
                                        {strength.category.toLowerCase() === 'data' ? 'Interpretation' : strength.category}
                                    </div>
                                    <div 
                                        className="strength-carousel" 
                                        ref={(el) => { if (el) carouselRefs.current[strength.category] = el; }}
                                    >
                                        {strength.descriptions.map((desc, i) => (
                                            <div key={i} className="strength-description">{desc}</div>
                                        ))}
                                    </div>

                                    {strength.descriptions.length > 1 && (
                                        <div className="carousel-dots">
                                            {strength.descriptions.map((_, i) => (
                                                <button 
                                                    key={i} 
                                                    className={`dot ${i === (activeIndices[strength.category] || 0) ? 'active' : ''}`}
                                                    onClick={() => handleDotClick(strength.category, i)}
                                                />
                                            ))}
                                        </div>
                                    )}
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
                                    <div 
                                    ref={(el) => { 
                                        if (el) carouselRefs.current[habit.category] = el;
                                    }} 
                                    className="report-carousel">
                                        {hasError ? (
                                            <div className="report-carousel-item error-message">
                                                ⚠️ There was an error, try re-evaluating the AI reflection.
                                            </div>
                                        ) : habit.prompts.length > 0 ? (
                                            habit.prompts.map((prompt, idx) => (
                                                <div key={idx} className="report-carousel-item">
                                                    <p>{prompt.text}</p>
                                                    <div className="feedback-section">
                                                        <p className="feedback-text">
                                                            <em>Provide feedback on this coaching prompt:</em>
                                                        </p>
                                                        <div className="feedback-buttons">
                                                            <button 
                                                                className="thumb-btn" 
                                                                onClick={() => handleFeedback(habit, idx, 'up')}
                                                            >
                                                                <i className={`fas fa-thumbs-up ${habit.prompts[idx].rating === 'up' ? 'active-up' : ''}`}></i>
                                                            </button>
                                                            <button 
                                                                className="thumb-btn" 
                                                                onClick={() => handleFeedback(habit, idx, 'down')}
                                                            >
                                                                <i className={`fas fa-thumbs-down ${habit.prompts[idx].rating === 'down' ? 'active-down' : ''}`}></i>
                                                            </button>
                                                        </div>

                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="report-carousel-item">
                                                <p>No prompts available.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="carousel-dots">
                                        {habit.prompts.map((_, idx) => (
                                            <button 
                                                key={idx} 
                                                className={`dot ${idx === (activeIndices[habit.category] || 0) ? 'active' : ''}`} 
                                                onClick={() => handleDotClick(habit.category, idx)}
                                            />
                                        ))}
                                    </div>

                                    <div className="action-buttons">
                                        <div className={`action-left ${getScoreClass(habit.thm_overall_score)}`}>
                                            <span>{habit.title}</span>
                                        </div>
                                        <div className="action-right">
                                            <button 
                                                className={`re-evaluate-btn ${hasError ? 'highlighted' : 'disabled'}`} 
                                                onClick={() => handleSingleReflection(habit.reflectionVar)}
                                                title="Re-Evaluate"
                                            >
                                                <i className={`fas fa-sync-alt ${loadingReflection === habit.reflectionVar ? 'fa-spin' : ''}`}></i>
                                            </button>
                                            <button 
                                                className="detailed-analysis-btn" 
                                                onClick={() => navigate(`/detail-analysis/${habit.category.toLowerCase()}`)}
                                            >
                                                + Detailed Analysis
                                            </button>
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

