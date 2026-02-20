document.addEventListener('DOMContentLoaded', function () {
    // Get DOM elements
    const newTicketBtn = document.getElementById('newTicketBtn');
    const ticketModal = document.getElementById('ticketModal');
    const modalContent = document.getElementById('modalContent');
    const recordOption = document.getElementById('recordOption');
    const textOption = document.getElementById('textOption');

    // Store modal instance globally for easy access
    let modalInstance = null;

    // Open modal when "Raise New Ticket" button is clicked
    if (newTicketBtn) {
        newTicketBtn.addEventListener('click', function () {
            // Reset modal content to initial options
            showInitialOptions();

            // Show modal
            if (!modalInstance) {
                modalInstance = new bootstrap.Modal(ticketModal);
            }
            modalInstance.show();
        });
    }

    // Handle recording option
    if (recordOption) {
        recordOption.addEventListener('click', function () {
            showRecorder();
        });
    }

    // Handle text option
    if (textOption) {
        textOption.addEventListener('click', function () {
            showTextForm();
        });
    }

    // Reset to initial options when modal is hidden
    if (ticketModal) {
        ticketModal.addEventListener('hidden.bs.modal', function () {
            showInitialOptions();
        });
    }

    // Show initial options in modal
    function showInitialOptions() {
        modalContent.innerHTML = `
            <div class="text-center">
                <p class="mb-4">How would you like to describe your issue?</p>
                <div class="d-grid gap-3">
                    <button id="recordOption" class="btn btn-outline-primary btn-lg">
                        <i class="bi bi-mic fs-1"></i>
                        <div class="mt-2">Record Audio</div>
                    </button>
                    <button id="textOption" class="btn btn-outline-success btn-lg">
                        <i class="bi bi-textarea-t fs-1"></i>
                        <div class="mt-2">Type Text</div>
                    </button>
                </div>
            </div>
        `;

        // Rebind event listeners for dynamically created buttons
        document.getElementById('recordOption').addEventListener('click', showRecorder);
        document.getElementById('textOption').addEventListener('click', showTextForm);
    }

    // Show recorder in modal
    function showRecorder() {
        modalContent.innerHTML = `
            <div id="recorderContainer"></div>
            <div class="mt-3 text-center">
                <button id="backToOptions" class="btn btn-secondary">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
            </div>
        `;

        // Initialize recorder component
        new VoiceTicketRecorder('recorderContainer');

        // Add back button functionality
        document.getElementById('backToOptions').addEventListener('click', showInitialOptions);
    }

    // Show text form in modal
    function showTextForm() {
        modalContent.innerHTML = `
            <form id="textTicketForm">
                <div class="mb-3">
                    <label for="issueDescription" class="form-label">Issue Description</label>
                    <textarea class="form-control" id="issueDescription" rows="5" placeholder="Please describe your issue in detail..." required></textarea>
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

        // Handle form submission
        document.getElementById('textTicketForm').addEventListener('submit', handleTextSubmission);

        // Add back button functionality
        document.getElementById('backToOptions').addEventListener('click', showInitialOptions);
    }

    // Handle text ticket submission
    async function handleTextSubmission(event) {
        event.preventDefault();

        const description = document.getElementById('issueDescription').value.trim();

        if (!description) {
            flashMessage('Please enter a description for your issue.', 'danger');
            return;
        }

        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            // Send to server
            const response = await fetch('/api/create_ticket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: description,
                    source: 'text'
                })
            });

            const result = await response.json();

            if (response.ok) {
                flashMessage('Ticket created successfully!', 'success');

                // Close modal
                if (modalInstance) {
                    modalInstance.hide();
                }

                // Refresh dashboard
                if (typeof refreshDashboard === 'function') {
                    refreshDashboard();
                }
            } else {
                throw new Error(result.error || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error:', error);
            flashMessage('Failed to create ticket. Please try again.', 'danger');
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }

    // Flash message utility
    function flashMessage(message, type) {
        // Create flash message
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Prepend to modal body or container
        const container = modalContent.closest('.modal-body') || document.querySelector('.container');
        if (container) {
            container.prepend(alert);
        } else {
            document.body.prepend(alert);
        }
    }
});

// Global function to refresh dashboard (will be called by recorder component)
function refreshDashboard() {
    // Reload the page to refresh all data
    location.reload();
}
