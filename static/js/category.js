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

    // Renumber each category wrapper and its content
    categoryWrappers.forEach((wrapper, index) => {
        const newCategoryNum = index + 1;
        const oldCategoryNum = parseInt(wrapper.getAttribute("data-category"));

        if (oldCategoryNum === newCategoryNum) {
            return; // No change needed
        }

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
            categoryBtn.textContent = newCategoryNum;

            // Re-attach click event
            categoryBtn.replaceWith(categoryBtn.cloneNode(true));
            const newCategoryBtn = wrapper.querySelector(".category__btn");
            newCategoryBtn.addEventListener("click", () => {
                switchCategory(newCategoryNum);
            });
        }

        // Update remove button
        const removeBtn = wrapper.querySelector(".catbar__remove-btn");
        if (removeBtn) {
            removeBtn.setAttribute("data-category", newCategoryNum);
            removeBtn.setAttribute(
                "aria-label",
                `Remove Category ${newCategoryNum}`,
            );

            // Re-attach click event
            removeBtn.replaceWith(removeBtn.cloneNode(true));
            const newRemoveBtn = wrapper.querySelector(".catbar__remove-btn");
            newRemoveBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                removeCategory(newCategoryNum);
            });
        }
    });

    // Renumber category contents
    categoryContents.forEach((content, index) => {
        const newCategoryNum = index + 1;
        const oldCategoryNum = parseInt(content.getAttribute("data-category"));

        if (oldCategoryNum === newCategoryNum) {
            return; // No change needed
        }

        // Update content data-category
        content.setAttribute("data-category", newCategoryNum);

        // Update h2 heading - preserve custom name if it exists
        const heading = content.querySelector("h2");
        if (heading) {
            const customName = categoryNames.get(oldCategoryNum);
            if (customName) {
                categoryNames.delete(oldCategoryNum);
                categoryNames.set(newCategoryNum, customName);
                heading.textContent = customName;
            } else {
                heading.textContent = `Category ${newCategoryNum}`;
            }
            heading.setAttribute("data-category", newCategoryNum);
        }

        // Update all tab buttons
        content.querySelectorAll(".input__box-nav-btn").forEach((tabBtn) => {
            const tabName = tabBtn.getAttribute("data-tab");
            tabBtn.setAttribute("data-category", newCategoryNum);

            // Re-attach click event
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

        // Update all form field IDs and labels
        content.querySelectorAll("label[for]").forEach((label) => {
            const forAttr = label.getAttribute("for");
            const newForAttr = forAttr.replace(
                /cat\d+/,
                `cat${newCategoryNum}`,
            );
            label.setAttribute("for", newForAttr);
        });

        content.querySelectorAll("input[id], select[id]").forEach((field) => {
            const fieldId = field.getAttribute("id");
            const newFieldId = fieldId.replace(
                /cat\d+/,
                `cat${newCategoryNum}`,
            );
            field.setAttribute("id", newFieldId);
        });
    });
}

// Function to create new category
function createCategory(categoryNum) {
    // Create wrapper for button and remove button
    const btnWrapper = document.createElement("div");
    btnWrapper.className = "catbar__btn-wrapper";
    btnWrapper.setAttribute("data-category", categoryNum);

    // Create category button
    const categoryBtn = document.createElement("button");
    categoryBtn.className = "catbar__btn category__btn";
    categoryBtn.setAttribute("data-category", categoryNum);
    categoryBtn.setAttribute("data-title", `Category ${categoryNum}`);
    categoryBtn.setAttribute("aria-label", `Category ${categoryNum}`);
    categoryBtn.textContent = categoryNum;

    // Add click event to new category button
    categoryBtn.addEventListener("click", () => {
        switchCategory(categoryNum);
    });

    // Create remove button for all categories
    const removeBtn = document.createElement("button");
    removeBtn.className = "catbar__remove-btn";
    removeBtn.setAttribute("type", "button");
    removeBtn.setAttribute("data-category", categoryNum);
    removeBtn.setAttribute("aria-label", `Remove Category ${categoryNum}`);
    removeBtn.textContent = "×";

    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeCategory(categoryNum);
    });

    btnWrapper.appendChild(removeBtn);
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

    // Add event listener to category heading for editing
    const heading = categoryContent.querySelector(".input__category-heading");
    if (heading) {
        // Save custom name on blur
        heading.addEventListener("blur", () => {
            const newName = heading.textContent.trim();
            if (newName && newName !== `Category ${categoryNum}`) {
                categoryNames.set(categoryNum, newName);
                // Update button tooltip
                updateCategoryButtonTooltip(categoryNum, newName);
            } else {
                categoryNames.delete(categoryNum);
                heading.textContent = `Category ${categoryNum}`;
                // Reset button tooltip
                updateCategoryButtonTooltip(
                    categoryNum,
                    `Category ${categoryNum}`,
                );
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
function initializeCategories() {
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
        });
    }
}

// Initialize event listeners
function initializeCategoryManagement() {
    // Create the first category by default
    categoryCount = 1;
    createCategory(1);
    switchCategory(1);

    // Add category button click handler
    document.getElementById("cat-add").addEventListener("click", () => {
        categoryCount++;
        createCategory(categoryCount);
        switchCategory(categoryCount);
    });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCategoryManagement);
} else {
    initializeCategoryManagement();
}
