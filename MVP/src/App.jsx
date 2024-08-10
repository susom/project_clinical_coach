import { useState, useRef } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import VoiceRecorder from './VoiceRecorder';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const apiContextRef = useRef([]);

    // Function to handle stopping the recording and processing the audio blob
    const handleStopRecording = async (blob) => {
        // Create FormData and append the recorded audio blob
        const formData = new FormData();
        formData.append('file', blob.blob, 'recording.mp3');

        // Call the backend with the recorded audio blob
        callAjax(formData, (response) => {
            if (response && response.transcription) {
                console.log("Transcription:", response.transcription);
                setAudioUrl(URL.createObjectURL(blob.blob));  // Display the recorded audio
                // Further processing of the transcription if needed...
            } else {
                console.error("Failed to get a transcription from the server.");
            }
        });
    };

    // Function to call the backend API
    const callAjax = (formData, callback) => {
        window.clicnical_coach_jsmo_module.transcribeAudio(formData, (res) => {
            if (res && res.transcription) {
                console.log("Transcription from API:", res.transcription);
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
        <>
            <h1>Clinical Coach - MVP</h1>
            <div className="card">
                <VoiceRecorder
                    setIsRecording={setIsRecording}
                    handleStopRecording={handleStopRecording}
                />
                {audioUrl && (
                    <div style={{ marginTop: '20px' }}>
                        <audio controls src={audioUrl} style={{ width: '100%', maxWidth: '400px' }} />
                    </div>
                )}
            </div>
        </>
    );
}

export default App;
