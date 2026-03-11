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

// Initialize result panel event listeners
function initializeResultPanel() {
    // Add tab button click handlers
    document.querySelectorAll(".result__tab-btn").forEach((btn) => {
        const tabName = btn.getAttribute("data-result-tab");
        btn.addEventListener("click", () => {
            switchResultTab(tabName);
        });
    });

    // Add card toggle click handlers
    document.querySelectorAll(".result__card").forEach((card) => {
        const header = card.querySelector(".result__card-header");
        const toggleBtn = card.querySelector(".result__card-toggle");

        if (header && toggleBtn) {
            // Click on header or toggle button
            header.addEventListener("click", (e) => {
                // Only toggle if clicking header, not on interactive elements within
                if (
                    e.target === header ||
                    e.target.closest(".result__card-toggle")
                ) {
                    toggleResultCard(card);
                }
            });

            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleResultCard(card);
            });
        }
    });

    // Initialize with facade tab active
    switchResultTab("facade");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeResultPanel);
} else {
    initializeResultPanel();
}
