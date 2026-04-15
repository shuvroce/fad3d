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

// Reads the current clump type hidden input value and triggers the switch.
function syncAnchorVariant(categoryNum) {
    const input = document.getElementById(`cat${categoryNum}-anchor-type`);
    if (input) switchAnchorVariant(categoryNum, input.value);
}

function initAnchorInput() {
    initAnchorVariants();
    document.addEventListener("change", anchorInputChangeHandler);
}

function anchorInputChangeHandler(e) {
    const el = e.target;
    if (!el.matches("input[type='hidden'][id$='-anchor-type']")) return;

    const match = el.id.match(/^cat(\d+)-anchor-type$/);
    if (match) syncAnchorVariant(match[1]);
}

// Initialize on load for all existing categories.
function initAnchorVariants() {
    document.querySelectorAll("input[type='hidden'][id$='-anchor-type']").forEach((input) => {
        const match = input.id.match(/^cat(\d+)-anchor-type$/);
        if (match) syncAnchorVariant(match[1]);
    });
}

export { initAnchorInput, switchAnchorVariant, syncAnchorVariant };
