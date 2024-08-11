import { useState, useRef } from 'react';
import './App.css';
import VoiceRecorder from './VoiceRecorder';
import './assets/mvp.css';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [transcription, setTranscription] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const handleStopRecording = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob.blob, 'recording.mp3');

        callAjax(formData, (response) => {
            if (response && response.transcription) {
                setTranscription(response.transcription);
                setAudioUrl(URL.createObjectURL(blob.blob));
            } else {
                console.error("Failed to get a transcription from the server.");
            }
        });
    };

    const callAjax = (formData, callback) => {
        window.clicnical_coach_jsmo_module.transcribeAudio(formData, (res) => {
            if (res && res.transcription) {
                if (callback) callback(res);
            } else {
                console.log("Unexpected response format:", res);
            }
        }, (err) => {
            console.log("transcribeAudio error:", err);
            if (callback) callback();
        });
    };

    const handleSubmitToAI = () => {
        const chatmlPayload = [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: transcription }
        ];

        callAI(chatmlPayload, (aiContent) => {
            if (aiContent) {
                setAiResponse(aiContent);
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
        <div id="clinicalcoachmvp_container">
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
                {transcription && (
                    <div style={{ marginTop: '20px' }}>
                        <blockquote style={{ fontStyle: 'italic' }}>
                            "{transcription}"
                        </blockquote>
                        <button onClick={handleSubmitToAI} style={{ marginTop: '10px' }}>
                            Submit to AI
                        </button>
                    </div>
                )}
                {aiResponse && (
                    <div style={{ marginTop: '20px' }}>
                        <blockquote style={{ fontStyle: 'italic' }}>
                            "{aiResponse}"
                        </blockquote>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
