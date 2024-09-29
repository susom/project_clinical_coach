import React from 'react';
import { useStudents } from '../contexts/Students';
import { FaUserCircle } from 'react-icons/fa';

function Home() {
    const { selectedStudent, aiResponse, updateAIResponse } = useStudents();

    const handleSubmitToAI = () => {
        if (!selectedStudent || !selectedStudent.transcription) {
            console.error("No transcription to submit.");
            return;
        }

        const chatmlPayload = [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: selectedStudent.transcription }
        ];

        console.log("chatmlPayload", chatmlPayload);

        callAI(chatmlPayload, (aiContent) => {
            console.log("aiContent callback", aiContent);
            if (aiContent) {
                updateAIResponse(aiContent); // Store AI response in context
            } else {
                console.error("Failed to get a response from the AI.");
            }
        });
    };

    const callAI = (chatmlPayload, callback) => {
        window.clicnical_coach_jsmo_module.callAI(chatmlPayload, (res) => {
            if (res) {
                if (callback) callback(res);
            } else {
                console.log("Unexpected AI response format:", res);
            }
        }, (err) => {
            console.log("callAI error:", err);
            if (callback) callback();
        });
    };

    return (
        <div className="home-content">
            <div className="session-date">
                <h2>Today, September 10, 2024</h2>
            </div>

            {selectedStudent ? (
                <div className="student-card">
                    <div className="student-info">
                        <FaUserCircle size={80} className="student-icon" />
                        <h3 className="student-name">{selectedStudent.name}</h3>
                    </div>

                    <div className="session-details">
                        <div className="session-status">
                            <h4>Session Completed</h4>
                        </div>

                        {selectedStudent.transcription && (
                            <div className="session-summary">
                                <blockquote>{selectedStudent.transcription}</blockquote>
                            </div>
                        )}

                        <button onClick={handleSubmitToAI}>Submit to AI</button>
                    </div>
                </div>
            ) : (
                <p>Please select a student and start recording a session.</p>
            )}

            {aiResponse && (
                <blockquote className="ai-response">
                    "{aiResponse}"
                </blockquote>
            )}
        </div>
    );
}

export default Home;
