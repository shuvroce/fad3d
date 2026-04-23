// ============================
// Calculation Engine
// Collects inputs, calls Python APIs, updates Design Summary
// ============================

// Import shared state
import { _materials } from './materialProp.js';
import { _alumSections } from './alumSecProp.js';
import { _steelSections } from './steelSecProp.js';
import { getSettings } from './settings.js';
import { getWindInputsCache } from './inputPanel.js';
import { _computeGlassThk } from './generalInput.js';

// Import result updaters
import { updateWindResults, updateFacadeResults } from './results.js';

const CALC_DEBOUNCE_MS = 400;

// Per-category and wind debounce timers
const _calcTimers = { wind: null };

// ---- Input Collectors ----

// Reads the 5 General tab inputs and returns base + derived geometry values.
function _getGeneralInputs(catNum) {
    const f = id => parseFloat(document.getElementById(id)?.value) || 0;
    const s = id => document.getElementById(id)?.value || null;

    const floor_height      = f(`cat${catNum}-general-floor_height`);
    const span_length       = f(`cat${catNum}-general-span_length`);
    const vertical_spacing  = f(`cat${catNum}-general-vertical_spacing`);
    const slab_thickness    = f(`cat${catNum}-general-slab_thickness`);
    const facade_type       = s(`cat${catNum}-general-facade_type`) || 'cont';

    const glass_length   = (span_length > 0 && vertical_spacing > 0) ? Math.max(span_length, vertical_spacing) : null;
    const glass_width    = (span_length > 0 && vertical_spacing > 0) ? Math.min(span_length, vertical_spacing) : null;
    const mullion_length = floor_height > 0
        ? (facade_type === 'sfgp' ? (floor_height - slab_thickness || null) : floor_height)
        : null;
    const transom_length = span_length > 0 ? span_length : null;
    const tran_spacing   = vertical_spacing > 0 ? vertical_spacing : null;
    const h_a            = slab_thickness > 0 ? slab_thickness : null;

    return { floor_height: floor_height || null, span_length: span_length || null,
             vertical_spacing: vertical_spacing || null, slab_thickness: slab_thickness || null,
             facade_type, glass_length, glass_width, mullion_length, transom_length, tran_spacing, h_a };
}

function collectWindInputs() {
    const cache = getWindInputsCache();
    const g = id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') {
                return el.options.length > 0 ? el.options[el.selectedIndex]?.value ?? null : null;
            }
            return el.value || null;
        }
        return cache[id] || null;
    };
    return {
        b_length: g('b_length'),
        b_width: g('b_width'),
        b_height: g('b_height'),
        b_floor_heights: g('b_floor_heights'),
        location: g('location'),
        exposure_cat: g('exposure_cat'),
        occupancy_cat: g('occupancy_cat'),
        K_d: g('K_d'),
        GC_pi: g('GC_pi'),
        b_rigidity: g('b_rigidity'),
        b_freq: g('b_freq'),
        damping: g('damping'),
        topography_type: g('topography_type'),
        topo_crest_side: g('topo_crest_side'),
        topo_height: g('topo_height'),
        topo_length: g('topo_length'),
        topo_distance: g('topo_distance'),
    };
}

function collectGlassInputs(catNum) {
    const g = id => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.tagName === 'SELECT') {
            return el.options.length > 0 ? el.options[el.selectedIndex]?.value ?? null : null;
        }
        return el.value || null;
    };
    const glassType = g(`cat${catNum}-glass-type`) || 'sgu';
    const prefix = `cat${catNum}-glass-${glassType}`;
    const settings = getSettings();
    const calcMode = g(`cat${catNum}-glass-calc-mode`) || 'auto';

    const gen = _getGeneralInputs(catNum);
    const base = {
        glass_type: glassType,
        length: gen.glass_length,
        width: gen.glass_width,
        wind_load: g(`cat${catNum}-glass-wind_load`),
        def_criteria: settings.glassDeflRatio,
        support_type: g(`cat${catNum}-glass-support_type`),
        calc_mode: calcMode,
        zone: g(`cat${catNum}-general-zone`) || 'zone4',
    };

    const manual = calcMode === 'manual';

    if (glassType === 'sgu') {
        return {
            ...base,
            thickness: g(`${prefix}-thickness`),
            grade: g(`${prefix}-grade`),
            ...(manual && { nfl: g(`${prefix}-nfl`), def: g(`${prefix}-def`) }),
        };
    }
    if (glassType === 'lgu') {
        return {
            ...base,
            grade: g(`${prefix}-grade`),
            thickness1: g(`${prefix}-thickness1`),
            thickness_inner: g(`${prefix}-thickness_inner`),
            thickness2: g(`${prefix}-thickness2`),
            chart_thickness: g(`${prefix}-chart_thickness`),
            ...(manual && { nfl: g(`${prefix}-nfl`), def: g(`${prefix}-def`) }),
        };
    }
    if (glassType === 'dgu') {
        return {
            ...base,
            grade1: g(`${prefix}-grade1`),
            grade2: g(`${prefix}-grade2`),
            thickness1: g(`${prefix}-thickness1`),
            gap: g(`${prefix}-gap`),
            thickness2: g(`${prefix}-thickness2`),
            ...(manual && {
                nfl1: g(`${prefix}-nfl1`),
                nfl2: g(`${prefix}-nfl2`),
                def1: g(`${prefix}-def1`),
                def2: g(`${prefix}-def2`),
            }),
        };
    }
    if (glassType === 'ldgu') {
        return {
            ...base,
            grade1: g(`${prefix}-grade1`),
            grade2: g(`${prefix}-grade2`),
            thickness1_1: g(`${prefix}-thickness1_1`),
            thickness_inner: g(`${prefix}-thickness_inner`),
            thickness1_2: g(`${prefix}-thickness1_2`),
            gap: g(`${prefix}-gap`),
            thickness2: g(`${prefix}-thickness2`),
            chart_thickness: g(`${prefix}-chart_thickness`),
            ...(manual && {
                nfl1: g(`${prefix}-nfl1`),
                nfl2: g(`${prefix}-nfl2`),
                def1: g(`${prefix}-def1`),
                def2: g(`${prefix}-def2`),
            }),
        };
    }
    return base;
}

function _resolveProfilePayload(sectionName, profileList, isSteel = false) {
    if (!sectionName || !profileList) return null;
    const sec = (profileList || []).find(s => s.name === sectionName);
    if (!sec) return null;
    const mat = (_materials || []).find(m => m.name === sec.grade);
    const fy = mat ? (mat.fy || null) : null;
    if (isSteel) {
        const steelType = (sec.profileType || 'steel-rhs').replace('steel-', '');
        return {
            profile_type: steelType === 'w' ? 'iw' : steelType,
            web_length: sec.d, flange_length: sec.b,
            thk: sec.t, flange_thk: sec.tf, web_thk: sec.tw,
            F_y: fy || 318,
            computed_phi_Mn: sec._phi_Mn ?? null, computed_I_xx: sec._I_xx ?? null, computed_I_yy: sec._I_yy ?? null
        };
    }
    const cPhiMn = sec._phi_Mn ?? sec.mnYield ?? sec.phiMn ?? null;
    const cIxx   = sec._I_xx ?? sec.ix ?? null;
    const cIyy   = sec._I_yy ?? sec.iy ?? null;
    return {
        profile_type: sec.profileType || 'stick', profile_name: sec.name,
        web_length: sec.d, flange_length: sec.b, web_thk: sec.tw, flange_thk: sec.tf, F_y: fy,
        tor_constant: sec.j, area: sec.a, I_xx: sec.ix, I_yy: sec.iy, Y: sec.y, X: sec.x,
        plastic_x: sec.plasticX, plastic_y: sec.plasticY, phi_Mn: sec.mnYield,
        computed_phi_Mn: cPhiMn, computed_I_xx: cIxx, computed_I_yy: cIyy
    };
}

// Map a section object to an alum profile payload (for sending all profiles to backend)
function _sectionToAlumProfile(sec) {
    const mat = (_materials || []).find(m => m.name === sec.grade);
    return {
        profile_type: sec.profileType || 'stick',
        profile_name: sec.name,
        web_length: sec.d, flange_length: sec.b, web_thk: sec.tw, flange_thk: sec.tf,
        F_y: mat ? mat.fy : null,
        tor_constant: sec.j, area: sec.a, I_xx: sec.ix, I_yy: sec.iy,
        Y: sec.y, X: sec.x, plastic_x: sec.plasticX, plastic_y: sec.plasticY, phi_Mn: sec.mnYield,
        computed_phi_Mn: sec._phi_Mn ?? null, computed_I_xx: sec._I_xx ?? null, computed_I_yy: sec._I_yy ?? null,
    };
}

// Map a section object to a steel profile payload
function _sectionToSteelProfile(sec) {
    const mat = (_materials || []).find(m => m.name === sec.grade);
    return {
        profile_type: sec.profileType || 'steel-rhs',
        profile_name: sec.name,
        web_length: sec.d, flange_length: sec.b, thk: sec.t, flange_thk: sec.tf, web_thk: sec.tw,
        F_y: mat ? mat.fy : null,
        computed_phi_Mn: sec._phi_Mn ?? null, computed_I_xx: sec._I_xx ?? null, computed_I_yy: sec._I_yy ?? null,
    };
}

function collectFrameInputs(catNum) {
    const g = id => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.tagName === 'SELECT') {
            return el.options.length > 0 ? el.options[el.selectedIndex]?.value ?? null : null;
        }
        return el.value || null;
    };
    const geometry = g(`cat${catNum}-frame-geometry`) || 'regular';
    const mullionType = g(`cat${catNum}-frame-mullion-type`) || 'alu';
    const gen = _getGeneralInputs(catNum);
    const frameType = gen.facade_type;
    const variant = `${geometry}-${mullionType}`;
    const prefix = `cat${catNum}-frame-${variant}`;
    const settings = getSettings();

    const frame = {
        geometry: geometry,
        mullion_type: mullionType === 'alu-steel' ? 'Aluminum + Steel' : 'Aluminum Only',
        frame_type: frameType === 'sfgp' ? 'Floor-to-floor' : 'Continuous',
        width: gen.transom_length,
        length: gen.mullion_length,
        wind_neg: g(`${prefix}-wind_neg`),
        glass_thk: _computeGlassThk(catNum),
        tran_spacing: gen.tran_spacing,
        mullion: g(`${prefix}-mullion`),
        transom: g(`${prefix}-transom`),
        steel: g(`${prefix}-steel`),
        defl_ratio: settings.frameDeflRatio,
        mul_mu: g(`${prefix}-mul_mu`),
        mul_vu: g(`${prefix}-mul_vu`),
        mul_def: g(`${prefix}-mul_def`),
        tran_mu: g(`${prefix}-tran_mu`),
        tran_vu: g(`${prefix}-tran_vu`),
        tran_def_wind: g(`${prefix}-tran_def_wind`),
        tran_def_dead: g(`${prefix}-tran_def_dead`),
        joint_fy: g(`${prefix}-joint_fy`),
        joint_fz: g(`${prefix}-joint_fz`),
        reaction_Ry: g(`${prefix}-reaction_Ry`),
        reaction_Rz: g(`${prefix}-reaction_Rz`),
        zone: g(`cat${catNum}-general-zone`) || 'zone4',
    };

    // Resolve profile payloads from the section stores
    const mullionPayload = _resolveProfilePayload(frame.mullion, _alumSections);
    const transomPayload = _resolveProfilePayload(frame.transom, _alumSections);
    const steelPayload = _resolveProfilePayload(frame.steel, _steelSections, true);

    if (mullionPayload) frame.mullion = mullionPayload;
    if (transomPayload) frame.transom = transomPayload;
    if (steelPayload) frame.steel = steelPayload;

    return frame;
}

function collectConnectionInputs(catNum) {
    const g = id => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.tagName === 'SELECT') {
            return el.options.length > 0 ? el.options[el.selectedIndex]?.value ?? null : null;
        }
        return el.value || null;
    };
    return {
        screw_nos: g(`cat${catNum}-conn-nos`),
        screw_dia: g(`cat${catNum}-conn-screw-dia`),
        head_dia: g(`cat${catNum}-conn-screw-head-dia`),
        t1: g(`cat${catNum}-conn-t1`),
        t2: g(`cat${catNum}-conn-t2`),
        tc: g(`cat${catNum}-conn-tc`),
    };
}

function collectAnchorInputs(catNum) {
    const g = id => {
        const el = document.getElementById(id);
        if (!el) return null;
        if (el.tagName === 'SELECT') {
            return el.options.length > 0 ? el.options[el.selectedIndex]?.value ?? null : null;
        }
        return el.value || null;
    };
    // Select values: 'box-clump', 'u-clump', 'l-clump'
    const clumpValue = g(`cat${catNum}-anchor-type`) || 'box-clump';
    // Map select value to display text for backend
    const clumpDisplay = clumpValue === 'box-clump' ? 'Box Clump'
        : clumpValue === 'u-clump' ? 'U Clump'
        : 'L Clump';
    // Prefix matches the select value directly (used in HTML IDs)
    const prefix = `cat${catNum}-anchor-${clumpValue}`;
    return {
        clump_type: clumpDisplay,
        anchor_dia: g(`${prefix}-anchor_dia`),
        embed_depth: g(`${prefix}-embed_depth`),
        N_p5: g(`${prefix}-N_p5`) || g(`cat${catNum}-anchor-N_p5`),
        h_a: _getGeneralInputs(catNum).h_a,
        bp_thk: g(`${prefix}-bp_thk`),
        anchor_nos: g(`${prefix}-anchor_nos`),
        C_a1: g(`${prefix}-C_a1`),
        C_a2: g(`${prefix}-C_a2`),
        // U Clump and L Clump shared
        fin_thk: g(`${prefix}-fin_thk`),
        fin_e: g(`${prefix}-fin_e`),
        thr_bolt_dia: g(`${prefix}-thr_bolt_dia`),
        // L Clump specific
        front_bp_length_N: g(`${prefix}-front_bp_length_N`),
        front_bp_width_B: g(`${prefix}-front_bp_width_B`),
        top_bp_width_B: g(`${prefix}-top_bp_width_B`),
        top_anchor_nos: g(`${prefix}-top_anchor_nos`),
        front_C_a1: g(`${prefix}-front_C_a1`),
        top_C_a1: g(`${prefix}-top_C_a1`),
    };
}

// ---- API callers ----

function _post(url, body) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(r => r.ok ? r.json() : null).catch(() => null);
}

function _postHtml(url, body) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(r => r.ok ? r.text() : null).catch(() => null);
}

async function runWindCalc() {
    const inputs = collectWindInputs();
    const result = await _post('/api/render/wind', inputs);
    updateWindResults(result);

    // Dispatch raw CC data for wind 3D shell visualization
    if (result?.cc_data) {
        window.dispatchEvent(new CustomEvent('wind-cc-updated', {
            detail: { ...result.cc_data, inputs },
        }));
    }
}

async function runCategoryCalc(catNum) {
    const frameInputs = collectFrameInputs(catNum);
    const alumProfiles = (_alumSections || []).map(_sectionToAlumProfile);
    const steelProfiles = (_steelSections || []).map(_sectionToSteelProfile);
    const windInputs = collectWindInputs();

    const [glassResponse, frameResponse] = await Promise.all([
        _post('/api/render/glass', { ...collectGlassInputs(catNum), wind: windInputs }),
        _post('/api/render/frame', { frame: frameInputs, alum_profiles: alumProfiles, steel_profiles: steelProfiles, wind: windInputs }),
    ]);

    const glassHtml = glassResponse?.html ?? null;
    const glassResult = glassResponse?.result ?? null;
    const frameHtml = frameResponse?.html ?? null;
    const frameResult = frameResponse?.result ?? null;

    const frameForDownstream = { ...frameInputs };
    if (frameResult) {
        if (frameResult.joint_fy != null) frameForDownstream.joint_fy = frameResult.joint_fy;
        if (frameResult.joint_fz != null) frameForDownstream.joint_fz = frameResult.joint_fz;
        if (frameResult.reaction_Ry != null) frameForDownstream.reaction_Ry = frameResult.reaction_Ry;
        if (frameResult.reaction_Rz != null) frameForDownstream.reaction_Rz = frameResult.reaction_Rz;
    }

    const [connHtml, anchorHtml] = await Promise.all([
        _postHtml('/api/render/connection', { conn: collectConnectionInputs(catNum), frame: frameForDownstream }),
        _postHtml('/api/render/anchorage', { anchor: collectAnchorInputs(catNum), frame: frameForDownstream, alum_profiles: alumProfiles }),
    ]);

    const gen = _getGeneralInputs(catNum);
    updateFacadeResults(catNum, {
        glass: glassHtml,
        frame: frameHtml,
        conn: connHtml,
        anchor: anchorHtml,
        geometry: { ...gen, glass_thk: _computeGlassThk(catNum) },
        glassResult: glassResult,
        frameResult: frameResult,
    });
}

// ---- Debounced triggers ----

function scheduleWindCalc() {
    clearTimeout(_calcTimers.wind);
    _calcTimers.wind = setTimeout(runWindCalc, CALC_DEBOUNCE_MS);
}

function scheduleCategoryCalc(catNum) {
    clearTimeout(_calcTimers[catNum]);
    _calcTimers[catNum] = setTimeout(() => runCategoryCalc(catNum), CALC_DEBOUNCE_MS);
}

// ---- Delegated change listeners ----

document.addEventListener('change', (e) => {
    const el = e.target;

    // Wind inputs (inside wind panel template)
    if (el.closest('.wind__panel')) {
        scheduleWindCalc();
        return;
    }

    // Category inputs — detect cat number from id pattern cat{N}-...
    const match = el.id?.match(/^cat(\d+)-/);
    if (match) {
        scheduleCategoryCalc(match[1]);
    }
});

document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.closest('.wind__panel')) {
        scheduleWindCalc();
        return;
    }
    const match = el.id?.match(/^cat(\d+)-/);
    if (match) scheduleCategoryCalc(match[1]);
});

// Also re-run category calc when section dropdowns change (alumSecProp / steelSecProp)
document.addEventListener('frame-sections-changed', () => {
    const activeCat = _getActiveCategoryNum();
    if (activeCat) scheduleCategoryCalc(activeCat);
});

function _getActiveCategoryNum() {
    const active = document.querySelector('.category__btn.active');
    return active ? parseInt(active.getAttribute('data-category')) : null;
}

// Clear all category calc timers (call before renumbering)
function clearAllCategoryTimers() {
    for (const key of Object.keys(_calcTimers)) {
        if (key !== 'wind') {
            clearTimeout(_calcTimers[key]);
            delete _calcTimers[key];
        }
    }
}

// Renumber calc timers after category renumbering (oldNum -> newNum mapping)
function renumberCategoryTimers(oldToNewMap) {
    const newTimers = { wind: _calcTimers.wind };
    for (const [oldNum, timerId] of Object.entries(_calcTimers)) {
        if (oldNum === 'wind') continue;
        const newNum = oldToNewMap.get(Number(oldNum));
        if (newNum != null) {
            newTimers[newNum] = timerId;
        }
    }
    // Replace the timer object contents
    for (const key of Object.keys(_calcTimers)) delete _calcTimers[key];
    for (const [key, val] of Object.entries(newTimers)) _calcTimers[key] = val;
}

// Initialize calculation engine
function initCalcEngine() {
}

export { initCalcEngine, runWindCalc, runCategoryCalc, scheduleWindCalc, scheduleCategoryCalc, clearAllCategoryTimers, renumberCategoryTimers };
