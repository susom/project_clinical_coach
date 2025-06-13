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
        
        $module->emDebug("what the fuck", $mimeType, $docName);
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: inline; filename="' . $docName . '"');
        header('Content-Length: ' . strlen($fileContent));
        echo $fileContent;
        exit;
    }
}

// Normal form/page rendering
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $edoc_id = intval($_POST['edoc_id']);
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
            echo "<p style='color:red'>Could not retrieve file.</p>";
        }
    } else {
        echo "<p style='color:red'>Invalid resource id.</p>";
    }
}
?>

<form method="post">
    <input type="hidden" name="redcap_csrf_token" value="<?php echo $module->getCSRFToken(); ?>">
    <label for="edoc_id">Resource ID (edoc_id):</label>
    <input type="number" name="edoc_id" id="edoc_id" required>
    <button type="submit">Preview Audio</button>
</form>
