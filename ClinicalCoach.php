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

    public function redcap_module_ajax($action, $payload, $project_id, $record, $instrument, $event_id, $repeat_instance,
                                       $survey_hash, $response_id, $survey_queue_hash, $page, $page_full, $user_id, $group_id) {

        try {
            switch ($action) {
                case "callAI":
                    $messages = $payload;

                    // Retrieve the main system context reflection from project settings
                    $main_system_context = $this->getProjectSetting("system_context_summarize");

                    // Reflection contexts (could be null, so we check them before appending)
                    $reflection_contexts = [
                        $this->getProjectSetting("system_context_reflection_1"),
                        $this->getProjectSetting("system_context_reflection_2"),
                        $this->getProjectSetting("system_context_reflection_3"),
                        $this->getProjectSetting("system_context_reflection_4"),
                        $this->getProjectSetting("system_context_reflection_5"),
                        $this->getProjectSetting("system_context_reflection_6")
                    ];

                    // Array to hold results from all API calls
                    $allResults = [];

                    // TODO NEED TO ENGIENEER PROMPT TO GIVE RELATIVE SCORE?
                    function assignScore($responseContent) {
                        // Example logic: scoring based on the length of the content
                        $length = strlen($responseContent);
                        if ($length < 100) {
                            return 1; // Bad response
                        } elseif ($length < 300) {
                            return 2; // Average response
                        } else {
                            return 3; // Good response
                        }
                    }

                    // Loop through each reflection context
                    foreach ($reflection_contexts as $index => $reflection_context) {
                        if (!empty($reflection_context)) {
                            // Append main system context and current reflection context
                            $currentMessages = $this->appendSystemContext($messages, $main_system_context);
                            $currentMessages = $this->appendSystemContext($currentMessages, $reflection_context);

                            $this->emDebug("chatml Messages array to API for reflection context " . ($index + 1), $currentMessages);

                            // Prepare parameters for the API call
                            $model  = "gpt-4o";
                            $params = array("messages" => $currentMessages);

                            if ($this->getProjectSetting("gpt-temperature")) {
                                $params["temperature"] = floatval($this->getProjectSetting("gpt-temperature"));
                            }
                            if ($this->getProjectSetting("gpt-top-p")) {
                                $params["top_p"] = floatval($this->getProjectSetting("gpt-top-p"));
                            }
                            if ($this->getProjectSetting("gpt-frequency-penalty")) {
                                $params["frequency_penalty"] = floatval($this->getProjectSetting("gpt-frequency-penalty"));
                            }
                            if ($this->getProjectSetting("presence_penalty")) {
                                $params["presence_penalty"] = floatval($this->getProjectSetting("presence_penalty"));
                            }
                            if ($this->getProjectSetting("gpt-max-tokens")) {
                                $params["max_tokens"] = intval($this->getProjectSetting("gpt-max-tokens"));
                            }

                            // Make the API call for the current context
                            $response = $this->getSecureChatInstance()->callAI($model, $params, PROJECT_ID);
                            $result = $this->formatResponse($response);

                            // Extract the response content for scoring
                            $responseContent = $result['response']['content'] ?? '';
                            $score = assignScore($responseContent);

                            // Add the result to the allResults array, including the score
                            $allResults[] = [
                                "reflection_context" => "Reflection " . ($index + 1),
                                "response" => $result,
                                "score" => $score
                            ];

                            $this->emDebug("API result for reflection context " . ($index + 1), $result);
                        }
                    }

                // Return all results as a JSON array
                $this->emDebug("All API results", $allResults);
                return json_encode($allResults);



                case "transcribeAudio":
                    $messages = $payload;
                    $this->emDebug("Received payload for transcribeAudio, unpack base64 and pass along to callAI");

                    // TODO I THINK MAY BE BETTER TO UPLOAD FILE POST TO tmp FOLDER , then PASS THE PATH IN AND PULL AND PREP THE FILE HERE TO PASS TO WHISPER
                    if (isset($messages['file_base64'])) {
                        // Extract and decode the Base64 data
                        $base64String = $messages['file_base64'];
                        $decodedData = base64_decode($base64String);

                        // Define the file path for the temporary file
                        $tempFilePath = sys_get_temp_dir() . '/recording.wav';

                        // Save the decoded data as a file
                        if (file_put_contents($tempFilePath, $decodedData) !== false) {
                            $this->emDebug("File saved successfully to", $tempFilePath);

                            // Now you can proceed with your Whisper API call using $tempFilePath
                            $model = "whisper";
                            $params = array("input" => $tempFilePath);
                            if ($this->getProjectSetting("secure-chat-whisper-system-context")) {
                                $params["initial_prompt"] = $this->getProjectSetting("secure-chat-whisper-system-context");
                            }
                            if ($this->getProjectSetting("secure-chat-whisper-prompt")) {
                                $params["prompt"] = $this->getProjectSetting("secure-chat-whisper-prompt");
                            }

                            if ($this->getProjectSetting("whisper-language")) {
                                $params["language"] = $this->getProjectSetting("whisper-language");
                            }
                            if ($this->getProjectSetting("whisper-temperature")) {
                                $params["temperature"] = floatval($this->getProjectSetting("whisper-temperature"));
                            }
                            if ($this->getProjectSetting("whisper-max-tokens")) {
                                $params["max_tokens"] = intval($this->getProjectSetting("whisper-max-tokens"));
                            }
                            if ($this->getProjectSetting("whisper-compression-rate")) {
                                $params["compression_ratio_threshold"] = floatval($this->getProjectSetting("whisper-compression-rate"));
                            }
                            if ($this->getProjectSetting("whisper-logprobs")) {
                                $params["log_prob_threshold"] = floatval($this->getProjectSetting("whisper-logprobs"));
                            }
                            if ($this->getProjectSetting("whisper-no-speech-threshold")) {
                                $params["no_speech_threshold"] = floatval($this->getProjectSetting("whisper-no-speech-threshold"));
                            }
                            if ($this->getProjectSetting("whisper-condition-on-previous-text") !== null) {
                                $params["condition_on_previous_text"] = (bool) $this->getProjectSetting("whisper-condition-on-previous-text");
                            }

                            $this->emDebug("Whisper file path sent to API:", $params);
                            $response = $this->getSecureChatInstance()->callAI($model, $params, PROJECT_ID);
                            $result = $this->formatResponse($response);

                            $this->emDebug("calling SecureChatAI.callAI() result:", $result);
                            return json_encode($result);
                        } else {
                            $this->emDebug("Failed to save the decoded file.");
                            return json_encode(["error" => "Failed to save the decoded file."]);
                        }
                    } else {
                        $this->emDebug("No Base64-encoded file received.");
                        return json_encode(["error" => "No Base64-encoded file received."]);
                    }

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
