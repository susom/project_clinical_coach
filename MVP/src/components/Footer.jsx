import React, { useState, useEffect, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { useStudents } from '../contexts/Students';

function Footer() {
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { students, selectedStudent, selectStudent, updateTranscription } = useStudents();

    const clinicianId = 1234; // Placeholder for clinician ID
    const selectedStudentRef = useRef(null); // Create a ref to store selectedStudent

    // Keep the ref updated with the latest selectedStudent value
    useEffect(() => {
        selectedStudentRef.current = selectedStudent;
    }, [selectedStudent]);

    const handleStudentChange = (event) => {
        selectStudent(Number(event.target.value));
    };

    const handleStopRecording = async (blob) => {
        const currentSelectedStudent = selectedStudentRef.current; // Access the current ref value
        if (!currentSelectedStudent) {
            alert("Please select a student before recording.");
            return;
        }

        const formData = new FormData();
        formData.append('file', blob.blob, 'recording.mp3');
        formData.append('studentId', currentSelectedStudent.id); // Use the ref value
        formData.append('clinicianId', clinicianId);

        setIsUploading(true);
        callAjax(formData, (response) => {
            setIsUploading(false);

            //TODO just for show for now
            if (response && response.transcription) {
                // Update transcription in the context
                updateTranscription(currentSelectedStudent.id, response.transcription);
            }
        });
    };

    const callAjax = (formData, callback) => {
        window.clicnical_coach_jsmo_module.transcribeAudio(formData, (res) => {
            if (res) {
                if (callback) callback(res);
            } else {
                console.log("Unexpected response format:", res);
            }
        }, (err) => {
            console.log("transcribeAudio error:", err);
            if (callback) callback();
        });
    };

    return (
        <footer className="footer-container">
            <div className="footer-content">
                <h3>Start a Coaching Session</h3>

                <div className="footer-controls">
                    <VoiceRecorder
                        setIsRecording={setIsRecording}
                        handleStopRecording={handleStopRecording}
                        disabled={isUploading || !selectedStudent}
                    />

                    <select
                        className="student-dropdown"
                        value={selectedStudent ? selectedStudent.id : ''}
                        onChange={handleStudentChange}
                    >
                        <option value="">Select A Student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
