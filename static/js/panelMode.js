// ============================
// Panel Mode Switching (Wind vs Facade)
// ============================

let currentPanelMode = "facade"; // 'wind' or 'facade'
let savedFacadeContent = ""; // Store facade panel content when switching to wind
let savedCatbarContent = ""; // Store catbar content when switching to wind

// Function to switch panel mode
function switchPanelMode(mode) {
    if (currentPanelMode === mode) return; // Already in this mode

    currentPanelMode = mode;

    const inputContainer = document.getElementById("input-container");
    const catbar = document.querySelector(".catbar");
    const leftPanel = document.querySelector(".left__panel");
    const toggleBtn = document.querySelector(".left__panel-toggle-left");

    // Wind is left button → exiting to right, entering from left
    // Facade is right button → exiting to left, entering from right
    const exitClass   = mode === "wind" ? "panel-mode-exiting-right"  : "panel-mode-exiting-left";
    const enterClass  = mode === "wind" ? "panel-mode-entering-left"  : "panel-mode-entering-right";

    // Fade out catbar, input, and toggle together
    inputContainer.classList.add(exitClass);
    catbar.classList.add(exitClass);
    if (toggleBtn) toggleBtn.classList.add(exitClass);

    setTimeout(() => {
        inputContainer.classList.remove(exitClass);
        catbar.classList.remove(exitClass);
        if (toggleBtn) toggleBtn.classList.remove(exitClass);

        if (mode === "wind") {
            // Save current facade content before switching
            savedFacadeContent = inputContainer.innerHTML;
            savedCatbarContent = catbar.innerHTML;

            // Swap content before showing
            inputContainer.innerHTML = createWindPanel();

            // Apply width change and hide catbar after content is ready
            catbar.style.display = "none";
            if (leftPanel) leftPanel.classList.add("wind-mode");

            initializeWindPanel();
        } else {
            // Restore saved facade categories
            if (savedFacadeContent) {
                inputContainer.innerHTML = savedFacadeContent;
                catbar.innerHTML = savedCatbarContent;
                reattachCategoryEventListeners();
            }

            // Show catbar and restore width after content is ready
            catbar.style.display = "flex";
            if (leftPanel) leftPanel.classList.remove("wind-mode");
        }

        // Fade in new content
        inputContainer.classList.add(enterClass);
        catbar.classList.add(enterClass);
        if (toggleBtn) toggleBtn.classList.add(enterClass);

        const cleanup = () => {
            inputContainer.classList.remove(enterClass);
            catbar.classList.remove(enterClass);
            if (toggleBtn) toggleBtn.classList.remove(enterClass);
        };
        inputContainer.addEventListener("animationend", cleanup, { once: true });

        // Update floating bar button states
        updateFloatingBarButtons(mode);
    }, 150);
}

// Function to reattach event listeners after restoring facade content
function reattachCategoryEventListeners() {
    // Reattach category button click handlers
    document.querySelectorAll(".category__btn").forEach((btn) => {
        const categoryNum = parseInt(btn.getAttribute("data-category"));
        btn.addEventListener("click", () => {
            if (typeof switchCategory === "function") {
                switchCategory(categoryNum);
            }
        });
    });

    // Reattach remove button handlers
    document.querySelectorAll(".catbar__remove-btn").forEach((btn) => {
        const categoryNum = parseInt(btn.getAttribute("data-category"));
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (typeof removeCategory === "function") {
                removeCategory(categoryNum);
            }
        });
    });

    // Reattach add category button handler
    const addBtn = document.getElementById("cat-add");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            if (
                typeof categoryCount !== "undefined" &&
                typeof createCategory === "function" &&
                typeof switchCategory === "function"
            ) {
                categoryCount++;
                if (typeof availableIcons !== "undefined" && typeof categoryIcons !== "undefined") {
                    categoryIcons.set(categoryCount, availableIcons[Math.floor(Math.random() * availableIcons.length)]);
                }
                createCategory(categoryCount);
                switchCategory(categoryCount);
                populateFrameSectionDropdowns?.();
            }
        });
    }

    // Restore icon SVGs and context menu listeners on catbar buttons
    if (typeof reattachCategoryIcons === "function") {
        reattachCategoryIcons();
    }

    // Reattach tab switching handlers
    document.querySelectorAll(".input__box-nav-btn").forEach((btn) => {
        const categoryNum = parseInt(btn.getAttribute("data-category"));
        const tabName = btn.getAttribute("data-tab");
        btn.addEventListener("click", () => {
            if (typeof switchTab === "function") {
                switchTab(categoryNum, tabName);
            }
        });
    });

    // Reattach editable heading handlers
    document.querySelectorAll(".input__category-heading").forEach((heading) => {
        const categoryNum = parseInt(heading.getAttribute("data-category"));

        // Save custom name on blur
        heading.addEventListener("blur", () => {
            const customName = heading.textContent.trim();
            if (
                typeof categoryNames !== "undefined" &&
                typeof updateCategoryButtonTooltip === "function"
            ) {
                categoryNames.set(categoryNum, customName);
                updateCategoryButtonTooltip(categoryNum, customName);
            }
        });

        // Prevent enter key from creating new line
        heading.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                heading.blur();
            }
        });

        // Select all text when clicked
        heading.addEventListener("click", () => {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(heading);
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });
}

// Function to create wind panel HTML
function createWindPanel() {
    const template = document.getElementById("wind-panel-template");
    return template.innerHTML;
}

// Function to initialize wind panel event listeners
function initializeWindPanel() {
    // Populate location dropdown from server
    const locationSel = document.getElementById('location');
    if (locationSel && locationSel.options.length === 0) {
        fetch('/api/wind/locations')
            .then(r => r.ok ? r.json() : null)
            .then(locations => {
                if (!locations) return;
                locations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc;
                    opt.textContent = loc;
                    locationSel.appendChild(opt);
                });
                const dhaka = Array.from(locationSel.options).find(o => o.value === 'Dhaka');
                if (dhaka) locationSel.value = 'Dhaka';
            })
            .catch(() => {});
    }

    // Wire calculate button to the calc engine
    const calculateBtn = document.querySelector('.wind__btn-calculate');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => {
            if (typeof scheduleWindCalc === 'function') scheduleWindCalc();
        });
    }

    // Reset button clears all wind inputs
    const resetBtn = document.querySelector('.wind__btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('.wind__panel input, .wind__panel select').forEach(input => {
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = '';
                }
            });
        });
    }
}

// Function to update floating bar button states
function updateFloatingBarButtons(mode) {
    const windBtn = document.querySelector(
        '.floating__bar-btn[data-mode="wind"]',
    );
    const facadeBtn = document.querySelector(
        '.floating__bar-btn[data-mode="facade"]',
    );

    if (!windBtn || !facadeBtn) {
        // Fallback: find buttons by text content if data attributes not set
        const floatingButtons = document.querySelectorAll(".floating__bar-btn");
        floatingButtons.forEach((btn) => {
            if (btn.textContent.trim() === "Wind") {
                btn.classList.toggle("active", mode === "wind");
            } else if (btn.textContent.trim() === "Facade") {
                btn.classList.toggle("active", mode === "facade");
            }
        });
    } else {
        windBtn.classList.toggle("active", mode === "wind");
        facadeBtn.classList.toggle("active", mode === "facade");
    }
}

// Initialize panel mode system when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePanelMode);
} else {
    initializePanelMode();
}

function initializePanelMode() {
    // Get floating bar buttons
    const windBtn = document.querySelector(
        ".floating__bar-left .floating__bar-btn:first-child",
    );
    const facadeBtn = document.querySelector(
        ".floating__bar-left .floating__bar-btn:last-child",
    );

    if (windBtn && facadeBtn) {
        // Add data attributes for easier identification
        windBtn.setAttribute("data-mode", "wind");
        facadeBtn.setAttribute("data-mode", "facade");

        // Add click handlers
        windBtn.addEventListener("click", () => switchPanelMode("wind"));
        facadeBtn.addEventListener("click", () => switchPanelMode("facade"));
    }

    // Start in facade mode (default)
    // Categories will be initialized by category.js
}
