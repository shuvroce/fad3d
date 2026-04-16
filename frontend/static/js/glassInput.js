import { openModal } from './floatingBar.js';

const CHART_THICKNESS_STEPS = [5, 6, 8, 10, 12, 16, 19];

// Support type value → folder name used in chart asset paths
const SUPPORT_FOLDER = {
    'four-edges': 'four-edge',
    'three-edges': 'three-edge',
    'two-edges': 'two-edge',
    'one-edge': 'one-edge',
};

// Return the closest standard chart thickness >= ply sum; clamp to max if sum exceeds all.
function _findChartThk(sum) {
    if (!sum || sum <= 0) return null;
    return CHART_THICKNESS_STEPS.find(t => t >= sum) ?? CHART_THICKNESS_STEPS[CHART_THICKNESS_STEPS.length - 1];
}

// Auto-compute and store chart_thickness for LGU/LDGU based on ply sum.
function _updateChartThk(catNum) {
    const glassType = document.getElementById(`cat${catNum}-glass-type`)?.value;
    let sum = 0;
    let fieldId = null;

    if (glassType === 'lgu') {
        const t1 = parseFloat(document.getElementById(`cat${catNum}-glass-lgu-thickness1`)?.value) || 0;
        const t2 = parseFloat(document.getElementById(`cat${catNum}-glass-lgu-thickness2`)?.value) || 0;
        sum = t1 + t2;
        fieldId = `cat${catNum}-glass-lgu-chart_thickness`;
    } else if (glassType === 'ldgu') {
        const t1 = parseFloat(document.getElementById(`cat${catNum}-glass-ldgu-thickness1_1`)?.value) || 0;
        const t2 = parseFloat(document.getElementById(`cat${catNum}-glass-ldgu-thickness1_2`)?.value) || 0;
        sum = t1 + t2;
        fieldId = `cat${catNum}-glass-ldgu-chart_thickness`;
    }

    if (!fieldId) return;
    const field = document.getElementById(fieldId);
    if (!field) return;

    const chartThk = _findChartThk(sum);
    if (chartThk !== null) {
        field.value = chartThk;
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

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

// Show/hide manual fields in all glass type sections for a category
function _syncManualFields(catNum, mode) {
    document
        .querySelectorAll(`.glass__type-fields[data-category="${catNum}"] .glass__manual-fields`)
        .forEach(el => el.classList.toggle('hidden', mode !== 'manual'));

    if (mode !== 'manual') _updateChartThk(catNum);
}

function initGlassInput() {
    document.addEventListener("change", glassInputChangeHandler);
    document.addEventListener("click", _calcModeClickHandler);
    document.addEventListener("click", _chartBtnClickHandler);
}

// Resolve the thickness and glass category (monolithic/laminated) for a chart button
function _resolveChartParams(btn) {
    const section = btn.closest('.glass__type-fields');
    if (!section) return null;
    const glassType = section.dataset.glassType;
    const catNum = section.dataset.category;
    const pane = btn.dataset.pane || '1';
    const chartType = btn.dataset.chartType; // 'load' or 'deflection'

    const supportTypeRaw = document.getElementById(`cat${catNum}-glass-support_type`)?.value || '';
    const supportFolder = SUPPORT_FOLDER[supportTypeRaw];
    if (!supportFolder) return null; // point-fixed has no charts

    let thickness = null;
    let glassCategory = 'monolithic';

    if (glassType === 'sgu') {
        thickness = document.getElementById(`cat${catNum}-glass-sgu-thickness`)?.value;
    } else if (glassType === 'dgu') {
        const thkId = pane === '2' ? `cat${catNum}-glass-dgu-thickness2` : `cat${catNum}-glass-dgu-thickness1`;
        thickness = document.getElementById(thkId)?.value;
    } else if (glassType === 'lgu') {
        glassCategory = 'laminated';
        thickness = document.getElementById(`cat${catNum}-glass-lgu-chart_thickness`)?.value;
    } else if (glassType === 'ldgu') {
        if (pane === '2') {
            thickness = document.getElementById(`cat${catNum}-glass-ldgu-thickness2`)?.value;
        } else {
            glassCategory = 'laminated';
            thickness = document.getElementById(`cat${catNum}-glass-ldgu-chart_thickness`)?.value;
        }
    }

    const singleThkFolders = ['two-edge', 'one-edge'];
    const isSingleThk = singleThkFolders.includes(supportFolder);

    if (!isSingleThk && (!thickness || isNaN(parseFloat(thickness)))) return null;

    const chartDir = chartType === 'deflection' ? 'glass-defl-charts' : 'glass-load-charts';
    const filename = isSingleThk ? 'all-thk.png' : `${parseFloat(thickness)}mm.png`;
    const url = `/report/assets/glass-charts/${chartDir}/${glassCategory}/${supportFolder}/${filename}`;
    return { url, chartType, glassType, pane };
}

function _chartBtnClickHandler(e) {
    const btn = e.target.closest('.input__chart-btn');
    if (!btn) return;
    const params = _resolveChartParams(btn);
    if (!params) return;
    _openGlassChart(params);
}

function _openGlassChart({ url, chartType }) {
    const modal = document.getElementById('glass-chart-modal');
    if (!modal) return;

    const titleEl = modal.querySelector('.modal__title');
    const img = document.getElementById('glass-chart-image');
    const loading = document.getElementById('glass-chart-loading');

    if (titleEl) {
        titleEl.textContent = chartType === 'deflection' ? 'Deflection Reference Chart' : 'NFL Reference Chart';
    }

    img.style.display = 'none';
    loading.style.display = 'block';

    img.onload = () => {
        loading.style.display = 'none';
        img.style.display = 'block';
    };
    img.onerror = () => {
        loading.innerHTML = '<p>Chart not available for this configuration.</p>';
    };
    img.src = url;

    openModal('glass-chart-modal');
}

function glassInputChangeHandler(e) {
    const el = e.target;

    // Glass type switching — matches hidden input (from radio cards) or legacy select
    const glassTypeMatch = el.id?.match(/^cat(\d+)-glass-type$/);
    if (glassTypeMatch) {
        switchGlassType(glassTypeMatch[1], el.value);
    }

    // Support type — hide point-fixed-irrelevant fields in the active glass type section
    if (el.id?.match(/^cat(\d+)-glass-support_type$/)) {
        const catNum = el.id.match(/^cat(\d+)/)[1];
        const isPointFixed = el.value === 'point-fixed';
        document
            .querySelectorAll(`.glass__type-fields[data-category="${catNum}"]`)
            .forEach(section => syncPointFixedFields(section, isPointFixed));
    }

    // Auto chart thickness: recompute when laminate ply inputs change in auto mode
    if (el.id?.match(/^cat(\d+)-glass-(lgu|ldgu)-thickness/)) {
        const catNum = el.id.match(/^cat(\d+)/)[1];
        const mode = document.getElementById(`cat${catNum}-glass-calc-mode`)?.value;
        if (mode !== 'manual') _updateChartThk(catNum);
    }
}

function _calcModeClickHandler(e) {
    const btn = e.target.closest('.glass__calc-mode-btn');
    if (!btn) return;
    const toggle = btn.closest('.glass__calc-mode-toggle');
    const mode = btn.dataset.mode;
    const targetId = toggle.dataset.calcModeTarget;
    const hidden = document.getElementById(targetId);

    toggle.querySelectorAll('.glass__calc-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (hidden) hidden.value = mode;

    const catNum = toggle.closest('[data-tab="glass"]')?.dataset.category;
    _syncManualFields(catNum, mode);
}

export { initGlassInput, switchGlassType, syncPointFixedFields };
