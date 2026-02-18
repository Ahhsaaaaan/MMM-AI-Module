# STT and Vision Pipeline Setup

  

This document describes the speech-to-text and multimodal AI pipeline implemented in MMM-AI-Test.

  

---

  

## Implemented Components

  

## Project Structure

| File | Purpose |
|--------|------------|
| node_helper.js | Handles buffer-based audio/image capture, Whisper transcription, and Azure OpenAI chat completion |
| MMM-AI-Test.js | Manages UI states such as Preparing, Listening, transcription display, and AI response rendering |
| system_prompt.js | Defines agent persona and output constraints (for example: fashion advisor, 20–30 word responses) |
| .env | Stores Azure credentials (git-ignored) |
| .env.example | Template for required environment variables |
| package.json | Declares project dependencies such as axios, dotenv, and form-data |

  

---

  

## Environment Variables

  

Copy `.env.example` to `.env` and configure:

  

```

AZURE_STT_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

AZURE_STT_OPENAI_API_KEY=your-stt-api-key

AZURE_STT_OPENAI_DEPLOYMENT_NAME=gpt-4o-transcribe

azure_key=your-chat-api-key

SAVE_DEBUG_FILES=false

```

  

---

  

## Flow

  

1.  `START_AI_LISTENING` notification triggers `node_helper.captureAudioAndImage()`.

2. Image captured to buffer via `fswebcam` (stdout).

3.  `AUDIO_RECORDING_STARTED` sent to frontend (shows "AI Listening..." for 5 seconds).

4. Audio captured to buffer via `arecord` (stdout).

5. Audio buffer sent to Azure Whisper; transcription returned.

6.  `CAPTURE_COMPLETE` sent with transcription; frontend shows "You said: …".

7. Transcription + image sent to Azure Chat completions.

8.  `AI_RESPONSE` sent to frontend; response displayed for 30 seconds.

  

---

  

## Design Notes

  

**Buffer-based capture:** Audio and image are held in memory. No files written unless `SAVE_DEBUG_FILES=true`, reducing SD card wear on embedded systems.

  

**Notification bus:** All triggering is via `START_AI_LISTENING`. Compatible with MMM-Remote-Control custom menu, GPIO buttons, or any module that sends MagicMirror notifications.

  

**Persona:**  `system_prompt.js` is a separate module; swap prompts to change behavior without modifying core logic.

  

---

  

## Testing

  

1. Configure `.env` with valid Azure credentials.

2. Restart MagicMirror (e.g. `pm2 restart mm`).

3. Trigger via MMM-Remote-Control "AI Assistant" button or equivalent.

4. Speak during the 5-second window.

5. Confirm transcription appears, then AI response.

  

Check logs for `"Transcription successful"`, `"Sending to Azure OpenAI"`, and any API errors.