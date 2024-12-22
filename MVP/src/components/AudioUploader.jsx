import React, { useRef } from 'react';

const AudioUploader = ({ onFileUpload }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileUpload(file);
        }
    };

    return (
        <div>
            <button onClick={() => fileInputRef.current.click()}>Upload Audio</button>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="audio/*"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default AudioUploader;
