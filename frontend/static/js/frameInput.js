// ============================
// Frame Variant Field Switching
// ============================

// Show only the field set matching the selected geometry + mullion type combination.
function switchFrameVariant(categoryNum, geometry, mullionType) {
    const variant = `${geometry}-${mullionType}`;
    document
        .querySelectorAll(`.frame__variant-fields[data-category="${categoryNum}"]`)
        .forEach((section) => {
            section.classList.toggle("hidden", section.dataset.frameVariant !== variant);
        });
}

// Reads the current values of both selects for a given category and triggers the switch.
function syncFrameVariant(categoryNum) {
    const geo = document.getElementById(`cat${categoryNum}-frame-geometry`);
    const mul = document.getElementById(`cat${categoryNum}-frame-mullion-type`);
    if (geo && mul) switchFrameVariant(categoryNum, geo.value, mul.value);
}

function initFrameInput() {
    // Initialize on load for all existing categories
    initFrameVariants();

    // Delegated listener — works for dynamically created categories
    document.addEventListener("change", frameInputChangeHandler);

    // Listen for section changes
    document.addEventListener('frame-sections-changed', populateFrameSectionDropdowns);
}

function frameInputChangeHandler(e) {
    const select = e.target;
    if (!select.matches("select[id$='-frame-geometry'], select[id$='-frame-mullion-type']")) return;

    const match = select.id.match(/^cat(\d+)-frame-(?:geometry|mullion-type)$/);
    if (!match) return;

    syncFrameVariant(match[1]);
}

// Initialize on load for all existing categories.
function initFrameVariants() {
    document.querySelectorAll("select[id$='-frame-geometry']").forEach((sel) => {
        const match = sel.id.match(/^cat(\d+)-frame-geometry$/);
        if (match) syncFrameVariant(match[1]);
    });
    populateFrameSectionDropdowns();
}

// ============================
// Section Dropdown Population
// ============================

// Populate all mullion/transom selects from aluminum sections,
// and all embedded steel selects from steel sections.
function populateFrameSectionDropdowns() {
    const alumOptions = (_alumSections || [])
        .map(s => `<option value="${s.name}">${s.name}</option>`)
        .join('');
    const steelOptions = (_steelSections || [])
        .map(s => `<option value="${s.name}">${s.name}</option>`)
        .join('');

    document
        .querySelectorAll('.frame__variant-fields select[id$="-mullion"], .frame__variant-fields select[id$="-transom"]')
        .forEach(sel => {
            const prev = sel.value;
            sel.innerHTML = alumOptions;
            if (prev) sel.value = prev;
        });

    document
        .querySelectorAll('.frame__variant-fields select[id$="-steel"]')
        .forEach(sel => {
            const prev = sel.value;
            sel.innerHTML = steelOptions;
            if (prev) sel.value = prev;
        });
}

export { initFrameInput, switchFrameVariant, populateFrameSectionDropdowns };
