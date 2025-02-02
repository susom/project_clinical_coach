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
     * Normalize the results into a consistent JSON structure for the frontend.
     *
     * @param array $results The original results array.
     * @return array The normalized structure.
     */
    public function normalizeAIEvalResults($results) {
        try {
            $normalized = [
                "summary" => [],
                "reflections" => [],
                "final" => []
            ];

            // Normalize Summary
            if (!empty($results['summary']['response']['response']['content'])) {
                $summaryContent = json_decode($results['summary']['response']['response']['content'], true);
                $normalized['summary'] = $summaryContent ?: [];
            } else {
                $normalized['summary'] = [
                    "error" => "Summary content is missing or invalid."
                ];
            }

            // Normalize Reflections
            if (!empty($results['reflections']) && is_array($results['reflections'])) {
                foreach ($results['reflections'] as $reflection) {
                    if (!empty($reflection['response']['response']['content'])) {
                        $reflectionContent = json_decode($reflection['response']['response']['content'], true);
                        $normalized['reflections'][] = $reflectionContent ?: [
                            "error" => "Reflection content is missing or invalid."
                        ];
                    } else {
                        $normalized['reflections'][] = [
                            "error" => "Reflection response content is missing."
                        ];
                    }
                }
            } else {
                $normalized['reflections'] = [
                    "error" => "Reflections are missing or not an array."
                ];
            }

            // Normalize Final
            if (!empty($results['final']['response']['response']['content'])) {
                $finalContent = json_decode($results['final']['response']['response']['content'], true);
                $normalized['final'] = $finalContent ?: [
                    "error" => "Final content is missing or invalid."
                ];
            } else {
                $normalized['final'] = [
                    "error" => "Final response content is missing."
                ];
            }

            return $normalized;
        } catch (Exception $e) {
            return [
                "error" => "An error occurred during normalization: " . $e->getMessage()
            ];
        }
    }

    public function redcap_module_ajax($action, $payload, $project_id, $record, $instrument, $event_id, $repeat_instance,
                                       $survey_hash, $response_id, $survey_queue_hash, $page, $page_full, $user_id, $group_id) {

        try {
            switch ($action) {
                case "callAI":
                    $messages = json_decode($payload, 1);

                    // Validate payload
                    if (empty($messages['transcription'])) {
                        $this->emDebug("No transcription data provided in payload.");
                        return json_encode([
                            "error" => true,
                            "message" => "Transcription data is required."
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

                    $results = [
                        "summary" => null,
                        "reflections" => [],
                        "final" => null,
                    ];

                    $model = $this->getProjectSetting("llm-model");
                    $defaultParams = [
                        "temperature" => floatval($this->getProjectSetting("gpt-temperature", .7)),
                        "top_p" => floatval($this->getProjectSetting("gpt-top-p", .9)),
                        "frequency_penalty" => floatval($this->getProjectSetting("gpt-frequency-penalty", 0.5)),
                        "presence_penalty" => floatval($this->getProjectSetting("presence_penalty", 0.0)),
                        "max_tokens" => max(intval($this->getProjectSetting("gpt-max-tokens", 1500)), 800),
                        "format" => "json",
                    ];

                    $this->emDebug("Selected model:", $model);

                    // Step 1: Process the main summary
                    if (!empty($main_system_context)) {
                        try {
                            $mainSummaryMessages = [
                                ["role" => "system", "content" => $main_system_context],
                                ["role" => "user", "content" => $messages['transcription']],
                            ];

                            $mainSummaryResponse = $this->getSecureChatInstance()->callAI(
                                $model,
                                array_merge(["messages" => $mainSummaryMessages], $defaultParams),
                                PROJECT_ID
                            );
                            $mainSummaryResult = $this->formatResponse($mainSummaryResponse);
                            $results["summary"] = [
                                "response" => $mainSummaryResult,
                                "content" => $mainSummaryResult['response']['content'] ?? "No summary generated",
                            ];
                        } catch (Exception $e) {
                            $results["summary"] = [
                                "response" => null,
                                "content" => "Error generating summary: " . $e->getMessage(),
                            ];
                        }
                    } else {
                        $results["summary"] = [
                            "response" => null,
                            "content" => "Main system context is missing.",
                        ];
                    }

//                    $this->emDebug("main summary result", $results);
//                    break;

                    // Step 2: Process the reflections
                    foreach ($reflection_contexts as $index => $reflection_context) {
                        try {
                            $currentMessages = [
                                ["role" => "system", "content" => $reflection_context],
                                ["role" => "user", "content" => $messages['transcription']],
                            ];

                            $response = $this->getSecureChatInstance()->callAI(
                                $model,
                                array_merge(["messages" => $currentMessages], $defaultParams),
                                PROJECT_ID
                            );
                            $result = $this->formatResponse($response);
                            $results["reflections"][] = [
                                "reflection_context" => "Reflection " . ($index + 1),
                                "response" => $result,
                                "content" => $result['response']['content'] ?? '',
                            ];
                        } catch (Exception $e) {
                            $results["reflections"][] = [
                                "reflection_context" => "Reflection " . ($index + 1),
                                "response" => null,
                                "content" => "Error generating reflection.",
                            ];
                        }
                    }

                    // Step 3: Consolidate reflections and make final API call
                    if (!empty($main_system_final)) {
                        try {
                            $finalMessages = [
                                ["role" => "system", "content" => $main_system_final],
                                ["role" => "user", "content" => $messages['transcription']],
                            ];

                            // Append all reflection contents
                            foreach ($results["reflections"] as $reflection) {
                                if (!empty($reflection["content"])) {
                                    $finalMessages[] = [
                                        "role" => "assistant",
                                        "content" => $reflection["content"],
                                    ];
                                }
                            }

                            $finalResponse = $this->getSecureChatInstance()->callAI(
                                $model,
                                array_merge(["messages" => $finalMessages], $defaultParams),
                                PROJECT_ID
                            );

                            $finalResult = $this->formatResponse($finalResponse);
                            $results["final"] = [
                                "response" => $finalResult,
                                "content" => $finalResult['response']['content'] ?? "No final result generated",
                            ];
                        } catch (Exception $e) {
                            $results["final"] = [
                                "response" => null,
                                "content" => "Error generating final result: " . $e->getMessage(),
                            ];
                        }
                    } else {
                        $results["final"] = [
                            "response" => null,
                            "content" => "Main system final context is missing.",
                        ];
                    }

                    $normalized_results = $this->normalizeAIEvalResults($results);

                    //TODO USING NORMALIZED RESULTS BLOCK ABOVE, BUT FOR NOW USE STUBBED VERSION TO WORK ON UI DELETE WHEN READY
                    $normalized_results = [
                        "summary" => [
                            "summary_title" => "Conversation Summary and Organization Assessment",
                            "one_sentence_summary" => "A 45-year-old male with diabetes and hypertension diagnosed with mastoiditis with possible intracranial extension treated with IV antibiotics, showing clinical improvement; follow-up for monitoring is planned.",
                            "long_summary" => "A 45-year-old male with a medical history of Type 2 diabetes and hypertension presented with worsening left-sided ear pain, discharge, hearing loss, fever, and headaches over two weeks. On examination, he had swelling, erythema over the mastoid area, and tenderness on palpation. Otoscopy revealed a perforated tympanic membrane with purulent drainage. Initial laboratory tests showed elevated WBC count of 15,000 and CRP levels of 12.5. Imaging confirmed mastoiditis with possible intracranial extension. The patient was started on intravenous vancomycin and ceftriaxone for broad-spectrum coverage while awaiting culture results. Neurosurgery was consulted due to concerns for an epidural abscess; however, lumbar puncture was deferred because of elevated intracranial pressure. Over the next 48 hours, the patient showed clinical improvement with reduced swelling and pain. Cultures identified Streptococcus pneumoniae sensitive to ceftriaxone, leading to discontinuation of vancomycin. The patient was discharged on oral antibiotics with outpatient ENT follow-up and instructions to monitor for any worsening symptoms or neurological changes.",
                            "organization_review" => "The case presentation was logically structured from initial symptoms to diagnosis and treatment strategies; however, it could benefit from a more concise discussion of differential diagnoses.",
                            "certainty_score" => "🤓 85% AI Certainty"
                        ],
                        "reflections" => [
                            [
                                "reflection_context" => "Reflection on Frame of Mind",
                                "report_title" => "Reflection on Frame of Mind Thinking Habits Report",
                                "overall_assessment" => "🌼❓",
                                "thm_overall_score" => 2,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "You demonstrated self-awareness by recognizing when your focus waned during a critical diagnostic step. How did you refocus to ensure accurate reasoning?",
                                        "Your ability to reflect on feelings of overwhelm and identify their impact on clinical decisions highlights emotional intelligence. What strategies helped you mitigate stress?"
                                    ],
                                    "coaching_questions" => [
                                        "How can you enhance your ability to maintain mental focus during extended clinical reasoning tasks?",
                                        "What steps might you take to preemptively address feelings of distraction or worry before they impact patient care?"
                                    ]
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "Am I focused?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student demonstrated self-awareness by acknowledging moments of distraction during case analysis and taking deliberate steps to refocus.",
                                        "ai_certainty_score" => "🤓 85% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"I caught myself overthinking the imaging findings and had to step back to refocus on the main symptoms.\" (Line 45)",
                                                "\"When I felt distracted by unrelated thoughts, I paused to revisit the clinical priorities.\" (Line 56)"
                                            ],
                                            "additional" => ["42", "48", "53", "61"]
                                        ]
                                    ]
                                ]
                            ],
                            [
                                "reflection_context" => "Reflection on Knowledge",
                                "report_title" => "Reflection on Knowledge Thinking Habits Report",
                                "overall_assessment" => "🌼🌼🌼",
                                "thm_overall_score" => 3,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "Your synthesis of patient history, physical examination findings, and initial diagnostic results demonstrated excellent clinical reasoning. What specific techniques do you use to ensure all relevant information is considered?",
                                        "You proactively identified and pursued the necessary additional diagnostic tests and specialist consultations. How do you prioritize these needs in complex cases?"
                                    ],
                                    "coaching_questions" => []
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "What information do I have?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student demonstrated comprehensive awareness of the patient's history and diagnostic results.",
                                        "ai_certainty_score" => "🤓 95% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"Examination reveals swelling and erythema over the mastoid area with tenderness on palpation.\" (Line 5)",
                                                "\"Otoscopy showed a perforated tympanic membrane with purulent drainage.\" (Line 6)"
                                            ],
                                            "additional" => ["1", "2", "4", "7"]
                                        ]
                                    ]
                                ]
                            ],
                            [
                                "reflection_context" => "Reflection on Problem Definition",
                                "report_title" => "Reflection on Problem Definition Thinking Habits Report",
                                "overall_assessment" => "🌼🌼❓",
                                "thm_overall_score" => 2,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "You prioritized the most critical health problem effectively by focusing on the patient’s acute neurological symptoms.",
                                        "Your assessment of the severity of illness demonstrated careful consideration of clinical signs and lab results."
                                    ],
                                    "coaching_questions" => [
                                        "How might you improve your ability to recognize when a case transitions from simple to complicated?",
                                        "What strategies could help you refine your approach to determining whether chronic conditions warrant prioritization in complex cases?"
                                    ]
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "Is this the most important problem to solve?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student effectively prioritized the acute neurological symptoms, reflecting awareness of immediate health risks.",
                                        "ai_certainty_score" => "🤓 90% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"The focus has to be on the intracranial extension, as it’s life-threatening.\" (Line 18)",
                                                "\"Other issues like ear pain are secondary.\" (Line 24)"
                                            ],
                                            "additional" => ["16", "20", "26", "28"]
                                        ]
                                    ]
                                ]
                            ],
                            [
                                "reflection_context" => "Reflection on Strategy",
                                "report_title" => "Reflection on Strategy Thinking Habits Report",
                                "overall_assessment" => "🌼🌼",
                                "thm_overall_score" => 3,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "You demonstrated thoughtful application of clinical frameworks by integrating evidence-based guidelines into your differential diagnosis.",
                                        "Your ability to explain the pathophysiological mechanisms driving the patient’s symptoms highlights your depth of understanding."
                                    ],
                                    "coaching_questions" => [
                                        "How could you refine your approach to identifying the most relevant frameworks for complex cases?",
                                        "What additional steps might enhance your ability to articulate the mechanisms behind your therapeutic strategies?"
                                    ]
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "What frameworks should I use to solve this problem?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student effectively identified relevant clinical guidelines and algorithms.",
                                        "ai_certainty_score" => "🤓 85% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"The AHA guidelines suggest this approach for managing acute hypertension in stroke.\" (Line 14)",
                                                "\"Applying the sepsis protocol due to elevated lactate.\" (Line 20)"
                                            ],
                                            "additional" => ["12", "18", "22", "28"]
                                        ]
                                    ]
                                ]
                            ],
                            [
                                "reflection_context" => "Reflection on Solution",
                                "report_title" => "Reflection on Solution Thinking Habits Report",
                                "overall_assessment" => "🌼🌼",
                                "thm_overall_score" => 3,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "You identified key gaps in data for the working diagnosis, demonstrating thorough reflection.",
                                        "Your detailed rationale for intervention planning highlights your proactive approach."
                                    ],
                                    "coaching_questions" => [
                                        "What additional steps could improve your confidence in the comprehensiveness of your differential diagnosis?",
                                        "How can you better articulate contingency plans for unexpected treatment outcomes?"
                                    ]
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "Does the working diagnosis make sense?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student effectively justified their working diagnosis by integrating patient history and diagnostic findings.",
                                        "ai_certainty_score" => "🤓 85% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"Imaging confirmed mastoiditis with possible intracranial extension.\" (Line 9)",
                                                "\"The elevated WBC count supports an infectious etiology.\" (Line 7)"
                                            ],
                                            "additional" => ["5", "6", "11"]
                                        ]
                                    ]
                                ]
                            ],
                            [
                                "reflection_context" => "Reflection on Data",
                                "report_title" => "Reflection on Data Thinking Habits Report",
                                "overall_assessment" => "🌼🌱",
                                "thm_overall_score" => 2,
                                "coaching_insights" => [
                                    "positive_feedback" => [
                                        "Recognizing data discrepancies shows your ability to reassess clinical stories.",
                                        "You accurately anticipated outcomes for key findings."
                                    ],
                                    "coaching_questions" => [
                                        "What steps might you take when data significantly diverges from your expectations?",
                                        "How can you ensure you systematically identify discrepancies in clinical stories?"
                                    ]
                                ],
                                "detailed_analysis" => [
                                    [
                                        "question" => "Does the data match the story?",
                                        "emoji" => "🌼",
                                        "analysis" => "The student identified discrepancies in the patient’s history and lab results, leading to a revision of the treatment plan.",
                                        "ai_certainty_score" => "🤓 80% AI Certainty",
                                        "supporting_citations" => [
                                            "primary" => [
                                                "\"The lab results don’t match the initial diagnosis.\" (Line 45)",
                                                "\"Additional imaging confirmed the revised diagnosis.\" (Line 78)"
                                            ],
                                            "additional" => ["30", "44", "48", "50"]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "final" => [
                            "reportTitle" => "Thinking Habits Report",
                            "version" => "v0.64.0",
                            "oneSentenceSummary" => "45-year-old male with Type 2 diabetes and hypertension presenting with mastoiditis and possible intracranial extension.",
                            "thinkingHabitsScore" => "Mind 🔴| Problem 🟡| Knowledge 🟢| Strategy 🟡| Solution 🟢| Data 🟢",
                            "positiveFeedback" => [
                                "Mind: Am I focused? You demonstrated strong synthesis of the patient’s evolving clinical picture.",
                                "Problem: Have I identified assumptions? Your ability to question diagnostic assumptions shows active engagement with clinical reasoning."
                            ],
                            "coachingPrompts" => [
                                "Mind: How do you maintain focus when balancing multiple differential diagnoses?",
                                "Knowledge: What strategies can you use to identify when external expertise is needed?"
                            ],
                            "caseOrganizationFeedback" => "The case presentation followed a logical flow, starting with background and progressing to differential diagnoses."
                        ]
                    ];

                    return json_encode($normalized_results);

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
                        'format' => 'json'
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

                    // ✅ Step 1: Store WAV file first
                    $docId = \REDCap::storeFile($tempFilePath, $this->getProjectId());

                    if (!$docId) {
                        $this->emDebug("❌ Failed to store WAV file in REDCap.");
                        unlink($tempFilePath);
                        return json_encode(["error" => "Failed to store WAV file."]);
                    }

                    $newInstanceId = $this->getNextInstanceId($coachId);
                    $sessionId = "{$studentId}-{$newInstanceId}"; // Generate unique session ID

                    // ✅ Save Transcription + Metadata to REDCap
                    $recordData = [
                        'record_id' => $coachId,  // ✅ Main REDCap record (coach)
                        'redcap_repeat_instrument' => 'session_logs', // ✅ Replace with your instrument name
                        'redcap_repeat_instance' => $newInstanceId, // ✅ REDCap will auto-assign the next available instance
                        'session_learner_id' => $studentId, // ✅ Student associated with the session
                        'session_date' => $sessionDate,
                        'session_transcript_raw' => json_decode($result['response']['content'] ?? '{}', true)['text'] ?? '',
                        'session_audio_raw_1' => $docId, // ✅ Store doc_id in the same request
                        'session_id' => $sessionId,
                    ];

                    $saveResult = \REDCap::saveData('json', json_encode([$recordData]));

                    if (!empty($saveResult['errors'])) {
                        $this->emDebug("Failed to save session to REDCap:", $saveResult);
                        unlink($tempFilePath);
                        return json_encode(["error" => "Failed to save session."]);
                    }

                    $this->emDebug("✅ Session + WAV file successfully saved to REDCap!", $saveResult);

                    // ✅ Cleanup temp file
                    unlink($tempFilePath);

                    return json_encode([
                        "session_id" => $sessionId, // ✅ Include session_id in response
                        "text" => json_decode($result['response']['content'] ?? '{}', true)['text'] ?? '',
                        "status" => "incomplete" // ✅ Keep track of processing status
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

                    if (empty($students)) {
                        $this->emDebug("No students found for coach $coachRecordId");
                    } else {
                        $this->emDebug("Found students (including sessions) for coach $coachRecordId", $students);
                    }

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

    private function fetchSessionsForLearner($coachRecordId, $learnerId) {
        $params = [
            'project_id' => $this->getProjectId(),
            'records'    => [$coachRecordId],
            'fields'     => [
                'session_learner_id','session_date','session_transcript_raw',
                'sess_reflect_mind','sess_reflect_mind_score',
                'sess_reflect_knowledge','sess_reflect_knowledge_score',
                'sess_reflect_problem','sess_reflect_problem_score',
                'sess_reflect_strategy','sess_reflect_strategy_score',
                'sess_reflect_solution','sess_reflect_solution_score',
                'sess_reflect_data','sess_reflect_data_score','sess_reflect_summary'
            ],
            'forms' => ['session_logs'],
            'filterLogic' => '[session_learner_id] = "' . db_escape($learnerId) . '"',
            'exportRepeatingInstrumentsEvents' => true,
            'return_format' => 'array'
        ];

        $sessionData = \REDCap::getData($params);
        $this->emDebug("fetchSessionsForLearner > session logs raw", $params, $sessionData);

        $sessions = [];

        if (!empty($sessionData[$coachRecordId]['repeat_instances'])) {
            foreach ($sessionData[$coachRecordId]['repeat_instances'] as $eventId => $instrumentData) {
                if (!empty($instrumentData['session_logs'])) {
                    foreach ($instrumentData['session_logs'] as $instanceNum => $row) {
                        if (($row['session_learner_id'] ?? '') == $learnerId) {
                            $sessions[] = [
                                'learner_id'   => $learnerId,
                                'session_date' => $row['session_date'] ?? '',
                                'transcript'   => $row['session_transcript_raw'] ?? '',
                                'reflections'  => [
                                    'mind' => [
                                        'content' => $row['sess_reflect_mind'] ?? '',
                                        'score'   => $row['sess_reflect_mind_score'] ?? ''
                                    ],
                                    'knowledge' => [
                                        'content' => $row['sess_reflect_knowledge'] ?? '',
                                        'score'   => $row['sess_reflect_knowledge_score'] ?? ''
                                    ],
                                    'problem' => [
                                        'content' => $row['sess_reflect_problem'] ?? '',
                                        'score'   => $row['sess_reflect_problem_score'] ?? ''
                                    ],
                                    'strategy' => [
                                        'content' => $row['sess_reflect_strategy'] ?? '',
                                        'score'   => $row['sess_reflect_strategy_score'] ?? ''
                                    ],
                                    'solution' => [
                                        'content' => $row['sess_reflect_solution'] ?? '',
                                        'score'   => $row['sess_reflect_solution_score'] ?? ''
                                    ],
                                    'data' => [
                                        'content' => $row['sess_reflect_data'] ?? '',
                                        'score'   => $row['sess_reflect_data_score'] ?? ''
                                    ]
                                ],
                                // A top-level property for "summary" if you like
                                'summary' => $row['sess_reflect_summary'] ?? ''
                            ];
                        }
                    }
                }
            }
        }

        return $sessions;
    }

    // In ClinicalCoach.php
    public function getCoaches(): array
    {
        $fields = ['record_id', 'coach_fname', 'coach_lname', 'coach_consent_agree'];
        $params = [
            'project_id'  => $this->getProjectId(),
            'fields'      => $fields,
            'filterLogic' => '[coach_consent_agree(1)] = "1"'
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

        return $coachesList;
    }

    private function getNextInstanceId($coachId)
    {
        $this->emDebug("🛠 Fetching highest session_log instance for coach: $coachId...");

        $fetchParams = [
            'project_id' => $this->getProjectId(),
            'records'    => [$coachId], // ✅ Filter by coach
            'fields'     => ['record_id', 'session_learner_id', 'session_id'],
            'forms'      => ['session_logs'], // ✅ Explicitly fetch session_logs
            'exportRepeatingInstrumentsEvents' => true, // ✅ Required for repeating instances
            'return_format' => 'array'
        ];

        $data = \REDCap::getData($fetchParams);
        $this->emDebug("📌 FULL RAW DATA RETURNED FROM REDCap:", $data);

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
            $this->emDebug("⚠️ No session logs found for coach: $coachId");
        }

        $nextInstance = $highestInstance + 1;
        $this->emDebug("✅ Highest found: $highestInstance → Returning new instance: $nextInstance");

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
