import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';

const MAX_RECORDING_TIME = 15 * 60; // 15 minutes in seconds

const VoiceRecorder = () => {
    const [state, setState] = useState('pre-record'); // pre-record, recording, paused, finalized
    const [elapsedTime, setElapsedTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);

    const audioContextRef = useRef(null); // To hold the AudioContext
    const analyserRef = useRef(null); // For frequency data
    const dataArrayRef = useRef(null); // For waveform data
    const canvasRef = useRef(null); // To draw the waveform
    const animationFrameRef = useRef(null); // To manage the animation frame

    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

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

    const startRecording = async () => {
        try {
            console.log('Starting recording process...');
            setElapsedTime(0);
            audioChunks.current = [];
            setRecordedBlob(null);
            setPreviewUrl('');

            // Set state to 'recording' and wait for rendering
            setState('recording');
            await new Promise((resolve) => setTimeout(resolve, 100));
            console.log('Canvas Ref:', canvasRef.current);

            // Check if canvas is ready
            if (!canvasRef.current) {
                throw new Error('Canvas element is not available.');
            }

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
            timerRef.current = setInterval(() => {
                setElapsedTime((prevElapsedTime) => {
                    if (prevElapsedTime + 1 >= MAX_RECORDING_TIME) {
                        stopRecording();
                        return MAX_RECORDING_TIME;
                    }
                    return prevElapsedTime + 1;
                });
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone or initializing Audio API:', error);
            alert('Unable to access your microphone. Please check your permissions.');
        }
    };

    const submitRecording = async () => {
        const formData = new FormData();
        formData.append('file', recordedBlob);

        try {
            const response = await fetch('/your-backend-endpoint', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            console.log('Transcription:', data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            console.log('Recording stopped.');
        }

        // Stop waveform animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        // Reset state values
        setElapsedTime(0); // Reset elapsed time
        setState('finalized'); // Move to finalized state

        // Reset MediaRecorder data when recording stops
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                setRecordedBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));

                // Reset progress and countdown
                audioChunks.current = []; // Clear audio chunks
            };
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            console.log('Recording paused.');
            setState('paused');
            clearInterval(timerRef.current);
        } else {
            console.warn('Cannot pause. MediaRecorder is not in a recording state.');
        }
    };


    const resumeRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
                mediaRecorderRef.current.resume();
                console.log('Recording resumed.');
            } else {
                console.warn('Cannot resume. MediaRecorder is not in a paused state.');
            }

            setState('recording');
            timerRef.current = setInterval(() => {
                setElapsedTime((prevElapsedTime) => prevElapsedTime + 1);
            }, 1000);
        } catch (error) {
            console.error('Error resuming recording:', error);
        }
    };


    const restartRecording = () => {
        // Stop any ongoing recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Clear intervals and reset all states
        clearInterval(timerRef.current);
        timerRef.current = null;
        audioChunks.current = [];
        setElapsedTime(0); // Reset timer
        setRecordedBlob(null); // Clear recorded blob
        setPreviewUrl(''); // Clear preview URL
        setState('pre-record'); // Reset to stage_1
    };

    // Run the recorder
    useEffect(() => {
        if (state === 'recording') {
            console.log('Starting MediaRecorder and timer...');
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.start(); // Start recording
                console.log('MediaRecorder started.');

                // Start the timer
                timerRef.current = setInterval(() => {
                    setElapsedTime((prevElapsedTime) => {
                        if (prevElapsedTime + 1 >= MAX_RECORDING_TIME) {
                            stopRecording();
                            return MAX_RECORDING_TIME;
                        }
                        return prevElapsedTime + 1;
                    });
                }, 1000);
            }
        }
    }, [state]);

    useEffect(() => {
        // Cleanup interval on unmount
        return () => clearInterval(timerRef.current);
    }, []);

    // Calculate remaining time
    const remainingTime = MAX_RECORDING_TIME - elapsedTime;
    const minutesRemaining = Math.floor(remainingTime / 60);
    const secondsRemaining = remainingTime % 60;

    // Calculate progress percentage
    const progressPercentage = (elapsedTime / MAX_RECORDING_TIME) * 100;

    return (
        <div className="vr_recording-controls">
            {state === 'pre-record' && (
                <div className="vr stage_1">
                    <p>Confirm information and press record to start</p>
                    <button className="vr_record-button" onClick={startRecording}>
                        <i className="fas fa-microphone vr_record-icon"></i>
                    </button>
                </div>
            )}

            {state === 'recording' && (
                <div className="vr stage_2">
                    <canvas id="waveform" ref={canvasRef} className="vr_waveform-container"></canvas>
                    <button className="vr_record-button active" onClick={pauseRecording}>
                        <i className="fas fa-pause vr_record-icon"></i>
                    </button>
                </div>
            )}

            {state === 'paused' && (
                <div className="vr stage_3">
                    <div id="waveform" className="vr_waveform-container paused"></div>
                    <div className="vr_buttons">
                        <button className="vr_stop-button" onClick={stopRecording}>
                            <i className="fas fa-stop vr_record-icon"></i>
                        </button>
                        <button className="vr_record-button active" onClick={resumeRecording}>
                            <i className="fas fa-microphone vr_record-icon"></i>
                        </button>
                        <button className="vr_restart-button" onClick={restartRecording}>
                            <i className="fas fa-sync-alt vr_record-icon"></i>
                        </button>
                    </div>
                </div>
            )}

            {state === 'finalized' && (
                <div className="vr stage_4">
                    <div className="vr_previews">
                    <h4>Recordings in this Session</h4>
                        <audio controls>
                            <source src={previewUrl} type="audio/wav"/>
                        </audio>
                        <audio controls>
                            <source src={previewUrl} type="audio/wav"/>
                        </audio>
                    </div>

                    <div className="vr_buttons finalize">
                        <button className="vr_stop-button">
                            <i className="fas fa-stop vr_record-icon"></i>
                        </button>
                        <button className="vr_record-button" onClick={startRecording}>
                            <i className="fas fa-microphone vr_record-icon"></i>
                        </button>
                        <button className="vr_restart-button" onClick={submitRecording}>
                            <i className="fas fa-upload vr_record-icon"></i>
                        </button>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default VoiceRecorder;
