// ============================
// Panel Mode Switching (Wind vs Facade)
// ============================

import { runWindCalc } from './calcEngine.js';
import { switchCategory, switchTab, createCategory, categoryNames, updateCategoryButtonTooltip, initializeCategoryDragDrop } from './category.js';
import { categoryIcons, availableIcons, reattachCategoryIcons } from './categoryIcons.js';
import { populateFrameSectionDropdowns } from './frameInput.js';
import { showWindView, hideWindView } from './windView.js';
import { showFacadeView, hideFacadeView } from './facadeView.js';
import { triggerFigureCheck } from './figureChecker.js';
import { updateViewControlButtons } from './viewControls.js';

let currentPanelMode = "facade"; // 'wind' or 'facade'
let savedFacadeContent = ""; // Store facade panel content when switching to wind
let savedCatbarContent = ""; // Store catbar content when switching to wind
let cachedWindInputs = {}; // Cache wind inputs when panel is not in DOM
let cachedCategoryData = []; // Cache category data when switching to wind mode
let _isRestoringWindInputs = false; // Flag to skip caching during restore

const WIND_INPUT_IDS = [
    'b_length', 'b_width', 'b_height', 'b_floor_heights',
    'location', 'exposure_cat', 'occupancy_cat',
    'K_d', 'GC_pi', 'b_rigidity', 'b_freq', 'damping',
    'topography_type', 'topo_crest_side', 'topo_height',
    'topo_length', 'topo_distance',
    'exposure_note', 'occupancy_note', 'topography_note',
];

function cacheWindInputs() {
    if (_isRestoringWindInputs) {
        return;
    }
    WIND_INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            cachedWindInputs[id] = el.value;
        }
    });
}

function setWindInputsCache(data) {
    cachedWindInputs = { ...data };
}

function restoreCachedWindInputs() {
    _isRestoringWindInputs = true;
    WIND_INPUT_IDS.forEach(id => {
        if (cachedWindInputs[id] != null) {
            const el = document.getElementById(id);
            if (el) {
                el.value = cachedWindInputs[id];
                // Sync radio card active state
                const group = document.querySelector(`[data-radio-target="${id}"]`);
                if (group) {
                    group.querySelectorAll('.type-radio__card').forEach(card => {
                        card.classList.toggle('active', card.dataset.value === cachedWindInputs[id]);
                    });
                }
                // Dispatch change event for dependent handlers
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else {
            }
    });
    _isRestoringWindInputs = false;
}

function getWindInputsForSave() {
    const data = {};
    WIND_INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        data[id] = el ? el.value : (cachedWindInputs[id] || '');
    });
    return data;
}

// Persist form field values to HTML attributes to survive innerHTML save/restore
function persistFormValues(container) {
    if (!container) return;
    
    // Persist input values
    container.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
            el.setAttribute('checked', el.checked ? 'checked' : '');
        } else if (el.tagName === 'SELECT') {
            Array.from(el.options).forEach(option => {
                if (option.value === el.value) {
                    option.setAttribute('selected', 'selected');
                } else {
                    option.removeAttribute('selected');
                }
            });
        } else {
            // For text inputs, textareas, and other inputs
            if (el.value !== '') {
                el.setAttribute('value', el.value);
            } else {
                el.removeAttribute('value');
            }
        }
    });
}

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
            // Cache category data before destroying facade content
            cachedCategoryData = [];
            document.querySelectorAll(".input__category-content").forEach((content) => {
                const catNum = parseInt(content.getAttribute("data-category"));
                if (isNaN(catNum)) return;

                const g = id => document.getElementById(id)?.value || "";
                const glassType = g(`cat${catNum}-glass-type`) || "sgu";
                const supportType = g(`cat${catNum}-glass-${glassType}-support_type`);
                const frameGeometry = g(`cat${catNum}-frame-geometry`) || "regular";
                const mullionType = g(`cat${catNum}-frame-mullion-type`) || "alu";
                const variant = `${frameGeometry}-${mullionType}`;
                const mullionName = g(`cat${catNum}-frame-${variant}-mullion`);
                const steelName = g(`cat${catNum}-frame-${variant}-steel`);

                cachedCategoryData.push({
                    index: catNum,
                    glass_type: glassType,
                    support_type: supportType,
                    frame_geometry: frameGeometry,
                    mullion_type: mullionType === "alu-steel" ? "Aluminum + Steel" : "Aluminum Only",
                    mullion_name: mullionName,
                    steel_name: steelName,
                });
            });

            // Persist form field values to attributes before saving facade content
            persistFormValues(inputContainer);
            
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
            // Cache wind inputs before switching to facade
            cacheWindInputs();

            // Restore saved facade categories
            if (savedFacadeContent) {
                inputContainer.innerHTML = savedFacadeContent;
                catbar.innerHTML = savedCatbarContent;

                // The saved HTML includes stale .custom-select wrappers with no event
                // listeners and selects flagged data-custom-select-init='true' which
                // causes the MutationObserver to skip them.  Unwrap the selects out
                // of their old wrappers and clear the flag so the observer re-creates
                // fresh wrappers with working listeners.
                inputContainer.querySelectorAll(".custom-select").forEach(wrapper => {
                    const select = wrapper.querySelector("select");
                    if (!select) return;
                    delete select.dataset.customSelectInit;
                    select.style.display = "";
                    wrapper.parentNode.insertBefore(select, wrapper);
                    wrapper.remove();
                });

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

        // Direct view show/hide calls (replaces DOM event coupling)
        if (mode === 'wind') {
            hideFacadeView();
            showWindView();
            // Disable view controls in wind mode
            document.querySelectorAll('#view-mode-controls .floating__bar-btn').forEach(btn => {
                btn.disabled = true;
            });
        } else {
            hideWindView();
            showFacadeView();
            // Enable view controls in facade mode
            document.querySelectorAll('#view-mode-controls .floating__bar-btn').forEach(btn => {
                btn.disabled = false;
            });
        }

        // Refresh figure checker on panel mode change
        triggerFigureCheck();
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

// Function to toggle wind section collapse/expand
function toggleWindSection(card) {
    card.classList.toggle("collapsed");
}

// Show/hide topo detail fields based on topography type
function _updateTopoDetailVisibility() {
    const topoType = document.getElementById('topography_type');
    const detailFields = document.getElementById('topo-detail-fields');
    if (!topoType || !detailFields) return;
    detailFields.classList.toggle('hidden', topoType.value === 'Homogeneous');
}

// Show/hide frequency/damping fields based on building rigidity
function _updateFlexFieldsVisibility() {
    const rigidity = document.getElementById('b_rigidity');
    const flexFields = document.getElementById('flex-fields');
    if (!rigidity || !flexFields) return;
    flexFields.classList.toggle('hidden', rigidity.value === 'Rigid');
}

// Function to initialize wind panel event listeners
function initializeWindPanel() {
    // Restore cached wind inputs (from .fad load or previous mode switch)
    restoreCachedWindInputs();

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

    // Attach collapsible toggle listeners to all wind section cards
    document.querySelectorAll('.wind__panel .result__card').forEach((card) => {
        const header = card.querySelector('.result__card-header');
        const toggleBtn = card.querySelector('.result__card-toggle');
        if (header && toggleBtn) {
            header.addEventListener('click', (e) => {
                if (e.target === header || e.target.closest('.result__card-toggle')) {
                    toggleWindSection(card);
                }
            });
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleWindSection(card);
            });
        }
    });

    // Set initial topo detail visibility
    _updateTopoDetailVisibility();
    _updateFlexFieldsVisibility();

    // Cache wind inputs on change so they persist across mode switches
    document.addEventListener('change', (e) => {
        if (e.target.closest('.wind__panel')) {
            if (e.target.id === 'topography_type') _updateTopoDetailVisibility();
            if (e.target.id === 'b_rigidity') _updateFlexFieldsVisibility();
            cacheWindInputs();
        }
    });
    document.addEventListener('input', (e) => {
        if (e.target.closest('.wind__panel')) cacheWindInputs();
    });
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

function initPanelMode() {
    const windBtn = document.querySelector('.topbar__panel-btn .topbar__btn-mode:first-child');
    const facadeBtn = document.querySelector('.topbar__panel-btn .topbar__btn-mode:last-child');

    if (windBtn) windBtn.addEventListener('click', () => switchPanelMode('wind'));
    if (facadeBtn) facadeBtn.addEventListener('click', () => switchPanelMode('facade'));

    // Initialize views based on current mode
    if (currentPanelMode === 'wind') {
        showWindView();
        hideFacadeView();
    } else {
        showFacadeView();
        hideWindView();
    }
}

function getCurrentPanelMode() {
    return currentPanelMode;
}

// Function to update floating bar button states
function updateFloatingBarButtons(mode) {
    document.querySelectorAll('.topbar__btn-mode').forEach(btn => {
        const text = btn.textContent.trim();
        if (text === 'Wind') btn.classList.toggle('active', mode === 'wind');
        else if (text === 'Facade') btn.classList.toggle('active', mode === 'facade');
    });
}

function getCachedCategoryData() {
    return cachedCategoryData;
}

function getWindInputsCache() {
    return cachedWindInputs;
}

function prepareForCategoryRestore() {
    currentPanelMode = 'facade';
    const catbar = document.querySelector('.catbar');
    const leftPanel = document.querySelector('.left__panel');
    if (catbar) catbar.style.display = 'flex';
    if (leftPanel) leftPanel.classList.remove('wind-mode');

    if (savedFacadeContent) {
        const inputContainer = document.getElementById('input-container');
        if (inputContainer) {
            inputContainer.innerHTML = savedFacadeContent;
        }
    }
}

export { initPanelMode, initializeLeftPanelToggle, switchPanelMode, getCurrentPanelMode, getCachedCategoryData, getWindInputsCache, reattachCategoryEventListeners, cacheWindInputs, getWindInputsForSave, restoreCachedWindInputs, setWindInputsCache, savedFacadeContent, savedCatbarContent, prepareForCategoryRestore };
