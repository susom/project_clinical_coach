;{
    const module = ExternalModules.Stanford.ClinicalCoach;

    if (!window.ExternalModules.moduleQueuedAjax) {
        console.error("moduleQueuedAjax is not defined!");
    } else {
        console.log("moduleQueuedAjax is defined.");
    }

    Object.assign(module, {
        InitFunction: function () {
            console.log("Calling this InitFunction() after load...", window.clicnical_coach_jsmo_module.data);
        },

        getInitialSystemContext: function() {
            return  window.clicnical_coach_jsmo_module.data;
        },

        transcribeAudio: async (formData, callback, errorCallback) => {
            try {
                // Extract the file from FormData
                let file;
                for (let pair of formData.entries()) {
                    if (pair[0] === 'file') {
                        file = pair[1];
                        break;
                    }
                }

                // Convert the file to Base64
                const base64File = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result.split(',')[1]);  // Remove the data URL prefix
                    reader.onerror = error => reject(error);
                });

                // Create a new payload with the Base64-encoded file
                const payload = {
                    file_base64: base64File,
                    fileName: file.name,
                    fileType: file.type
                };

                // Send the payload via AJAX
                const res = await module.ajax('transcribeAudio', payload);
                let parsedRes = JSON.parse(res);

                if (parsedRes?.response?.content) {
                    // Extract the text from the content field
                    const content = JSON.parse(parsedRes.response.content);

                    // Create a new structure with transcription
                    const transcriptionResult = {
                        transcription: content.text
                    };

                    callback(transcriptionResult);
                } else {
                    console.error("Failed to parse transcription response:", res);
                    errorCallback(res);
                }
            } catch (err) {
                console.error("Error in callTranscribe: ", err);
                errorCallback(err);
            }
        },

        callAI: async (payload, callback, errorCallback) => {
            try {
                const res = await module.ajax('callAI', payload);

                // Log the full response for debugging
                // console.log("JSMO Raw response from backend:", res);

                // Try parsing the response
                let parsedRes = JSON.parse(res);

                // Log the parsed response to inspect its structure
                // console.log("JSMO Parsed AI response:", parsedRes);

                // Adjust the structure checks based on the actual response format
                if (Array.isArray(parsedRes)) {
                    // Pass the whole parsed response to the callback for further processing
                    callback(parsedRes);
                } else if (parsedRes?.response?.content) {
                    // If it's a singular response with content
                    callback(parsedRes.response.content);
                } else {
                    console.error("JSMO Unexpected response format:", parsedRes);
                    errorCallback(res);
                }
            } catch (err) {
                console.error("JSMO rror in callAI:", err);
                errorCallback(err);
            }
        }
    });
}
