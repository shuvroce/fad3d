// ============================
// Project Save / Load
// Serialize project state to .fad (JSON) and restore on open
// ============================
//
// Uses dynamic imports exclusively to avoid triggering the
// materialProp.js <-> floatingBar.js circular dependency during
// module evaluation (which breaks the entire app if loaded early).

// ============================
// Helpers
// ============================

function _setVal(id, value) {
    const el = document.getElementById(id);
    if (!el || value == null) return;
    el.value = value;
}

function _notify(message) {
    const bar = document.getElementById('topbar__status-notification');
    if (!bar) return;
    bar.textContent = message;
    bar.classList.add('visible');
    setTimeout(() => bar.classList.remove('visible'), 3000);
}

// ============================
// Collect Project Data (Save)
// ============================

function _collectGeneralInfo() {
    const v = id => document.getElementById(id)?.value || '';
    const reportIncludes = {};
    ['toc', 'intro', 'material-specs', 'design-consideration',
     'idealization', 'theory', 'moment-capacity', 'wind-pressure',
     'categories', 'reference'].forEach(id => {
        reportIncludes[id] = document.getElementById(id)?.checked ?? true;
    });
    return {
        projectNumber: v('gen-project-number'),
        projectName: v('gen-project-name'),
        location: v('gen-project-location'),
        client: v('gen-client'),
        rev: v('gen-rev'),
        date: v('gen-date'),
        description: v('gen-description'),
        reportIncludes,
    };
}

function _collectWindInputs() {
    const ids = [
        'b_length', 'b_width', 'b_height', 'b_floor_heights',
        'location', 'exposure_cat', 'occupancy_cat',
        'K_d', 'GC_pi', 'b_rigidity', 'b_freq', 'damping',
        'topography_type', 'topo_crest_side', 'topo_height',
        'topo_length', 'topo_distance',
        'exposure_note', 'occupancy_note', 'topography_note',
    ];
    const data = {};
    ids.forEach(id => {
        const el = document.getElementById(id);
        data[id] = el ? el.value : '';
    });
    return data;
}

function _collectCategoryInputs(catNum) {
    const content = document.querySelector(
        `.input__category-content[data-category="${catNum}"]`
    );
    if (!content) return {};
    const inputs = {};
    content.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        inputs[el.id] = el.value;
    });
    return inputs;
}

async function _collectProjectData() {
    const [matMod, alumMod, steelMod, catMod, iconMod, windMod] = await Promise.all([
        import('./materialProp.js').catch(() => null),
        import('./alumSecProp.js').catch(() => null),
        import('./steelSecProp.js').catch(() => null),
        import('./category.js').catch(() => null),
        import('./categoryIcons.js').catch(() => null),
        import('./inputPanel.js').catch(() => null),
    ]);

    const materials = matMod?._materials ? matMod._materials.map(m => ({ ...m })) : [];
    const alumSections = alumMod?._alumSections ? alumMod._alumSections.map(s => {
        const c = { ...s }; delete c._phi_Mn; delete c._I_xx;
        delete c._I_yy; delete c._nameEdited; return c;
    }) : [];
    const steelSections = steelMod?._steelSections ? steelMod._steelSections.map(s => {
        const c = { ...s }; delete c._phi_Mn; delete c._I_xx;
        delete c._I_yy; delete c._nameEdited; return c;
    }) : [];
    const catNames = catMod?.categoryNames || new Map();
    const catIcons = iconMod?.categoryIcons || new Map();
    const defaultIcon = iconMod?.DEFAULT_CATEGORY_ICON || 'window';

    // Settings from localStorage (avoids importing settings.js)
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('fad3d-settings') || '{}'); } catch (_) {}

    const categories = [];
    
    // Check if we're in wind mode to determine how to collect category inputs
    const inputPanelMod = await import('./inputPanel.js').catch(() => null);
    const isWindMode = inputPanelMod && inputPanelMod.getCurrentPanelMode 
        ? inputPanelMod.getCurrentPanelMode() === 'wind'
        : false;
    
    if (isWindMode && inputPanelMod) {
        // When in wind mode, collect category inputs from saved facade content
        const catbarBtnWrappers = document.querySelectorAll('.catbar__btn-wrapper');
        catbarBtnWrappers.forEach(wrapper => {
            const catNum = parseInt(wrapper.getAttribute('data-category'));
            categories.push({
                name: catNames.get(catNum) || `Category ${catNum}`,
                icon: catIcons.get(catNum) || defaultIcon,
                inputs: _collectCategoryInputsFromSavedFacade(catNum, inputPanelMod.savedFacadeContent),
            });
        });
    } else {
        // Normal facade mode - collect from DOM
        document.querySelectorAll('.catbar__btn-wrapper').forEach(wrapper => {
            const catNum = parseInt(wrapper.getAttribute('data-category'));
            categories.push({
                name: catNames.get(catNum) || `Category ${catNum}`,
                icon: catIcons.get(catNum) || defaultIcon,
                inputs: _collectCategoryInputs(catNum),
            });
        });
    }

    // Use cached wind inputs if wind panel is not in DOM
    const windInputs = windMod?.getWindInputsForSave
        ? windMod.getWindInputsForSave()
        : _collectWindInputs();

    return {
        version: '1.0',
        generalInfo: _collectGeneralInfo(),
        settings,
        materials,
        alumSections,
        steelSections,
        windInputs,
        categories,
    };
}

// Helper function to collect category inputs from saved facade content
function _collectCategoryInputsFromSavedFacade(catNum, savedFacadeContent) {
    // Try to get saved facade content from parameter
    let savedContent = savedFacadeContent || '';
    
    if (!savedContent) {
        // Fallback to empty object if no saved content
        return {};
    }
    
    // Create a temporary element to parse the saved content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = savedContent;
    
    // Find the category content for this category number
    const categoryContent = tempDiv.querySelector(
        `.input__category-content[data-category="${catNum}"]`
    );
    
    if (!categoryContent) {
        return {};
    }
    
    // Collect all input values from this category content
    const inputs = {};
    categoryContent.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
        inputs[el.id] = el.value;
    });
    
    return inputs;
}

// ============================
// Save (Download)
// ============================

function _triggerDownload(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const projectName = data.generalInfo?.projectName?.trim() || 'project';
    const safeName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');

    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.fad`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportProject() {
    const data = await _collectProjectData();
    _triggerDownload(data);
    _notify('Project saved');
}

// ============================
// Load (Open)
// ============================

function importProject(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.version) {
                _notify('Invalid project file');
                return;
            }
            await _restoreProject(data);
            _notify('Project loaded');
        } catch (err) {
            console.error('[ProjectLoad] Failed:', err);
            _notify('Failed to load project file');
        }
    };
    reader.readAsText(file);
}

async function _restoreProject(data) {
    // 1. Settings — write to localStorage, then update form via settings.js
    _restoreSettings(data.settings);

    // 2. General info
    _restoreGeneralInfo(data.generalInfo);

    // 3. Materials, alum sections, steel sections — update arrays via module refs
    const [matMod, alumMod, steelMod, windMod] = await Promise.all([
        import('./materialProp.js').catch(() => null),
        import('./alumSecProp.js').catch(() => null),
        import('./steelSecProp.js').catch(() => null),
        import('./inputPanel.js').catch(() => null),
    ]);
    if (matMod) _restoreArray(matMod._materials, data.materials);
    if (alumMod) _restoreArray(alumMod._alumSections, data.alumSections);
    if (steelMod) _restoreArray(steelMod._steelSections, data.steelSections);

    // 4. Wind inputs — restore DOM elements and cache
    if (data.windInputs) {
        Object.entries(data.windInputs).forEach(([id, value]) => {
            _setVal(id, value);
        });
        // Also populate cache directly for when wind panel is not in DOM
        if (windMod?.setWindInputsCache) {
            windMod.setWindInputsCache(data.windInputs);
        } else if (windMod?.cacheWindInputs) {
            windMod.cacheWindInputs();
        }
    }

    // 5. Categories — reset and rebuild via initializeCategories from category.js
    await _restoreCategories(data.categories);

    // 6. Trigger recalculation for all categories and wind
    await _triggerRecalc();
}

// ============================
// Restore Helpers
// ============================

function _restoreSettings(settings) {
    if (!settings) return;
    localStorage.setItem('fad3d-settings', JSON.stringify({ ...settings }));
    // Trigger settings module to reload from localStorage
    try {
        import('./settings.js').then(mod => {
            if (mod.loadSettingsFromStorage) mod.loadSettingsFromStorage();
        });
    } catch (_) {}
}

function _restoreGeneralInfo(info) {
    if (!info) return;
    _setVal('gen-project-number', info.projectNumber);
    _setVal('gen-project-name', info.projectName);
    _setVal('gen-project-location', info.location);
    _setVal('gen-client', info.client);
    _setVal('gen-rev', info.rev);
    _setVal('gen-date', info.date);
    _setVal('gen-description', info.description);

    if (info.reportIncludes) {
        Object.entries(info.reportIncludes).forEach(([id, checked]) => {
            const el = document.getElementById(id);
            if (el) el.checked = checked;
        });
    }

    const projectName = (info.projectName || '').trim();
    if (projectName) {
        const nameEl = document.getElementById('header-project-name');
        if (nameEl) nameEl.textContent = projectName;
    }
}

function _restoreArray(target, source) {
    if (!target || !source || !Array.isArray(source)) return;
    target.length = 0;
    source.forEach(item => target.push({ ...item }));
}

async function _restoreCategories(categories) {
    if (!categories || !categories.length) return;

    const [catMod, iconMod, glassMod, frameMod, anchorMod] = await Promise.all([
        import('./category.js').catch(() => null),
        import('./categoryIcons.js').catch(() => null),
        import('./glassInput.js').catch(() => null),
        import('./frameInput.js').catch(() => null),
        import('./anchorInput.js').catch(() => null),
    ]);

    // Reset to a single fresh category
    if (catMod?.initializeCategories) {
        await catMod.initializeCategories();
    }

    // Create additional categories
    for (let i = 1; i < categories.length; i++) {
        document.getElementById('cat-add')?.click();
    }

    // Populate each category
    categories.forEach((catData, index) => {
        const catNum = index + 1;

        // Set category name
        const name = catData.name || `Category ${catNum}`;
        if (name !== `Category ${catNum}`) {
            if (catMod?.categoryNames) catMod.categoryNames.set(catNum, name);
            const heading = document.querySelector(
                `.input__category-content[data-category="${catNum}"] .input__category-heading`
            );
            if (heading) heading.textContent = name;

            const btn = document.querySelector(
                `.category__btn[data-category="${catNum}"]`
            );
            if (btn) {
                btn.setAttribute('data-title', name);
                btn.setAttribute('aria-label', name);
            }
        }

        // Set category icon
        if (catData.icon && iconMod?.categoryIcons) {
            iconMod.categoryIcons.set(catNum, catData.icon);
        }

        // Restore all form field values by ID
        if (catData.inputs) {
            Object.entries(catData.inputs).forEach(([id, value]) => {
                _setVal(id, value);
            });
        }

        // Sync variant selectors
        if (glassMod?.switchGlassType) {
            const glassTypeEl = document.getElementById(`cat${catNum}-glass-type`);
            if (glassTypeEl) {
                glassMod.switchGlassType(catNum, glassTypeEl.value);
                const glassSection = document.querySelector(
                    `.glass__type-fields[data-category="${catNum}"][data-glass-type="${glassTypeEl.value}"]`
                );
                if (glassSection && glassMod.syncPointFixedFields) {
                    const supportEl = glassSection.querySelector('[id$="-support_type"]');
                    if (supportEl) glassMod.syncPointFixedFields(glassSection, supportEl.value === 'Point Fixed');
                }
            }
        }
        if (frameMod?.syncFrameVariant) frameMod.syncFrameVariant(catNum);
        if (anchorMod?.syncAnchorVariant) anchorMod.syncAnchorVariant(catNum);
    });

    // Re-render icon SVGs
    if (iconMod?.reattachCategoryIcons) iconMod.reattachCategoryIcons();

    // Activate category 1
    if (catMod?.switchCategory) catMod.switchCategory(1);
}

async function _triggerRecalc() {
    const { scheduleWindCalc, scheduleCategoryCalc } = await import('./calcEngine.js').catch(() => ({}));

    // Trigger wind calculation
    if (scheduleWindCalc) scheduleWindCalc();

    // Trigger calculations for all categories
    document.querySelectorAll('.catbar__btn-wrapper').forEach(wrapper => {
        const catNum = parseInt(wrapper.getAttribute('data-category'));
        if (scheduleCategoryCalc) scheduleCategoryCalc(catNum);
    });
}

// ============================
// Init
// ============================

function initProjectSaveLoad() {
    const saveBtn = document.getElementById('download-btn');
    const openBtn = document.getElementById('load-btn');
    const fileInput = document.getElementById('yaml-file-input');

    saveBtn?.addEventListener('click', () => exportProject());

    openBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.fad')) {
            _notify('Please select a .fad project file');
            return;
        }
        importProject(file);
        fileInput.value = '';
    });
}

export { initProjectSaveLoad, exportProject, importProject };
