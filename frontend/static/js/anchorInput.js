// ============================
// Anchor Variant Field Switching
// ============================

// Show only the field set matching the selected clump type.
function switchAnchorVariant(categoryNum, clumpType) {
    document
        .querySelectorAll(`.anchor__variant-fields[data-category="${categoryNum}"]`)
        .forEach((section) => {
            section.classList.toggle("hidden", section.dataset.anchorVariant !== clumpType);
        });
}

// Reads the current clump type select value and triggers the switch.
function syncAnchorVariant(categoryNum) {
    const sel = document.getElementById(`cat${categoryNum}-anchor-type`);
    if (sel) switchAnchorVariant(categoryNum, sel.value);
}

function initAnchorInput() {
    // Initialize on load for all existing categories
    initAnchorVariants();

    // Delegated listener — works for dynamically created categories
    document.addEventListener("change", anchorInputChangeHandler);
}

function anchorInputChangeHandler(e) {
    const select = e.target;
    if (!select.matches("select[id$='-anchor-type']")) return;

    const match = select.id.match(/^cat(\d+)-anchor-type$/);
    if (match) syncAnchorVariant(match[1]);
}

// Initialize on load for all existing categories.
function initAnchorVariants() {
    document.querySelectorAll("select[id$='-anchor-type']").forEach((sel) => {
        const match = sel.id.match(/^cat(\d+)-anchor-type$/);
        if (match) syncAnchorVariant(match[1]);
    });
}

export { initAnchorInput, switchAnchorVariant };
