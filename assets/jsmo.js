;{
    const module = ExternalModules.Stanford.ClinicalCoach;

    if (!window.ExternalModules.moduleQueuedAjax) {
        console.error("moduleQueuedAjax is not defined!");
    } else {
        console.log("moduleQueuedAjax is defined.");
    }

    Object.assign(module, {
        InitFunction: function () {
            console.log("Calling this InitFunction() after load...", window.clinical_coach_jsmo_module.data);
        },

        getInitialSystemContext: function() {
            return  window.clinical_coach_jsmo_module.data;
        },

        transcribeAudio: async (formData, callback, errorCallback) => {
            try {
                console.log("Starting transcribeAudio...");

                let file;
                for (let pair of formData.entries()) {
                    console.log(pair[0], pair[1]);
                    if (pair[0] === "file") {
                        file = pair[1];
                        console.log("File found in FormData:", file);
                    }
                }

                // Convert the file to Base64
                console.log("Converting file to Base64...");
                const fileBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(",")[1]); // Strip the metadata part
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(file);
                });

                const payload = {
                    file: fileBase64, // Base64-encoded string
                    fileName: formData.get("file").name, // File name
                    fileType: formData.get("file").type, // MIME type
                    metadata: formData.get("metadata"), // Already JSON string
                };
                console.log("Sending payload to module.ajax:", payload);
                const res = await module.ajax("transcribeAudio", payload);


                console.log("Raw response from module.ajax:", res);
                const parsedRes = JSON.parse(res);

                if (parsedRes?.response?.content) {
                    callback(parsedRes.response.content);
                } else {
                    console.error("Failed to parse transcription response:", parsedRes);
                    errorCallback(parsedRes);
                }
            } catch (err) {
                console.error("Error in transcribeAudio:", err);
                errorCallback(err);
            }
        },

        callAI: async (payload, callback, errorCallback) => {
            try {
                const res = await module.ajax('callAI', payload);
                console.log("Raw response from module.ajax:", res, typeof res);

                let parsedRes;
                if (typeof res === "string") {
                    try {
                        parsedRes = JSON.parse(res);
                    } catch (parseError) {
                        console.error("Error parsing response:", parseError);
                        errorCallback?.("Invalid JSON response");
                        return;
                    }
                } else if (typeof res === "object" && res !== null) {
                    parsedRes = res; // Already parsed
                } else {
                    errorCallback?.("Unexpected response format");
                    return;
                }

                console.log("Parsed response:", parsedRes);

                if (parsedRes.summary && Array.isArray(parsedRes.reflections) && parsedRes.final) {
                    // Fully normalized response
                    callback?.(parsedRes);
                } else {
                    console.error("Unexpected response format:", parsedRes);
                    errorCallback?.("Unexpected response format");
                }
            } catch (err) {
                console.error("Error in callAI:", err);
                errorCallback?.(err);
            }
        },

        fetchCoachData: async (recordId) => {
            try {
                // recordId is the selected coach ID
                const payload = { record_id: recordId };
                const res = await module.ajax("fetchCoachData", payload);
                return JSON.parse(res);
            } catch (err) {
                console.error("Error in fetchCoachData:", err);
                throw err;
            }
        },

        fetchStudentsData: async (coachRecordId) => {
            try {
                const payload = { coach_record_id: coachRecordId };
                const res = await module.ajax("fetchStudentsData", payload);

                if (typeof res === "string") {
                    return JSON.parse(res);
                } else if (Array.isArray(res)) {
                    return res;
                } else {
                    console.error("Unexpected response format:", res);
                    return [];
                }
            } catch (err) {
                console.error("Error in fetchStudentsData:", err);
                return [];
            }
        },

    });
}
