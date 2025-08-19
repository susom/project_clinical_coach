<?php
/** @var \Stanford\ClinicalCoach\ClinicalCoach $module */

// Handle file streaming if ?edoc_id=xxx in GET
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['edoc_id'])) {
    $edoc_id = intval($_GET['edoc_id']);
    if ($edoc_id) {
        list($mimeType, $docName, $fileContent) = \REDCap::getFile($edoc_id);
        if (!$fileContent) {
            http_response_code(404);
            exit("File not found");
        }
        // Force correct MIME for common audio types
        $ext = strtolower(pathinfo($docName, PATHINFO_EXTENSION));
        if ($ext === 'wav') $mimeType = 'audio/wav';
        if ($ext === 'mp3') $mimeType = 'audio/mpeg';
        if ($ext === 'webm') $mimeType = 'audio/webm';

        $module->emDebug("Streaming file", $mimeType, $docName);
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: inline; filename="' . $docName . '"');
        header('Content-Length: ' . strlen($fileContent));
        echo $fileContent;
        exit;
    }
}

// Handle POST requests for either audio preview or CSV download
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // ACTION: DOWNLOAD SYSTEM PROMPTS AS CSV
    if (isset($_POST['action']) && $_POST['action'] === 'download_csv') {

        // Define the system context prompts
        $prompts = [
            ["key" => "system_context_summarize", "name" => "Raw text to inject into system context for Overall summarization"],
            ["key" => "system_context_reflection_1", "name" => "Raw text to inject into system context for reflection (Mind)"],
            ["key" => "system_context_reflection_2", "name" => "Raw text to inject into system context for reflection (Knowledge)"],
            ["key" => "system_context_reflection_3", "name" => "Raw text to inject into system context for reflection (Problem)"],
            ["key" => "system_context_reflection_4", "name" => "Raw text to inject into system context for reflection (Strategy)"],
            ["key" => "system_context_reflection_5", "name" => "Raw text to inject into system context for reflection (Solution)"],
            ["key" => "system_context_reflection_6", "name" => "Raw text to inject into system context for reflection (Data)"],
            ["key" => "system_context_final", "name" => "Raw text to inject into system context for final THM report"],
        ];

        // Prepare CSV data
        $csv_data = [];
        // Add header row
        $csv_data[] = ['key', 'name', 'value'];

        // Add a row for each prompt
        foreach ($prompts as $prompt) {
            $key = $prompt['key'];
            $name = $prompt['name'];
            // Fetch the value from module's system settings
            $value = $module->getProjectSetting($key) ?? '';
            $csv_data[] = [$key, $name, $value];
        }

        // Set headers to trigger CSV download
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="system_context_prompts_snapshot.csv"');

        // Write data to output
        $output = fopen('php://output', 'w');
        foreach ($csv_data as $row) {
            fputcsv($output, $row);
        }
        fclose($output);
        exit;

    } else { // ACTION: PREVIEW AUDIO (original functionality)
        $edoc_id = intval($_POST['edoc_id'] ?? 0);
        if ($edoc_id) {
            $file_info = \REDCap::getFile($edoc_id);
            if ($file_info && !empty($file_info[2])) {
                $audioUrl = $_SERVER['PHP_SELF'] . "?edoc_id=$edoc_id";
                echo "<h3>Audio Preview for edoc_id $edoc_id</h3>";
                echo "<audio controls src='{$audioUrl}'>Your browser does not support the audio element.</audio>";
                echo "<ul>";
                echo "<li><b>Name:</b> " . htmlspecialchars($file_info[1] ?? '[n/a]') . "</li>";
                echo "<li><b>Type:</b> " . htmlspecialchars($file_info[0] ?? '[n/a]') . "</li>";
                echo "</ul><hr>";
            } else {
                echo "<p style='color:red'>Could not retrieve file with edoc_id $edoc_id.</p>";
            }
        } else {
            echo "<p style='color:red'>Invalid resource id provided.</p>";
        }
    }
}
?>

<h3>Preview Audio File</h3>
<form method="post">
    <input type="hidden" name="redcap_csrf_token" value="<?php echo $module->getCSRFToken(); ?>">
    <label for="edoc_id">Resource ID (edoc_id):</label>
    <input type="number" name="edoc_id" id="edoc_id" required>
    <button type="submit">Preview Audio</button>
</form>

<hr style="margin: 30px 0;">

<h3>Download System Prompts</h3>
<p>Click the button below to download a CSV snapshot of all system context prompts.</p>
<form method="post">
    <input type="hidden" name="redcap_csrf_token" value="<?php echo $module->getCSRFToken(); ?>">
    <input type="hidden" name="action" value="download_csv">
    <button type="submit">Download Prompts as CSV</button>
</form>