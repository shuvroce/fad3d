// ============================
// Figure Checker
// Verifies required report images exist
// ============================

import { getCurrentPanelMode, getCachedCategoryData } from './inputPanel.js';
import { updateFiguresIndicator } from './viewControls.js';
import { getAlumSections } from './alumSecProp.js';

const DEBOUNCE_MS = 400;
let _checkTimer = null;
let _isChecking = false;
let _figuresDir = "";

// ---- API helpers ----

async function _post(url, body) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : "{}",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function _get(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// ---- Data Collection ----

function _collectCategoryData() {
    if (getCurrentPanelMode() === "wind") {
        return getCachedCategoryData();
    }

    const categories = [];
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

        categories.push({
            index: catNum,
            glass_type: glassType,
            support_type: supportType,
            frame_geometry: frameGeometry,
            mullion_type: mullionType === "alu-steel" ? "Aluminum + Steel" : "Aluminum Only",
            mullion_name: mullionName,
            steel_name: steelName,
        });
    });
    return categories;
}

function _collectAlumProfiles() {
    const alumSections = getAlumSections() || [];
    return alumSections
        .filter(s => s.name && (s.profileType === "stick" || s.profileType === "manual"))
        .map(s => ({ name: s.name, profileType: s.profileType || "stick" }));
}

// ---- Directory Management ----

async function _fetchFiguresDir() {
    const data = await _get("/api/figures/dir");
    if (data && data.directory) {
        _figuresDir = data.directory;
    }
    return _figuresDir;
}

async function _openDirectoryPicker() {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "figure__dir-overlay";
        overlay.innerHTML = `
            <div class="figure__dir-dialog">
                <h4>Set Figures Directory</h4>
                <input type="text" class="figure__dir-input" placeholder="Enter full directory path" value="${_figuresDir}" />
                <div class="figure__dir-actions">
                    <button class="figure__dir-btn figure__dir-btn--browse">Browse</button>
                    <button class="figure__dir-btn figure__dir-btn--cancel">Cancel</button>
                    <button class="figure__dir-btn figure__dir-btn--confirm">Set</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector(".figure__dir-input");
        const browseBtn = overlay.querySelector(".figure__dir-btn--browse");
        const cancelBtn = overlay.querySelector(".figure__dir-btn--cancel");
        const confirmBtn = overlay.querySelector(".figure__dir-btn--confirm");

        const cleanup = () => overlay.remove();

        const confirm = async () => {
            const path = input.value.trim();
            cleanup();
            if (!path) {
                resolve(false);
                return;
            }
            const data = await _post("/api/figures/set_dir", { directory: path });
            if (data?.directory) {
                _figuresDir = data.directory;
                resolve(true);
            } else {
                resolve(false);
            }
        };

        browseBtn.addEventListener("click", async () => {
            const data = await _post("/api/figures/open_picker", {});
            if (data?.directory) {
                _figuresDir = data.directory;
                input.value = data.directory;
            }
        });

        confirmBtn.addEventListener("click", confirm);
        cancelBtn.addEventListener("click", () => { cleanup(); resolve(false); });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") confirm();
            if (e.key === "Escape") { cleanup(); resolve(false); }
        });

        input.focus();
        input.select();
    });
}

// ---- Rendering ----

function _renderFigurePanel(figures, total, found) {
    const panel = document.getElementById("figure-panel");
    if (!panel) return;

    let html = "";

    // Header with directory path and controls
    html += `<div class="figure__panel-header">
        <span class="figure__panel-title">Required Figures</span>
        <div class="figure__panel-actions">
            <button class="figure__panel-btn" id="figure-picker-btn" aria-label="Set directory" data-title="Set figures directory">
                <svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H8v-2h6v2zm4-4H8v-2h10v2z"/></svg>
            </button>
            <button class="figure__panel-btn" id="figure-refresh-btn" aria-label="Refresh" data-title="Refresh">
                <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            </button>
        </div>
    </div>`;

    // Directory path display
    const dirDisplay = _figuresDir.length > 40 ? "..." + _figuresDir.slice(-37) : _figuresDir;
    html += `<div class="figure__panel-dir" title="${_figuresDir}">
        <svg class="figure__panel-dir-icon" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
        <span class="figure__panel-dir-path">${dirDisplay}</span>
    </div>`;

    if (!figures || figures.length === 0) {
        html += `<div class="figure__panel-empty">No figures required for current inputs</div>`;
    } else {
        // Group by category
        const groups = new Map();
        for (const fig of figures) {
            const cat = fig.category || "Other";
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(fig);
        }

        for (const [groupName, groupFigs] of groups) {
            html += `<div class="figure__group">
                <div class="figure__group-title">${groupName}</div>`;
            for (const fig of groupFigs) {
                const icon = fig.exists
                    ? `<svg class="figure__item-icon figure__item-icon--found" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`
                    : `<svg class="figure__item-icon figure__item-icon--missing" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
                html += `<div class="figure__item">${icon}<span class="figure__item-name">${fig.name}</span></div>`;
            }
            html += `</div>`;
        }
    }

    // Footer
    html += `<div class="figure__panel-footer">
        <span>${found} of ${total} figures found</span>
    </div>`;

    panel.innerHTML = html;

    // Attach event listeners
    const refreshBtn = document.getElementById("figure-refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            triggerFigureCheck();
        });
    }

    const pickerBtn = document.getElementById("figure-picker-btn");
    if (pickerBtn) {
        pickerBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            pickerBtn.disabled = true;
            const opened = await _openDirectoryPicker();
            pickerBtn.disabled = false;
            if (opened) {
                const dirEl = document.querySelector(".figure__panel-dir");
                if (dirEl) {
                    const display = _figuresDir.length > 40 ? "..." + _figuresDir.slice(-37) : _figuresDir;
                    dirEl.querySelector(".figure__panel-dir-path").textContent = display;
                    dirEl.title = _figuresDir;
                }
                triggerFigureCheck();
            }
        });
    }
}

function _updateIndicator(total, found) {
    if (total === 0) {
        updateFiguresIndicator("all");
        return;
    }
    if (found === total) {
        updateFiguresIndicator("all");
    } else if (found === 0) {
        updateFiguresIndicator("none");
    } else {
        updateFiguresIndicator("some");
    }
}

// ---- Public API ----

function triggerFigureCheck() {
    if (_isChecking) return;
    clearTimeout(_checkTimer);
    _checkTimer = setTimeout(_runCheck, DEBOUNCE_MS);
}

async function _runCheck() {
    _isChecking = true;
    const payload = {
        categories: _collectCategoryData(),
        alum_profiles: _collectAlumProfiles(),
        directory: _figuresDir,
    };

    const result = await _post("/api/check_figures", payload);
    _isChecking = false;

    if (!result || !result.success) {
        const panel = document.getElementById("figure-panel");
        if (panel) {
            const errMsg = result?.error || "Failed to check figures";
            panel.innerHTML = `<div class="figure__panel-empty">${errMsg}</div>`;
        }
        return;
    }

    const { figures, total, found } = result;
    _renderFigurePanel(figures, total, found);
    _updateIndicator(total, found);
}

async function initFigureChecker() {
    // Fetch current figures directory from backend
    await _fetchFiguresDir();

    // Auto-refresh on category switch
    window.addEventListener("category-switched", () => triggerFigureCheck());

    // Auto-refresh on panel mode change
    window.addEventListener("panel-mode-changed", () => triggerFigureCheck());

    // Auto-refresh on input changes in categories (debounced via delegation)
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        inputContainer.addEventListener("change", () => triggerFigureCheck());
    }

    // Initial check after short delay
    setTimeout(() => triggerFigureCheck(), 1500);
}

export { initFigureChecker, triggerFigureCheck };
