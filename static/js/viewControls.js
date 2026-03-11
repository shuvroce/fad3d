// ============================
// View Controls (Model/DC Ratio/Deflection)
// ============================

let currentViewMode = "model"; // 'model', 'dc-ratio', 'deflection'

// Function to switch view mode
function switchViewMode(mode) {
    if (currentViewMode === mode) return; // Already in this mode

    currentViewMode = mode;

    // Update button states in floating bar
    updateViewControlButtons(mode);

    // Update viewport visualization
    updateViewportDisplay(mode);

    // Log for debugging
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

    // TODO: Update Three.js visualization based on mode
    // This is where the actual 3D rendering logic will be implemented
    // For now, we'll just update the viewport class for styling purposes

    switch (mode) {
        case "model":
            // Show structural model
            console.log("Displaying structural model");
            break;
        case "dc-ratio":
            // Show demand-capacity ratio visualization
            console.log("Displaying DC ratio visualization");
            break;
        case "deflection":
            // Show deflection visualization
            console.log("Displaying deflection visualization");
            break;
    }
}

// Initialize view controls
function initializeViewControls() {
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

    // Start with model view (default)
    switchViewMode("model");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeViewControls);
} else {
    initializeViewControls();
}
