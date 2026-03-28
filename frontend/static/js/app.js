// ============================
// Main Application Entry Point
// ============================

// This file serves as the main entry point for the application.
// Individual modules are loaded separately:
// - theme.js: Theme toggle functionality
// - category.js: Category and tab management

console.log("FAD-3D Application Initialized");

function initTooltips() {
    const tooltip = document.createElement("div");
    tooltip.id = "global-tooltip";
    document.body.appendChild(tooltip);

    let showTimer = null;
    let currentTarget = null;

    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest("[data-title]");
        if (!target || target === currentTarget) return;

        currentTarget = target;
        clearTimeout(showTimer);

        showTimer = setTimeout(() => {
            const text = target.getAttribute("data-title");
            if (!text) return;

            tooltip.textContent = text;
            tooltip.classList.add("visible");
            positionTooltip(target);
        }, 300);
    });

    document.addEventListener("mouseout", (e) => {
        if (!e.target.closest("[data-title]")) return;
        clearTimeout(showTimer);
        tooltip.classList.remove("visible");
        currentTarget = null;
    });

    function positionTooltip(target) {
        const rect = target.getBoundingClientRect();
        tooltip.style.left = "0";
        tooltip.style.top = "0";
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        let left = rect.left + rect.width / 2 - tw / 2;
        let top = rect.bottom + 8;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        if (top + th > window.innerHeight - 8) top = rect.top - th - 8;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
    }
}

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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initTooltips();
        initializeLeftPanelToggle();
        initializeRightPanelToggle();
    });
} else {
    initTooltips();
    initializeLeftPanelToggle();
    initializeRightPanelToggle();
}
