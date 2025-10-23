let countdownSeconds = 120;
let timerInterval;
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
// --- NEW GLOBAL BUTTON ELEMENT ---
const globalEditBtn = document.getElementById("globalEditBtn"); 
let currentRow = 0;
const rows = [];
let timerStarted = false; // Track if timer has been manually started
// ... (rest of the existing variables)

const copusDetailsIdInput = document.getElementById('copusDetailsId');
const copusDetailsId = copusDetailsIdInput ? copusDetailsIdInput.value : null;

// ============================================================
// HELPERS: detect saved progress and update Start button label
// ============================================================
function hasAnySavedProgress() {
    try {
        if (typeof savedTimerState !== 'undefined' && savedTimerState) {
            return true;
        }
        if (typeof existingObservationData !== 'undefined' && Array.isArray(existingObservationData)) {
            return existingObservationData.some((obs) => {
                if (!obs) return false;
                const sa = obs.studentActions || {};
                const ta = obs.teacherActions || {};
                const el = obs.engagementLevel || {};
                const hasStudent = Object.values(sa).some(v => v === 1 || v === '1');
                const hasTeacher = Object.values(ta).some(v => v === 1 || v === '1');
                const hasEng = (el.High === 1 || el.Med === 1 || el.Low === 1 || el.High === '1' || el.Med === '1' || el.Low === '1');
                const hasComment = !!(obs.comment && String(obs.comment).trim().length > 0);
                return hasStudent || hasTeacher || hasEng || hasComment;
            });
        }
    } catch (_) { /* ignore */ }
    return false;
}

function updateStartBtnLabel() {
    if (!startBtn) return;
    const labelSpan = startBtn.querySelector('.btn-text') || startBtn;
    if (!timerInterval && hasAnySavedProgress()) {
        labelSpan.textContent = 'Continue Timer';
    } else {
        labelSpan.textContent = 'Start Timer';
    }
}

// ============================================================
// GLOBAL EDIT TOGGLE: enable/disable all inputs
// ============================================================
let isGlobalEditing = false;
function setAllInputsEnabled(enabled) {
    rows.forEach((row) => {
        const checkboxes = row.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => cb.disabled = !enabled);
        const commentField = row.querySelector("textarea, input[type='text']");
        if (commentField) commentField.disabled = !enabled;
    });
}

if (globalEditBtn) {
    globalEditBtn.addEventListener('click', () => {
        isGlobalEditing = !isGlobalEditing;
        setAllInputsEnabled(isGlobalEditing);
        const labelSpan = globalEditBtn.querySelector('.btn-text') || globalEditBtn;
        labelSpan.textContent = isGlobalEditing ? 'Save' : 'Edit';
        if (!isGlobalEditing) {
            // When toggling off edit (i.e., saving), trigger autosave
            scheduleAutoSave();
            // Re-apply per-interval enablement
            if (currentRow < rows.length) {
                highlightRow(currentRow);
            }
        }
    });
}

// ==========================================================
// TEMPORARILY COMMENT OUT TIMER AND ROW HIGHLIGHTING LOGIC
// FOR DEBUGGING PURPOSES. UNCOMMENT WHEN DONE DEBUGGING.
// ==========================================================


function updateCountdown() {
    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (countdownSeconds > 0) {
        countdownSeconds--;
        
        // Auto-save timer state every 10 seconds while running
        if (timerStarted && countdownSeconds % 10 === 0) {
            scheduleAutoSave();
        }
    } else {
        clearInterval(timerInterval);

        // Enable edit button for the finished row
        const finishedRow = rows[currentRow];
        const editBtn = finishedRow.querySelector("button");
        if (editBtn) editBtn.disabled = false;

        // Disable inputs in the finished row
        const checkboxes = finishedRow.querySelectorAll("input[type='checkbox']");
        checkboxes.forEach(cb => cb.disabled = true);
        const commentField = finishedRow.querySelector("textarea, input[type='text']");
        if (commentField) commentField.disabled = true;

        // Remove highlight
        finishedRow.style.backgroundColor = '';

        // Move to next row or stop if last
        if (currentRow < rows.length - 1) {
            currentRow++;
            highlightRow(currentRow);
            countdownSeconds = 120;
            timerInterval = setInterval(updateCountdown, 1000);
            scheduleAutoSave(); // Save when moving to next row
        } else {
            // All rows finished
            console.log("Observation complete.");
            scheduleAutoSave(); // Final save
        }
    }
}

function highlightRow(rowIndex) {
    rows.forEach((row) => {
        row.style.backgroundColor = '';
        if (!isGlobalEditing) {
            const checkboxes = row.querySelectorAll("input[type='checkbox']");
            checkboxes.forEach(cb => cb.disabled = true);
            const commentField = row.querySelector("textarea, input[type='text']");
            if (commentField) commentField.disabled = true;
        }
    });

    // Highlight the current row
    const row = rows[rowIndex];
    row.style.backgroundColor = 'yellow';
    if (!isGlobalEditing) {
        const activeCheckboxes = row.querySelectorAll("input[type='checkbox']");
        activeCheckboxes.forEach(cb => cb.disabled = false);
        const activeComment = row.querySelector("textarea, input[type='text']");
        if (activeComment) activeComment.disabled = false;
    }
}


// Start/Continue button listener
startBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    timerEl.style.backgroundColor = "";

    // If we have saved state or any saved progress, resume; else start fresh
    if (typeof savedTimerState !== 'undefined' && savedTimerState) {
        // Ensure currentRow/countdownSeconds already restored in load logic
        if (currentRow >= rows.length) currentRow = rows.length - 1;
        highlightRow(currentRow);
    } else if (hasAnySavedProgress()) {
        // No explicit timer state but some data exists; keep current row (default 0) and seconds (default 120)
        highlightRow(currentRow);
    } else {
        // Fresh start
        currentRow = 0;
        countdownSeconds = 120;
        highlightRow(currentRow);
    }

    updateCountdown();
    timerStarted = true; // Mark that timer has been started
    timerInterval = setInterval(updateCountdown, 1000);
    scheduleAutoSave(); // Save immediately when starting
    updateStartBtnLabel();
});

// ==========================================================
// END TEMPORARY COMMENT OUT
// ==========================================================

// Generate tables (keep this, as it generates the form fields)
const tablesContainer = document.getElementById("tablesContainer");

for (let t = 0; t < 1; t++) {
    const tableWrapper = document.createElement("div");

    tableWrapper.innerHTML = `
        <table border="1" style="margin-bottom: 20px;">
            <div class="table-scroll-container" style="max-height: 70vh; overflow-y: auto; border: 1px solid #ccc;">
  <table border="1" style="width: 100%; border-collapse: collapse;">
    <thead class="table-header">
      <tr>
        <th rowspan="2" style="position: sticky; top: 50px; background-color: #2f5597; color: white; z-index: 2;">Min</th>
        <th colspan="10" style="position: sticky; top: 73px; background-color: #2f5597; color: white; z-index: 2;">Student Actions</th>
        <th colspan="11" style="position: sticky; top: 73px; background-color: #2f5597; color: white; z-index: 2;">Teacher Actions</th>
        <th colspan="3" style="position: sticky; top: 73px; background-color: #2f5597; color: white; z-index: 2;">Level of Engagement</th>
    <th rowspan="2" style="position: sticky; top: 50px; background-color: #2f5597; color: white; z-index: 2;">Comments</th>
      </tr>
      <tr>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">L</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Ind</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Grp</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">AnQ</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">AsQ</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">WC</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">SP</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">T/Q</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">W</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">O</th>

        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Lec</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">RtW</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">MG</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">AnQ</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">PQ</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">FUp</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">1o1</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">D/V</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Adm</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">W</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">O</th>

        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">High</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Med</th>
        <th style="position: sticky; top: 55px; background-color: #2f5597; color: white; z-index: 2;">Low</th>
      </tr>
    </thead>
            <tbody id="copusBody${t}"></tbody>
        </table>
    `;

    tablesContainer.appendChild(tableWrapper);

    // Now generate rows inside the table body
    const tbody = tableWrapper.querySelector(`#copusBody${t}`);
    const studentActionLabels = ["L", "Ind", "Grp", "AnQ", "AsQ", "WC", "SP", "T/Q", "W", "O"];
    const teacherActionLabels = ["Lec", "RtW", "MG", "AnQ", "PQ", "FUp", "1o1", "D/V", "Adm", "W", "O"];
    const engagementLabels = ["High", "Med", "Low"];

    for (let r = 0; r < 45; r++) { // 45 rows for 90 minutes in 2-minute intervals
        const row = document.createElement("tr");

        // First cell: "Min" range (e.g., 0–2, 2–4, etc.)
        const minCell = document.createElement("td");
        const startMin = r * 2;
        const endMin = startMin + 2;
        minCell.textContent = `${startMin}–${endMin}`;
        row.appendChild(minCell);

        // Student Actions (10 checkboxes)
        for (let i = 0; i < 10; i++) {
            const td = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.label = `student-${studentActionLabels[i]}`; // Add label
            // checkbox.disabled = true; // Initially disabled - KEEP THIS COMMENTED OUT FOR DEBUGGING
            td.appendChild(checkbox);
            row.appendChild(td);
        }

        // Teacher Actions (11 checkboxes)
        for (let i = 0; i < 11; i++) {
            const td = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.dataset.label = `teacher-${teacherActionLabels[i]}`; // Add label
            // checkbox.disabled = true; // KEEP THIS COMMENTED OUT FOR DEBUGGING
            td.appendChild(checkbox);
            row.appendChild(td);
        }

        // Level of Engagement (3 checkboxes)
        for (let i = 0; i < 3; i++) {
            const td = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = `engagement-${r}`; // Unique name for each row's group
            checkbox.dataset.label = `engagement-${engagementLabels[i]}`; // Add label
            // checkbox.disabled = true; // KEEP THIS COMMENTED OUT FOR DEBUGGING
            checkbox.addEventListener('change', function () {
                if (this.checked) {
                    const rowNode = this.closest('tr');
                    const checkboxesInRow = rowNode.querySelectorAll('input[name="' + this.name + '"]');
                    checkboxesInRow.forEach(cb => {
                        if (cb !== this) {
                            cb.checked = false;
                        }
                    });
                }
            });
            td.appendChild(checkbox);
            row.appendChild(td);
        }

        // Comments input
        const commentCell = document.createElement("td");
        const commentInput = document.createElement("input");
        commentInput.type = "text";
        // commentInput.disabled = true; // KEEP THIS COMMENTED OUT FOR DEBUGGING
        commentCell.appendChild(commentInput);
        row.appendChild(commentCell);

        tbody.appendChild(row);
        rows.push(row); // Store row for later highlighting
    }
}

// ============================================================
// RESTORE EXISTING OBSERVATION DATA
// ============================================================
if (typeof existingObservationData !== 'undefined' && existingObservationData.length > 0) {
    console.log('Restoring observation data...', existingObservationData);
    
    existingObservationData.forEach((observation, index) => {
        if (index >= rows.length) return; // Skip if more data than rows
        
        const row = rows[index];
        const checkboxes = row.querySelectorAll('input[type="checkbox"]');
        const commentInput = row.querySelector('input[type="text"]');
        
        // Restore student actions
        if (observation.studentActions) {
            checkboxes.forEach(checkbox => {
                const label = checkbox.dataset.label;
                if (label && label.startsWith('student-')) {
                    const actionKey = label.replace('student-', '');
                    if (observation.studentActions[actionKey] === 1) {
                        checkbox.checked = true;
                    }
                }
            });
        }
        
        // Restore teacher actions
        if (observation.teacherActions) {
            checkboxes.forEach(checkbox => {
                const label = checkbox.dataset.label;
                if (label && label.startsWith('teacher-')) {
                    const actionKey = label.replace('teacher-', '');
                    if (observation.teacherActions[actionKey] === 1) {
                        checkbox.checked = true;
                    }
                }
            });
        }
        
        // Restore engagement level
        if (observation.engagementLevel) {
            checkboxes.forEach(checkbox => {
                const label = checkbox.dataset.label;
                if (label && label.startsWith('engagement-')) {
                    const levelKey = label.replace('engagement-', '');
                    if (observation.engagementLevel[levelKey] === 1) {
                        checkbox.checked = true;
                    }
                }
            });
        }
        
        // Restore comment
        if (observation.comment && commentInput) {
            commentInput.value = observation.comment;
        }
    });
    
    console.log('Observation data restored successfully!');
}

// ============================================================
// RESTORE TIMER STATE
// ============================================================
if (typeof savedTimerState !== 'undefined' && savedTimerState) {
    console.log('Restoring timer state (paused on return)...', savedTimerState);
    // Always pause on return: restore saved position and time without auto-resume
    currentRow = savedTimerState.currentRow || 0;
    countdownSeconds = (typeof savedTimerState.remainingSeconds === 'number')
        ? savedTimerState.remainingSeconds
        : 120;

    if (currentRow < rows.length) {
        highlightRow(currentRow);
    }
    // Update display but DO NOT start interval
    timerStarted = false;
    updateCountdown();
    console.log(`Timer restored paused at row ${currentRow}, ${countdownSeconds}s remaining`);
    updateStartBtnLabel();
} else {
    // No saved state, show initial timer display
    updateCountdown();
    console.log('No saved timer state, starting fresh');
}

// ============================================================
// AUTO-SAVE FUNCTIONALITY
// ============================================================
let autoSaveTimeout;
const AUTO_SAVE_DELAY = 3000; // Auto-save 3 seconds after last change

function collectCurrentData() {
    const dataToSend = [];
    
    rows.forEach((row, idx) => {
        const checkboxes = row.querySelectorAll("input[type='checkbox']");
        const commentInput = row.querySelector("input[type='text']");
        const comment = commentInput ? commentInput.value.trim() : "";
        
        const student = {};
        const teacher = {};
        const engagement = { High: 0, Med: 0, Low: 0 };
        
        checkboxes.forEach(checkbox => {
            const label = checkbox.dataset.label;
            if (!label) return;
            
            if (label.startsWith('student-')) {
                const key = label.replace('student-', '');
                student[key] = checkbox.checked ? 1 : 0;
            } else if (label.startsWith('teacher-')) {
                const key = label.replace('teacher-', '');
                teacher[key] = checkbox.checked ? 1 : 0;
            } else if (label.startsWith('engagement-')) {
                const key = label.replace('engagement-', '');
                engagement[key] = checkbox.checked ? 1 : 0;
            }
        });
        
        dataToSend.push({
            intervalNumber: idx + 1,
            studentActions: student,
            teacherActions: teacher,
            engagementLevel: engagement,
            comment: comment
        });
    });
    
    return dataToSend;
}

async function autoSaveProgress() {
    if (!copusDetailsId) {
        console.error('Cannot auto-save: copusDetailsId is missing');
        return;
    }
    
    const indicator = document.getElementById('autoSaveIndicator');
    
    try {
        const currentData = collectCurrentData();
        
        // Collect timer state
        const timerState = {
            isRunning: timerInterval ? true : false,
            currentRow: currentRow,
            remainingSeconds: countdownSeconds,
            lastUpdated: new Date().toISOString()
        };
        
        const response = await fetch(`/observer/copus-observation/${copusDetailsId}/save-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                copusRecords: currentData,
                timerState: timerState 
            })
        });
        
        const result = await response.json();
        if (result.success) {
            console.log('Progress auto-saved at:', result.savedAt);
            
            // Show the "Saved" indicator
            if (indicator) {
                indicator.style.display = 'inline';
                // Hide it after 2 seconds
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 2000);
            }
        } else {
            console.warn('Auto-save failed:', result.message);
        }
    } catch (error) {
        console.error('Auto-save error:', error);
    }
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSaveProgress, AUTO_SAVE_DELAY);
}

// Add event listeners for auto-save on all form inputs
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('copusForm');
    if (form) {
        form.addEventListener('change', scheduleAutoSave);
        form.addEventListener('input', scheduleAutoSave);
    }
    updateStartBtnLabel();
});

// Save before page unload
window.addEventListener('beforeunload', (e) => {
    if (timerStarted || (existingObservationData && existingObservationData.length > 0)) {
        // Try to save synchronously (note: modern browsers may not wait for async)
        autoSaveProgress();
        
        // Optional: Show warning if timer is running
        if (timerInterval) {
            e.preventDefault();
            e.returnValue = 'Your observation is in progress. Are you sure you want to leave?';
            return e.returnValue;
        }
    }
});

document.getElementById("submitBtn").addEventListener("click", async function (e) {
    e.preventDefault();

    // Show confirmation modal before submitting
    const confirmSubmit = confirm(
        "⚠️ CONFIRMATION REQUIRED\n\n" +
        "Are you sure you want to SUBMIT this COPUS observation?\n\n" +
        "Once submitted:\n" +
        "• The observation will be marked as COMPLETED\n" +
        "• Results will be calculated and saved\n" +
        "• Faculty will be able to view the results\n" +
        "• This action CANNOT be undone\n\n" +
        "Click OK to confirm submission, or Cancel to continue editing."
    );

    if (!confirmSubmit) {
        console.log("Submission cancelled by user");
        return; // User cancelled, do not proceed
    }

    // Get references for spinner and button text (assuming they exist in your HTML)
    const spinner = this.querySelector('.spinner');
    const btnText = this.querySelector('.btn-text');

    // Show spinner, hide text, disable button
    if (btnText) btnText.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';
    this.disabled = true; // 'this' refers to the submit button

    // Use the shared data collection function
    const dataToSend = collectCurrentData();

    // ==========================================================
    // VALIDATE: Each row must have at least 1 Student Action,
    // 1 Teacher Action, and 1 Level of Engagement checked
    // ==========================================================
    let allRowsComplete = true;
    let invalidRows = [];
    
    dataToSend.forEach((rowData, index) => {
        const hasStudentAction = Object.values(rowData.studentActions || {}).some(val => val === 1);
        const hasTeacherAction = Object.values(rowData.teacherActions || {}).some(val => val === 1);
        const hasEngagement = Object.values(rowData.engagementLevel || {}).some(val => val === 1);
        
        if (!hasStudentAction || !hasTeacherAction || !hasEngagement) {
            allRowsComplete = false;
            invalidRows.push(index + 1); // Store 1-based row number
        }
    });
    
    if (!allRowsComplete) {
        alert(
            "⚠️ INCOMPLETE OBSERVATION DATA\n\n" +
            "Each row must have at least:\n" +
            "• 1 Student Action checkbox selected\n" +
            "• 1 Teacher Action checkbox selected\n" +
            "• 1 Level of Engagement checkbox selected\n\n" +
            "Incomplete rows: " + invalidRows.join(', ') + "\n\n" +
            "Please complete all rows before submitting."
        );
        // Re-enable button and hide spinner on validation failure
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        this.disabled = false;
        return; // Stop the submission
    }
    // ==========================================================

    // --- Validate copusDetailsId --- (KEEP THIS, IT'S CRITICAL FOR BACKEND)
    if (!copusDetailsId) {
        alert("Error: Observation ID not found. Cannot submit data. Please ensure the page loaded correctly.");
        console.error("COPUS Details ID is missing. Make sure <input id='copusDetailsId'> is in your EJS.");
        // Re-enable button and hide spinner
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        this.disabled = false;
        return; // Stop the submission
    }

    // --- Prepare the final payload for the server ---
    const payload = {
        copusDetailsId: copusDetailsId, // Include the observation ID
        copusRecords: dataToSend        // Your array of row data
    };

    // --- Submit using Fetch API ---
    try {
        const response = await fetch("/observer_copus_result1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload) // Send the payload including copusDetailsId
        });

        // Check if the response was successful
        if (response.ok) {
            const result = await response.json(); // Try to parse JSON response

            console.log("Submission successful:", result);
            alert(result.message || "Observation data saved successfully!");

            // Redirect to the results page
            window.location.href = result.redirectUrl || "/observer_copus_result1";

        } else {
            // Handle non-OK responses (e.g., 400 Bad Request, 500 Internal Server Error)
            const errorData = await response.json(); // Attempt to parse error message from server
            console.error("Submission failed:", response.status, errorData);
            alert(`Error submitting data: ${errorData.message || 'An unknown error occurred. Please try again.'}`);
        }
    } catch (err) {
        // Handle network errors or issues with the fetch itself
        console.error("Network or submission error:", err);
        alert("A network error occurred. Please check your internet connection and try again.");
    } finally {
        // Always re-enable the button and hide the spinner, regardless of success or failure
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        this.disabled = false;
    }
});
