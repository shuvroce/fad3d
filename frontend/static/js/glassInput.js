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
    'def_criteria', 'nfl', 'nfl1', 'nfl2',
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
    const select = e.target;

    // Glass type switching
    if (select.matches("select[id$='-glass-type']")) {
        const match = select.id.match(/^cat(\d+)-glass-type$/);
        if (match) switchGlassType(match[1], select.value);
    }

    // Support type — hide irrelevant fields when Point Fixed
    if (select.matches("select[id*='-glass-'][id$='-support_type']")) {
        const glassSection = select.closest('.glass__type-fields');
        if (glassSection) syncPointFixedFields(glassSection, select.value === 'Point Fixed');
    }
}

export { initGlassInput, switchGlassType, syncPointFixedFields };
