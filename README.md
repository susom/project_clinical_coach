# ClinicalCoach External Module

### Description
- Provides a React-based interface for recording audio sessions between a Coach and a Learner.
- Leverages AI (via the SecureChatAI module) to transcribe and analyze each session.
- Consolidates session reflections and final summaries into a structured JSON output.

### Key Features
- **Audio Capture & Transcription**: Integrates Whisper for quick audio-to-text conversion.
- **AI Summaries & Reflections**: Uses multiple system prompts to generate insights on clinical reasoning, reflective thinking, and final conclusions.
- **Logging & Debugging**: Includes `emDebug` calls at key points for transparent, trackable processing.
- **Extendable & Modular**: Designed to slot into a broader coaching or clinical reasoning ecosystem.

### Workflow Highlights
1. **Audio Input**: Upload or record audio from the user interface.
2. **Transcription**: The EM calls Whisper API to convert audio to text.
3. **AI Analysis**: Summaries, reflections, and final outputs are generated through a sequence of LLM prompts.
4. **Structured Results**: Returns a standardized JSON object containing all AI-produced content, including error handling.

### Dependencies
- **SecureChatAI** module for calling Whisper and GPT-like endpoints.
- **React Front End** built and bundled into `MVP/dist/assets`.

