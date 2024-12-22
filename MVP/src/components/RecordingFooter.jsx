import React, { useState, useEffect, useRef } from 'react';
import ThinkingHabitsOverview from './ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import { useConfirmModal } from '../contexts/ConfirmModal';
import VoiceRecorder from '../components/VoiceRecorder';
import './RecordingFooter.css';

function RecordingFooter({ stage, setStage }) {
    const { showConfirmModal } = useConfirmModal();
    const { students, selectedStudent, selectStudent } = useStudents();

    // for audio recording
    const [isRecording, setIsRecording] = useState(false); // To manage recording state
    const mediaRecorderRef = useRef(null); // To store the MediaRecorder instance
    const audioChunksRef = useRef([]); // To store recorded audio chunks

    useEffect(() => {
        // Cleanup the MediaRecorder and stop any active recording
        return () => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current = null;
            }
        };
    }, []);


    const handleStudentChange = (event) => {
        const studentId = Number(event.target.value);
        selectStudent(studentId);
    };

    const handleRecordClick = () => {
        if (!selectedStudent) {
            const confirmed = showConfirmModal({
                title: '',
                message: 'You must select a student to start a recording session. ',
                showConfirm: false,
                showCancel: true,
                confirmText: '',
                cancelText: 'Got It!',
            });

            if (confirmed) {
                console.log('User logged out');
                // Add your logout functionality here
            } else {
                console.log('User canceled logout');
            }
        } else {
            setStage(3); // Move to stage 3 UI
        }
    };

    const thmLabels = selectedStudent?.reflections
        ? [
            { label: 'Strategy', color: selectedStudent.reflections.strategy?.score === 'N/A' ? 'gray' : 'green' },
            { label: 'Solution', color: selectedStudent.reflections.solution?.score === 'N/A' ? 'gray' : 'green' },
            { label: 'Knowledge', color: selectedStudent.reflections.knowledge?.score === 'N/A' ? 'gray' : 'green' },
            { label: 'Problem', color: selectedStudent.reflections.problem?.score === 'N/A' ? 'gray' : 'yellow' },
            { label: 'Data', color: selectedStudent.reflections.data?.score === 'N/A' ? 'gray' : 'yellow' },
            { label: 'Mind', color: selectedStudent.reflections.mind?.score === 'N/A' ? 'gray' : 'red' },
        ]
        : [
            { label: 'Strategy', color: 'gray' },
            { label: 'Solution', color: 'gray' },
            { label: 'Knowledge', color: 'gray' },
            { label: 'Problem', color: 'gray' },
            { label: 'Data', color: 'gray' },
            { label: 'Mind', color: 'gray' },
        ];

    return (
        <div className={`recording-footer ${stage === 3 ? 'stage-3-layout' : 'stage-2-layout'}`}>
            {stage === 2 && (
                <div className="stage-2-container">
                    <div className="record-button" onClick={handleRecordClick}>
                        <i className="fas fa-microphone record-icon"></i>
                    </div>
                    <div className="recording-setup">
                        <h3 className="recording-title">Start A Recording Session</h3>
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
                        <ThinkingHabitsOverview habits={thmLabels} disabled />
                        <p className="recording-helper-text">
                            Your student's thinking habits metrics will appear here if you've coached them before.
                        </p>
                    </div>
                </div>
            )}

            {stage === 3 && (
                <div className="stage-3-container">
                    <h3 className="recording-title">Start A Recording Session</h3>
                    <div className="recording-student-info">
                        <div className="recording-profile-picture">
                            {selectedStudent && selectedStudent.profilePicture ? (
                                <img src={selectedStudent.profilePicture} alt={selectedStudent.name} />
                            ) : (
                                <i className="fas fa-user-circle profile-icon"></i>
                            )}
                        </div>
                        <div className="student-details">
                            <select
                                className="student-dropdown"
                                value={selectedStudent ? selectedStudent.id : ''}
                                onChange={(e) => selectStudent(Number(e.target.value))}
                            >
                                <option value="">Select A Student</option>
                                {students.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.name}
                                    </option>
                                ))}
                            </select>
                            <ThinkingHabitsOverview habits={thmLabels} />
                            <p className="recording-current-time">{new Date().toLocaleString('en-US', {
                                weekday: 'long',
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true,
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                            })}</p>
                        </div>
                    </div>
                    <VoiceRecorder />
                </div>
            )}
        </div>
    );
}

export default RecordingFooter;
