// ============================
// Category Icon Management
// ============================

// Store category icons (categoryNum -> icon key string)
export const categoryIcons = new Map();

// Available SVG icons: key -> { label, svg path/markup }
// FIX: exported so category.js can import and use SVG_ICONS directly
export const SVG_ICONS = {
    building: { label: "Building", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 22V12h6v10"/><path d="M3 9h18"/><path d="M9 3v6"/><path d="M15 3v6"/></svg>` },
    tower: { label: "Tower", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V8l6-6 6 6v14"/><path d="M6 12h12"/><path d="M6 17h12"/><path d="M10 22v-4h4v4"/></svg>` },
    columns: { label: "Columns", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="4" height="20" rx="1"/><rect x="10" y="2" width="4" height="20" rx="1"/><rect x="18" y="2" width="4" height="20" rx="1"/></svg>` },
    grid: { label: "Grid", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>` },
    layers: { label: "Layers", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>` },
    hexagon: { label: "Hexagon", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 21.5 7 21.5 17 12 22 2.5 17 2.5 7 12 2"/></svg>` },
    diamond: { label: "Diamond", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg>` },
    circle: { label: "Circle", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>` },
    triangle: { label: "Triangle", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 21 2 21 12 2"/></svg>` },
    sun: { label: "Sun", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` },
    star: { label: "Star", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
    frame: { label: "Frame", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="1"/><rect x="6" y="6" width="12" height="12" rx="0.5"/></svg>` },
    window: { label: "Window", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="1"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="9" x2="12" y2="21"/></svg>` },
    anchor: { label: "Anchor", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>` },
    link: { label: "Link", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>` },
    shield: { label: "Shield", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
    cube: { label: "Cube", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
    home: { label: "Home", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
    zap: { label: "Zap", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
    settings: { label: "Settings", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
};

// Default icon key
export const DEFAULT_CATEGORY_ICON = "window";

// Available icon keys (order shown in grid)
export const availableIcons = Object.keys(SVG_ICONS);

let currentCategoryForIconSelection = null;

// ============================
// Icon Selector Modal
// ============================

function showIconSelector(categoryNum) {
    currentCategoryForIconSelection = categoryNum;

    const modal = document.getElementById("category-icon-modal");
    const iconGrid = document.getElementById("icon-grid");
    if (!modal || !iconGrid) return;

    iconGrid.innerHTML = "";
    const currentIcon = categoryIcons.get(categoryNum) || DEFAULT_CATEGORY_ICON;

    availableIcons.forEach((key) => {
        const def = SVG_ICONS[key];
        const iconBtn = document.createElement("button");
        iconBtn.className = "icon-option";
        iconBtn.innerHTML = def.svg;
        iconBtn.setAttribute("type", "button");
        iconBtn.setAttribute("data-icon", key);
        iconBtn.setAttribute("title", def.label);
        if (currentIcon === key) iconBtn.classList.add("selected");

        iconBtn.addEventListener("click", () => {
            selectCategoryIcon(categoryNum, key);
            closeIconSelector();
        });
        iconGrid.appendChild(iconBtn);
    });

    modal.style.display = "block";
}

function closeIconSelector() {
    const modal = document.getElementById("category-icon-modal");
    if (modal) modal.style.display = "none";
    currentCategoryForIconSelection = null;
}

function selectCategoryIcon(categoryNum, icon) {
    categoryIcons.set(categoryNum, icon);
    updateCategoryButtonIcon(categoryNum, icon);
}

function removeCategoryIcon(categoryNum) {
    categoryIcons.delete(categoryNum);
    updateCategoryButtonIcon(categoryNum, null);
}

// Update only the icon <span> content; badge remains intact
function updateCategoryButtonIcon(categoryNum, iconKey) {
    const categoryBtn = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (!categoryBtn) return;

    const iconSpan = categoryBtn.querySelector(".category__btn-icon");
    if (iconSpan) {
        const key = iconKey || DEFAULT_CATEGORY_ICON;
        const def = SVG_ICONS[key];
        iconSpan.innerHTML = def ? def.svg : SVG_ICONS[DEFAULT_CATEGORY_ICON].svg;
    }
}

export function reattachCategoryIcons() {
    document.querySelectorAll(".category__btn").forEach((btn) => {
        const num = parseInt(btn.getAttribute("data-category"));
        const key = categoryIcons.get(num) || DEFAULT_CATEGORY_ICON;
        const def = SVG_ICONS[key];
        const iconSpan = btn.querySelector(".category__btn-icon");
        if (iconSpan) iconSpan.innerHTML = def ? def.svg : SVG_ICONS[DEFAULT_CATEGORY_ICON].svg;
        // Re-attach contextmenu listener (lost after cloneNode)
        btn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showCategoryContextMenu(e, num);
        });
    });
}

// ============================
// Context Menu
// ============================

let _contextMenuTarget = null;

export function showCategoryContextMenu(e, categoryNum) {
    closeCategoryContextMenu();

    _contextMenuTarget = categoryNum;

    const menu = document.createElement("ul");
    menu.className = "catbar__context-menu";
    menu.setAttribute("role", "menu");

    // ── Customize icon ──────────────────────────────────────────────────────
    const customizeItem = document.createElement("li");
    customizeItem.className = "catbar__context-menu-item";
    customizeItem.setAttribute("role", "menuitem");
    customizeItem.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Customize`;
    customizeItem.addEventListener("click", () => {
        closeCategoryContextMenu();
        showIconSelector(categoryNum);
    });

    // ── Duplicate ───────────────────────────────────────────────────────────
    const duplicateItem = document.createElement("li");
    duplicateItem.className = "catbar__context-menu-item";
    duplicateItem.setAttribute("role", "menuitem");
    duplicateItem.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Duplicate`;
    duplicateItem.addEventListener("click", () => {
        closeCategoryContextMenu();
        document.dispatchEvent(
            new CustomEvent("category-duplicate-requested", { detail: { categoryNum } })
        );
    });

    // ── Delete ──────────────────────────────────────────────────────────────
    const deleteItem = document.createElement("li");
    deleteItem.className = "catbar__context-menu-item catbar__context-menu-item--danger";
    deleteItem.setAttribute("role", "menuitem");
    deleteItem.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>Delete`;
    deleteItem.addEventListener("click", () => {
        closeCategoryContextMenu();
        document.dispatchEvent(
            new CustomEvent("category-remove-requested", { detail: { categoryNum } })
        );
    });

    menu.appendChild(customizeItem);
    menu.appendChild(duplicateItem);
    menu.appendChild(deleteItem);
    document.body.appendChild(menu);

    // Position near cursor, keep within viewport
    const menuWidth = 170;
    const menuHeight = 132; // 3 items × ~44px
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 6;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 6;
    menu.style.left = x + "px";
    menu.style.top = y + "px";

    // Dismiss when clicking outside the menu
    setTimeout(() => {
        document.addEventListener("click", closeCategoryContextMenu, { once: true });
    }, 0);
}

function closeCategoryContextMenu() {
    const existing = document.querySelector(".catbar__context-menu");
    if (existing) existing.remove();
    _contextMenuTarget = null;
}

export function initCategoryContextMenu() {
    // Close on Escape key — registered only ONCE via initializeCategoryIcons()
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeCategoryContextMenu();
    });
}

// ============================
// Initialize
// ============================

export function initializeCategoryIcons() {
    const closeBtn = document.getElementById("close-icon-selector");
    if (closeBtn) closeBtn.addEventListener("click", closeIconSelector);

    const removeBtn = document.getElementById("remove-category-icon");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            if (currentCategoryForIconSelection) {
                removeCategoryIcon(currentCategoryForIconSelection);
                closeIconSelector();
            }
        });
    }

    const modal = document.getElementById("category-icon-modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeIconSelector();
        });
    }

    // Escape key handler — registered once here, not per-category
    initCategoryContextMenu();
}