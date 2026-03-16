// ============================
// Design Summary Results Management
// ============================

// Function to switch between Wind and Facade tabs
function switchResultTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll(".result__tab-content").forEach((content) => {
        content.classList.add("hidden");
    });

    // Remove active class from all tab buttons
    document.querySelectorAll(".result__tab-btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    // Show selected tab content
    const selectedTab = document.querySelector(
        `.result__tab-content[data-result-tab="${tabName}"]`,
    );
    if (selectedTab) {
        selectedTab.classList.remove("hidden");
    }

    // Add active class to clicked tab button
    const activeButton = document.querySelector(
        `.result__tab-btn[data-result-tab="${tabName}"]`,
    );
    if (activeButton) {
        activeButton.classList.add("active");
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
        const categoryName =
            typeof categoryNames !== "undefined"
                ? categoryNames.get(categoryNum) || `Category ${categoryNum}`
                : `Category ${categoryNum}`;
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
function initializeResultPanel() {
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

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeResultPanel);
} else {
    initializeResultPanel();
}
