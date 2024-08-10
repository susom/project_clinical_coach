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
                // TODO I DOUBT THIS IS THE BEST WORKFLOW
                // TODO I THINK MAYBE BETTER TO TEMPORARILY UPLOAD THE FILE TO A tmp FOLDER, THEN PASS THE tmp file path as payload to JSMO AJAX

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

                console.log("Base64 encoded file:", payload.file_base64);

                // Send the payload via AJAX
                const res = await module.ajax('transcribeAudio', payload);
                let parsedRes = JSON.parse(res);
                if (parsedRes?.transcription) {
                    callback(parsedRes);
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
                let parsedRes = JSON.parse(res);
                if (parsedRes?.response) {
                    callback(parsedRes);
                } else {
                    console.error("Failed to parse response:", res);
                    errorCallback(res);
                }
            } catch (err) {
                console.error("Error in callAI: ", err);
                errorCallback(err);
            }
        },








        //SAVE FOR LATER?
        login: async (payload, callback, errorCallback) => {
            const res = await module.ajax('login', payload);
            let parsed = JSON.parse(res)

            if('error' in parsed) {
                console.error(parsed['error'])
                errorCallback(parsed['error'])
            } else {
                console.log('resolving!')
                callback(parsed)
            }
        },
        verifyPhone: async (payload, callback, errorCallback) => {
            const res = await module.ajax('verifyPhone', payload);
            let parsed = JSON.parse(res)

            if('error' in parsed) {
                console.error(parsed['error'])
                errorCallback(parsed['error'])
            } else {
                callback(parsed)
            }
        }
    });
}
