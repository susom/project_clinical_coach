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

    public function initSystemContexts(){
        //TODO CLEAN THIS UP
        $this->system_context_persona = $this->getProjectSetting('chatbot_system_context_persona');
        $this->system_context_steps = $this->getProjectSetting('chatbot_system_context_steps');
        $this->system_context_rules = $this->getProjectSetting('chatbot_system_context_rules');

        $initial_system_context = $this->appendSystemContext([], $this->system_context_persona);
        $initial_system_context = $this->appendSystemContext($initial_system_context, $this->system_context_steps);
        $initial_system_context = $this->appendSystemContext($initial_system_context, $this->system_context_rules);

        return $initial_system_context;
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
                    $systemMessageFound = false;

                    // Iterate through the messages to check if a 'system' role exists
                    $reflection_context = $this->getProjectSetting("system_context_reflection_1");
                    foreach ($messages as &$message) {
                        if (isset($message['role']) && $message['role'] === 'system') {
                            $message['content'] .= "\n\n" . $reflection_context;
                            $systemMessageFound = true;
                            break;
                        }
                    }

                    // If no 'system' role was found, prepend a new system message
                    if (!$systemMessageFound) {
                        array_unshift($messages, [
                            'role' => 'system',
                            'content' => $reflection_context
                        ]);
                    }

                    $this->emDebug("chatml Messages array to API", $messages);

                    // CALL API ENDPOINT WITH AUGMENTED CHATML
                    $model  = "gpt-4o";
                    $params = array("messages" => $messages);

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

                    $response = $this->getSecureChatInstance()->callAI($model, $params, PROJECT_ID);
                    $result = $this->formatResponse($response);

                    $this->emDebug("calling SecureChatAI.callAI()", $result);
                    return json_encode($result);

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


                case "login":
                    $data = $this->sanitizeInput($payload);
                    return json_encode($this->loginUser($data));
                case "verifyPhone":
                    $data = $this->sanitizeInput($payload);
                    return json_encode($this->verifyPhone($data));

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
