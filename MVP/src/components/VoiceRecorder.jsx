import React, { useState, useRef, useEffect } from 'react';

import './VoiceRecorder.css';
import { useConfirmModal } from '../contexts/ConfirmModal';
import { useStudents } from '../contexts/Students';
import { useCoach } from '../contexts/Coach';

const MAX_RECORDING_TIME = 15 * 60; // 15 minutes in seconds

const VoiceRecorder = ({ navigate }) => {
    const [state, setState] = useState('pre-record'); // pre-record, recording, paused, finalized
    const [elapsedTime, setElapsedTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);
    const [isResuming, setIsResuming] = useState(false);

    const audioContextRef = useRef(null); // To hold the AudioContext
    const analyserRef = useRef(null); // For frequency data
    const dataArrayRef = useRef(null); // For waveform data
    const canvasRef = useRef(null); // To draw the waveform
    const animationFrameRef = useRef(null); // To manage the animation frame
    const [isUploading, setIsUploading] = useState(false); // Tracks the uploading state
    const { showConfirmModal } = useConfirmModal();
    const { selectedStudent, updateStudent, createNewSession } = useStudents();
    const { coach , setStage } = useCoach();

    // Function to clear the timer and reset elapsed time
    const clearTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current); // Stops the interval running for the timer
            timerRef.current = null; // Ensures the timer reference is cleared
        }
        setElapsedTime(0); // Resets the elapsed time to zero
    };

    // Effect to handle audio element errors for the preview
    useEffect(() => {
        const audioElement = document.querySelector('audio'); // Selects the audio element in the DOM
        if (audioElement) {
            audioElement.onerror = () => {
                console.error('Error loading audio preview.'); // Logs an error if the audio preview fails to load
            };
        }
    }, [previewUrl]); // Runs whenever the `previewUrl` changes

    // Effect to clean up Web Audio API resources and animations
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close(); // Closes the AudioContext to release resources
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current); // Cancels any active animation frames for the waveform
            }
        };
    }, []); // Runs once when the component unmounts

    useEffect(() => {
        console.log('my current state is', mediaRecorderRef.current)

        if (state === 'recording' && !isResuming) {
            console.log('Starting MediaRecorder and timer...');
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.start(); // Starts the MediaRecorder for audio recording
                console.log('MediaRecorder started.');

                // Starts a timer to track elapsed time
                timerRef.current = setInterval(() => {
                    setElapsedTime((prevElapsedTime) => {
                        if (prevElapsedTime + 1 >= MAX_RECORDING_TIME) {
                            stopRecording(); // Stops recording if the max time is reached
                            return MAX_RECORDING_TIME; // Ensures the time doesn't exceed the max limit
                        }
                        return prevElapsedTime + 1; // Increments the elapsed time
                    });
                }, 1000);
            }
        }
        // Temp fix to prevent crash
        if(isResuming)
            drawWaveform();

    }, [state, isResuming]); // Adds `isResuming` to the dependency array

    // Effect to clean up the timer interval when the component unmounts
    useEffect(() => {
        return () => clearInterval(timerRef.current); // Clears the interval to avoid memory leaks
    }, []);


    // Calculates the remaining recording time
    const remainingTime = MAX_RECORDING_TIME - elapsedTime; // Subtracts elapsed time from the max recording time
    const minutesRemaining = Math.floor(remainingTime / 60); // Converts the remaining time to minutes
    const secondsRemaining = remainingTime % 60; // Calculates the remaining seconds

    // Calculates the progress percentage for the progress bar
    const progressPercentage = (elapsedTime / MAX_RECORDING_TIME) * 100; // Converts elapsed time into a percentage

    const drawWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas not found!");
            return;
        }

        // Match parent container's dimensions
        canvas.width = canvas.offsetWidth || 300; // Fallback width
        canvas.height = 150; // Adjust height as needed
        const canvasCtx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;

        if (!analyser || !dataArray) {
            console.error("Analyser or dataArray is not defined!");
            return;
        }

        const draw = () => {
            // Clear the canvas
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the center horizontal line
            canvasCtx.strokeStyle = "#000"; // Black line
            canvasCtx.lineWidth = 1; // Adjust line thickness
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, canvas.height / 2); // Start from the left edge at the middle
            canvasCtx.lineTo(canvas.width, canvas.height / 2); // Draw to the right edge
            canvasCtx.stroke();

            // Check if dataArray is being populated
            analyser.getByteFrequencyData(dataArray);

            const barWidth = (canvas.width / dataArray.length) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                barHeight = dataArray[i] / 2;

                // Gradient for each bar
                const gradient = canvasCtx.createLinearGradient(
                    0,
                    canvas.height / 2,
                    0,
                    canvas.height / 2 - barHeight
                );
                gradient.addColorStop(0, `hsl(${(i / dataArray.length) * 360}, 100%, 50%)`); // Vibrant color
                gradient.addColorStop(1, "#000"); // Black at the bottom
                canvasCtx.fillStyle = gradient;

                // Draw the bar extending up and down from the center
                const yCenter = canvas.height / 2;
                canvasCtx.fillRect(
                    x, // X position
                    yCenter - barHeight / 2, // Start at centerline
                    barWidth, // Width of the bar
                    barHeight // Height of the bar
                );

                x += barWidth + 1; // Space between bars
            }

            animationFrameRef.current = requestAnimationFrame(draw);
        };

        draw();
    };

    const callAjax = (formData, callback) => {
        if (!window.clinical_coach_jsmo_module?.transcribeAudio) {
            console.error("transcribeAudio is undefined in JSMO module!");
            return;
        }

        window.clinical_coach_jsmo_module.transcribeAudio(
            formData,
            (res) => {
                if (callback) callback(res);
            },
            (err) => {
                console.error("transcribeAudio error:", err);
                if (callback) callback();
            }
        );
    };

    const submitRecording = async () => {
        // 1. Ask if user wants to submit recording
        const confirmed = await showConfirmModal({
            title: 'Submit Recording?',
            message: 'Are you sure you want to submit this recording?',
            showConfirm: true,
            showCancel: true,
            confirmText: 'Yes',
            cancelText: 'No',
        });

        if (!confirmed) {
            console.log('User canceled submission.');
            return;
        }

        if (!recordedBlob) {
            console.error("No recording available to submit.");
            return;
        }

        // 2. Show "Recording Submitted!" modal
        const postSubmitConfirm = await showConfirmModal({
            title: 'Recording Submitted!',
            message: "Your recording has been submitted for Clinical Coach analysis. Evaluations should come shortly.",
            showConfirm: true,
            confirmText: 'OK',
        });
        if (!postSubmitConfirm) {
            console.log('User did not confirm submission modal.');
            return;
        }
        
        // 3. Submit the recording to the backend
        try {
            const new_session_time = new Date().toISOString().split('T')[0] + " " + new Date().toLocaleTimeString();
            const tempSessionId = createNewSession(selectedStudent.id);
        
            // Prepare FormData for backend submission
            const formData = new FormData();
            formData.append("file", recordedBlob, "recording.wav");
            formData.append("metadata", JSON.stringify({
              studentId: selectedStudent.id,
              coachId: coach.record_id,
              session_date: new_session_time,
            }));
        
            // Immediately update session to pending placeholder
            updateStudent(selectedStudent.id, (session) => {
              if (session.session_id === tempSessionId) {
                return {
                  ...session,
                  session_id: tempSessionId,
                  transcript: "Transcription pending...",
                  status: "pending",
                };
              }
              return session;
            });
        
            // Fire off AJAX call in the background
            callAjax(formData, async (rawResponse) => {
              try {
                const parsedResponse = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
                const transcription = parsedResponse?.text;
                const sessionId = parsedResponse?.session_id;
                if (transcription && sessionId) {
                  updateStudent(selectedStudent.id, (session) => {
                    if (session.session_id === tempSessionId) {
                      return {
                        ...session,
                        session_id: sessionId,
                        transcript: transcription,
                        status: "pending",
                      };
                    }
                    return session;
                  });
                } else {
                  console.error("[ERROR NO TRANSCRIPTION RECEIVED]:", rawResponse);
                }
              } catch (error) {
                console.error("[ERROR HANDLING TRANSCRIPTION RESPONSE]:", error);
              }
            });
        

            // Navigate immediately to notifications view
            setStage(1);
            navigate('/notifications');
        
        } catch (error) {
            console.error("Error submitting recording:", error);
        }
    };

    const startRecording = async () => {
        try {
            setElapsedTime(0);
            audioChunks.current = [];
            setRecordedBlob(null);
            setPreviewUrl('');

            // Set state to 'recording' and wait for rendering
            setState('recording');
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone stream received:', stream);

            // Initialize Web Audio API
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);

            // Connect the analyser to the audio stream
            source.connect(analyserRef.current);

            // Prepare waveform data array
            analyserRef.current.fftSize = 2048;
            const bufferLength = analyserRef.current.frequencyBinCount;
            dataArrayRef.current = new Uint8Array(bufferLength);

            // Start drawing the waveform
            drawWaveform();

            // Initialize MediaRecorder
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };
            mediaRecorderRef.current.start();

            // Start the timer
            clearTimer(); // Ensure no previous timer is running
            timerRef.current = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access your microphone. Please check your permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Stop waveform animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Clear timer and reset elapsed time
        clearTimer();

        setState('finalized');

        // Package the recorded audio
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                setRecordedBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                audioChunks.current = [];
            };
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();

            setState('paused');
            // Stop waveform animation
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            clearInterval(timerRef.current); // Stop the timer
        } else {
            console.warn('MediaRecorder is not active. Cannot pause.');
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.resume(); // Resumes the MediaRecorder
            setIsResuming(true); // Indicates that the state change to 'recording' is due to a resume action TEMP FIX
            setState('recording'); // Updates the state
            timerRef.current = setInterval(() => {
                setElapsedTime((prevElapsedTime) => prevElapsedTime + 1); // Continues incrementing elapsed time
            }, 1000);
        }
    };

    const restartRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Clear timer and reset all states
        clearInterval(timerRef.current);
        timerRef.current = null;
        audioChunks.current = [];
        setElapsedTime(0); // Reset timer and progress bar
        setRecordedBlob(null); // Clear recorded blob
        setPreviewUrl(''); // Clear preview URL
        setState('pre-record'); // Reset to stage 1
    };

    return (
        <div className="vr_recording-controls">
            {state === 'pre-record' && (
                <div className="veear stage_1">
                    <button className="vr_record-button" onClick={startRecording}>
                        <i className="fas fa-microphone vr_record-icon"></i>
                    </button>
                </div>
            )}

            {state === 'recording' && (
                <div className="veear stage_2">
                    <canvas id="waveform" ref={canvasRef} className="vr_waveform-container"></canvas>
                    <button className="vr_record-button active" onClick={pauseRecording}>
                        <i className="fas fa-pause vr_record-icon"></i>
                    </button>
                </div>
            )}

            {state === 'paused' && (
                <div className="veear stage_3">
                    <div id="waveform" className="vr_waveform-container paused"></div>
                    <div className="vr_buttons">
                        <button className="vr_stop-button" onClick={stopRecording}>
                            <i className="fas fa-stop vr_record-icon"></i>
                        </button>
                        <button className="vr_record-button" onClick={resumeRecording}>
                            <i className="fas fa-microphone vr_record-icon"></i>
                        </button>
                        <button className="vr_restart-button" onClick={restartRecording}>
                            <i className="fas fa-sync-alt vr_record-icon"></i>
                        </button>
                    </div>
                </div>
            )}

            {state === 'finalized' && (
                <div className="veear stage_4">
                    <div className="vr_previews">
                        {previewUrl && (
                            <div className="vr_audio-container">
                                <audio controls key={previewUrl} className="vr_audio-preview">
                                    <source src={previewUrl} type="audio/wav"/>
                                    Your browser does not support the audio element.
                                </audio>
                                <button
                                    className="vr_delete-button"
                                    onClick={() => {
                                        clearTimer(); // Reset the timer
                                        setPreviewUrl('');
                                        setRecordedBlob(null);
                                        setState('pre-record');
                                    }}
                                >
                                    <i className="fas fa-trash-alt vr_record-icon"></i>
                                </button>
                            </div>
                            )}
                    </div>

                    <div className="vr_buttons finalize">
                        <button className="vr_submit-button" onClick={submitRecording}>
                            Submit Recording
                        </button>
                        <button className="vr_record-button" onClick={startRecording}>
                            <i className="fas fa-microphone vr_record-icon"></i>
                        </button>
                    </div>
                </div>
            )}

            {state !== 'finalized' && (
                <>
                    <p className="vr_record-timer">{`${Math.floor(elapsedTime / 60)
                                .toString()
                                .padStart(2, '0')}:${(elapsedTime % 60).toString().padStart(2, '0')}`}</p>

                    <div className="vr_progress-container">
                        <div className="vr_progress-bar">
                            <div
                                className="vr_progress"
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                        </div>
                        <div className="vr_timer-remaining">
                            <span>{`${minutesRemaining
                                .toString()
                                .padStart(2, '0')}:${secondsRemaining
                                .toString()
                                .padStart(2, '0')}`} Mins</span>
                            <b>Remaining</b>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceRecorder;
