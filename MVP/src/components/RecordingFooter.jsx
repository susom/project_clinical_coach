import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ThinkingHabitsOverview from './ThinkingHabitsOverview';
import { useStudents } from '../contexts/Students';
import { useConfirmModal } from '../contexts/ConfirmModal';
import VoiceRecorder from '../components/VoiceRecorder';
import './RecordingFooter.css';

function RecordingFooter({ stage, setStage }) {
    const navigate = useNavigate();
    const { showConfirmModal } = useConfirmModal();
    const { students, selectedStudent, selectStudent } = useStudents();

    const handleStudentChange = (event) => {
        const studentId = event.target.value; // Keep it as a string
        console.log("🟡 Selected Student ID:", studentId, students);

        const student = students.find(s => s.id === studentId); // Compare as string
        if (student) {
            console.log("✅ Found Student:", student);
            selectStudent(student.id); // Pass the string ID
            setStage(3); // ✅ Immediately transition to Stage 3
        } else {
            console.warn("🚨 Student not found for ID:", studentId);
        }
    };

    const handleRecordClick = () => {
        if (!selectedStudent) {
            showConfirmModal({
                title: '',
                message: 'You must select a student to start a recording session.',
                showConfirm: false,
                showCancel: true,
                confirmText: '',
                cancelText: 'Got It!',
            });
        } else {
            console.log("🎤 Recording started for student:", selectedStudent);
            setStage(3);
        }
    };

    const thmLabels = selectedStudent?.habitsData || [
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
                            {selectedStudent?.profilePicture ? (
                                <>
                                    <img src={selectedStudent.profilePicture} alt={selectedStudent.name}/>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-user-circle profile-icon"></i>
                                </>
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
                    <VoiceRecorder navigate={navigate} />
                </div>
            )}
        </div>
    );
}

export default RecordingFooter;
