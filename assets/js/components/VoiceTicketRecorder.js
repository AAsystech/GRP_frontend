class VoiceTicketRecorder {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recording = false;

        // Create the recorder UI
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        this.container.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <button id="recordButton" class="btn btn-danger btn-lg mb-3">
                        <i class="bi bi-mic" style="font-size: 2rem;"></i>
                    </button>
                    <div>
                        <span id="recordingText">Ready to record</span>
                        <div id="recordingSpinner" class="spinner-border spinner-border-sm d-none" role="status">
                            <span class="visually-hidden">Processing...</span>
                        </div>
                    </div>
                    <div id="transcriptContainer" class="mt-3 text-start d-none">
                        <h6>Transcript:</h6>
                        <p id="transcriptText" class="mb-0"></p>
                    </div>
                </div>
            </div>
        `;

        // Initialize element references
        this.recordButton = this.container.querySelector('#recordButton');
        this.recordingText = this.container.querySelector('#recordingText');
        this.recordingSpinner = this.container.querySelector('#recordingSpinner');
        this.transcriptContainer = this.container.querySelector('#transcriptContainer');
        this.transcriptText = this.container.querySelector('#transcriptText');
    }

    bindEvents() {
        this.recordButton.addEventListener('click', () => this.toggleRecording());
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
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = event => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                await this.processRecording(stream);
            };

            // Start recording
            this.mediaRecorder.start();
            this.recording = true;
            this.recordButton.classList.add('recording');
            this.recordingText.textContent = 'Recording...';
            this.recordButton.innerHTML = '<i class="bi bi-stop-fill" style="font-size: 2rem;"></i>';
        } catch (err) {
            console.error('Error accessing microphone:', err);
            this.flashMessage('Microphone access denied. Please enable microphone permissions.', 'danger');
        }
    }

    stopRecording() {
        this.mediaRecorder.stop();
        this.recording = false;
        this.recordButton.classList.remove('recording');
        this.recordButton.innerHTML = '<i class="bi bi-mic" style="font-size: 2rem;"></i>';
    }

    async processRecording(stream) {
        // Create audio blob
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];

        // Create form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        // Show spinner while processing
        this.recordingSpinner.classList.remove('d-none');
        this.recordingText.textContent = 'Processing audio...';

        try {
            // Send to server
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.ok) {
                this.transcriptText.textContent = result.transcript;
                this.transcriptContainer.style.display = 'block';
                this.flashMessage('Transcription completed successfully!', 'success');

                // Refresh the dashboard (if needed)
                if (typeof refreshDashboard === 'function') {
                    refreshDashboard();
                }
            } else {
                throw new Error('Transcription failed');
            }
        } catch (error) {
            console.error('Error:', error);
            this.flashMessage('Transcription failed. Please try again.', 'danger');
        } finally {
            this.recordingSpinner.classList.add('d-none');
            this.recordingText.textContent = 'Ready to record';
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
    }

    flashMessage(message, type) {
        // Create flash message
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Prepend to flash container or parent
        const flashContainer = this.container.closest('.container') || document.querySelector('.container');
        if (flashContainer) {
            flashContainer.prepend(alert);
        } else {
            document.body.prepend(alert);
        }
    }
}

// Initialize recorder when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // This will be initialized by the modal workflow
});
