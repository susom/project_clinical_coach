<?php
namespace Stanford\ClinicalCoach;

require_once "emLoggerTrait.php";

class ClinicalCoach extends \ExternalModules\AbstractExternalModule {

    use emLoggerTrait;

    private \Stanford\SecureChatAI\SecureChatAI $secureChatInstance;
    const BUILD_FILE_DIR = 'MVP/dist/assets';
    const SecureChatInstanceModuleName = 'secure_chat_ai';

    public function __construct() {
		parent::__construct();
		// Other code to run when object is instantiated
	}

    public function generateAssetFiles(): array {
        $cwd = $this->getModulePath();
        $assets = [];

        $full_path = $cwd . self::BUILD_FILE_DIR . '/';
        $dir_files = scandir($full_path);

        // Check if scandir failed
        if ($dir_files === false) {
            $this->emError("Failed to open directory: $full_path");
            return $assets; // Return an empty array or handle the error as needed
        }

        $dir_files = array_diff($dir_files, array('..', '.'));

        foreach ($dir_files as $file) {
            $url = $this->getUrl(self::BUILD_FILE_DIR . '/' . $file);
            $html = '';
            if (str_contains($file, '.js')) {
                $html = "<script type='module' crossorigin src='{$url}'></script>";
            } elseif (str_contains($file, '.css')) {
                $html = "<link rel='stylesheet' href='{$url}'>";
            }
            if ($html !== '') {
                $assets[] = $html;
            }
        }

        return $assets;
    }

    public function appendSystemContext($chatMlArray, $newContext) {
        $hasSystemContext = false;
        for ($i = 0; $i < count($chatMlArray); $i++) {
            if ($chatMlArray[$i]['role'] == 'system' && !empty($chatMlArray[$i]['content'])) {
                $chatMlArray[$i]['content'] .= '\n\n ' . $newContext;
                $hasSystemContext = true;
                break;
            }
        }

        if (!$hasSystemContext) {
            array_unshift($chatMlArray, array("role" => "system", "content" => $newContext));
        }

        return $chatMlArray;
    }
    
    private function getJsonSchemaFor($type) {
        switch ($type) {
            case "summary": 
                return [
                    "type" => "object",
                    "properties" => [
                        "summary_title" => ["type" => "string"],
                        "one_sentence_summary" => ["type" => "string"],
                        "long_summary" => ["type" => "string"],
                        "organization_review" => ["type" => "string"],
                        "certainty_score" => ["type" => "string"]
                    ],
                    "required" => [
                        "summary_title",
                        "one_sentence_summary",
                        "long_summary",
                        "organization_review",
                        "certainty_score"
                    ]
                ]; // JSON schema array

            case "final": 
                return [
                    "type" => "object",
                    "properties" => [
                        "reportTitle" => ["type" => "string"],
                        "version" => ["type" => "string"],
                        "positiveFeedback" => [
                            "type" => "array",
                            "items" => ["type" => "string"]
                        ]
                    ],
                    "required" => ["reportTitle", "version", "positiveFeedback"]
                ];

            case "reflection": 
                    return [
                    "type" => "object",
                    "properties" => [
                        "report_title" => ["type" => "string"],
                        "overall_assessment" => ["type" => "string"],
                        "thm_overall_score" => ["type" => "integer"],
                        "coaching_insights" => [
                            "type" => "object",
                            "properties" => [
                                "positive_feedback" => [
                                    "type" => "array",
                                    "items" => ["type" => "string"]
                                ],
                                "coaching_questions" => [
                                    "type" => "array",
                                    "items" => ["type" => "string"]
                                ]
                            ],
                            "required" => ["positive_feedback", "coaching_questions"]
                        ],
                        "detailed_analysis" => [
                            "type" => "array",
                            "items" => [
                                "type" => "object",
                                "properties" => [
                                    "question" => ["type" => "string"],
                                    "emoji" => ["type" => "string"],
                                    "analysis" => ["type" => "string"],
                                    "ai_certainty_score" => ["type" => "string"],
                                    "supporting_citations" => [
                                        "type" => "object",
                                        "properties" => [
                                            "primary" => [
                                                "type" => "array",
                                                "items" => ["type" => "string"]
                                            ]
                                        ],
                                        "required" => ["primary"]
                                    ]
                                ],
                                "required" => [
                                    "question",
                                    "emoji",
                                    "analysis",
                                    "ai_certainty_score",
                                    "supporting_citations"
                                ]
                            ]
                        ]
                    ],
                    "required" => [
                        "report_title",
                        "overall_assessment",
                        "thm_overall_score",
                        "coaching_insights",
                        "detailed_analysis"
                    ]
                ];

            default: 
                return null;
        }
    }

    public function redcap_module_ajax($action, $payload, $project_id, $record, $instrument, $event_id, $repeat_instance,
                                       $survey_hash, $response_id, $survey_queue_hash, $page, $page_full, $user_id, $group_id) {

        try {
            switch ($action) {
                case "callAI":
                    // Decode incoming payload
                    $data = json_decode($payload, true);
                    if (empty($data['session_id']) || empty($data['coach_id'])) {
                        return json_encode([
                            "error" => true,
                            "message" => "Missing session_id or coach_id in payload."
                        ]);
                    }

                    $session_id = $data['session_id'];
                    $coach_id = $data['coach_id'];
                    $reflection_var = $data['reflection_var'] ?? null;
                    $re_eval_main_and_final = $data['re_eval_main_and_final'] ?? false;

                    // Fetch transcription from REDCap repeating instrument
                    $params = [
                        'project_id' => $this->getProjectId(),
                        'records'    => [$coach_id],
                        'fields'     => ["session_transcript_raw", "session_id"],
                        'forms'      => ['session_logs'],
                        'exportRepeatingInstrumentsEvents' => true,
                        'return_format' => 'array',
                        "filterLogic" => "[session_id] = '$session_id'"
                    ];
                    $session_data = \REDCap::getData($params);

                    // 🔍 Traverse nested structure to find session
                    $transcription = null;

                    if (!empty($session_data[$coach_id]['repeat_instances'])) {
                        foreach ($session_data[$coach_id]['repeat_instances'] as $event_id => $event_data) {
                            if (!empty($event_data['session_logs'])) {
                                foreach ($event_data['session_logs'] as $instance => $session) {
                                    if ($session['session_id'] === $session_id) {
                                        $transcription = $session['session_transcript_raw'];
                                        break 2; // Exit both loops once found
                                    }
                                }
                            }
                        }
                    }

                    if (empty($transcription)) {
                        return json_encode([
                            "error" => true,
                            "message" => "No transcription found for session_id: $session_id"
                        ]);
                    }

                    // Retrieve the main system context and reflection contexts
                    $main_system_context = $this->getProjectSetting("system_context_summarize");
                    $main_system_final = $this->getProjectSetting("system_context_final");
                    $reflection_contexts = array_filter([
                        $this->getProjectSetting("system_context_reflection_1"),
                        $this->getProjectSetting("system_context_reflection_2"),
                        $this->getProjectSetting("system_context_reflection_3"),
                        $this->getProjectSetting("system_context_reflection_4"),
                        $this->getProjectSetting("system_context_reflection_5"),
                        $this->getProjectSetting("system_context_reflection_6"),
                    ]);

                    $model = $this->getProjectSetting("llm-model");
                    $isGPT41 = $model === "gpt-4.1";
                    $defaultParams = [
                        "temperature" => floatval($this->getProjectSetting("gpt-temperature", .7)),
                        "top_p" => floatval($this->getProjectSetting("gpt-top-p", .9)),
                        "frequency_penalty" => floatval($this->getProjectSetting("gpt-frequency-penalty", 0.5)),
                        "presence_penalty" => floatval($this->getProjectSetting("presence_penalty", 0.0)),
                        "max_tokens" => max(intval($this->getProjectSetting("gpt-max-tokens", 1500)), 800)
                    ];

                    if (str_starts_with($model, "gpt-")) {
                        $defaultParams["response_format"] = ["type" => "json_object"];
                    }

                    $results = [
                        "summary" => [
                            "response" => null,
                            "content" => null
                        ],
                        "reflections" => [],
                        "final" => [
                            "response" => null,
                            "content" => null
                        ],
                    ];

                    // Step 1: Process the main system context
                    if ((!$reflection_var || $re_eval_main_and_final) && !empty($main_system_context) ) {
                        $this->emDebug("Calling summary AI with main context", $main_system_context);
                        $customParams = $defaultParams;
                        if ($isGPT41) {
                            $customParams["json_schema"] = $this->getJsonSchemaFor("summary"); 
                        }
                        $summaryResult = $this->processAIResponse(
                            $model,
                            $main_system_context,
                            $transcription,
                            $customParams
                        );
                        $this->emDebug("Summary response raw", $summaryResult);

                        if(!empty($summaryResult["response"]["response"])){
                            $results["summary"]["response"] = $summaryResult["response"]["response"];
                        }

                        if (!empty($summaryResult["content"])) {
                            // 🛠️ Sanitize and validate JSON
                            $sanitizedJson = $this->sanitizeAndCleanJson($summaryResult["content"]);

                            // ✅ Save the result (whether valid JSON or an error message)
                            $updateResult = $this->updateRepeatingInstrument($coach_id, $session_id, 'session_logs', [
                                'sess_main_summary' => $sanitizedJson
                            ]);
                            $this->emDebug("Saved sess_main_summary", $updateResult);

                            // 📝 Log any errors from the update
                            if (!empty($updateResult['errors'])) {
                                $this->emDebug("Error saving sess_main_summary:", $updateResult['errors']);
                            }

                            $jsonResult = json_decode($sanitizedJson, true);
                            $results["summary"]["content"] = $jsonResult;
                        }
                    } else {
                        $results["summary"]["content"] = "Main system context is missing.";
                    }
                    sleep(2);

                    //2. Process the reflections
                    if (!$re_eval_main_and_final) {
                        $reflectionFieldMap = [
                            0 => 'sess_reflect_mind',
                            1 => 'sess_reflect_knowledge',
                            2 => 'sess_reflect_problem',
                            3 => 'sess_reflect_strategy',
                            4 => 'sess_reflect_solution',
                            5 => 'sess_reflect_data'
                        ];
                        foreach ($reflection_contexts as $index => $reflection_context) {

                            $fieldName = $reflectionFieldMap[$index];
                            if ($reflection_var && $reflection_var !== $fieldName) continue;

                            $this->emDebug("Calling reflection AI", $fieldName);
                            if ($isGPT41) {
                                $customParams["json_schema"] = $this->getJsonSchemaFor("reflection"); 
                            }
                            $reflectionResult = $this->processAIResponse(
                                $model,
                                $reflection_context,
                                $transcription,
                                $customParams
                            );
                            $this->emDebug("Reflection response", $index, $reflectionResult);

                            if(!empty($reflectionResult["response"]["response"])){
                                $results["reflections"][$index]["response"] = $reflectionResult["response"]["response"];
                            }

                            if (!empty($reflectionResult["content"])) {
                                // 🛠️ Sanitize and validate JSON
                                $sanitizedJson = $this->sanitizeAndCleanJson($reflectionResult["content"]);

                                // ✅ Save the result (whether valid JSON or an error message)
                                $updateResult = $this->updateRepeatingInstrument($coach_id, $session_id, 'session_logs', [
                                    $reflectionFieldMap[$index] => $sanitizedJson
                                ]);
                                
                                // 📝 Log any errors from the update
                                if (!empty($updateResult['errors'])) {
                                    $this->emDebug("❌ Error saving sess_main_summary:", $updateResult['errors']);
                                }

                                $jsonResult = json_decode($sanitizedJson, true);
                                $results["reflections"][$index]["content"] = $jsonResult;

                                // ✅ If valid JSON (not an error), save thm_overall_score
                                $score = $jsonResult["thm_overall_score"] 
                                    ?? $jsonResult["repaired_json"]["thm_overall_score"] 
                                    ?? null;

                                if ($score !== null) {
                                    $scoreUpdateResult = $this->updateRepeatingInstrument($coach_id, $session_id, 'session_logs', [
                                        $reflectionFieldMap[$index] . "_score" => $score
                                    ]);
                                    $this->emDebug("Score save result", $reflectionFieldMap[$index] . "_score", $scoreUpdateResult);
                                } else {
                                    $this->emDebug("⚠️ Skipping score save — no usable score found:", $jsonResult);
                                }
                            }
                            sleep(1);
                        }
                    }

                    if ((!$reflection_var || $re_eval_main_and_final) && !empty($main_system_final) ) {
                        // 📝 Prepare final messages (system + user input)
                        $finalMessages = [];

                        if ($re_eval_main_and_final) {
                            $reflectionFieldMap = [
                                0 => 'sess_reflect_mind',
                                1 => 'sess_reflect_knowledge',
                                2 => 'sess_reflect_problem',
                                3 => 'sess_reflect_strategy',
                                4 => 'sess_reflect_solution',
                                5 => 'sess_reflect_data'
                            ];
                        
                            $session_data = \REDCap::getData([
                                'project_id' => $this->getProjectId(),
                                'records' => [$coach_id],
                                'fields' => array_values($reflectionFieldMap),
                                'forms' => ['session_logs'],
                                'exportRepeatingInstrumentsEvents' => true,
                                'return_format' => 'array',
                                'filterLogic' => "[session_id] = '$session_id'"
                            ]);
                        
                            foreach ($session_data[$coach_id]['repeat_instances'] as $event_data) {
                                foreach ($event_data['session_logs'] as $session) {
                                    if ($session['session_id'] === $session_id) {
                                        foreach ($reflectionFieldMap as $i => $fieldName) {
                                            if (!empty($session[$fieldName])) {
                                                $parsed = json_decode($session[$fieldName], true);
                                                $results["reflections"][$i]["content"] = $parsed ?: $session[$fieldName];
                                            }
                                        }
                                        break 2;
                                    }
                                }
                            }
                        }

                        if ($this->isGeminiModel($model)) {
                            // 🔹 Gemini-style: Flatten all reflections into one user message
                            $reflectionsConcat = '';
                            foreach ($results["reflections"] as $i => $reflection) {
                                if (!empty($reflection["content"])) {
                                    $reflectionsConcat .= "\n\nReflection " . ($i+1) . ":\n";
                                    $reflectionsConcat .= is_array($reflection["content"])
                                        ? json_encode($reflection["content"], JSON_PRETTY_PRINT)
                                        : $reflection["content"];
                                }
                            }

                            $finalMessages[] = [
                                "role" => "system",
                                "content" => $main_system_final
                            ];

                            $finalMessages[] = [
                                "role" => "user",
                                "content" => $transcription .
                                    "\n\n---\n\nPrior Reflections:\n" . $reflectionsConcat .
                                    "\n\nPlease generate a final self-reflection summary."
                            ];

                        } else {
                            // 🔹 GPT-style: Native ChatML message array
                            $finalMessages[] = ["role" => "system", "content" => $main_system_final];
                            $finalMessages[] = ["role" => "user", "content" => $transcription];

                            foreach ($results["reflections"] as $reflection) {
                                if (!empty($reflection["content"])) {
                                    $finalMessages[] = [
                                        "role" => "assistant",
                                        "content" => is_array($reflection["content"])
                                            ? json_encode($reflection["content"], JSON_PRETTY_PRINT)
                                            : $reflection["content"]
                                    ];
                                }
                            }

                            $finalMessages[] = ["role" => "user", "content" => "Please generate a final self-reflection summary."];
                        }

                        $this->emDebug("Final message payload", $finalMessages);

                        // 🔥 Call AI for final summary
                        $customParams = $defaultParams;
                        if ($isGPT41) {
                            $customParams["json_schema"] = $this->getJsonSchemaFor("final"); 
                        }
                        $finalResponse = $this->getSecureChatInstance()->callAI(
                            $model,
                            array_merge(["messages" => $finalMessages], $customParams),
                            PROJECT_ID
                        );
                        $this->emDebug("Final AI response", $finalResponse);

                        if(!empty($finalResponse["response"]["response"])){
                            $results["final"]["response"] = $finalResponse["response"]["response"];
                        }

                        if (!empty($finalResponse["content"])) {
                            // 🛠️ Sanitize and validate JSON
                            $sanitizedJson = $this->sanitizeAndCleanJson($finalResponse["content"]);

                            // ✅ Save the result (whether valid JSON or an error message)
                            $updateResult = $this->updateRepeatingInstrument($coach_id, $session_id, 'session_logs', [
                                'sess_reflect_summary' => $sanitizedJson
                            ]);

                            // 📝 Log any errors from the update
                            if (!empty($updateResult['errors'])) {
                                $this->emDebug("❌ Error saving sess_main_summary:", $updateResult['errors']);
                            }

                            $jsonResult = json_decode($sanitizedJson, true);
                            $results["final"]["content"] = $jsonResult;
                        }
                    } else {
                        $results["final"]["content"] = "Main system final context is missing.";
                    }

                    $this->emDebug($results);
                    return json_encode($results);
                    exit;

                case "updateSession":
                    $sessionData = json_decode($payload, true);

                    if (empty($sessionData['session_id'])) {
                        return json_encode(["error" => "No session_id provided"]);
                    }

                    $coachId = $sessionData['coach_id'] ?? null;
                    $sessionId = $sessionData['session_id'];
                    $transcript = $sessionData['transcript'] ?? '';
                    $status = $sessionData['status'] ?? 'pending';

                    // 🔥 Locate the correct session instance
                    $fetchParams = [
                        'project_id' => $this->getProjectId(),
                        'fields' => ['record_id', 'session_id'],
                        'forms' => ['session_logs'],
                        'exportRepeatingInstrumentsEvents' => true,
                        'return_format' => 'array'
                    ];
                    $data = \REDCap::getData($fetchParams);

                    $foundInstance = null;

                    if (!empty($data[$coachId]['repeat_instances'])) {
                        foreach ($data[$coachId]['repeat_instances'] as $eventId => $instrumentData) {
                            if (!empty($instrumentData['session_logs'])) {
                                foreach ($instrumentData['session_logs'] as $instanceNum => $row) {
                                    if ($row['session_id'] === $sessionId) {
                                        $foundInstance = $instanceNum;
                                        break 2; // Exit both loops
                                    }
                                }
                            }
                        }
                    }

                    if (!$foundInstance) {
                        return json_encode(["error" => "Session not found"]);
                    }

                    // 🔥 Update the existing session
                    $recordData = [
                        'record_id' => $coachId,
                        'redcap_repeat_instrument' => 'session_logs',
                        'redcap_repeat_instance' => $foundInstance,
                        'session_transcript_raw' => $transcript,
                        'session_status' => $status
                    ];

                    $result = \REDCap::saveData('json', json_encode([$recordData]));

                    return json_encode($result);

                
                
                case "savePromptRating":
                    $data = json_decode($payload, true);
                    if (!$data || empty($data['coach_id']) || empty($data['sess_id']) || empty($data['category']) || empty($data['prompt'])) {
                        return json_encode(["error" => "Missing required parameters"]);
                    }
                
                    $fieldName = "sess_reflect_" . strtolower($data['category']) . "_rating";
                
                    // 🔍 Fetch existing ratings (ensure correct REDCap structure)
                    $existingData = \REDCap::getData([
                        'project_id' => $this->getProjectId(),
                        'records'    => [$data['coach_id']],
                        'fields'     => [$fieldName, 'session_id'],
                        'forms'      => ['session_logs'],
                        'exportRepeatingInstrumentsEvents' => true,
                        'return_format' => 'array'
                    ]);
                
                    $currentRatings = [];
                    $foundInstance = null;
                
                    // ✅ Correctly extract ratings from the nested structure
                    if (!empty($existingData[$data['coach_id']]['repeat_instances'])) {
                        foreach ($existingData[$data['coach_id']]['repeat_instances'] as $eventId => $instances) {
                            if (!empty($instances['session_logs'])) {
                                foreach ($instances['session_logs'] as $instanceNum => $row) {
                                    if ($row['session_id'] === $data['sess_id']) {
                                        $foundInstance = $instanceNum;  // 🔥 Save the correct instance number
                                        if (!empty($row[$fieldName])) {
                                            $currentRatings = json_decode($row[$fieldName], true) ?? [];
                                        }
                                        break 2;
                                    }
                                }
                            }
                        }
                    }
                
                    // 🔄 Update only the relevant prompt, leave others unchanged
                    $found = false;
                    foreach ($currentRatings as &$ratingEntry) {
                        if ($ratingEntry['prompt'] === $data['prompt']) {
                            $ratingEntry['rating'] = $data['rating']; // Update existing rating
                            $found = true;
                            break;
                        }
                    }
                
                    // 🚀 Debug: Log if new prompt is added
                    if (!$found) {
                        $currentRatings[] = [
                            "prompt" => $data['prompt'],
                            "rating" => $data['rating']
                        ];
                    }
                
                    // 🔥 Ensure we have a valid instance to update
                    if ($foundInstance === null) {
                        return json_encode(["error" => "Session not found for updating ratings"]);
                    }
                
                    // ✅ Save back to REDCap in the correct instance
                    $updateResult = $this->updateRepeatingInstrument($data['coach_id'], $data['sess_id'], 'session_logs', [
                        'record_id' => $data['coach_id'],
                        'redcap_repeat_instrument' => 'session_logs',
                        'redcap_repeat_instance' => $foundInstance,  // ✅ Correct instance number
                        $fieldName => json_encode($currentRatings, JSON_PRETTY_PRINT)
                    ]);
                
                    if (!empty($updateResult['errors'])) {
                        return json_encode(["error" => "Failed to save prompt rating", "details" => $updateResult['errors']]);
                    }
                
                    return json_encode([
                        "success" => true,
                        "message" => "Prompt rating saved!",
                        "updated_ratings" => $currentRatings
                    ]);
                    
                
                case "transcribeAudio":
                    // ✅ Extract payload
                    if (!empty($payload['file']) && !empty($payload['fileName'])) {
                        $fileName = $payload['fileName'];
                        $fileContent = base64_decode($payload['file']);
                    } else {
                        $rawInput = file_get_contents('php://input');

                        $inputData = json_decode($rawInput, true);
                        if (!$inputData || empty($inputData['file']) || empty($inputData['fileName'])) {
                            $this->emDebug("Invalid payload received. Missing required fields.", $inputData);
                            return json_encode(["error" => "Invalid payload. Base64 file data or fileName missing."]);
                        }

                        $fileName = $inputData['fileName'];
                        $fileContent = base64_decode($inputData['file']);
                    }

                    // ✅ Save the decoded WAV file
                    $tempFilePath = sys_get_temp_dir() . '/' . uniqid('audio_', true) . '_' . $fileName;

                    if ($fileContent === false) {
                        $this->emDebug("Base64 decoding failed.");
                        return json_encode(["error" => "Failed to decode base64 file data."]);
                    }

                    if (file_put_contents($tempFilePath, $fileContent) === false) {
                        $this->emDebug("Failed to write WAV file:", $tempFilePath);
                        return json_encode(["error" => "Failed to save WAV file."]);
                    }

                    $this->emDebug("WAV file successfully saved:", $tempFilePath);

                    // ✅ Extract Metadata Properly
                    $metadata = json_decode($payload['metadata'] ?? '{}', true);
                    $studentId = $metadata['studentId'] ?? null;
                    $coachId = $metadata['coachId'] ?? null;
                    $sessionDate = $metadata['session_date'] ?? date("Y-m-d H:i:s");

                    if (!$studentId || !$coachId) {
                        $this->emDebug("Missing studentId or coachId, cannot save to REDCap.");
                        unlink($tempFilePath);
                        return json_encode(["error" => "Missing studentId or coachId."]);
                    }

                    // ✅ Whisper API Call
                    $model = "whisper";
                    $params = [
                        'fileName' => $fileName,
                        'file' => $tempFilePath, // Pass WAV directly
                        'language' => 'en',
                        'temperature' => '0.0',
                        'response_format' => 'srt'
                    ];

                    if ($this->getProjectSetting("whisper-language")) {
                        $params["language"] = $this->getProjectSetting("whisper-language");
                    }

                    $this->emDebug("Sending to Whisper API:", $params);

                    try {
                        $response = $this->getSecureChatInstance()->callAI($model, $params, PROJECT_ID);
                    } catch (Exception $e) {
                        $this->emDebug("Whisper API call failed:", $e->getMessage());
                        unlink($tempFilePath);
                        return json_encode(["error" => "Whisper API call failed: " . $e->getMessage()]);
                    }

                    $result = $this->formatResponse($response);
                    $this->emDebug("Formatted Whisper API result:", $result);

                    // Step 1: Store WAV file first
                    $docId = \REDCap::storeFile($tempFilePath, $this->getProjectId());

                    if (!$docId) {
                        $this->emDebug("Failed to store WAV file in REDCap.");
                        unlink($tempFilePath);
                        return json_encode(["error" => "Failed to store WAV file."]);
                    }

                    $newInstanceId = $this->getNextInstanceId($coachId);
                    $sessionId = "{$studentId}-{$newInstanceId}"; // Generate unique session ID

                    // Save Transcription + Metadata to REDCap
                    $recordData = [
                        'record_id' => $coachId,  // Main REDCap record (coach)
                        'redcap_repeat_instrument' => 'session_logs', // Replace with your instrument name
                        'redcap_repeat_instance' => $newInstanceId, // REDCap will auto-assign the next available instance
                        'session_learner_id' => $studentId, // Student associated with the session
                        'session_date' => $sessionDate,
                        'session_transcript_raw' => json_decode($result['response']['content'] ?? '{}', true)['text'] ?? '',
                        'session_audio_raw_1' => $docId, // Store doc_id in the same request
                        'session_id' => $sessionId,
                    ];

                    $saveResult = \REDCap::saveData('json', json_encode([$recordData]));

                    if (!empty($saveResult['errors'])) {
                        $this->emDebug("Failed to save session to REDCap:", $saveResult);
                        unlink($tempFilePath);
                        return json_encode(["error" => "Failed to save session."]);
                    }

                    $this->emDebug("Session + WAV file successfully saved to REDCap!", $saveResult);

                    // Cleanup temp file
                    unlink($tempFilePath);

                    return json_encode([
                        "session_id" => $sessionId, // Include session_id in response
                        "text" => json_decode($result['response']['content'] ?? '{}', true)['text'] ?? '',
                        "status" => "incomplete" // Keep track of processing status
                    ]);

                
                
                case "fetchCoachData":
                    // 1) Extract record_id from $payload
                    $recordId = $payload['record_id'] ?? null;

                    // 2) If no record_id, return error
                    if (empty($recordId)) {
                        return json_encode([ "error" => "No record_id provided" ]);
                    }

                    // 3) Use \REDCap::getData or project APIs to fetch Coach fields
                    $fields = ['record_id','coach_fname','coach_lname','coach_pic', 'coach_profession', 'coach_institution'];
                    $params = [
                        'project_id' => $this->getProjectId(),
                        'records'    => [$recordId],
                        'fields'     => $fields
                    ];
                    $data = \REDCap::getData($params);

                    // 4) Return JSON with relevant details
                    $returnPayload = [];
                    if (!empty($data[$recordId])) {
                        $coachRow = reset($data[$recordId]); // get the first event
                        $returnPayload = [
                            'record_id' => $coachRow['record_id'],
                            'fname'     => $coachRow['coach_fname'] ?? '',
                            'lname'     => $coachRow['coach_lname'] ?? '',
                            'coach_profession'=> $coachRow['coach_profession'] ?? '',
                            'coach_institution'=> $coachRow['coach_institution'] ?? '',
                            'coach_pic'=> $coachRow['coach_pic'] ?? ''
                        ];
                    }
                    return json_encode($returnPayload);


                case "fetchStudentsData":
                    $coachRecordId = $payload['coach_record_id'] ?? null;
                    if (empty($coachRecordId)) {
                        return json_encode(["error" => "No coach_record_id provided"]);
                    }

                    // 1) Fetch all learners for this coach (record=2) from the "learners" instrument
                    $learnerParams = [
                        'project_id' => $this->getProjectId(),
                        'records'    => [$coachRecordId],
                        'fields'     => ['learner_id','learner_fname','learner_lname','learner_pic'],
                        'forms'      => ['learners'],
                        'exportRepeatingInstrumentsEvents' => true,
                        'return_format' => 'array'
                    ];
                    $learnerData = \REDCap::getData($learnerParams);

                    $students = [];

                    // Make sure we see repeating_instances
                    if (!empty($learnerData[$coachRecordId]['repeat_instances'])) {
                        $repeat = $learnerData[$coachRecordId]['repeat_instances'];
                        // 'learners' is presumably at $repeat[event_id]['learners']
                        // We'll assume there's one event => $repeat[$eventId]
                        foreach ($repeat as $eventId => $instrumentData) {
                            if (!empty($instrumentData['learners'])) {
                                foreach ($instrumentData['learners'] as $instanceNum => $row) {
                                    $learnerId = $row['learner_id'] ?? null;
                                    if (!$learnerId) continue;

                                    // 2) For each learner, fetch their sessions
                                    $sessions = [];
                                    $sessions = $this->fetchSessionsForLearner($coachRecordId, $learnerId);

                                    // Build final structure
                                    $students[] = [
                                        'id' => $learnerId,
                                        'name' => trim(($row['learner_fname'] ?? '') . ' ' . ($row['learner_lname'] ?? '')),
                                        'profilePicture' => $row['learner_pic'] ?? null,
                                        'sessions' => $sessions
                                    ];
                                }
                            }
                        }
                    }

                    // if (empty($students)) {
                    //     $this->emDebug("No students found for coach $coachRecordId");
                    // } else {
                    //     $this->emDebug("Found students (including sessions) for coach $coachRecordId", $students);
                    // }

                    return json_encode($students);

                
                
                default:
                    throw new Exception("Action $action is not defined");

            }
        } catch(\Exception $e) {
            $this->emError($e);
            return json_encode([
                "error" => $e->getMessage(),
                "success" => false
            ]);
        }
    }


    private function isGeminiModel($model) {
        return stripos($model, 'gemini') !== false;
    }


    public function formatResponse($response) {
        $content = $this->getSecureChatInstance()->extractResponseText($response);
        $role = $response['choices'][0]['message']['role'] ?? 'assistant';
        $id = $response['id'] ?? null;
        $model = $response['model'] ?? null;
        $usage = $response['usage'] ?? null;

        $formattedResponse = [
            'response' => [
                'role' => $role,
                'content' => $content
            ],
            'id' => $id,
            'model' => $model,
            'usage' => $usage
        ];

        return $formattedResponse;
    }

    /**
     * Processes an AI response by preparing messages, making the request, and cleaning the result.
     *
     * @param string $model The AI model to use.
     * @param string $systemContext The system prompt for AI guidance.
     * @param string $userInput The user's input (e.g., transcript).
     * @param array $defaultParams Default AI request parameters.
     * @return array An array containing the structured response and cleaned JSON content.
     */
    function processAIResponse($model, $systemContext, $userInput, $defaultParams) {
        try {
            // 📝 Prepare AI request payload
            $messages = [
                ["role" => "system", "content" => $systemContext],
                ["role" => "user", "content" => $userInput]
            ];
            
            // Call AI securely
            $response = $this->getSecureChatInstance()->callAI(
                $model,
                array_merge(["messages" => $messages], $defaultParams),
                PROJECT_ID
            );

            // Process and clean response
            $result = $this->formatResponse($response);
            $cleanedContent = $this->sanitizeAndCleanJson($result['response']['content'] ?? '');

            $this->emDebug("processAIResponse", [
                "response" => $result,
                "content" => $cleanedContent
            ]);
            // Return structured result
            return [
                "response" => $result,
                "content" => $cleanedContent
            ];
        } catch (Exception $e) {
            $this->emDebug("AI Processing Error", $e->getMessage(), $e->getTraceAsString());
            return [
                "response" => null,
                "content" => "Error generating response: " . $e->getMessage()
            ];
        }
    }

    private function fetchSessionsForLearner($coachRecordId, $learnerId) {
        $params = [
            'project_id' => $this->getProjectId(),
            'records'    => [$coachRecordId],
            'fields'     => [
                'session_id', 'session_learner_id', 'session_date', 'session_transcript_raw',
                'sess_reflect_mind', 'sess_reflect_mind_score', 'sess_reflect_mind_rating',
                'sess_reflect_knowledge', 'sess_reflect_knowledge_score', 'sess_reflect_knowledge_rating',
                'sess_reflect_problem', 'sess_reflect_problem_score', 'sess_reflect_problem_rating',
                'sess_reflect_strategy', 'sess_reflect_strategy_score', 'sess_reflect_strategy_rating',
                'sess_reflect_solution', 'sess_reflect_solution_score', 'sess_reflect_solution_rating',
                'sess_reflect_data', 'sess_reflect_data_score', 'sess_reflect_data_rating',
                'sess_reflect_summary', 'sess_main_summary'
            ],
            'forms' => ['session_logs'],
            'filterLogic' => '[session_learner_id] = "' . db_escape($learnerId) . '"',
            'exportRepeatingInstrumentsEvents' => true,
            'return_format' => 'array'
        ];
    
        $sessionData = \REDCap::getData($params);
        $sessions = [];
    
        if (!empty($sessionData[$coachRecordId]['repeat_instances'])) {
            foreach ($sessionData[$coachRecordId]['repeat_instances'] as $eventId => $instrumentData) {
                if (!empty($instrumentData['session_logs'])) {
                    foreach ($instrumentData['session_logs'] as $instanceNum => $row) {
                        if (($row['session_learner_id'] ?? '') == $learnerId) {
    
                            // 🧼 Decode and normalize reflection content
                            $normalize = function ($raw) {
                                $parsed = json_decode($raw ?? '', true);
                                if (isset($parsed['repaired_json'])) {
                                    return $parsed['repaired_json']; // ✅ Serve only the repaired part
                                }
                                return $parsed;
                            };
    
                            $sessions[] = [
                                'session_id' => $row['session_id'],
                                'learner_id' => $learnerId,
                                'session_date' => $row['session_date'] ?? '',
                                'transcript' => $row['session_transcript_raw'] ?? '',
                                'reflections' => [
                                    'mind' => [
                                        'content' => $normalize($row['sess_reflect_mind']),
                                        'score'   => $row['sess_reflect_mind_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_mind_rating'] ?? '[]', true)
                                    ],
                                    'knowledge' => [
                                        'content' => $normalize($row['sess_reflect_knowledge']),
                                        'score'   => $row['sess_reflect_knowledge_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_knowledge_rating'] ?? '[]', true)
                                    ],
                                    'problem' => [
                                        'content' => $normalize($row['sess_reflect_problem']),
                                        'score'   => $row['sess_reflect_problem_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_problem_rating'] ?? '[]', true)
                                    ],
                                    'strategy' => [
                                        'content' => $normalize($row['sess_reflect_strategy']),
                                        'score'   => $row['sess_reflect_strategy_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_strategy_rating'] ?? '[]', true)
                                    ],
                                    'solution' => [
                                        'content' => $normalize($row['sess_reflect_solution']),
                                        'score'   => $row['sess_reflect_solution_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_solution_rating'] ?? '[]', true)
                                    ],
                                    'data' => [
                                        'content' => $normalize($row['sess_reflect_data']),
                                        'score'   => $row['sess_reflect_data_score'] ?? '',
                                        'rating'  => json_decode($row['sess_reflect_data_rating'] ?? '[]', true)
                                    ]
                                ],
                                'summary' => $normalize($row['sess_main_summary']),
                                'thm_report' => $normalize($row['sess_reflect_summary'])
                            ];
                        }
                    }
                }
            }
        }
    
        $this->emDebug($sessions);
        return $sessions;
    }
    
    public function getFeedbackURL(){
        $url = $this->getProjectSetting("feedback-url");
        return empty($url) ? null : $url;
    }

    // In ClinicalCoach.php
    public function getCoaches($user_id=null): array
    {
        $filter_by_user = !is_null($user_id) ? ' && [coach_sunet] =  "'.$user_id.'"' : "";
        $fields = ['record_id', 'coach_fname', 'coach_lname', 'coach_consent_agree'];
        $params = [
            'project_id'  => $this->getProjectId(),
            'fields'      => $fields,
            'filterLogic' => '[coach_consent_agree(1)] = "1"' . $filter_by_user
        ];
        $allData = \REDCap::getData($params);

        $coachesList = [];
        foreach ($allData as $recordId => $events) {
            // $events is an array keyed by event_id
            foreach ($events as $eventId => $row) {
                $coachesList[] = [
                    'record_id' => $row['record_id'],
                    'fname'     => $row['coach_fname'],
                    'lname'     => $row['coach_lname']
                ];
            }
        }

        // If no coaches, insert a placeholder with USERID
        if (empty($coachesList)) {
            $coachesList = [[
                "record_id" => null, // No valid coach
                "fname" => USERID, // Show USERID in place of first name
                "lname" => "(Not Found)" // Indicate no coach found
            ]];
        }

        return $coachesList;
    }

    /**
     * Cleans and safely decodes JSON content from AI responses.
     *
     * @param string $jsonString The raw JSON string from AI.
     * @return array|null Returns a decoded array or null on failure.
     */
    private function sanitizeAndCleanJson($jsonString, $allowRepair = true) {
        $json = trim($jsonString);
        $json = preg_replace('/^```(?:json)?\s*/', '', $json);
        $json = preg_replace('/```$/', '', $json);
        $json = preg_replace('/^[^{]*(\{.*\})[^}]*$/s', '$1', $json);
    
        $json = str_replace(["\\n", "\\r", "\n", "\r"], ' ', $json);
        $json = preg_replace('/\\\\+/', '\\', $json);
        $json = preg_replace('/\\\\"/', '"', $json);
    
        $json = preg_replace('/\$[a-zA-Z0-9_]+\$/', '"Unknown"', $json);
        $json = preg_replace('/\{(\w+)\}:/', '"$1":', $json);
        $json = preg_replace('/supporting_citations\s*"?:/', '"supporting_citations":', $json);
    
        $patterns = [
            '/([{,])\s*(\w+)\s*:/',
            '/"([^"]+)"\s*:\s*,/',
            '/,\s*([}\]])/',
            '/"([^"]+)"\s+"([^"]+)"/',
            '/"([^"]+)"\s*:\s*"([^"]+)"\s*"([^"]+)"\s*:/',
            '/""(\w+)"/',
            '/"(\w+)"\s*:[\s\n]*""/',
        ];
        $replacements = [
            '$1"$2":',
            '',
            '$1',
            '"$1": "$2"',
            '"$1": "$2", "$3":',
            '"$1"',
            '',
        ];
        $json = preg_replace($patterns, $replacements, $json);
    
        $json = preg_replace_callback('/"([^"]+)"\s*:/', function ($matches) {
            $key = preg_replace('/\s+/', '_', trim($matches[1]));
            return "\"$key\":";
        }, $json);
    
        $json = preg_replace('/_{2,}/', '_', $json);
        $json = preg_replace('/}(?:(?!\}).)*$/s', '}', $json);
    
        $decoded = json_decode($json, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $this->finalCleanAndEncode($decoded);
        }
    
        $this->emDebug("Bad JSON Detected", ["error" => json_last_error_msg()]);
    
        if ($allowRepair === false) {
            // STOP! This was called from repairJsonWithAI. Don't try to repair again.
            $fallback = json_encode([
                "error" => "Invalid JSON detected: " . json_last_error_msg(),
                "broken_json" => substr($json, 0, 4000),
                "attempted_ai_repair" => true,
                "repair_status" => "failed"
            ], JSON_PRETTY_PRINT);
    
            $this->emDebug("❌ Recursive repair blocked. Returning fallback.", $fallback);
            return $fallback;
        }
    
        $repaired = $this->repairJsonWithAI($json);
        if ($repaired) {
            $this->emDebug("AI one-shot JSON repair succeeded.");
            return json_encode([
                "attempted_ai_repair" => true,
                "repaired_json" => json_decode($repaired, true)
            ], JSON_PRETTY_PRINT);
        }
    
        $fallback = json_encode([
            "error" => "Invalid JSON detected: " . json_last_error_msg(),
            "broken_json" => substr($json, 0, 4000),
            "attempted_ai_repair" => true,
            "repair_status" => "failed"
        ], JSON_PRETTY_PRINT);
    
        $this->emDebug("❌ AI one-shot repair failed. Saving fallback JSON.", $fallback);
        return $fallback;
    }
    
    private function repairJsonWithAI($brokenJson) {
        // Try to extract the most JSON-like inner payload first (balanced braces).
        $candidate = $this->extractFirstBalancedJsonObject($brokenJson);
        if ($candidate !== null) {
            $brokenJson = $candidate;
        }

        $prompt = <<<EOT
    You are a JSON repair assistant. Return ONLY a corrected JSON value (object or array). 
    No markdown, no code fences, no text. Output must begin with '{' or '[' and end with the matching '}' or ']'.

    Broken JSON:
    $brokenJson
    EOT;

        $maxAttempts = 3;

        for ($i = 1; $i <= $maxAttempts; $i++) {
            try {
                $resp = $this->getSecureChatInstance()->callAI(
                    $this->getProjectSetting("llm-model"),
                    [
                        "messages" => [
                            ["role" => "system", "content" => "Fix malformed JSON. Output raw JSON only."],
                            ["role" => "user", "content" => $prompt]
                        ],
                        "temperature" => 0,
                        "max_tokens" => 1500
                    ],
                    PROJECT_ID
                );

                if (empty($resp["content"])) {
                    $this->emDebug("Attempt $i: empty AI content");
                    continue;
                }

                $raw = trim($resp["content"]);

                // Hard guard: reject non-JSON wrappers/fences
                $startsOk = (strlen($raw) > 0 && ($raw[0] === '{' || $raw[0] === '['));
                $endsOk   = (substr($raw, -1) === '}' || substr($raw, -1) === ']');
                if (!($startsOk && $endsOk)) {
                    $this->emDebug("Attempt $i: AI output not raw JSON start/end", mb_substr($raw, 0, 200));
                    continue;
                }

                // Deep decode: handle JSON-of-JSON
                $try = $this->deepJsonDecode($raw);
                if ($try['ok']) {
                    // Return pretty JSON string; caller won’t re-sanitize.
                    return json_encode($try['value'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                } else {
                    $this->emDebug("Attempt $i: decode error", $try['error'], mb_substr($raw, 0, 200));
                }
            } catch (\Exception $e) {
                $this->emDebug("Attempt $i: AI repair exception", $e->getMessage());
            }
        }

        return null;
    }

    
    private function finalCleanAndEncode($decoded) {
        $cleaned = function ($data) use (&$cleaned) {
            if (is_array($data)) {
                $out = [];
                foreach ($data as $k => $v) {
                    $k = preg_replace('/[\s_]+/', '_', trim($k));
                    $k = preg_replace('/_{2,}/', '_', $k);
                    $out[$k] = $cleaned($v);
                }
                return $out;
            } elseif (is_string($data)) {
                return trim(str_replace(["\n", "\r"], ' ', $data));
            }
            return $data;
        };
        return json_encode($cleaned($decoded), JSON_PRETTY_PRINT);
    }
    
    /**
     * Updates a specific repeating instrument instance in REDCap
     *
     * @param string $recordId - The top-level record identifier (e.g., coach_id)
     * @param string $instanceId - The unique session identifier (e.g., session_id)
     * @param string $instrument - The name of the REDCap repeating instrument
     * @param array $updateFields - Associative array of fields to update
     *
     * @return array - REDCap saveData response
     */
    private function updateRepeatingInstrument($recordId, $instanceId, $instrument, $updateFields) {
        // Fetch existing data to find the correct repeating instance
        $fetchParams = [
            'project_id' => $this->getProjectId(),
            'fields' => ['record_id', 'session_id'],  // Modify if the unique field changes
            'forms' => [$instrument],
            'exportRepeatingInstrumentsEvents' => true,
            'return_format' => 'array'
        ];
        $data = \REDCap::getData($fetchParams);

        $foundInstance = null;

        // 🔍 Locate the matching instance
        if (!empty($data[$recordId]['repeat_instances'])) {
            foreach ($data[$recordId]['repeat_instances'] as $eventId => $instrumentData) {
                if (!empty($instrumentData[$instrument])) {
                    foreach ($instrumentData[$instrument] as $instanceNum => $row) {
                        if ($row['session_id'] === $instanceId) {  // Adjust this if another field should be used
                            $foundInstance = $instanceNum;
                            break 2; // Exit both loops once found
                        }
                    }
                }
            }
        }

        // 🔥 If session is not found, return an error
        if (!$foundInstance) {
            return ["error" => "Instance not found for $instanceId in $instrument"];
        }

        // 🔥 Build the record data for saving
        $recordData = array_merge([
            'record_id' => $recordId,
            'redcap_repeat_instrument' => $instrument,
            'redcap_repeat_instance' => $foundInstance
        ], $updateFields);


        // 🔥 Save data to REDCap
        $result = \REDCap::saveData('json', json_encode([$recordData]));

        // ✅ Log errors if any
        if (!empty($result['errors'])) {
            \ExternalModules\ExternalModules::emDebug("Error updating $instrument for $instanceId:", $result['errors']);
        }

        return $result;
    }

    private function getNextInstanceId($coachId)
    {
        $this->emDebug("getNextInstanceId() Fetching highest session_log instance for coach: $coachId...");

        $fetchParams = [
            'project_id' => $this->getProjectId(),
            'records'    => [$coachId], // Filter by coach
            'fields'     => ['record_id', 'session_learner_id', 'session_id'],
            'forms'      => ['session_logs'], // Explicitly fetch session_logs
            'exportRepeatingInstrumentsEvents' => true, // Required for repeating instances
            'return_format' => 'array'
        ];

        $data = \REDCap::getData($fetchParams);
        // $this->emDebug("📌 FULL RAW DATA RETURNED FROM REDCap:", $data);

        $highestInstance = 0; // Default to 0 if no sessions exist

        if (!empty($data[$coachId]['repeat_instances'])) {
            foreach ($data[$coachId]['repeat_instances'] as $eventId => $instrumentData) {
                if (!empty($instrumentData['session_logs'])) {
                    // 🔥 Extract the highest session_log instance key
                    $sessionInstances = array_keys($instrumentData['session_logs']);
                    $numericInstances = array_filter($sessionInstances, 'is_numeric'); // Ensure numeric keys
                    if (!empty($numericInstances)) {
                        $highestInstance = max($numericInstances);
                    }
                }
            }
        } else {
            $this->emDebug("No session logs found for coach: $coachId");
        }

        $nextInstance = $highestInstance + 1;
        $this->emDebug("Highest found: $highestInstance → Returning new instance: $nextInstance");

        return $nextInstance;
    }

    /**
     * @return \Stanford\SecureChatAI\SecureChatAI
     * @throws \Exception
     */
    public function getSecureChatInstance(): \Stanford\SecureChatAI\SecureChatAI
    {
        if(empty($this->secureChatInstance)){
            $this->setSecureChatInstance(\ExternalModules\ExternalModules::getModuleInstance(self::SecureChatInstanceModuleName));
            return $this->secureChatInstance;
        }else{
            return $this->secureChatInstance;
        }
    }

    /**
     * @param \Stanford\SecureChatAI\SecureChatAI $secureChatInstance
     */
    public function setSecureChatInstance(\Stanford\SecureChatAI\SecureChatAI $secureChatInstance): void
    {
        $this->secureChatInstance = $secureChatInstance;
    } 
}
