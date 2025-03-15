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
                const payload = {
                    file: await convertFileToBase64(formData.get("file")),
                    fileName: formData.get("file").name,
                    fileType: formData.get("file").type,
                    metadata: formData.get("metadata"),
                };

                const res = await module.ajax("transcribeAudio", payload);

                if (!res) {
                    console.error("❌ No response received from module.ajax");
                    errorCallback?.("No response from server");
                    return;
                }

                // 🚀 FINAL FIX → Remove extra JSON.parse
                const parsedRes = typeof res === "string" ? JSON.parse(res) : res;

                if (parsedRes?.session_id && parsedRes?.text) {
                    callback?.(parsedRes);
                } else {
                    console.error("❌ Unexpected response format:", parsedRes);
                    errorCallback?.("Unexpected response format");
                }
            } catch (err) {
                console.error("❌ Error in transcribeAudio:", err);
                errorCallback?.(err);
            }
        },

        callAI: async (payload, callback, errorCallback) => {
            try {
                const res = await module.ajax('callAI', payload);
                console.log("Raw response from module.ajax:", res, typeof res);

                let cleanedRes = typeof res === "string" ? cleanAIResponse(res) : res; // 🔥 Apply cleaning function
                console.log("Cleaned AI Response:", cleanedRes);

                let parsedRes;
                if (typeof cleanedRes === "string") {
                    try {
                        parsedRes = JSON.parse(cleanedRes);
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

                if (parsedRes.summary && (Array.isArray(parsedRes.reflections) || typeof parsedRes.reflections === "object") && parsedRes.final) {
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

        updateSession: async (sessionData, callback, errorCallback) => {
            try {
                console.log("Updating session in REDCap...", sessionData);
                const res = await module.ajax("updateSession", sessionData);

                console.log("Raw response from module.ajax (updateSession):", res);
                const parsedRes = JSON.parse(res);

                if (parsedRes.error) {
                    console.error("❌ Failed to update session in REDCap:", parsedRes.error);
                    errorCallback?.(parsedRes.error);
                } else {
                    console.log("✅ Session successfully updated in REDCap!", parsedRes);
                    callback?.(parsedRes);
                }
            } catch (err) {
                console.error("Error in updateSession:", err);
                errorCallback?.(err);
            }
        },

        savePromptRating: async (payload, callback, errorCallback) => {
            try {
                const res = await module.ajax("savePromptRating", payload);
                const parsedRes = JSON.parse(res);

                if (parsedRes.error) {
                    console.error("❌ Failed to update session in REDCap:", parsedRes.error);
                    errorCallback?.(parsedRes.error);
                } else {
                    console.log("✅ Session successfully updated in REDCap!", parsedRes);
                    callback?.(parsedRes);
                }
            } catch (err) {
                console.error("Error in updateSession:", err);
                errorCallback?.(err);
            }
        }
    });
}

// ✅ Helper function to convert file to Base64
async function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function cleanAIResponse(responseText) {
    return responseText.replace(/```json|```/g, "").trim(); 
}
