// ============================
// Settings Modal
// ============================

const _settingsDefaults = {
    windCode:        'BNBC2020',
    glassCode:       'ASTME1300',
    alumCode:        'ADM2015',
    steelCode:       'AISC360',
    unitSystem:      'metric',
    glassDeflType:   'span_ratio',
    glassDeflRatio:  60,
    glassDeflAbs:    25,
    frameDeflType:   'span_ratio',
    frameDeflRatio:  175,
    frameDeflAbs:    20,
};

let _settingsCurrent = Object.assign({}, _settingsDefaults);

function loadSettingsFromStorage() {
    const saved = localStorage.getItem('fad3d-settings');
    if (saved) {
        try { Object.assign(_settingsCurrent, JSON.parse(saved)); } catch (_) {}
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('fad3d-settings', JSON.stringify(_settingsCurrent));
}

function getSettings() {
    return Object.assign({}, _settingsCurrent);
}

// Populate form controls from _settingsCurrent
function _applyToForm() {
    const g = id => document.getElementById(id);

    g('setting-wind-code').value        = _settingsCurrent.windCode;
    g('setting-glass-code').value       = _settingsCurrent.glassCode;
    g('setting-alum-code').value        = _settingsCurrent.alumCode;
    g('setting-steel-code').value       = _settingsCurrent.steelCode;

    document.querySelectorAll('input[name="setting-unit-system"]').forEach(r => {
        r.checked = r.value === _settingsCurrent.unitSystem;
    });

    g('setting-glass-defl-type').value  = _settingsCurrent.glassDeflType;
    g('setting-glass-defl-ratio').value = _settingsCurrent.glassDeflRatio;
    g('setting-glass-defl-abs').value   = _settingsCurrent.glassDeflAbs;
    g('setting-frame-defl-type').value  = _settingsCurrent.frameDeflType;
    g('setting-frame-defl-ratio').value = _settingsCurrent.frameDeflRatio;
    g('setting-frame-defl-abs').value   = _settingsCurrent.frameDeflAbs;

    _syncDeflFields('glass');
    _syncDeflFields('frame');
}

// Read form controls into _settingsCurrent
function _readFromForm() {
    const g = id => document.getElementById(id);

    _settingsCurrent.windCode        = g('setting-wind-code').value;
    _settingsCurrent.glassCode       = g('setting-glass-code').value;
    _settingsCurrent.alumCode        = g('setting-alum-code').value;
    _settingsCurrent.steelCode       = g('setting-steel-code').value;

    const unitRadio = document.querySelector('input[name="setting-unit-system"]:checked');
    if (unitRadio) _settingsCurrent.unitSystem = unitRadio.value;

    _settingsCurrent.glassDeflType   = g('setting-glass-defl-type').value;
    _settingsCurrent.glassDeflRatio  = Number(g('setting-glass-defl-ratio').value);
    _settingsCurrent.glassDeflAbs    = Number(g('setting-glass-defl-abs').value);
    _settingsCurrent.frameDeflType   = g('setting-frame-defl-type').value;
    _settingsCurrent.frameDeflRatio  = Number(g('setting-frame-defl-ratio').value);
    _settingsCurrent.frameDeflAbs    = Number(g('setting-frame-defl-abs').value);
}

// Show/hide ratio vs absolute deflection fields
function _syncDeflFields(prefix) {
    const type     = document.getElementById(`setting-${prefix}-defl-type`)?.value;
    const ratioWrap = document.getElementById(`setting-${prefix}-defl-ratio-wrap`);
    const absWrap   = document.getElementById(`setting-${prefix}-defl-abs-wrap`);
    if (!ratioWrap || !absWrap) return;
    ratioWrap.classList.toggle('hidden', type === 'absolute');
    absWrap.classList.toggle('hidden',   type === 'span_ratio');
}

// Sidebar tab switching
function _initTabs(modal) {
    const navBtns = modal.querySelectorAll('.settings-modal__nav-btn');
    const panes   = modal.querySelectorAll('.settings-modal__tab');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.settingsTab;
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panes.forEach(p => p.classList.toggle('hidden', p.dataset.settingsTab !== target));
        });
    });
}

function initSettingsModal() {
    loadSettingsFromStorage();

    const modal     = document.getElementById('settings-modal');
    const openBtn   = document.getElementById('settings-btn');
    const closeBtn  = document.getElementById('close-settings-modal');
    const cancelBtn = document.getElementById('cancel-settings-modal');
    const applyBtn  = document.getElementById('apply-settings-modal');

    if (!modal) return;

    _initTabs(modal);

    // Deflection type toggles
    ['glass', 'frame'].forEach(prefix => {
        document.getElementById(`setting-${prefix}-defl-type`)
            ?.addEventListener('change', () => _syncDeflFields(prefix));
    });

    openBtn?.addEventListener('click', () => {
        _applyToForm();
        // Reset to first tab
        modal.querySelectorAll('.settings-modal__nav-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        modal.querySelectorAll('.settings-modal__tab').forEach((p, i) => p.classList.toggle('hidden', i !== 0));
        openModal('settings-modal');
    });

    closeBtn?.addEventListener('click', () => closeModal('settings-modal'));
    cancelBtn?.addEventListener('click', () => closeModal('settings-modal'));

    applyBtn?.addEventListener('click', () => {
        _readFromForm();
        saveSettingsToStorage();
        closeModal('settings-modal');
        document.dispatchEvent(new CustomEvent('settingsChanged', { detail: getSettings() }));
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('settings-modal'); });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsModal);
} else {
    initSettingsModal();
}
