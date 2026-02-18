# MMM-AI — Ambient Intelligence for Smart Mirrors

An AI-powered ambient agent that operates through an always-available smart display, triggered on demand via remote control.

---

## What This Project Is

Traditional assistants are reactive and require explicit commands. Ambient intelligence aims to reduce friction by allowing AI systems to remain passively available and context-aware. This project explores the idea of a proactive AI agent operating through a smart mirror: the display stays dormant until the user invokes it, then captures voice and vision context, processes it through a multimodal model, and surfaces a concise response. The design favors low cognitive load and minimal interaction overhead.

---

## Core Capabilities

- **On-demand activation** — Agent remains idle until explicitly triggered via remote control or notification, avoiding always-on listening
- **Multimodal context** — Combines speech-to-text transcription with live camera capture to ground responses in the immediate environment
- **Constrained output** — System prompt enforces brevity and decisiveness (20–30 words); no filler, lists, or meta commentary
- **Persona flexibility** — Modular system prompt supports pluggable personas (e.g., fashion advisor, style engine) without changing core logic
- **Buffer-based capture** — Audio and image processing uses in-memory buffers by default to minimize SD card wear on embedded hardware
- **Notification-driven architecture** — Integrates with MagicMirror² and MMM-Remote-Control via `START_AI_LISTENING` notification for cross-module triggering

---

## Why MagicMirror²

MagicMirror² serves as the orchestration layer for the ambient display. It provides module lifecycle management, socket-based IPC between frontend and backend, and a notification bus that allows remote control modules to trigger the AI agent. The mirror itself becomes the host for both passive information display and on-demand AI interaction.

---

## Dependencies

- [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror)
- [MMM-Remote-Control](https://github.com/Jopyth/MMM-Remote-Control) (or [custom fork](https://github.com/YOUR_ORG/MMM-Remote-Control)) — required for AI triggering from the remote web interface

---

## Installation

1. Install [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) and [MMM-Remote-Control](https://github.com/Jopyth/MMM-Remote-Control).
2. Clone this repository and copy the `MMM-AI-Test` module into your MagicMirror `modules/` directory.
3. Copy `modules/mmm-Remote-Control/custom_menu.json` into your MMM-Remote-Control module folder. This file defines the "AI Assistant" button in the remote control UI; without it, AI triggering will not work.
4. Add the module to `config/config.js`:

```javascript
{
	module: "MMM-AI-Test",
	position: "middle_center"
}
```

5. Install module dependencies (`npm install` in the MMM-AI-Test directory), configure `.env` with Azure OpenAI credentials (see `modules/MMM-AI-Test/.env.example`), and start MagicMirror.

---

## License

MIT. Allows reuse and modification with attribution.
