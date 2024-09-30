import React from 'react';
import StatusIndicator from './StatusIndicator';
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

        // Call AI function and handle the callback
        callAI(chatmlPayload, (aiContent) => {
            if (aiContent && Array.isArray(aiContent)) {
                const updatedStudent = {
                    ...selectedStudent,
                    aiResponse: aiContent // Store the AI response in the student data
                };

                console.log("HOME handleSubmitToAI Updating student with AI response:", updatedStudent);

                // Instead of using updateStudentData, use updateAIResponse
                updateAIResponse(selectedStudent.id, aiContent);
            } else {
                console.error("HOME handleSubmitToAI No content received from AI or invalid format");
            }
        });
    };


    const callAI = (chatmlPayload, callback) => {
        window.clicnical_coach_jsmo_module.callAI(
            chatmlPayload,
            (res) => {
                if (!res) {
                    console.error("HOME callAI Response is null or undefined");
                    callback(undefined);  // Pass undefined to indicate failure
                    return;
                }

                try {
                    const parsedRes = Array.isArray(res) ? res : typeof res === 'object' ? res : JSON.parse(res);

                    if (Array.isArray(parsedRes)) {
                        console.log("HOME callAI Parsed response before callback:", parsedRes);
                        callback(parsedRes);
                    } else {
                        console.error("HOME callAI Unexpected response format:", parsedRes);
                        callback(undefined);  // Call with undefined for failure
                    }
                } catch (error) {
                    console.error("HOME callAI Error parsing response:", error);
                    callback(undefined);  // Call with undefined for failure
                }
            },
            (err) => {
                console.error("HOME callAI AI call failed:", err);
                callback(undefined);  // Ensure callback is called on error
            }
        );
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

                        <StatusIndicator />

                        {selectedStudent.transcription && (
                            <div className="session-summary">
                                <blockquote>{selectedStudent.transcription}</blockquote>
                                <button onClick={handleSubmitToAI}>Submit to AI</button>
                            </div>
                        )}
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
