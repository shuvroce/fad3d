// ============================
// Main Application Entry Point
// ============================

// This file serves as the main entry point for the application.
// Individual modules are loaded separately:
// - theme.js: Theme toggle functionality
// - category.js: Category and tab management

console.log("FAD-3D Application Initialized");

function initializePanelToggle() {
    const leftPanelToggleButton = document.querySelector(
        ".left__panel-toggle-left",
    );
    const inputContainer = document.getElementById("input-container");

    if (!leftPanelToggleButton || !inputContainer) {
        return;
    }

    const syncToggleLabel = () => {
        const isCollapsed = inputContainer.classList.contains("collapsed");
        const label = isCollapsed ? "Expand left panel" : "Collapse left panel";
        leftPanelToggleButton.setAttribute("aria-label", label);
        leftPanelToggleButton.setAttribute("data-title", label);
        leftPanelToggleButton.classList.toggle("collapsed", isCollapsed);
    };

    leftPanelToggleButton.addEventListener("click", () => {
        inputContainer.classList.toggle("collapsed");
        syncToggleLabel();
    });

    syncToggleLabel();
}

function initializeRightPanelToggle() {
    const rightPanelToggleButton = document.querySelector(
        ".right__panel-toggle-right",
    );
    const rightPanel = document.querySelector(".right__panel");
    const resultBox = document.querySelector(".result__box");
    const floatingBarRight = document.querySelector(".floating__bar-right");

    if (!rightPanelToggleButton || !rightPanel || !resultBox) {
        return;
    }

    const syncToggleLabel = () => {
        const isCollapsed = resultBox.classList.contains("collapsed");
        const label = isCollapsed
            ? "Expand right panel"
            : "Collapse right panel";
        rightPanelToggleButton.setAttribute("aria-label", label);
        rightPanelToggleButton.setAttribute("data-title", label);
        rightPanelToggleButton.classList.toggle("collapsed", isCollapsed);
        rightPanel.classList.toggle("collapsed", isCollapsed);
        if (floatingBarRight) {
            floatingBarRight.classList.toggle("collapsed", isCollapsed);
        }
    };

    rightPanelToggleButton.addEventListener("click", () => {
        resultBox.classList.toggle("collapsed");
        syncToggleLabel();
    });

    syncToggleLabel();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initializePanelToggle();
        initializeRightPanelToggle();
    });
} else {
    initializePanelToggle();
    initializeRightPanelToggle();
}
