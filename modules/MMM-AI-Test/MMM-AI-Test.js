/* Magic Mirror
 * Module: MMM-AI-Test
 *
 * AI Assistant module for voice interaction
 */

Module.register("MMM-AI-Test", {
	defaults: {
		fadeSpeed: 300
	},

	start: function() {
		Log.info("Starting module: " + this.name);
		this.statusMessage = "Ready";
		this.isPreparing = false;
		this.isListening = false;
		this.transcription = null;
		this.aiResponse = null;
	},

	getStyles: function() {
		return ["MMM-AI-Test.css"];
	},

	getDom: function() {
		var wrapper = document.createElement("div");
		wrapper.className = "ai-assistant-wrapper";
		
		if (this.isListening) {
			// Show "AI Listening" only during actual 5-second audio recording
			wrapper.innerHTML = "<div class='ai-status-text'>AI Listening...</div>";
		} else if (this.isPreparing) {
			// Show "Preparing" during image capture (before audio recording)
			wrapper.innerHTML = "<div class='ai-ready-text'>Preparing...</div>";
		} else if (this.aiResponse) {
			// Show AI response
			wrapper.innerHTML = "<div class='ai-label-text'>Fashion AI</div>" +
			                   "<div class='ai-response-text'>" + this.aiResponse + "</div>";
		} else if (this.transcription) {
			// Show transcribed text while waiting for AI
			wrapper.innerHTML = "<div class='ai-label-text'>You said:</div>" +
			                   "<div class='ai-transcription-text'>\"" + this.transcription + "\"</div>" +
			                   "<div class='ai-dimmed-text'>Thinking...</div>";
		} else {
			// Ready state
			wrapper.innerHTML = "<div class='ai-ready-text'>" + this.statusMessage + "</div>";
		}
		
		return wrapper;
	},

	notificationReceived: function(notification, payload, sender) {
		Log.info(this.name + " received notification: " + notification);
		
		if (notification === "START_AI_LISTENING") {
			Log.info("AI Listening triggered! Starting capture...");
			this.isPreparing = true;
			this.isListening = false;
			this.statusMessage = "Preparing...";
			this.updateDom(this.config.fadeSpeed);
			
			// Send request to backend to capture audio and image
			this.sendSocketNotification("START_CAPTURE", {});
		}
	},

	socketNotificationReceived: function(notification, payload) {
		Log.info(this.name + " received socket notification: " + notification);
		
		if (notification === "AUDIO_RECORDING_STARTED") {
			// Audio recording has started - show "AI Listening" for exactly 5 seconds
			Log.info("Audio recording started!");
			this.isPreparing = false;
			this.isListening = true;
			this.updateDom(this.config.fadeSpeed);
		}
		
		if (notification === "CAPTURE_COMPLETE") {
			Log.info("Capture complete!", payload);
			this.isPreparing = false;
			this.isListening = false;
			
			if (payload.success && payload.transcription) {
				// Display transcribed text while waiting for AI response
				this.transcription = payload.transcription;
				this.aiResponse = null;
				this.statusMessage = "Thinking...";
				Log.info("Transcription: " + payload.transcription);
			} else if (payload.error) {
				// Show error
				this.transcription = null;
				this.aiResponse = null;
				this.statusMessage = "Error: " + payload.error;
			} else {
				// Capture failed
				this.transcription = null;
				this.aiResponse = null;
				this.statusMessage = "Capture failed";
			}
			
			this.updateDom(this.config.fadeSpeed);
		}

		if (notification === "AI_RESPONSE") {
			Log.info("AI Response received!", payload);

			if (payload.success && payload.response) {
				// Replace transcription with AI response
				this.transcription = null;
				this.aiResponse = payload.response;
				Log.info("AI Response: " + payload.response);
			} else if (payload.error) {
				this.transcription = null;
				this.aiResponse = null;
				this.statusMessage = "AI Error: " + payload.error;
			}

			this.updateDom(this.config.fadeSpeed);

			// Reset to "Ready" after 30 seconds
			var self = this;
			setTimeout(function() {
				self.transcription = null;
				self.aiResponse = null;
				self.statusMessage = "Ready";
				self.updateDom(self.config.fadeSpeed);
			}, 30000);
		}
	}
});
