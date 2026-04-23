// ============================
// View Controls (Model/DC Ratio/Deflection)
// ============================

import { setViewMode as setFacadeViewMode } from './facadeView.js';

let currentViewMode = "model"; // 'model', 'dc-ratio', 'deflection'

// Function to switch view mode
function switchViewMode(mode) {
    if (currentViewMode === mode) return; // Already in this mode

    currentViewMode = mode;

    // Update button states in floating bar
    updateViewControlButtons(mode);

    // Update viewport visualization
    updateViewportDisplay(mode);

    // Notify facade view of mode change
    setFacadeViewMode(mode);

    console.log(`View mode switched to: ${mode}`);
}

// Function to update view control button states
function updateViewControlButtons(mode) {
    const viewButtons = document.querySelectorAll(
        ".floating__bar-right .floating__bar-btn",
    );

    viewButtons.forEach((btn) => {
        btn.classList.remove("active");

        // Match button text to mode
        const btnText = btn.textContent
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");
        if (
            (mode === "model" && btnText === "model") ||
            (mode === "dc-ratio" && btnText === "dc-ratio") ||
            (mode === "deflection" && btnText === "deflection")
        ) {
            btn.classList.add("active");
        }
    });
}

// Function to update viewport display based on view mode
function updateViewportDisplay(mode) {
    const viewport = document.querySelector(".viewport__container");
    if (!viewport) return;

    // Remove all view mode classes
    viewport.classList.remove("view-model", "view-dc-ratio", "view-deflection");

    // Add appropriate class for styling
    viewport.classList.add(`view-${mode}`);

    switch (mode) {
        case "model":
            console.log("Displaying structural model");
            break;
        case "dc-ratio":
            console.log("Displaying DC ratio visualization");
            break;
        case "deflection":
            console.log("Displaying deflection visualization");
            break;
    }
}

function getCurrentViewMode() {
    return currentViewMode;
}

// Initialize view controls
function initViewControls() {
    const viewButtons = document.querySelectorAll(
        ".floating__bar-right .floating__bar-btn",
    );

    viewButtons.forEach((btn) => {
        const btnText = btn.textContent.trim().toLowerCase();

        btn.addEventListener("click", () => {
            if (btnText === "model") {
                switchViewMode("model");
            } else if (btnText.includes("dc") || btnText.includes("ratio")) {
                switchViewMode("dc-ratio");
            } else if (btnText === "deflection") {
                switchViewMode("deflection");
            }
        });
    });

    // Disable view buttons in wind mode (they're facade-only controls)
    // Note: Panel mode is determined by getCurrentPanelMode from inputPanel
    const isWind = document.querySelector('.topbar__btn-mode.active')?.textContent?.trim().toLowerCase() === 'wind';
    document.querySelectorAll('#view-mode-controls .floating__bar-btn').forEach(btn => {
        btn.disabled = isWind;
    });

    // Start with model view (default)
    switchViewMode("model");
}

// ============================
// Figures Panel Toggle
// ============================

function initFiguresPanel() {
    const btn = document.getElementById('figures-btn');
    const panel = document.getElementById('figure-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = !btn.classList.contains('open');
        btn.classList.toggle('open', opening);
        panel.classList.toggle('open', opening);
    });

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !panel.contains(e.target)) {
            btn.classList.remove('open');
            panel.classList.remove('open');
        }
    });
}

/**
 * Update the figures status indicator dot.
 * @param {'all'|'some'|'none'} status
 */
function updateFiguresIndicator(status) {
    const dot = document.getElementById('figures-indicator');
    if (dot) dot.dataset.status = status;
}

// ============================
// Filter Panel Toggle
// ============================

function initFilterPanel() {
    const btn = document.getElementById('filter-btn');
    const panel = document.getElementById('filter-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = !btn.classList.contains('open');
        btn.classList.toggle('open', opening);
        panel.classList.toggle('open', opening);
    });

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !panel.contains(e.target)) {
            btn.classList.remove('open');
            panel.classList.remove('open');
        }
    });
}

// Export functions
export {
    initViewControls,
    initFiguresPanel,
    initFilterPanel,
    getCurrentViewMode,
    switchViewMode,
    updateFiguresIndicator,
    updateViewControlButtons
};
