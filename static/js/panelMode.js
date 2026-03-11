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

    if (mode === "wind") {
        // Save current facade content before switching
        savedFacadeContent = inputContainer.innerHTML;
        savedCatbarContent = catbar.innerHTML;

        // Hide catbar
        catbar.style.display = "none";

        // Add wind-mode class to left panel
        if (leftPanel) {
            leftPanel.classList.add("wind-mode");
        }

        // Show wind panel
        inputContainer.innerHTML = createWindPanel();

        // Initialize any event listeners for wind panel
        initializeWindPanel();
    } else {
        // Show catbar
        catbar.style.display = "flex";

        // Remove wind-mode class from left panel
        if (leftPanel) {
            leftPanel.classList.remove("wind-mode");
        }

        // Restore saved facade categories
        if (savedFacadeContent) {
            inputContainer.innerHTML = savedFacadeContent;
            catbar.innerHTML = savedCatbarContent;

            // Reattach event listeners to restored elements
            reattachCategoryEventListeners();
        }
    }

    // Update floating bar button states
    updateFloatingBarButtons(mode);
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
                createCategory(categoryCount);
                switchCategory(categoryCount);
            }
        });
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
    return `
        <div class="wind__panel">
            <div>
                <h2 class="input__category-heading">Wind Load Parameters</h2>
            </div>
            
            <div class="wind__section">
                <h3 class="wind__section-heading">General Information</h3>
                
                <div class="input__field">
                    <label for="wind-design-code">Design Code</label>
                    <select id="wind-design-code">
                        <option value="">Select design code</option>
                        <option value="asce7-16">ASCE 7-16</option>
                        <option value="asce7-22">ASCE 7-22</option>
                        <option value="en1991">EN 1991-1-4</option>
                        <option value="bnbc2020">BNBC 2020</option>
                        <option value="is875">IS 875 Part 3</option>
                    </select>
                </div>
                
                <div class="input__field">
                    <label for="wind-exposure">Exposure Category</label>
                    <select id="wind-exposure">
                        <option value="">Select exposure</option>
                        <option value="b">Exposure B</option>
                        <option value="c">Exposure C</option>
                        <option value="d">Exposure D</option>
                    </select>
                </div>
                
                <div class="input__field">
                    <label for="wind-importance">Importance Factor</label>
                    <select id="wind-importance">
                        <option value="">Select importance</option>
                        <option value="0.87">Category I (0.87)</option>
                        <option value="1.0">Category II (1.0)</option>
                        <option value="1.15">Category III (1.15)</option>
                        <option value="1.15">Category IV (1.15)</option>
                    </select>
                </div>
            </div>
            
            <div class="wind__section">
                <h3 class="wind__section-heading">Wind Speed & Direction</h3>
                
                <div class="input__field">
                    <label for="wind-basic-speed">Basic Wind Speed</label>
                    <div class="input__group">
                        <input type="number" id="wind-basic-speed" placeholder="0.0">
                        <span class="input__unit">m/s</span>
                    </div>
                </div>
                
                <div class="input__field">
                    <label for="wind-direction">Wind Direction</label>
                    <select id="wind-direction">
                        <option value="">Select direction</option>
                        <option value="0">0° (North)</option>
                        <option value="45">45° (NE)</option>
                        <option value="90">90° (East)</option>
                        <option value="135">135° (SE)</option>
                        <option value="180">180° (South)</option>
                        <option value="225">225° (SW)</option>
                        <option value="270">270° (West)</option>
                        <option value="315">315° (NW)</option>
                    </select>
                </div>
                
                <div class="input__field">
                    <label for="wind-gust-factor">Gust Effect Factor</label>
                    <input type="number" id="wind-gust-factor" placeholder="0.85" step="0.01">
                </div>
            </div>
            
            <div class="wind__section">
                <h3 class="wind__section-heading">Building Geometry</h3>
                
                <div class="input__field">
                    <label for="wind-building-height">Building Height</label>
                    <div class="input__group">
                        <input type="number" id="wind-building-height" placeholder="0.0">
                        <span class="input__unit">m</span>
                    </div>
                </div>
                
                <div class="input__field">
                    <label for="wind-building-width">Building Width</label>
                    <div class="input__group">
                        <input type="number" id="wind-building-width" placeholder="0.0">
                        <span class="input__unit">m</span>
                    </div>
                </div>
                
                <div class="input__field">
                    <label for="wind-building-depth">Building Depth</label>
                    <div class="input__group">
                        <input type="number" id="wind-building-depth" placeholder="0.0">
                        <span class="input__unit">m</span>
                    </div>
                </div>
                
                <div class="input__field">
                    <label for="wind-ground-elevation">Ground Elevation</label>
                    <div class="input__group">
                        <input type="number" id="wind-ground-elevation" placeholder="0.0">
                        <span class="input__unit">m</span>
                    </div>
                </div>
            </div>
            
            <div class="wind__section">
                <h3 class="wind__section-heading">Pressure Coefficients</h3>
                
                <div class="input__field">
                    <label for="wind-cp-external">External Pressure Coefficient (Cp)</label>
                    <input type="number" id="wind-cp-external" placeholder="0.8" step="0.1">
                </div>
                
                <div class="input__field">
                    <label for="wind-cp-internal">Internal Pressure Coefficient (Cpi)</label>
                    <input type="number" id="wind-cp-internal" placeholder="±0.18" step="0.1">
                </div>
                
                <div class="input__field">
                    <label for="wind-topographic-factor">Topographic Factor (Kzt)</label>
                    <input type="number" id="wind-topographic-factor" placeholder="1.0" step="0.1">
                </div>
                
                <div class="input__field">
                    <label for="wind-directional-factor">Directional Factor (Kd)</label>
                    <input type="number" id="wind-directional-factor" placeholder="0.85" step="0.05">
                </div>
            </div>
        </div>
    `;
}

// Function to initialize wind panel event listeners
function initializeWindPanel() {
    // Add event listener for calculate button
    const calculateBtn = document.querySelector(".wind__btn-calculate");
    if (calculateBtn) {
        calculateBtn.addEventListener("click", () => {
            console.log("Calculate wind loads");
            // TODO: Implement wind load calculation
            alert("Wind load calculation will be implemented here");
        });
    }

    // Add event listener for reset button
    const resetBtn = document.querySelector(".wind__btn-reset");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            const windInputs = document.querySelectorAll(
                ".wind__panel input, .wind__panel select",
            );
            windInputs.forEach((input) => {
                if (input.tagName === "SELECT") {
                    input.selectedIndex = 0;
                } else {
                    input.value = "";
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
