/* Magic Mirror
 * Node Helper: MMM-AI-Test
 *
 * Backend logic for audio/camera capture
 * Uses in-memory buffers instead of saving files to disk (saves SD card wear on RPi)
 * Set SAVE_DEBUG_FILES=true in .env to save files for debugging
 */

const NodeHelper = require("node_helper");
const { exec, execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
// const { GoogleGenAI } = require("@google/genai"); // COMMENTED OUT — switched to Azure OpenAI
const SYSTEM_PROMPT = require("./system_prompt");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Config: set SAVE_DEBUG_FILES=true in .env to save audio/image files to disk for debugging
const SAVE_DEBUG_FILES = process.env.SAVE_DEBUG_FILES === "true";

module.exports = NodeHelper.create({
	start: function() {
		console.log("Starting node helper for: " + this.name);
		console.log("SAVE_DEBUG_FILES:", SAVE_DEBUG_FILES);
	},

	socketNotificationReceived: function(notification, payload) {
		console.log(this.name + " received socket notification: " + notification);
		
		if (notification === "START_CAPTURE") {
			this.captureAudioAndImage();
		}
	},

	// ============================================================
	// NEW: Buffer-based capture (no files saved to disk by default)
	// ============================================================

	captureAudioAndImage: function() {
		console.log("Starting audio and image capture (buffer mode)...");
		
		// Capture image first (instant), then audio (5 seconds)
		this.captureImageToBuffer((imageBuffer, imageError) => {
			if (imageError) {
				console.error("Image capture failed:", imageError);
			} else {
				console.log("Image captured to buffer, size:", imageBuffer.length, "bytes");
			}

			// Notify frontend that audio recording is about to start
			// This ensures "AI Listening" shows for exactly 5 seconds
			this.sendSocketNotification("AUDIO_RECORDING_STARTED", {});

			this.captureAudioToBuffer((audioBuffer, audioError) => {
				if (audioError) {
					console.error("Audio capture failed:", audioError);
					this.sendSocketNotification("CAPTURE_COMPLETE", {
						transcription: null,
						error: audioError,
						success: false
					});
					return;
				}

				console.log("Audio captured to buffer, size:", audioBuffer.length, "bytes");

				// Optionally save files to disk for debugging
				if (SAVE_DEBUG_FILES) {
					const timestamp = new Date().getTime();
					const moduleDir = path.resolve(__dirname);
					const debugAudioFile = path.join(moduleDir, `debug_audio_${timestamp}.wav`);
					const debugImageFile = path.join(moduleDir, `debug_image_${timestamp}.jpg`);
					
					fs.writeFileSync(debugAudioFile, audioBuffer);
					console.log("Debug audio saved:", debugAudioFile);
					
					if (imageBuffer) {
						fs.writeFileSync(debugImageFile, imageBuffer);
						console.log("Debug image saved:", debugImageFile);
					}
				}

				console.log("Capture complete! Now transcribing from buffer...");

				// Send audio buffer directly to STT API (no file needed)
				this.transcribeAudioFromBuffer(audioBuffer, (transcription, error) => {
					if (error) {
						console.error("Transcription failed:", error);
						this.sendSocketNotification("CAPTURE_COMPLETE", {
							transcription: null,
							error: error,
							success: false
						});
					} else {
						console.log("Transcription successful:", transcription);

						// Send transcription to frontend immediately (shows "You said: ...")
						this.sendSocketNotification("CAPTURE_COMPLETE", {
							transcription: transcription,
							success: true
						});

						// Now send transcription + image to Azure OpenAI
						console.log("Sending to Azure OpenAI...");
						this.sendToAzureOpenAI(transcription, imageBuffer);
					}
				});
			});
		});
	},

	// Capture image directly into a Buffer (stdout) using fswebcam
	captureImageToBuffer: function(callback) {
		console.log("Capturing image to buffer...");
		
		// fswebcam with "--save -" writes the JPEG to stdout instead of a file
		// --skip 10: skip first 10 frames (lets camera auto-adjust exposure/white balance)
		// --jpeg 95: high quality JPEG compression
		const cmd = `fswebcam -r 1280x720 --no-banner --skip 10 --jpeg 95 --save -`;
		
		exec(cmd, { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			if (error) {
				console.error("Image capture error:", error.message);
				console.error("stderr:", stderr ? stderr.toString() : "");
				// Return null buffer but don't block the flow
				callback(null, error.message);
			} else {
				console.log("Image captured to buffer successfully, size:", stdout.length, "bytes");
				callback(stdout, null);
			}
		});
	},

	// Capture audio directly into a Buffer (stdout) using arecord
	captureAudioToBuffer: function(callback) {
		console.log("Capturing audio to buffer...");
		console.log("Starting 5-second audio recording...");
		
		const startTime = Date.now();
		
		// arecord with -t wav and output to stdout (-)
		// This writes the WAV data directly to stdout instead of a file
		const cmd = `arecord -D plughw:3,0 -f S16_LE -r 16000 -c 1 -d 5 -t wav -`;
		
		exec(cmd, { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
			const duration = ((Date.now() - startTime) / 1000).toFixed(2);
			console.log(`Audio command finished in ${duration} seconds`);
			
			if (error) {
				console.error("Audio capture ERROR:", error.message);
				console.error("Error code:", error.code);
				callback(null, error.message);
			} else {
				console.log("Audio captured to buffer successfully, size:", stdout.length, "bytes");
				if (stderr && stderr.length > 0) console.log("stderr:", stderr.toString());
				callback(stdout, null);
			}
		});
	},

	// Transcribe audio directly from a Buffer (no file on disk needed)
	transcribeAudioFromBuffer: async function(audioBuffer, callback) {
		console.log("Starting transcription from buffer, size:", audioBuffer.length, "bytes");
		
		// Check if environment variables are set
		if (!process.env.AZURE_STT_OPENAI_ENDPOINT || !process.env.AZURE_STT_OPENAI_API_KEY) {
			console.error("ERROR: Azure OpenAI credentials not found in .env file!");
			callback(null, "Azure OpenAI credentials not configured");
			return;
		}

		try {
			const axios = require("axios");
			
			// Azure OpenAI Whisper API endpoint
			const endpoint = process.env.AZURE_STT_OPENAI_ENDPOINT;
			const apiKey = process.env.AZURE_STT_OPENAI_API_KEY;
			const deploymentName = process.env.AZURE_STT_OPENAI_DEPLOYMENT_NAME;
			const apiVersion = "2024-06-01";

			const url = `${endpoint}/openai/deployments/${deploymentName}/audio/transcriptions?api-version=${apiVersion}`;

			console.log("Calling Azure OpenAI STT API...");
			console.log("Endpoint:", url);
			console.log("Audio buffer size:", audioBuffer.length, "bytes");
			
			// Create form data with buffer directly (no file stream needed)
			const formData = new FormData();
			formData.append(
				"file",
				audioBuffer,
				{
					filename: "audio.wav",
					contentType: "audio/wav"
				}
			);
			
			console.log("Form data headers:", formData.getHeaders());
			
			const response = await axios.post(url, formData, {
				headers: {
					"api-key": apiKey,
					...formData.getHeaders()
				},
				maxBodyLength: Infinity,
				maxContentLength: Infinity
			});

			console.log("STT API Response status:", response.status);
			console.log("STT API Response:", response.data);
			
			// Azure OpenAI returns the transcription in the "text" field
			const transcription = response.data.text || response.data.transcription || "";
			
			if (transcription) {
				console.log("Transcription successful:", transcription);
				callback(transcription, null);
			} else {
				console.error("No transcription text in response");
				callback(null, "No transcription returned");
			}
			
		} catch (error) {
			console.error("Transcription error:", error.message);
			
			// Log detailed axios error
			if (error.response) {
				console.error("Error status:", error.response.status);
				console.error("Error headers:", error.response.headers);
				console.error("Error data:", error.response.data);
			} else if (error.request) {
				console.error("No response received:", error.request);
			} else {
				console.error("Error setting up request:", error.message);
			}
			
			console.error("Full error stack:", error.stack);
			callback(null, error.message);
		}
	},

	// ============================================================
	// Phase 4: Send transcription + image to Azure OpenAI
	// ============================================================

	/* ---- GEMINI CODE COMMENTED OUT ----
	sendToGemini: async function(transcription, imageBuffer) {
		console.log("Starting Gemini AI request...");
		console.log("Transcription:", transcription);
		console.log("Image buffer:", imageBuffer ? imageBuffer.length + " bytes" : "none");

		if (!process.env.GEMINI_KEY) {
			console.error("ERROR: GEMINI_KEY not found in .env file!");
			this.sendSocketNotification("AI_RESPONSE", {
				response: null,
				error: "Gemini API key not configured",
				success: false
			});
			return;
		}

		try {
			const ai = new GoogleGenAI({
				apiKey: process.env.GEMINI_KEY,
				apiVersion: "v1alpha"
			});

			const parts = [
				{ text: transcription }
			];

			if (imageBuffer) {
				parts.push({
					inlineData: {
						mimeType: "image/jpeg",
						data: imageBuffer.toString("base64")
					},
					mediaResolution: {
						level: "media_resolution_medium"
					}
				});
			}

			console.log("Calling Gemini API (gemini-3-flash-preview)...");

			const response = await ai.models.generateContent({
				model: "gemini-3-flash-preview",
				systemInstruction: SYSTEM_PROMPT,
				contents: [{ parts: parts }],
				config: {
					maxOutputTokens: 300,
					thinkingConfig: {
						thinkingLevel: "low",
					}
				}
			});

			const aiText = response.text;
			console.log("Gemini AI response:", aiText);

			if (aiText) {
				this.sendSocketNotification("AI_RESPONSE", {
					response: aiText,
					success: true
				});
			} else {
				console.error("No text in Gemini response");
				this.sendSocketNotification("AI_RESPONSE", {
					response: null,
					error: "No response from AI",
					success: false
				});
			}

		} catch (error) {
			console.error("Gemini API error:", error.message);
			if (error.response) {
				console.error("Error details:", error.response);
			}
			console.error("Full error stack:", error.stack);

			this.sendSocketNotification("AI_RESPONSE", {
				response: null,
				error: error.message,
				success: false
			});
		}
	}
	---- END GEMINI CODE COMMENTED OUT ---- */

	sendToAzureOpenAI: async function(transcription, imageBuffer) {
		console.log("Starting Azure OpenAI request...");
		console.log("Transcription:", transcription);
		console.log("Image buffer:", imageBuffer ? imageBuffer.length + " bytes" : "none");

		const apiKey = process.env.azure_key;
		if (!apiKey) {
			console.error("ERROR: azure_key not found in .env file!");
			this.sendSocketNotification("AI_RESPONSE", {
				response: null,
				error: "Azure OpenAI API key not configured",
				success: false
			});
			return;
		}

		try {
			const axios = require("axios");

			const resourceName = "https://synthia-v2.openai.azure.com";
			const deploymentName = "gpt-5-mini";
			const apiVersion = "2025-04-01-preview";

			const url = `${resourceName}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

			// Build messages array
			const userContent = [];

			// Add text
			userContent.push({
				type: "text",
				text: transcription
			});

			// Add image if available
			if (imageBuffer) {
				const base64Image = imageBuffer.toString("base64");
				userContent.push({
					type: "image_url",
					image_url: {
						url: `data:image/jpeg;base64,${base64Image}`,
						detail: "low"
					}
				});
			}

			const requestBody = {
				messages: [
					{
						role: "system",
						content: SYSTEM_PROMPT
					},
					{
						role: "user",
						content: userContent
					}
				],
				max_completion_tokens: 2048,
				reasoning_effort: "low"
			};

			console.log("Calling Azure OpenAI API (gpt-5-mini)...");
			console.log("Endpoint:", url);

			const response = await axios.post(url, requestBody, {
				headers: {
					"api-key": apiKey,
					"Content-Type": "application/json"
				}
			});

			console.log("Azure OpenAI response status:", response.status);

			const choice = response.data.choices && response.data.choices[0];
			const aiText = choice && choice.message && choice.message.content;

			console.log("Azure OpenAI response:", aiText);
			console.log("Finish reason:", choice && choice.finish_reason);
			console.log("Usage:", JSON.stringify(response.data.usage));

			if (aiText && aiText.trim().length > 0) {
				this.sendSocketNotification("AI_RESPONSE", {
					response: aiText,
					success: true
				});
			} else {
				const finishReason = choice && choice.finish_reason;
				const reasoning = response.data.usage && response.data.usage.completion_tokens_details && response.data.usage.completion_tokens_details.reasoning_tokens;
				console.error("No text in Azure OpenAI response. Finish reason:", finishReason, "Reasoning tokens used:", reasoning);
				this.sendSocketNotification("AI_RESPONSE", {
					response: null,
					error: finishReason === "length" 
						? "AI used all tokens on reasoning, no output generated. Try again." 
						: "No response from AI",
					success: false
				});
			}

		} catch (error) {
			console.error("Azure OpenAI API error:", error.message);
			if (error.response) {
				console.error("Error status:", error.response.status);
				console.error("Error data:", error.response.data);
			}
			console.error("Full error stack:", error.stack);

			this.sendSocketNotification("AI_RESPONSE", {
				response: null,
				error: error.message,
				success: false
			});
		}
	}


});
