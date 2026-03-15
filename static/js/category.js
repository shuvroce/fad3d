// ============================
// Category & Tab Management
// ============================

let categoryCount = 0;
const categoryNames = new Map(); // Store custom category names

// Function to switch categories
function switchCategory(categoryNum) {
    // Hide all category contents
    document.querySelectorAll(".input__category-content").forEach((content) => {
        content.classList.add("hidden");
    });

    // Remove active class from all category buttons
    document.querySelectorAll(".category__btn").forEach((btn) => {
        btn.classList.remove("active");
    });

    // Show selected category content
    const selectedCategory = document.querySelector(
        `.input__category-content[data-category="${categoryNum}"]`,
    );
    if (selectedCategory) {
        selectedCategory.classList.remove("hidden");
    }

    // Add active class to clicked category button
    const activeButton = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (activeButton) {
        activeButton.classList.add("active");
    }
}

// Function to switch tabs within a category
function switchTab(categoryNum, tabName) {
    // Hide all tab contents for this category
    document
        .querySelectorAll(`.input__tab-content[data-category="${categoryNum}"]`)
        .forEach((content) => {
            content.classList.add("hidden");
        });

    // Remove active class from all tab buttons for this category
    document
        .querySelectorAll(`.input__box-nav-btn[data-category="${categoryNum}"]`)
        .forEach((button) => {
            button.classList.remove("active");
        });

    // Show selected tab content
    const selectedTab = document.querySelector(
        `.input__tab-content[data-category="${categoryNum}"][data-tab="${tabName}"]`,
    );
    if (selectedTab) {
        selectedTab.classList.remove("hidden");
    }

    // Add active class to clicked tab button
    const activeButton = document.querySelector(
        `.input__box-nav-btn[data-category="${categoryNum}"][data-tab="${tabName}"]`,
    );
    if (activeButton) {
        activeButton.classList.add("active");
    }
}

// Function to remove a category
function removeCategory(categoryNum) {
    // Don't allow removal of the last remaining category
    if (categoryCount === 1) {
        alert("Cannot remove the last category");
        return;
    }

    // Check if the category being deleted is currently active
    const categoryButton = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    const isActive =
        categoryButton && categoryButton.classList.contains("active");

    // Remove category button wrapper
    const categoryWrapper = document.querySelector(
        `.catbar__btn-wrapper[data-category="${categoryNum}"]`,
    );
    if (categoryWrapper) {
        categoryWrapper.remove();
    }

    // Remove category content
    const categoryContent = document.querySelector(
        `.input__category-content[data-category="${categoryNum}"]`,
    );
    if (categoryContent) {
        categoryContent.remove();
    }

    // Renumber all categories after the deleted one
    renumberCategories();

    // Decrease category count
    categoryCount--;

    // Only switch categories if the deleted category was active
    if (isActive) {
        // Switch to the category before the deleted one (or category 1 if deleting category 1)
        const targetCategory = categoryNum > 1 ? categoryNum - 1 : 1;
        switchCategory(targetCategory);
    }
}

// Function to renumber all categories to maintain sequential order (1, 2, 3, ...)
function renumberCategories() {
    // Get all category wrappers in DOM order
    const categoryWrappers = Array.from(
        document.querySelectorAll(".catbar__btn-wrapper"),
    );
    const categoryContents = Array.from(
        document.querySelectorAll(".input__category-content"),
    );

    // Snapshot all per-category data keyed by OLD number before any mutations
    const oldNums = categoryWrappers.map((w) =>
        parseInt(w.getAttribute("data-category")),
    );
    const nameSnapshot = new Map(oldNums.map((n) => [n, categoryNames.get(n)]));
    const iconSnapshot =
        typeof categoryIcons !== "undefined"
            ? new Map(oldNums.map((n) => [n, categoryIcons.get(n)]))
            : null;

    // Rebuild Maps from scratch using the new sequential order
    categoryNames.clear();
    nameSnapshot.forEach((name, oldNum) => {
        const newNum = oldNums.indexOf(oldNum) + 1;
        if (name) categoryNames.set(newNum, name);
    });
    if (iconSnapshot && typeof categoryIcons !== "undefined") {
        categoryIcons.clear();
        iconSnapshot.forEach((icon, oldNum) => {
            const newNum = oldNums.indexOf(oldNum) + 1;
            if (icon) categoryIcons.set(newNum, icon);
        });
    }

    // Renumber each category wrapper and its content
    categoryWrappers.forEach((wrapper, index) => {
        const newCategoryNum = index + 1;
        const oldCategoryNum = oldNums[index];

        // Update wrapper data-category
        wrapper.setAttribute("data-category", newCategoryNum);

        // Update category button
        const categoryBtn = wrapper.querySelector(".category__btn");
        if (categoryBtn) {
            const customName =
                categoryNames.get(newCategoryNum) ||
                `Category ${newCategoryNum}`;
            categoryBtn.setAttribute("data-category", newCategoryNum);
            categoryBtn.setAttribute("data-title", customName);
            categoryBtn.setAttribute("aria-label", customName);

            // Update index badge
            const badge = categoryBtn.querySelector(".category__btn-badge");
            if (badge) badge.textContent = newCategoryNum;

            // Re-attach click event
            categoryBtn.replaceWith(categoryBtn.cloneNode(true));
            const newCategoryBtn = wrapper.querySelector(".category__btn");
            newCategoryBtn.addEventListener("click", () => {
                switchCategory(newCategoryNum);
            });
            newCategoryBtn.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                showCategoryContextMenu(e, newCategoryNum);
            });
        }
    });

    // Renumber category contents
    categoryContents.forEach((content, index) => {
        const newCategoryNum = index + 1;
        const oldCategoryNum = parseInt(content.getAttribute("data-category"));

        // Update content data-category
        content.setAttribute("data-category", newCategoryNum);

        // Update h2 heading
        const heading = content.querySelector("h2");
        if (heading) {
            const customName = categoryNames.get(newCategoryNum);
            heading.textContent = customName || `Category ${newCategoryNum}`;
            heading.setAttribute("data-category", newCategoryNum);
        }

        // Update all tab buttons
        content.querySelectorAll(".input__box-nav-btn").forEach((tabBtn) => {
            tabBtn.setAttribute("data-category", newCategoryNum);
            tabBtn.replaceWith(tabBtn.cloneNode(true));
        });

        // Re-attach events to new tab buttons
        content.querySelectorAll(".input__box-nav-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const catNum = button.getAttribute("data-category");
                const tabName = button.getAttribute("data-tab");
                switchTab(catNum, tabName);
            });
        });

        // Update all tab contents
        content
            .querySelectorAll(".input__tab-content")
            .forEach((tabContent) => {
                tabContent.setAttribute("data-category", newCategoryNum);
            });

        // Update glass type sub-sections
        content
            .querySelectorAll(".glass__type-fields")
            .forEach((section) => {
                section.setAttribute("data-category", newCategoryNum);
            });

        // Update frame variant sub-sections
        content
            .querySelectorAll(".frame__variant-fields")
            .forEach((section) => {
                section.setAttribute("data-category", newCategoryNum);
            });

        // Update all form field IDs and labels
        content.querySelectorAll("label[for]").forEach((label) => {
            label.setAttribute(
                "for",
                label.getAttribute("for").replace(/cat\d+/, `cat${newCategoryNum}`),
            );
        });

        content.querySelectorAll("input[id], select[id]").forEach((field) => {
            field.setAttribute(
                "id",
                field.getAttribute("id").replace(/cat\d+/, `cat${newCategoryNum}`),
            );
        });
    });

    // Restore icons after renumber (icons already migrated in Map)
    if (typeof reattachCategoryIcons === "function") {
        reattachCategoryIcons();
    }
}

// Function to create new category
function createCategory(categoryNum) {
    // Create wrapper for button and remove button
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "catbar__btn-wrapper";
    btnWrapper.setAttribute("data-category", categoryNum);
    btnWrapper.setAttribute("draggable", "true");

    // Create category button
    const categoryBtn = document.createElement("button");
    categoryBtn.className = "catbar__btn category__btn";
    categoryBtn.setAttribute("data-category", categoryNum);
    categoryBtn.setAttribute("data-title", `Category ${categoryNum}`);
    categoryBtn.setAttribute("aria-label", `Category ${categoryNum}`);

    // Icon element (main content)
    const iconEl = document.createElement("span");
    iconEl.className = "category__btn-icon";
    const iconKey = (typeof categoryIcons !== "undefined" && categoryIcons.get(categoryNum)) || (typeof DEFAULT_CATEGORY_ICON !== "undefined" ? DEFAULT_CATEGORY_ICON : null);
    const iconDef = (typeof SVG_ICONS !== "undefined" && iconKey) ? SVG_ICONS[iconKey] : null;
    iconEl.innerHTML = iconDef ? iconDef.svg : "";

    // Index badge
    const badge = document.createElement("span");
    badge.className = "category__btn-badge";
    badge.textContent = categoryNum;

    categoryBtn.appendChild(iconEl);
    categoryBtn.appendChild(badge);

    // Add click event to new category button
    categoryBtn.addEventListener("click", () => {
        switchCategory(categoryNum);
    });

    // Right-click context menu
    categoryBtn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showCategoryContextMenu(e, categoryNum);
    });

    btnWrapper.appendChild(categoryBtn);

    // Insert before the add button
    const catbar = document.querySelector(".catbar");
    const addBtn = document.querySelector("#cat-add");
    catbar.insertBefore(btnWrapper, addBtn);

    // Create category content
    const categoryContent = document.createElement("div");
    // First category should not be hidden by default
    categoryContent.className =
        categoryNum === 1
            ? "input__category-content"
            : "input__category-content hidden";
    categoryContent.setAttribute("data-category", categoryNum);
    // Clone template and populate with category-specific data
    const template = document.getElementById("category-content-template");
    const clone = template.content.cloneNode(true);

    // Update all data-category attributes
    clone.querySelectorAll("[data-category]").forEach((el) => {
        el.setAttribute("data-category", categoryNum);
    });

    // Update all form field IDs (cat0 → catN)
    clone.querySelectorAll("[id]").forEach((el) => {
        el.id = el.id.replace("cat0", `cat${categoryNum}`);
    });

    // Update all label for attributes
    clone.querySelectorAll("label[for]").forEach((label) => {
        label.setAttribute("for", label.getAttribute("for").replace("cat0", `cat${categoryNum}`));
    });

    // Set heading text
    clone.querySelector(".input__category-heading").textContent = `Category ${categoryNum}`;

    categoryContent.appendChild(clone);

    // Add category content to input container
    document.getElementById("input-container").appendChild(categoryContent);

    // Add event listeners to new tab buttons
    categoryContent
        .querySelectorAll(".input__box-nav-btn")
        .forEach((button) => {
            button.addEventListener("click", () => {
                const catNum = button.getAttribute("data-category");
                const tabName = button.getAttribute("data-tab");
                switchTab(catNum, tabName);
            });
        });

    // Attach context menu to the new button
    if (typeof initCategoryContextMenu === "function") {
        initCategoryContextMenu();
    }

    // Initialize frame variant visibility for the new category
    if (typeof syncFrameVariant === "function") {
        syncFrameVariant(categoryNum);
    }

    // Initialize anchor variant visibility for the new category
    if (typeof syncAnchorVariant === "function") {
        syncAnchorVariant(categoryNum);
    }

    // Add event listener to category heading for editing
    const heading = categoryContent.querySelector(".input__category-heading");
    if (heading) {
        // Save custom name on blur - read current category number dynamically
        heading.addEventListener("blur", () => {
            const currentCatNum = parseInt(
                heading.getAttribute("data-category"),
            );
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
    }
}

// Function to update category button tooltip
function updateCategoryButtonTooltip(categoryNum, tooltipText) {
    const categoryBtn = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (categoryBtn) {
        categoryBtn.setAttribute("data-title", tooltipText);
        categoryBtn.setAttribute("aria-label", tooltipText);
    }
}

// Global function to initialize/reinitialize the entire category system
async function initializeCategories() {
    // Clear existing categories from DOM
    const inputContainer = document.getElementById("input-container");
    if (inputContainer) {
        inputContainer.innerHTML = "";
    }

    // Clear existing category buttons from catbar
    const categoryButtonWrappers = document.querySelectorAll(
        ".catbar__btn-wrapper",
    );
    categoryButtonWrappers.forEach((wrapper) => wrapper.remove());

    // Reset category data
    categoryCount = 1;
    categoryNames.clear();

    await ensureTemplatesLoaded();

    // Create first category
    createCategory(1);
    switchCategory(1);

    // Reattach add category button handler
    const addBtn = document.getElementById("cat-add");
    if (addBtn) {
        // Remove old listeners by cloning
        const newAddBtn = addBtn.cloneNode(true);
        addBtn.replaceWith(newAddBtn);

        // Add fresh listener
        newAddBtn.addEventListener("click", () => {
            categoryCount++;
            createCategory(categoryCount);
            switchCategory(categoryCount);
            populateFrameSectionDropdowns?.();
        });
    }
}

// Fetch and inject input-temp.html if not already included by Flask/Jinja2
async function ensureTemplatesLoaded() {
    if (document.getElementById("category-content-template")) return;
    const response = await fetch("/templates/input-temp.html");
    const html = await response.text();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
}

// Drag-and-drop reordering of category buttons
function initializeCategoryDragDrop() {
    const catbar = document.querySelector(".catbar");
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

        // Determine insert position based on cursor position
        const rect = targetWrapper.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        const addBtn = document.querySelector("#cat-add");

        if (insertBefore) {
            catbar.insertBefore(dragSrc, targetWrapper);
        } else {
            catbar.insertBefore(dragSrc, targetWrapper.nextSibling || addBtn);
        }

        // Reorder category contents to match new catbar order
        const inputContainer = document.getElementById("input-container");
        document.querySelectorAll(".catbar__btn-wrapper").forEach((wrapper) => {
            const catNum = parseInt(wrapper.getAttribute("data-category"));
            const content = document.querySelector(`.input__category-content[data-category="${catNum}"]`);
            if (content) inputContainer.appendChild(content);
        });

        // Get new index of dragged wrapper before renumbering
        const newWrappers = Array.from(document.querySelectorAll(".catbar__btn-wrapper"));
        const newCategoryNum = newWrappers.indexOf(dragSrc) + 1;

        renumberCategories();
        switchCategory(newCategoryNum);
    });
}

// Initialize event listeners
async function initializeCategoryManagement() {
    await ensureTemplatesLoaded();

    // Create the first category by default
    categoryCount = 1;
    createCategory(1);
    switchCategory(1);

    // Add category button click handler
    document.getElementById("cat-add").addEventListener("click", () => {
        categoryCount++;
        createCategory(categoryCount);
        switchCategory(categoryCount);
        populateFrameSectionDropdowns?.();
    });

    initializeCategoryDragDrop();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCategoryManagement);
} else {
    initializeCategoryManagement();
}
