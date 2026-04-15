// ============================
// Category & Tab Management
// ============================

import {
    categoryIcons,
    SVG_ICONS,
    DEFAULT_CATEGORY_ICON,
    availableIcons,
    reattachCategoryIcons,
    showCategoryContextMenu,
    initializeCategoryIcons,
} from './categoryIcons.js';

import { populateFrameSectionDropdowns, syncFrameVariant } from './frameInput.js';
import { syncAnchorVariant } from './anchorInput.js';
import { clearFacadeCache, showFacadeResults, clearCollapseStateForCategory, renumberCollapseState } from './results.js';
import { clearAllCategoryTimers, renumberCategoryTimers } from './calcEngine.js';

let categoryCount = 0;
const categoryNames = new Map(); // Store custom category names

// ============================
// Switch Category
// ============================

function switchCategory(categoryNum) {
    const current = document.querySelector(".input__category-content:not(.hidden)");

    document.querySelectorAll(".category__btn").forEach((btn) => {
        btn.classList.remove("active");
    });
    const activeButton = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (activeButton) activeButton.classList.add("active");

    window.dispatchEvent(
        new CustomEvent("category-switched", {
            detail: { categoryNum: Number(categoryNum) },
        }),
    );

    const showNew = () => {
        document.querySelectorAll(".input__category-content").forEach((c) => {
            c.classList.add("hidden");
            c.classList.remove("is-exiting");
        });
        const target = document.querySelector(
            `.input__category-content[data-category="${categoryNum}"]`,
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

// ============================
// Switch Tab
// ============================

function switchTab(categoryNum, tabName) {
    const current = document.querySelector(
        `.input__tab-content[data-category="${categoryNum}"]:not(.hidden)`,
    );

    document
        .querySelectorAll(`.input__box-nav-btn[data-category="${categoryNum}"]`)
        .forEach((button) => button.classList.remove("active"));
    const activeButton = document.querySelector(
        `.input__box-nav-btn[data-category="${categoryNum}"][data-tab="${tabName}"]`,
    );
    if (activeButton) activeButton.classList.add("active");

    const showNew = () => {
        document
            .querySelectorAll(`.input__tab-content[data-category="${categoryNum}"]`)
            .forEach((c) => {
                c.classList.add("hidden");
                c.classList.remove("is-exiting");
            });
        const target = document.querySelector(
            `.input__tab-content[data-category="${categoryNum}"][data-tab="${tabName}"]`,
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

// ============================
// Remove Category
// ============================

function removeCategory(categoryNum) {
    if (categoryCount === 1) {
        alert("Cannot remove the last category");
        return;
    }

    const categoryWrapper = document.querySelector(
        `.catbar__btn-wrapper[data-category="${categoryNum}"]`,
    );
    const categoryContent = document.querySelector(
        `.input__category-content[data-category="${categoryNum}"]`,
    );

    if (!categoryWrapper && !categoryContent) return;

    const categoryButton = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    const isActive = categoryButton && categoryButton.classList.contains("active");

    // Clear collapse state for the removed category
    clearCollapseStateForCategory(categoryNum);

    if (categoryWrapper) categoryWrapper.remove();
    if (categoryContent) categoryContent.remove();

    renumberCategories();
    categoryCount--;

    // Clear stale cache entries after renumbering
    clearFacadeCache();
    const targetCategory = categoryNum > 1 ? categoryNum - 1 : 1;
    showFacadeResults(targetCategory);

    if (isActive) {
        switchCategory(targetCategory);
    }
}

// ============================
// Renumber Categories
// ============================

function renumberCategories() {
    const categoryWrappers = Array.from(
        document.querySelectorAll(".catbar__btn-wrapper"),
    );
    const categoryContents = Array.from(
        document.querySelectorAll(".input__category-content"),
    );

    // Snapshot old numbers before any mutations
    const oldNums = categoryWrappers.map((w) =>
        parseInt(w.getAttribute("data-category")),
    );
    const nameSnapshot = new Map(oldNums.map((n) => [n, categoryNames.get(n)]));
    const iconSnapshot = new Map(oldNums.map((n) => [n, categoryIcons.get(n)]));

    // Build old-to-new mapping for downstream state migration
    const oldToNewMap = new Map();
    oldNums.forEach((oldNum, index) => {
        oldToNewMap.set(oldNum, index + 1);
    });

    // Clear and renumber calc timers (stale timers for deleted cats would collect empty values)
    clearAllCategoryTimers();
    renumberCategoryTimers(oldToNewMap);

    // Renumber collapse state
    renumberCollapseState(oldToNewMap);

    // Rebuild Maps with new sequential numbers
    categoryNames.clear();
    nameSnapshot.forEach((name, oldNum) => {
        const newNum = oldToNewMap.get(oldNum);
        if (name) categoryNames.set(newNum, name);
    });

    categoryIcons.clear();
    iconSnapshot.forEach((icon, oldNum) => {
        const newNum = oldToNewMap.get(oldNum);
        if (icon) categoryIcons.set(newNum, icon);
    });

    // Renumber wrappers and buttons
    categoryWrappers.forEach((wrapper, index) => {
        const newCategoryNum = index + 1;
        wrapper.setAttribute("data-category", newCategoryNum);

        const categoryBtn = wrapper.querySelector(".category__btn");
        if (categoryBtn) {
            const customName = categoryNames.get(newCategoryNum) || `Category ${newCategoryNum}`;
            categoryBtn.setAttribute("data-category", newCategoryNum);
            categoryBtn.setAttribute("data-title", customName);
            categoryBtn.setAttribute("aria-label", customName);

            const badge = categoryBtn.querySelector(".category__btn-badge");
            if (badge) badge.textContent = newCategoryNum;

            // Re-attach events via cloneNode (clears old stale closures)
            categoryBtn.replaceWith(categoryBtn.cloneNode(true));
            const newBtn = wrapper.querySelector(".category__btn");
            newBtn.addEventListener("click", () => switchCategory(newCategoryNum));
        }
    });

    // Renumber content panels
    categoryContents.forEach((content, index) => {
        const newCategoryNum = index + 1;
        content.setAttribute("data-category", newCategoryNum);

        const heading = content.querySelector("h2");
        if (heading) {
            const customName = categoryNames.get(newCategoryNum);
            heading.textContent = customName || `Category ${newCategoryNum}`;
            heading.setAttribute("data-category", newCategoryNum);
        }

        // Clone tab buttons to clear stale listeners, then re-attach
        content.querySelectorAll(".input__box-nav-btn").forEach((tabBtn) => {
            tabBtn.setAttribute("data-category", newCategoryNum);
            tabBtn.replaceWith(tabBtn.cloneNode(true));
        });
        content.querySelectorAll(".input__box-nav-btn").forEach((button) => {
            button.addEventListener("click", () => {
                switchTab(button.getAttribute("data-category"), button.getAttribute("data-tab"));
            });
        });

        content.querySelectorAll(".input__tab-content").forEach((el) =>
            el.setAttribute("data-category", newCategoryNum)
        );
        content.querySelectorAll(".glass__type-fields").forEach((el) =>
            el.setAttribute("data-category", newCategoryNum)
        );
        content.querySelectorAll(".frame__variant-fields").forEach((el) =>
            el.setAttribute("data-category", newCategoryNum)
        );
        content.querySelectorAll(".anchor__variant-fields").forEach((el) =>
            el.setAttribute("data-category", newCategoryNum)
        );

        content.querySelectorAll("label[for]").forEach((label) => {
            label.setAttribute(
                "for",
                label.getAttribute("for").replace(/cat\d+/, `cat${newCategoryNum}`),
            );
        });
        content.querySelectorAll("[data-radio-target]").forEach((el) => {
            el.setAttribute(
                "data-radio-target",
                el.getAttribute("data-radio-target").replace(/cat\d+/, `cat${newCategoryNum}`),
            );
        });
        content.querySelectorAll("input[id], select[id]").forEach((field) => {
            field.setAttribute(
                "id",
                field.getAttribute("id").replace(/cat\d+/, `cat${newCategoryNum}`),
            );
        });
    });

    // Re-sync variant field visibility after ID renumbering
    categoryContents.forEach((_, index) => {
        const newCategoryNum = index + 1;
        syncAnchorVariant(newCategoryNum);
        syncFrameVariant(newCategoryNum);
    });

    // Restore icon SVGs after renumber
    reattachCategoryIcons();
}

// ============================
// Create Category
// ============================

function createCategory(categoryNum) {
    // ── Catbar button wrapper ───────────────────────────────────────────────
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "catbar__btn-wrapper";
    btnWrapper.setAttribute("data-category", categoryNum);
    btnWrapper.setAttribute("draggable", "true");

    const categoryBtn = document.createElement("button");
    categoryBtn.className = "catbar__btn category__btn";
    categoryBtn.setAttribute("data-category", categoryNum);
    categoryBtn.setAttribute("data-title", `Category ${categoryNum}`);
    categoryBtn.setAttribute("aria-label", `Category ${categoryNum}`);

    const iconEl = document.createElement("span");
    iconEl.className = "category__btn-icon";
    const iconKey = categoryIcons.get(categoryNum) || DEFAULT_CATEGORY_ICON;
    const iconDef = SVG_ICONS[iconKey];
    iconEl.innerHTML = iconDef ? iconDef.svg : SVG_ICONS[DEFAULT_CATEGORY_ICON].svg;

    const badge = document.createElement("span");
    badge.className = "category__btn-badge";
    badge.textContent = categoryNum;

    categoryBtn.appendChild(iconEl);
    categoryBtn.appendChild(badge);
    categoryBtn.addEventListener("click", () => switchCategory(categoryNum));
    categoryBtn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCategoryContextMenu(e, categoryNum);
    });

    btnWrapper.appendChild(categoryBtn);
    document.querySelector(".catbar__scroll").appendChild(btnWrapper);

    // ── Content panel ───────────────────────────────────────────────────────
    const categoryContent = document.createElement("div");
    categoryContent.className =
        categoryNum === 1 ? "input__category-content" : "input__category-content hidden";
    categoryContent.setAttribute("data-category", categoryNum);

    const template = document.getElementById("category-content-template");
    const clone = template.content.cloneNode(true);

    clone.querySelectorAll("[data-category]").forEach((el) =>
        el.setAttribute("data-category", categoryNum)
    );
    clone.querySelectorAll("[id]").forEach((el) => {
        el.id = el.id.replace("cat0", `cat${categoryNum}`);
    });
    clone.querySelectorAll("label[for]").forEach((label) => {
        label.setAttribute("for", label.getAttribute("for").replace("cat0", `cat${categoryNum}`));
    });
    clone.querySelectorAll("[data-radio-target]").forEach((el) => {
        el.setAttribute("data-radio-target", el.getAttribute("data-radio-target").replace("cat0", `cat${categoryNum}`));
    });
    clone.querySelector(".input__category-heading").textContent = `Category ${categoryNum}`;

    categoryContent.appendChild(clone);
    document.getElementById("input-container").appendChild(categoryContent);

    // Tab button listeners
    categoryContent.querySelectorAll(".input__box-nav-btn").forEach((button) => {
        button.addEventListener("click", () => {
            switchTab(button.getAttribute("data-category"), button.getAttribute("data-tab"));
        });
    });

    // NOTE: initCategoryContextMenu() is NOT called here — registered once
    // globally inside initializeCategoryIcons() to avoid duplicate listeners.

    syncFrameVariant(categoryNum);
    syncAnchorVariant(categoryNum);

    // Heading edit listeners
    _attachHeadingListeners(categoryContent, categoryNum);
}

// ============================
// Duplicate Category
// ============================

function duplicateCategory(sourceCategoryNum) {
    // ── Resolve source elements ─────────────────────────────────────────────
    const sourceWrapper = document.querySelector(
        `.catbar__btn-wrapper[data-category="${sourceCategoryNum}"]`,
    );
    const sourceContent = document.querySelector(
        `.input__category-content[data-category="${sourceCategoryNum}"]`,
    );
    if (!sourceWrapper || !sourceContent) return;

    categoryCount++;
    const newNum = categoryCount;

    // Copy icon and name from source
    const sourceIcon = categoryIcons.get(sourceCategoryNum) || DEFAULT_CATEGORY_ICON;
    const sourceName = categoryNames.get(sourceCategoryNum) || `Category ${sourceCategoryNum}`;
    const newName = `${sourceName} (Copy)`;

    categoryIcons.set(newNum, sourceIcon);
    categoryNames.set(newNum, newName);

    // ── Build new catbar button, insert right after source ──────────────────
    const newWrapper = document.createElement("div");
    newWrapper.className = "catbar__btn-wrapper";
    newWrapper.setAttribute("data-category", newNum);
    newWrapper.setAttribute("draggable", "true");

    const newBtn = document.createElement("button");
    newBtn.className = "catbar__btn category__btn";
    newBtn.setAttribute("data-category", newNum);
    newBtn.setAttribute("data-title", newName);
    newBtn.setAttribute("aria-label", newName);

    const iconEl = document.createElement("span");
    iconEl.className = "category__btn-icon";
    const iconDef = SVG_ICONS[sourceIcon];
    iconEl.innerHTML = iconDef ? iconDef.svg : SVG_ICONS[DEFAULT_CATEGORY_ICON].svg;

    const badge = document.createElement("span");
    badge.className = "category__btn-badge";
    badge.textContent = newNum;

    newBtn.appendChild(iconEl);
    newBtn.appendChild(badge);
    newBtn.addEventListener("click", () => switchCategory(newNum));
    newBtn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCategoryContextMenu(e, newNum);
    });

    newWrapper.appendChild(newBtn);
    // Insert immediately after the source wrapper in the catbar
    sourceWrapper.insertAdjacentElement("afterend", newWrapper);

    // ── Deep-clone content panel, insert right after source ─────────────────
    // Persist selected attribute on all options before cloning so cloneNode
    // captures the current selection state (HTML attribute, not DOM property).
    sourceContent.querySelectorAll('select option').forEach(opt => {
        const select = opt.parentElement;
        if (opt.value === select.value) {
            opt.setAttribute('selected', 'selected');
        } else {
            opt.removeAttribute('selected');
        }
    });

    const newContent = sourceContent.cloneNode(true);
    newContent.classList.add("hidden");
    newContent.setAttribute("data-category", newNum);

    // Rewrite all data-category, IDs, and label[for] inside the clone
    newContent.querySelectorAll("[data-category]").forEach((el) =>
        el.setAttribute("data-category", newNum)
    );
    newContent.querySelectorAll("[id]").forEach((el) => {
        el.id = el.id.replace(/cat\d+/, `cat${newNum}`);
    });
    newContent.querySelectorAll("label[for]").forEach((label) => {
        label.setAttribute(
            "for",
            label.getAttribute("for").replace(/cat\d+/, `cat${newNum}`),
        );
    });
    newContent.querySelectorAll("[data-radio-target]").forEach((el) => {
        el.setAttribute(
            "data-radio-target",
            el.getAttribute("data-radio-target").replace(/cat\d+/, `cat${newNum}`),
        );
    });

    // Remove old custom-select wrappers (cloned from source) and unwrap the
    // native selects so the MutationObserver in customSelect.js can re-wrap them
    newContent.querySelectorAll(".custom-select").forEach((wrapper) => {
        const select = wrapper.querySelector("select");
        if (select) {
            wrapper.parentNode.insertBefore(select, wrapper);
            delete select.dataset.customSelectInit;
            select.style.display = "";
        }
        wrapper.remove();
    });

    // Update the visible heading
    const heading = newContent.querySelector(".input__category-heading");
    if (heading) {
        heading.textContent = newName;
        heading.setAttribute("data-category", newNum);
    }

    // Insert immediately after source content
    sourceContent.insertAdjacentElement("afterend", newContent);

    // Re-attach tab button listeners on the clone
    newContent.querySelectorAll(".input__box-nav-btn").forEach((button) => {
        button.addEventListener("click", () => {
            switchTab(button.getAttribute("data-category"), button.getAttribute("data-tab"));
        });
    });

    // Re-attach heading edit listeners on the clone
    _attachHeadingListeners(newContent, newNum);

    // ── Renumber to keep sequential order, then switch to the new category ───
    // renumberCategories will shift newNum if needed; find its final slot by
    // position (it was inserted right after the source, so its index = sourceCategoryNum)
    renumberCategories();

    // After renumber, the duplicate sits at sourceCategoryNum + 1 positionally
    // unless the source was at the end. Derive the final number from the DOM.
    const allWrappers = Array.from(document.querySelectorAll(".catbar__btn-wrapper"));
    const finalIdx = allWrappers.indexOf(newWrapper);
    const finalNum = finalIdx !== -1 ? finalIdx + 1 : newNum;

    switchCategory(finalNum);
    populateFrameSectionDropdowns?.();
}

// ============================
// Heading Edit Listeners (shared by createCategory + duplicateCategory)
// ============================

function _attachHeadingListeners(contentEl, categoryNum) {
    const heading = contentEl.querySelector(".input__category-heading");
    if (!heading) return;

    heading.addEventListener("blur", () => {
        const currentCatNum = parseInt(heading.getAttribute("data-category"));
        const newName = heading.textContent.trim();
        const defaultName = `Category ${currentCatNum}`;
        if (newName && newName !== defaultName) {
            categoryNames.set(currentCatNum, newName);
            updateCategoryButtonTooltip(currentCatNum, newName);
        } else {
            categoryNames.delete(currentCatNum);
            heading.textContent = defaultName;
            updateCategoryButtonTooltip(currentCatNum, defaultName);
        }

        const activeBtn = document.querySelector(".category__btn.active");
        const activeCatNum = activeBtn ? Number(activeBtn.getAttribute("data-category")) : null;
        if (activeCatNum === currentCatNum && typeof updateFacadeResultCategory === "function") {
            updateFacadeResultCategory(currentCatNum);
        }
    });

    heading.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); heading.blur(); }
    });

    heading.addEventListener("click", () => {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(heading);
        selection.removeAllRanges();
        selection.addRange(range);
    });
}

// ============================
// Update Tooltip
// ============================

function updateCategoryButtonTooltip(categoryNum, tooltipText) {
    const categoryBtn = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (categoryBtn) {
        categoryBtn.setAttribute("data-title", tooltipText);
        categoryBtn.setAttribute("aria-label", tooltipText);
    }
}

// ============================
// Re-initialize (used by external callers)
// ============================

async function initializeCategories() {
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) inputContainer.innerHTML = "";

    document.querySelectorAll(".catbar__btn-wrapper").forEach((w) => w.remove());

    categoryCount = 1;
    categoryNames.clear();

    await ensureTemplatesLoaded();

    createCategory(1);
    switchCategory(1);

    const addBtn = document.getElementById("cat-add");
    if (addBtn) {
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.replaceWith(newAddBtn);
        newAddBtn.addEventListener("click", () => {
            categoryCount++;
            categoryIcons.set(
                categoryCount,
                availableIcons[Math.floor(Math.random() * availableIcons.length)]
            );
            createCategory(categoryCount);
            switchCategory(categoryCount);
            populateFrameSectionDropdowns?.();
        });
    }
}

// ============================
// Template Loader
// ============================

async function ensureTemplatesLoaded() {
    if (document.getElementById("category-content-template")) return;
    const response = await fetch("/templates/input-temp.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
}

// ============================
// Drag-and-Drop
// ============================

function initializeCategoryDragDrop() {
    const catbar = document.querySelector(".catbar__scroll");
    let dragSrc = null;

    catbar.addEventListener("dragstart", (e) => {
        const wrapper = e.target.closest(".catbar__btn-wrapper");
        if (!wrapper) return;
        dragSrc = wrapper;
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => wrapper.classList.add("dragging"), 0);
    });

    catbar.addEventListener("dragend", () => {
        document.querySelectorAll(".catbar__btn-wrapper").forEach((w) => {
            w.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
        });
        dragSrc = null;
    });

    catbar.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!dragSrc) return;
        const wrapper = e.target.closest(".catbar__btn-wrapper");
        document.querySelectorAll(".catbar__btn-wrapper").forEach((w) => {
            w.classList.remove("drag-over-top", "drag-over-bottom");
        });
        if (wrapper && wrapper !== dragSrc) {
            const rect = wrapper.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
                wrapper.classList.add("drag-over-top");
            } else {
                wrapper.classList.add("drag-over-bottom");
            }
        }
    });

    catbar.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetWrapper = e.target.closest(".catbar__btn-wrapper");
        if (!targetWrapper || !dragSrc || targetWrapper === dragSrc) return;

        const rect = targetWrapper.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        const addBtn = document.querySelector("#cat-add");

        if (insertBefore) {
            catbar.insertBefore(dragSrc, targetWrapper);
        } else {
            catbar.insertBefore(dragSrc, targetWrapper.nextSibling || addBtn);
        }

        const inputContainer = document.getElementById("input-container");
        document.querySelectorAll(".catbar__btn-wrapper").forEach((wrapper) => {
            const catNum = parseInt(wrapper.getAttribute("data-category"));
            const content = document.querySelector(
                `.input__category-content[data-category="${catNum}"]`
            );
            if (content) inputContainer.appendChild(content);
        });

        const newWrappers = Array.from(document.querySelectorAll(".catbar__btn-wrapper"));
        const newCategoryNum = newWrappers.indexOf(dragSrc) + 1;

        renumberCategories();
        switchCategory(newCategoryNum);
    });
}

// ============================
// Bootstrap
// ============================

async function initializeCategoryManagement() {
    await ensureTemplatesLoaded();

    categoryCount = 1;
    createCategory(1);
    switchCategory(1);

    // Initialize icon system (modal, Escape key, remove-icon btn) — called ONCE here
    initializeCategoryIcons();

    // Listen for context-menu events dispatched by categoryIcons.js
    document.addEventListener("category-remove-requested", (e) => {
        removeCategory(e.detail.categoryNum);
    });
    document.addEventListener("category-duplicate-requested", (e) => {
        duplicateCategory(e.detail.categoryNum);
    });

    // "+" button
    document.getElementById("cat-add").addEventListener("click", () => {
        categoryCount++;
        categoryIcons.set(
            categoryCount,
            availableIcons[Math.floor(Math.random() * availableIcons.length)]
        );
        createCategory(categoryCount);
        switchCategory(categoryCount);
        populateFrameSectionDropdowns?.();
    });

    initializeCategoryDragDrop();
}

function initCategories() {
    return initializeCategoryManagement();
}

export {
    initCategories,
    switchCategory,
    switchTab,
    removeCategory,
    createCategory,
    duplicateCategory,
    renumberCategories,
    categoryNames,
    updateCategoryButtonTooltip,
    ensureTemplatesLoaded,
    initializeCategoryDragDrop,
};