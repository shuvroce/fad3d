// ============================
// Category Icon Management
// ============================

// Store category icons (categoryNum -> icon emoji/character)
const categoryIcons = new Map();

// Available icon options
const availableIcons = [
    "🏢",
    "🏗️",
    "🏛️",
    "🏬",
    "🏪",
    "🏠",
    "🏘️",
    "🏚️",
    "🏡",
    "🏭",
    "⭐",
    "🔷",
    "🔶",
    "🔴",
    "🟢",
    "🟡",
    "🔵",
    "🟣",
    "🟤",
    "⚫",
    "A",
    "B",
    "C",
    "D",
    "E",
    "1",
    "2",
    "3",
    "4",
    "5",
];

let currentCategoryForIconSelection = null;

// Function to show icon selector modal
function showIconSelector(categoryNum) {
    currentCategoryForIconSelection = categoryNum;

    const modal = document.getElementById("category-icon-modal");
    const iconGrid = document.getElementById("icon-grid");

    if (!modal || !iconGrid) return;

    // Clear existing icons
    iconGrid.innerHTML = "";

    // Populate icon grid
    availableIcons.forEach((icon) => {
        const iconBtn = document.createElement("button");
        iconBtn.className = "icon-option";
        iconBtn.textContent = icon;
        iconBtn.setAttribute("type", "button");
        iconBtn.setAttribute("data-icon", icon);

        // Highlight if this is the current icon
        const currentIcon = categoryIcons.get(categoryNum);
        if (currentIcon === icon) {
            iconBtn.classList.add("selected");
        }

        iconBtn.addEventListener("click", () => {
            selectCategoryIcon(categoryNum, icon);
            closeIconSelector();
        });

        iconGrid.appendChild(iconBtn);
    });

    // Show modal
    modal.style.display = "flex";
}

// Function to close icon selector modal
function closeIconSelector() {
    const modal = document.getElementById("category-icon-modal");
    if (modal) {
        modal.style.display = "none";
    }
    currentCategoryForIconSelection = null;
}

// Function to select an icon for a category
function selectCategoryIcon(categoryNum, icon) {
    // Store the icon
    categoryIcons.set(categoryNum, icon);

    // Update the category button display
    updateCategoryButtonIcon(categoryNum, icon);
}

// Function to remove icon from a category
function removeCategoryIcon(categoryNum) {
    // Remove from storage
    categoryIcons.delete(categoryNum);

    // Update the category button display
    updateCategoryButtonIcon(categoryNum, null);
}

// Function to update category button with icon
function updateCategoryButtonIcon(categoryNum, icon) {
    const categoryBtn = document.querySelector(
        `.category__btn[data-category="${categoryNum}"]`,
    );
    if (!categoryBtn) return;

    // Remove existing icon element if present
    const existingIcon = categoryBtn.querySelector(".category__btn-icon");
    if (existingIcon) {
        existingIcon.remove();
    }

    // Add new icon if provided
    if (icon) {
        const iconElement = document.createElement("span");
        iconElement.className = "category__btn-icon";
        iconElement.textContent = icon;
        categoryBtn.appendChild(iconElement);
    }
}

// Function to handle right-click on category button
function handleCategoryRightClick(event, categoryNum) {
    event.preventDefault(); // Prevent default context menu
    showIconSelector(categoryNum);
}

// Function to attach right-click listener to a category button
function attachCategoryIconListener(categoryBtn) {
    const categoryNum = parseInt(categoryBtn.getAttribute("data-category"));

    categoryBtn.addEventListener("contextmenu", (e) => {
        handleCategoryRightClick(e, categoryNum);
    });

    // Restore icon if it exists
    const icon = categoryIcons.get(categoryNum);
    if (icon) {
        updateCategoryButtonIcon(categoryNum, icon);
    }
}

// Global function to reattach icon listeners after category operations
function reattachCategoryIconListeners() {
    document.querySelectorAll(".category__btn").forEach((btn) => {
        attachCategoryIconListener(btn);
    });
}

// Initialize category icon system
function initializeCategoryIcons() {
    // Close modal button
    const closeBtn = document.getElementById("close-icon-selector");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeIconSelector);
    }

    // Remove icon button
    const removeBtn = document.getElementById("remove-category-icon");
    if (removeBtn) {
        removeBtn.addEventListener("click", () => {
            if (currentCategoryForIconSelection) {
                removeCategoryIcon(currentCategoryForIconSelection);
                closeIconSelector();
            }
        });
    }

    // Close modal when clicking outside
    const modal = document.getElementById("category-icon-modal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeIconSelector();
            }
        });
    }

    // Attach listeners to existing category buttons
    reattachCategoryIconListeners();

    // Watch for new category buttons being added
    // This will be called from category.js after creating new categories
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCategoryIcons);
} else {
    initializeCategoryIcons();
}
