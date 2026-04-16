// ============================
// Result Panel & Right Panel Toggle
// ============================

import { categoryNames } from './category.js';
import { showFacadeResults, restoreCollapseStateForCategory, persistCollapseStateForCard } from './results.js';

// Function to switch between Wind and Facade tabs
function switchResultTab(tabName) {
    const RESULT_TAB_ORDER = ['facade', 'wind'];

    const current = document.querySelector(".result__tab-content:not(.hidden)");
    const currentTab = current ? current.dataset.resultTab : null;
    const goingRight = RESULT_TAB_ORDER.indexOf(tabName) >= RESULT_TAB_ORDER.indexOf(currentTab);

    document.querySelectorAll(".result__tab-btn").forEach((btn) => btn.classList.remove("active"));
    const activeButton = document.querySelector(`.result__tab-btn[data-result-tab="${tabName}"]`);
    if (activeButton) activeButton.classList.add("active");

    // Hide all instantly, transition new one in
    document.querySelectorAll(".result__tab-content").forEach((c) => c.classList.add("hidden"));

    const target = document.querySelector(`.result__tab-content[data-result-tab="${tabName}"]`);
    if (target) {
        target.classList.remove("hidden", "tab-enter-left", "tab-enter-right");
        target.classList.add(goingRight ? "tab-enter-right" : "tab-enter-left");
    }
}

// Function to toggle result card collapse/expand with per-category state
function toggleResultCard(card) {
    card.classList.toggle("collapsed");
    persistCollapseStateForCard(card);
}

// Function to update facade result category label
function updateFacadeResultCategory(categoryNum) {
    const categoryLabel = document.querySelector(
        '.result__tab-content[data-result-tab="facade"] .result__category-label span',
    );
    if (categoryLabel) {
        const categoryName = categoryNames.get(categoryNum) || `Category ${categoryNum}`;
        categoryLabel.textContent = categoryName;
    }
}

// Stamp a result tab template into its container and attach card toggle listeners
function _stampTabTemplate(templateId, containerSelector) {
    const tmpl = document.getElementById(templateId);
    const container = document.querySelector(containerSelector);
    if (!tmpl || !container) return;
    container.appendChild(tmpl.content.cloneNode(true));
    container.querySelectorAll(".result__card").forEach((card) => {
        const header = card.querySelector(".result__card-header");
        const toggleBtn = card.querySelector(".result__card-toggle");
        if (header && toggleBtn) {
            header.addEventListener("click", (e) => {
                if (e.target === header || e.target.closest(".result__card-toggle")) {
                    toggleResultCard(card);
                }
            });
            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleResultCard(card);
            });
        }
    });
}

// Initialize result panel event listeners
export function initializeResultPanel() {
    // Stamp card shells from templates
    _stampTabTemplate("result-wind-tab-template", '.result__tab-content[data-result-tab="wind"]');
    _stampTabTemplate("result-facade-tab-template", '.result__tab-content[data-result-tab="facade"]');

    // Add tab button click handlers
    document.querySelectorAll(".result__tab-btn").forEach((btn) => {
        const tabName = btn.getAttribute("data-result-tab");
        btn.addEventListener("click", () => {
            switchResultTab(tabName);
        });
    });

    // Initialize with facade tab active
    switchResultTab("facade");

    // Sync category title, results, and collapse state with the current active category on startup
    const activeBtn = document.querySelector(".category__btn.active");
    if (activeBtn) {
        const activeCategory = activeBtn.getAttribute("data-category");
        if (activeCategory) {
            updateFacadeResultCategory(Number(activeCategory));
            showFacadeResults(Number(activeCategory));
            restoreCollapseStateForCategory(Number(activeCategory));
        }
    }

    // Keep Design Summary category label, results, and collapse state synced on category switch
    window.addEventListener("category-switched", (event) => {
        const categoryNum = event?.detail?.categoryNum;
        if (categoryNum != null) {
            updateFacadeResultCategory(categoryNum);
            showFacadeResults(categoryNum);
            restoreCollapseStateForCategory(categoryNum);
        }
    });
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

export { updateFacadeResultCategory, switchResultTab, initializeRightPanelToggle };
