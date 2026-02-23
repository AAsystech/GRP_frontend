// GRP_frontend/assets/js/ticketWorkflow.js
import { VoiceTicketRecorder } from "./components/VoiceTicketRecorder.js"; // <-- adjust if file path differs
import { api } from "./api.js"; // <-- so text submission also goes to Render backend

document.addEventListener("DOMContentLoaded", function () {
    // Get DOM elements
    const newTicketBtn = document.getElementById("newTicketBtn");
    const ticketModal = document.getElementById("ticketModal");
    const modalContent = document.getElementById("modalContent");

    // Store modal instance globally for easy access
    let modalInstance = null;

    // Open modal when "Raise New Ticket" button is clicked
    if (newTicketBtn) {
        newTicketBtn.addEventListener("click", function () {
            // Reset modal content to initial options
            showInitialOptions();

            // Show modal
            if (!modalInstance) {
                modalInstance = new bootstrap.Modal(ticketModal);
            }
            modalInstance.show();
        });
    }

    // Reset to initial options when modal is hidden
    if (ticketModal) {
        ticketModal.addEventListener("hidden.bs.modal", function () {
            showInitialOptions();
        });
    }

    // Show initial options in modal
    function showInitialOptions() {
        modalContent.innerHTML = `
      <div class="text-center">
        <p class="mb-4">How would you like to describe your issue?</p>
        <div class="d-grid gap-3">
          <button id="recordOption" class="btn btn-outline-primary btn-lg" type="button">
            <i class="bi bi-mic fs-1"></i>
            <div class="mt-2">Record Audio</div>
          </button>
          <button id="textOption" class="btn btn-outline-success btn-lg" type="button">
            <i class="bi bi-textarea-t fs-1"></i>
            <div class="mt-2">Type Text</div>
          </button>
        </div>
      </div>
    `;

        // Bind events for dynamically created buttons
        document.getElementById("recordOption")?.addEventListener("click", showRecorder);
        document.getElementById("textOption")?.addEventListener("click", showTextForm);
    }

    // Show recorder in modal
    function showRecorder() {
        modalContent.innerHTML = `
      <div id="recorderContainer"></div>
      <div class="mt-3 text-center">
        <button id="backToOptions" class="btn btn-secondary" type="button">
          <i class="bi bi-arrow-left"></i> Back
        </button>
      </div>
    `;

        // Initialize recorder component (uploads only, using api.js)
        new VoiceTicketRecorder("recorderContainer", {
            uploadPath: "/ai/transcribe",
            fieldName: "file",
            auth: true,
        });

        // Back button
        document.getElementById("backToOptions")?.addEventListener("click", showInitialOptions);
    }

    // Show text form in modal
    function showTextForm() {
        modalContent.innerHTML = `
      <form id="textTicketForm">
        <div class="mb-3">
          <label for="issueDescription" class="form-label">Issue Description</label>
          <textarea class="form-control" id="issueDescription" rows="5"
            placeholder="Please describe your issue in detail..." required></textarea>
        </div>
        <div class="d-grid gap-2">
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-send"></i> Submit Ticket
          </button>
          <button id="backToOptions" type="button" class="btn btn-secondary">
            <i class="bi bi-arrow-left"></i> Back
          </button>
        </div>
      </form>
    `;

        document.getElementById("textTicketForm")?.addEventListener("submit", handleTextSubmission);
        document.getElementById("backToOptions")?.addEventListener("click", showInitialOptions);
    }

    // Handle text ticket submission
    async function handleTextSubmission(event) {
        event.preventDefault();

        const description = document.getElementById("issueDescription")?.value.trim();
        if (!description) {
            flashMessage("Please enter a description for your issue.", "danger");
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            // Use api.js so it goes to https://grp-backend.onrender.com with Authorization header
            await api.post("/ai/text", {
                text: description,
                source: "text",
            });

            flashMessage("Ticket created successfully!", "success");

            // Close modal
            if (modalInstance) modalInstance.hide();

            // Refresh dashboard
            if (typeof refreshDashboard === "function") refreshDashboard();
        } catch (error) {
            console.error("Error:", error);
            flashMessage(error?.message || "Failed to create ticket. Please try again.", "danger");
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }

    // Flash message utility
    function flashMessage(message, type) {
        const alert = document.createElement("div");
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

        const container = modalContent.closest(".modal-body") || document.querySelector(".container");
        (container || document.body).prepend(alert);
    }

    // Initialize default view inside modal (optional but consistent)
    showInitialOptions();
});

// Global function to refresh dashboard (called after uploads/submissions)
window.refreshDashboard = function refreshDashboard() {
    location.reload();
};