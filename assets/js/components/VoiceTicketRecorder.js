// GRP_frontend/assets/js/components/VoiceTicketRecorder.js
import { api } from "../api.js"; // <-- adjust path if needed

export class VoiceTicketRecorder {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`VoiceTicketRecorder: container "${containerId}" not found`);
        }

        // Options
        this.uploadPath = options.uploadPath || "/api/upload"; // backend route
        this.auth = options.auth ?? true; // send bearer token by default
        this.fieldName = options.fieldName || "audio"; // multipart field name expected by backend

        // State
        this.mediaRecorder = null;
        this.stream = null;
        this.audioChunks = [];
        this.recording = false;

        this.createUI();
        this.bindEvents();
    }

    createUI() {
        this.container.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <button id="recordButton" class="btn btn-danger btn-lg mb-3" type="button">
            <i class="bi bi-mic" style="font-size: 2rem;"></i>
          </button>

          <div>
            <span id="recordingText">Ready to record</span>
            <div id="recordingSpinner" class="spinner-border spinner-border-sm d-none ms-2" role="status">
              <span class="visually-hidden">Uploading...</span>
            </div>
          </div>
        </div>
      </div>
    `;

        this.recordButton = this.container.querySelector("#recordButton");
        this.recordingText = this.container.querySelector("#recordingText");
        this.recordingSpinner = this.container.querySelector("#recordingSpinner");
    }

    bindEvents() {
        this.recordButton.addEventListener("click", () => this.toggleRecording());
    }

    async toggleRecording() {
        if (!this.recording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const options = this.getSupportedRecorderOptions();
            this.mediaRecorder = new MediaRecorder(this.stream, options);

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                try {
                    await this.uploadRecording();
                    this.flashMessage("Audio uploaded successfully!", "success");
                } catch (err) {
                    console.error("Upload error:", err);
                    this.flashMessage(err?.message || "Audio upload failed.", "danger");
                } finally {
                    this.cleanupStream();
                    this.setReadyUI();
                }
            };

            this.mediaRecorder.start();
            this.recording = true;
            this.setRecordingUI();
        } catch (err) {
            console.error("Mic access error:", err);
            this.flashMessage(
                "Microphone access denied. Please enable microphone permissions.",
                "danger"
            );
            this.cleanupStream();
            this.setReadyUI();
        }
    }

    stopRecording() {
        if (!this.mediaRecorder) return;

        this.recording = false;

        // Switch UI immediately to show we're finishing up
        this.recordingSpinner.classList.remove("d-none");
        this.recordingText.textContent = "Uploading audio...";

        if (this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
        }
    }

    async uploadRecording() {
        // Build blob
        const mimeType =
            (this.mediaRecorder && this.mediaRecorder.mimeType) || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });

        // Pick a filename extension
        const ext = mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("mp4")
                ? "mp4"
                : "webm";
        const filename = `recording.${ext}`;

        // Build multipart form
        const formData = new FormData();
        formData.append(this.fieldName, audioBlob, filename);

        // Upload to backend via your api.js (FormData supported)
        // NOTE: api.upload returns parsed response if any; we don't need it.
        await api.upload(this.uploadPath, formData, { auth: this.auth });
    }

    cleanupStream() {
        if (this.stream) {
            this.stream.getTracks().forEach((t) => t.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    setRecordingUI() {
        this.recordingSpinner.classList.add("d-none");
        this.recordingText.textContent = "Recording...";
        this.recordButton.innerHTML =
            '<i class="bi bi-stop-fill" style="font-size: 2rem;"></i>';
    }

    setReadyUI() {
        this.recordingSpinner.classList.add("d-none");
        this.recordingText.textContent = "Ready to record";
        this.recordButton.innerHTML =
            '<i class="bi bi-mic" style="font-size: 2rem;"></i>';
    }

    getSupportedRecorderOptions() {
        // Try common mime types in order for best compatibility
        const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/ogg",
            "audio/mp4", // some Safari versions
        ];

        if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === "function") {
            for (const mimeType of candidates) {
                if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType };
            }
        }

        return {}; // let browser decide
    }

    flashMessage(message, type) {
        const alert = document.createElement("div");
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

        const flashContainer =
            this.container.closest(".container") || document.querySelector(".container");
        (flashContainer || document.body).prepend(alert);
    }
}