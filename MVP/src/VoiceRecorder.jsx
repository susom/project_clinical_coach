import React, { useState, useEffect, useRef } from 'react';
import { ReactMic } from 'react-mic';

const VoiceRecorder = ({ setIsRecording, handleStopRecording }) => {
    const [record, setRecord] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    const silenceThreshold = -40; // Threshold in dB
    const silenceDurationMs = 2000; // Duration in milliseconds
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const silenceStartRef = useRef(null);
    const silenceDurationRef = useRef(0);
    const checkSilenceIntervalRef = useRef(null);
    const mediaStreamRef = useRef(null);

    const startRecording = async () => {
        console.log('Recording started...');
        setRecord(true);
        setIsRecording(true);
        setAudioUrl(null);  // Clear previous recording
        await setupAudioContext();
        setupSilenceDetection();
    };

    const stopRecording = () => {
        console.log('Recording stopped...');
        setRecord(false);
        setIsRecording(false);
        if (checkSilenceIntervalRef.current) {
            clearInterval(checkSilenceIntervalRef.current);
            checkSilenceIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const onStop = (recordedBlob) => {
        console.log('Recording stopped, blob:', recordedBlob);

        if (recordedBlob && recordedBlob.blob) {
            console.log('Blob size:', recordedBlob.blob.size);
            console.log('Blob type:', recordedBlob.blob.type);

            const url = URL.createObjectURL(recordedBlob.blob);
            console.log('Generated audio URL:', url);

            setAudioUrl(url);
            console.log('audioUrl set:', url);

            setIsProcessing(false);
        } else {
            console.error('Recorded blob is empty or undefined!');
        }

        handleStopRecording && handleStopRecording(recordedBlob);
    };

    const setupAudioContext = async () => {
        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 2048;
            console.log('AudioContext and AnalyserNode set up successfully.');
        } catch (error) {
            console.error('Failed to set up AudioContext:', error);
        }
    };

    const setupSilenceDetection = () => {
        console.log('Setting up silence detection');
        try {
            const bufferLength = analyserRef.current.fftSize;
            const dataArray = new Uint8Array(bufferLength);

            silenceStartRef.current = null;
            silenceDurationRef.current = 0;

            checkSilenceIntervalRef.current = setInterval(() => {
                analyserRef.current.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const amplitude = (dataArray[i] - 128) / 128;
                    sum += amplitude * amplitude;
                }
                const rms = Math.sqrt(sum / bufferLength);
                const db = 20 * Math.log10(rms);

                // console.log(`Current dB level: ${db.toFixed(2)} (Threshold: ${silenceThreshold})`);

                if (db < silenceThreshold) {
                    if (silenceStartRef.current === null) {
                        silenceStartRef.current = Date.now();
                        silenceDurationRef.current = 0;
                        console.log(`Silence started at: ${silenceStartRef.current}`);
                    } else {
                        const silenceDurationElapsed = Date.now() - silenceStartRef.current;
                        silenceDurationRef.current += 100;
                        console.log(`Silence duration elapsed: ${silenceDurationRef.current}ms`);
                        if (silenceDurationRef.current >= silenceDurationMs) {
                            console.log('Silence threshold reached, stopping recording');
                            stopRecording(); // Stop the recording when silence is detected
                        }
                    }
                } else {
                    if (silenceStartRef.current !== null) {
                        console.log('Silence ended, resetting silenceStartRef');
                        silenceStartRef.current = null;
                        silenceDurationRef.current = 0;
                    }
                }
            }, 100); // Check every 100ms
        } catch (error) {
            console.error(`Failed to set up audio analysis: ${error}`);
        }
    };

    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (checkSilenceIntervalRef.current) {
                clearInterval(checkSilenceIntervalRef.current);
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div style={{ textAlign: 'center' }}>
            <button
                onClick={record ? stopRecording : startRecording}
                style={{
                    backgroundColor: record ? 'red' : isProcessing ? 'gray' : 'green',
                    color: 'white',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    marginBottom: '10px',
                    padding: '10px 20px',
                    borderRadius: '5px',
                }}
                disabled={isProcessing}
            >
                {record ? 'Stop Recording...' : isProcessing ? 'Processing...' : 'Start Recording'}
            </button>

            <div style={{ margin: '20px auto', width: '300px', height: '100px', display: record ? 'block' : 'none' }} className="react_mic_container">
                <ReactMic
                    className="react_mic"
                    record={record}
                    onStop={onStop}
                    strokeColor="#FF4081"
                    backgroundColor="#000000"
                    style={{ width: '100%', height: 'auto', borderRadius: '5px' }}
                />
            </div>

            {audioUrl && (
                <div style={{ marginTop: '20px' }}>
                    <audio controls src={audioUrl} style={{ width: '100%', maxWidth: '400px' }} />
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;
