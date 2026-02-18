# MMM-AI-Test

A MagicMirror² module that provides AI-powered voice interaction with camera vision capabilities. Ask questions and get intelligent responses based on what the camera sees.

## Features

- 🎤 **Voice Input** - 5-second audio recording with speech-to-text transcription
- 📷 **Camera Vision** - Captures images for visual context
- 🤖 **AI Response** - Uses Azure OpenAI GPT models for intelligent responses
- 👔 **Fashion Advisor** - Built-in persona for style recommendations

## Requirements

- Raspberry Pi (or compatible Linux system)
- USB Webcam
- USB Microphone
- MagicMirror² installation
- Azure OpenAI API access

## Installation

1. Navigate to your MagicMirror modules folder:
   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone this module (if not already present):
   ```bash
   git clone https://github.com/YOUR_USERNAME/MMM-AI-Test.git
   ```

3. Install dependencies:
   ```bash
   cd MMM-AI-Test
   npm install
   ```

4. Copy the environment template and configure:
   ```bash
   cp .env.example .env
   nano .env
   ```

## Configuration

### Environment Variables

Create a `.env` file in the module directory with your Azure OpenAI credentials:

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_STT_OPENAI_ENDPOINT` | Azure OpenAI endpoint for Speech-to-Text | `https://your-resource.openai.azure.com` |
| `AZURE_STT_OPENAI_API_KEY` | API key for STT service | `your-stt-api-key` |
| `AZURE_STT_OPENAI_DEPLOYMENT_NAME` | Whisper model deployment name | `gpt-4o-transcribe` |
| `azure_key` | API key for Chat completions | `your-chat-api-key` |
| `SAVE_DEBUG_FILES` | Save audio/image files for debugging | `false` |

### MagicMirror Config

Add the module to your `config/config.js`:

```javascript
{
    module: "MMM-AI-Test",
    position: "middle_center"
}
```

### Triggering the Module

The module listens for the `START_AI_LISTENING` notification. You can trigger it from:

- A physical button connected to GPIO
- Another module (like MMM-Remote-Control)
- Custom notification sender

## How It Works

1. **Trigger** - User activates the module (button press, notification, etc.)
2. **Preparing** - Module displays "Preparing..." while capturing camera image
3. **Listening** - "AI Listening..." displays for 5 seconds while recording audio
4. **Transcribing** - Audio is sent to Azure OpenAI Whisper for transcription
5. **Processing** - Transcription + image sent to GPT model for response
6. **Response** - AI response displays on screen for 30 seconds
7. **Ready** - Returns to ready state

## Hardware Setup

### Audio Device

The module uses `arecord` with device `plughw:3,0`. Find your microphone device:

```bash
arecord -l
```

Update the device in `node_helper.js` if different.

### Camera

Uses `fswebcam` for image capture. Test your webcam:

```bash
fswebcam test.jpg
```

## Troubleshooting

### Check Logs

```bash
pm2 logs mm
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Azure OpenAI credentials not configured" | Edit `.env` with valid credentials |
| No transcription returned | Check microphone device and audio levels |
| Image capture failed | Verify webcam connection with `fswebcam` |
| API errors | Verify endpoint URL and API key |

### Debug Mode

Enable debug file saving in `.env`:

```
SAVE_DEBUG_FILES=true
```

This saves captured audio and images to the module directory for inspection.

## File Structure

```
MMM-AI-Test/
├── MMM-AI-Test.js      # Frontend module
├── MMM-AI-Test.css     # Styles
├── node_helper.js      # Backend logic
├── system_prompt.js    # AI persona configuration
├── package.json        # Dependencies
├── .env                # Your credentials (git-ignored)
├── .env.example        # Template for .env
└── README.md           # This file
```

## Security

- ✅ `.env` file is git-ignored - your API keys stay local
- ✅ Audio/image buffers are processed in memory by default
- ✅ Debug files are optional and disabled by default

## License

MIT License - See LICENSE file for details.
