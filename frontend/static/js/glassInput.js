// ============================
// Glass Type Field Switching
// ============================

// Show only the field set matching the selected glass type within a category's glass tab.
function switchGlassType(categoryNum, glassType) {
    document
        .querySelectorAll(`.glass__type-fields[data-category="${categoryNum}"]`)
        .forEach((section) => {
            section.classList.toggle("hidden", section.dataset.glassType !== glassType);
        });
}

// Fields not required when support type is Point Fixed
const POINT_FIXED_HIDDEN = [
    'nfl', 'nfl1', 'nfl2',
    'load_x_area2', 'load1_x_area2', 'load2_x_area2',
    'def', 'def1', 'def2'
];

function syncPointFixedFields(glassSection, isPointFixed) {
    POINT_FIXED_HIDDEN.forEach(suffix => {
        const input = glassSection.querySelector(`[id$="-${suffix}"]`);
        if (input) {
            input.closest('.input__field').classList.toggle('hidden', isPointFixed);
        }
    });
}

function initGlassInput() {
    // Delegated listener so it works for dynamically created categories
    document.addEventListener("change", glassInputChangeHandler);
}

function glassInputChangeHandler(e) {
    const el = e.target;

    // Glass type switching — matches hidden input (from radio cards) or legacy select
    const glassTypeMatch = el.id?.match(/^cat(\d+)-glass-type$/);
    if (glassTypeMatch) {
        switchGlassType(glassTypeMatch[1], el.value);
    }

    // Support type — hide irrelevant fields when Point Fixed
    if (el.id?.match(/^cat\d+-glass-(?:sgu|dgu|lgu|ldgu)-support_type$/)) {
        const glassSection = el.closest('.glass__type-fields');
        if (glassSection) syncPointFixedFields(glassSection, el.value === 'point-fixed');
    }
}

export { initGlassInput, switchGlassType, syncPointFixedFields };
