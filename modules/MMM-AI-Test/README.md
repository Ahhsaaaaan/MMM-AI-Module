# MMM-AI-Test

  

MagicMirror² module for on-demand AI interaction. Captures voice and camera input, transcribes via Azure Whisper, and returns concise responses from a multimodal model. Part of the MMM-AI ambient intelligence stack (see parent repository).

  

---

  

## Overview

  

The module listens for the `START_AI_LISTENING` notification (typically sent from [MMM-Remote-Control](https://github.com/Jopyth/MMM-Remote-Control) via the custom menu). When triggered, it captures a single image and 5 seconds of audio, transcribes the audio with Azure OpenAI Whisper, and sends transcription plus image to GPT for a constrained response. Output is displayed for 30 seconds before returning to idle.

  

---

  

## Requirements

  

- MagicMirror²

- Raspberry Pi or compatible Linux

- USB webcam (`fswebcam`)

- USB microphone (`arecord`)

- Azure OpenAI resource with Whisper and GPT-4o deployments

  

---

  

## Installation

  

1. Copy this module into your MagicMirror `modules/` directory.

2. Install dependencies: `npm install`

3. Copy `.env.example` to `.env` and fill in Azure credentials.

4. Add to `config/config.js`:

  

```javascript

{

module: "MMM-AI-Test",

position: "middle_center"

}

```

  

5. Ensure MMM-Remote-Control is configured with `custom_menu.json` (see parent repo README for placement).

  

---

  

## Configuration

  

### Environment Variables

  

## Environment Configuration

Create a `.env` file in the project root and define the following variables:

| Variable | Description |
|----------|-------------|
| AZURE_STT_OPENAI_ENDPOINT | Azure OpenAI endpoint (example: https://your-resource.openai.azure.com) |
| AZURE_STT_OPENAI_API_KEY | API key used for Whisper transcription |
| AZURE_STT_OPENAI_DEPLOYMENT_NAME | Whisper deployment name (example: gpt-4o-transcribe) |
| AZURE_OPENAI_API_KEY | API key for chat completions |
| SAVE_DEBUG_FILES | Set to true to persist audio/image buffers for debugging |
  

### Hardware

  

**Microphone:** Default device is `plughw:3,0`. List devices with `arecord -l` and update the device string in `node_helper.js` if needed.

  

**Camera:** Uses `fswebcam`. Test with `fswebcam test.jpg`.

  

---

  

## Flow

  

1. Trigger — `START_AI_LISTENING` notification received

2. Preparing — Image captured, UI shows "Preparing..."

3. Listening — 5-second audio recording, UI shows "AI Listening..."

4. Transcribing — Audio sent to Whisper

5. Processing — Transcription + image sent to GPT

6. Response — AI output shown for 30 seconds

7. Ready — State resets

  

---

  

## File Structure

  

```

MMM-AI-Test/

├── MMM-AI-Test.js

├── MMM-AI-Test.css

├── node_helper.js

├── system_prompt.js

├── package.json

├── .env.example

└── README.md

```

  

---

  

## Troubleshooting

  

**Credentials:** Ensure `.env` exists and all required variables are set. Keys are git-ignored.

  

**No transcription:** Verify microphone device and levels. Check logs for STT API errors.

  

**Image capture failed:** Confirm `fswebcam` works. Check USB connection.

  

**Logs:**  `pm2 logs mm` (or equivalent for your process manager).

  

**Debug mode:** Set `SAVE_DEBUG_FILES=true` to write captured audio and images to the module directory.

  

---

  

## License

  

MIT.