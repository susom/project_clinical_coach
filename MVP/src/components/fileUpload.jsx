import React, { useRef, useState } from 'react';
import { FaPaperclip } from 'react-icons/fa';

function Footer() {
    const [isUploading, setIsUploading] = useState(false);
    const [transcription, setTranscription] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file, file.name);

            setIsUploading(true);

            callAjax(formData, (response) => {
                setIsUploading(false);
                if (response && response.transcription) {
                    setTranscription(response.transcription);
                } else {
                    console.error("Failed to get a transcription from the server.");
                }
            });
        }
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

    return (
        <footer className="footer-container">
            <div className="footer-content">
                <button onClick={() => fileInputRef.current.click()} className="attachment-button" disabled={isUploading}>
                    <FaPaperclip />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="audio/*"
                    onChange={handleFileChange}
                />

                {transcription && (
                    <div>
                        <blockquote>"{transcription}"</blockquote>
                    </div>
                )}
            </div>
        </footer>
    );
}

export default Footer;
