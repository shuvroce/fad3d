// ============================
// Panel Toggle and Tooltip Utilities
// ============================

function initializeRightPanelToggle() {
    const rightPanelToggleButton = document.querySelector(
        ".right__panel-toggle-right",
    );
    const rightPanel = document.querySelector(".right__panel");

    if (!rightPanelToggleButton || !rightPanel) {
        return;
    }

    const syncToggleLabel = () => {
        const isCollapsed = rightPanel.classList.contains("collapsed");
        const label = isCollapsed
            ? "Expand right panel"
            : "Collapse right panel";
        rightPanelToggleButton.setAttribute("aria-label", label);
        rightPanelToggleButton.setAttribute("data-title", label);
        rightPanelToggleButton.classList.toggle("collapsed", isCollapsed);
    };

    rightPanelToggleButton.addEventListener("click", () => {
        rightPanel.classList.toggle("collapsed");
        syncToggleLabel();
    });

    syncToggleLabel();
}

export { initializeRightPanelToggle };
