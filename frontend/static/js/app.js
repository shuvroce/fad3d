// ============================
// Panel Toggle and Tooltip Utilities
// ============================

function initializeLeftPanelToggle() {
    const leftPanelToggleButton = document.querySelector(
        ".left__panel-toggle-left",
    );
    const inputSlideUnit = document.querySelector(".input__slide-unit");

    if (!leftPanelToggleButton || !inputSlideUnit) {
        return;
    }

    const syncToggleLabel = () => {
        const isCollapsed = inputSlideUnit.classList.contains("collapsed");
        const label = isCollapsed ? "Expand left panel" : "Collapse left panel";
        leftPanelToggleButton.setAttribute("aria-label", label);
        leftPanelToggleButton.setAttribute("data-title", label);
        leftPanelToggleButton.classList.toggle("collapsed", isCollapsed);
    };

    leftPanelToggleButton.addEventListener("click", () => {
        inputSlideUnit.classList.toggle("collapsed");
        syncToggleLabel();
    });

    syncToggleLabel();
}

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

export { initializeLeftPanelToggle, initializeRightPanelToggle };
