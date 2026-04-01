// ============================
// Panel Mode Switching (Wind vs Facade)
// ============================

// Import calc engine functions
import { runWindCalc } from './calcEngine.js';
import {
    switchCategory,
    switchTab,
    createCategory,
    categoryNames,
    updateCategoryButtonTooltip,
    initializeCategoryDragDrop,
} from './category.js';
import {
    categoryIcons,
    availableIcons,
    reattachCategoryIcons,
} from './categoryIcons.js';
import { populateFrameSectionDropdowns } from './frameInput.js';

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
    const exitClass = mode === "wind" ? "panel-mode-exiting-right" : "panel-mode-exiting-left";
    const enterClass = mode === "wind" ? "panel-mode-entering-left" : "panel-mode-entering-right";

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
        btn.addEventListener("click", () => switchCategory(categoryNum));
    });

    // Restore icon SVGs and context menu listeners on catbar buttons
    reattachCategoryIcons();

    // Reattach tab switching handlers
    document.querySelectorAll(".input__box-nav-btn").forEach((btn) => {
        const categoryNum = parseInt(btn.getAttribute("data-category"));
        const tabName = btn.getAttribute("data-tab");
        btn.addEventListener("click", () => switchTab(categoryNum, tabName));
    });

    // Reattach add category button handler (clone to clear stale listeners)
    const addBtn = document.getElementById("cat-add");
    if (addBtn) {
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.replaceWith(newAddBtn);
        newAddBtn.addEventListener("click", () => {
            const count = document.querySelectorAll(".category__btn").length + 1;
            categoryIcons.set(count, availableIcons[Math.floor(Math.random() * availableIcons.length)]);
            createCategory(count);
            switchCategory(count);
            populateFrameSectionDropdowns?.();
        });
    }

    // Reattach editable heading handlers
    document.querySelectorAll(".input__category-heading").forEach((heading) => {
        const categoryNum = parseInt(heading.getAttribute("data-category"));

        heading.addEventListener("blur", () => {
            const currentCatNum = parseInt(heading.getAttribute("data-category"));
            const customName = heading.textContent.trim();
            categoryNames.set(currentCatNum, customName);
            updateCategoryButtonTooltip(currentCatNum, customName);
        });

        heading.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                heading.blur();
            }
        });

        heading.addEventListener("click", () => {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(heading);
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });

    // Reinitialize drag-and-drop (catbar__scroll DOM was destroyed by innerHTML restore)
    initializeCategoryDragDrop();
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
            .catch(() => { });
    }

    // Wire calculate button to the calc engine
    const calculateBtn = document.querySelector('.wind__btn-calculate');
    if (calculateBtn && typeof runWindCalc === 'function') {
        calculateBtn.addEventListener('click', runWindCalc);
    }
}

function initPanelMode() {
    const windBtn = document.querySelector('.floating__bar-left-button .floating__bar-btn:first-child');
    const facadeBtn = document.querySelector('.floating__bar-left-button .floating__bar-btn:last-child');

    if (windBtn) windBtn.addEventListener('click', () => switchPanelMode('wind'));
    if (facadeBtn) facadeBtn.addEventListener('click', () => switchPanelMode('facade'));
}

function getCurrentPanelMode() {
    return currentPanelMode;
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

export { initPanelMode, switchPanelMode, getCurrentPanelMode, reattachCategoryEventListeners };
