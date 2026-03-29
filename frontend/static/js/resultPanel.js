// ============================
// Design Summary Results Management
// ============================

import { categoryNames } from './category.js';

// Function to switch between Wind and Facade tabs
function switchResultTab(tabName) {
    const current = document.querySelector(".result__tab-content:not(.hidden)");

    // Immediately update button states
    document.querySelectorAll(".result__tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    const activeButton = document.querySelector(
        `.result__tab-btn[data-result-tab="${tabName}"]`,
    );
    if (activeButton) activeButton.classList.add("active");

    const showNew = () => {
        document.querySelectorAll(".result__tab-content").forEach((c) => {
            c.classList.add("hidden");
            c.classList.remove("is-exiting");
        });
        const target = document.querySelector(
            `.result__tab-content[data-result-tab="${tabName}"]`,
        );
        if (target) target.classList.remove("hidden");
    };

    if (current) {
        current.classList.add("is-exiting");
        setTimeout(showNew, 100);
    } else {
        showNew();
    }
}

// Function to toggle result card collapse/expand
function toggleResultCard(card) {
    card.classList.toggle("collapsed");
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

    // Sync category title with the current active category on startup
    const activeBtn = document.querySelector(".category__btn.active");
    if (activeBtn) {
        const activeCategory = activeBtn.getAttribute("data-category");
        if (activeCategory) {
            updateFacadeResultCategory(Number(activeCategory));
        }
    }

    // Keep Design Summary category label synced on category switch
    window.addEventListener("category-switched", (event) => {
        const categoryNum = event?.detail?.categoryNum;
        if (categoryNum != null) {
            updateFacadeResultCategory(categoryNum);
        }
    });
}

export { updateFacadeResultCategory, switchResultTab };
