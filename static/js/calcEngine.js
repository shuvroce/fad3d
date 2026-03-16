// ============================
// Calculation Engine
// Collects inputs, calls Python APIs, updates Design Summary
// ============================

const CALC_DEBOUNCE_MS = 400;

// Per-category and wind debounce timers
const _calcTimers = { wind: null };

// ---- Input Collectors ----

function collectWindInputs() {
    const g = id => document.getElementById(id)?.value || null;
    return {
        b_length:         g('b_length'),
        b_width:          g('b_width'),
        b_height:         g('b_height'),
        b_floor_heights:  g('b_floor_heights'),
        location:         g('location'),
        exposure_cat:     g('exposure_cat'),
        occupancy_cat:    g('occupancy_cat'),
        K_d:              g('K_d'),
        GC_pi:            g('GC_pi'),
        b_rigidity:       g('b_rigidity'),
        b_freq:           g('b_freq'),
        damping:          g('damping'),
        topography_type:  g('topography_type'),
        topo_crest_side:  g('topo_crest_side'),
        topo_height:      g('topo_height'),
        topo_length:      g('topo_length'),
        topo_distance:    g('topo_distance'),
    };
}

function collectGlassInputs(catNum) {
    const g = id => document.getElementById(id)?.value || null;
    const glassType = g(`cat${catNum}-glass-type`) || 'sgu';
    const prefix = `cat${catNum}-glass-${glassType}`;

    const base = {
        glass_type:   glassType,
        length:       g(`${prefix}-length`),
        width:        g(`${prefix}-width`),
        wind_load:    g(`${prefix}-wind_load`),
        def_criteria: g(`${prefix}-def_criteria`),
        support_type: g(`${prefix}-support_type`),
    };

    if (glassType === 'sgu' || glassType === 'lgu') {
        return { ...base, grade: g(`${prefix}-grade`), nfl: g(`${prefix}-nfl`), def: g(`${prefix}-def`) };
    }
    if (glassType === 'dgu' || glassType === 'ldgu') {
        return {
            ...base,
            grade1:     g(`${prefix}-grade1`),
            grade2:     g(`${prefix}-grade2`),
            thickness1: g(`${prefix}-thickness1`),
            thickness2: g(`${prefix}-thickness2`),
            nfl1:       g(`${prefix}-nfl1`),
            nfl2:       g(`${prefix}-nfl2`),
            def1:       g(`${prefix}-def1`),
            def2:       g(`${prefix}-def2`),
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
    return isSteel
        ? { profile_type: sec.profileType || 'steel-rhs', d: sec.d, b: sec.b, t: sec.t, tf: sec.tf, tw: sec.tw, F_y: fy }
        : { profile_type: sec.profileType || 'stick', profile_name: sec.name, web_length: sec.d, flange_length: sec.b, web_thk: sec.tw, flange_thk: sec.tf, F_y: fy,
            tor_constant: sec.j, area: sec.a, I_xx: sec.ix, I_yy: sec.iy, Y: sec.y, X: sec.x,
            plastic_x: sec.plasticX, plastic_y: sec.plasticY, phi_Mn: sec.mnYield };
}

function collectFrameInputs(catNum) {
    const g = id => document.getElementById(id)?.value || null;
    const geometry    = g(`cat${catNum}-frame-geometry`) || 'regular';
    const mullionType = g(`cat${catNum}-frame-mullion-type`) || 'Aluminum Only';
    const variant     = `${geometry}-${mullionType}`;
    const prefix      = `cat${catNum}-frame-${variant.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

    // Field IDs depend on frame variant
    const frame = {
        geometry:     geometry,
        mullion_type: mullionType,
        frame_type:   g(`cat${catNum}-frame-type`),
        width:        g(`cat${catNum}-frame-width`),
        length:       g(`cat${catNum}-frame-length`),
        wind_neg:     g(`cat${catNum}-frame-wind_neg`),
        glass_thk:    g(`cat${catNum}-frame-glass_thk`),
        tran_spacing: g(`cat${catNum}-frame-tran_spacing`),
        mullion:      g(`cat${catNum}-frame-mullion`),
        transom:      g(`cat${catNum}-frame-transom`),
        steel:        g(`cat${catNum}-frame-steel`),
    };

    // Resolve profile payloads from the section stores
    const mullionPayload = _resolveProfilePayload(frame.mullion, _alumSections);
    const transomPayload = _resolveProfilePayload(frame.transom, _alumSections);
    const steelPayload   = _resolveProfilePayload(frame.steel, _steelSections, true);

    if (mullionPayload) frame.mullion = mullionPayload;
    if (transomPayload) frame.transom = transomPayload;
    if (steelPayload)   frame.steel   = steelPayload;

    return frame;
}

function collectConnectionInputs(catNum) {
    const g = id => document.getElementById(id)?.value || null;
    return {
        screw_nos: g(`cat${catNum}-conn-screw_nos`),
        screw_dia: g(`cat${catNum}-conn-screw_dia`),
        head_dia:  g(`cat${catNum}-conn-head_dia`),
        t1:        g(`cat${catNum}-conn-t1`),
        t2:        g(`cat${catNum}-conn-t2`),
        tc:        g(`cat${catNum}-conn-tc`),
    };
}

function collectAnchorInputs(catNum) {
    const g = id => document.getElementById(id)?.value || null;
    const clumpType = g(`cat${catNum}-anchor-type`) || 'Box Clump';
    return {
        clump_type:  clumpType,
        anchor_dia:  g(`cat${catNum}-anchor-dia`),
        embed_depth: g(`cat${catNum}-anchor-embed_depth`),
        N_p5:        g(`cat${catNum}-anchor-N_p5`),
        h_a:         g(`cat${catNum}-anchor-h_a`),
        bp_thk:      g(`cat${catNum}-anchor-bp_thk`),
        anchor_nos:  g(`cat${catNum}-anchor-anchor_nos`),
        C_a1:        g(`cat${catNum}-anchor-C_a1`),
        C_a2:        g(`cat${catNum}-anchor-C_a2`),
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

async function runWindCalc() {
    const inputs = collectWindInputs();
    const result = await _post('/api/calc/wind', inputs);
    updateWindResults(result);
}

async function runCategoryCalc(catNum) {
    const frameInputs = collectFrameInputs(catNum);
    const alumProfiles = (_alumSections || []).map(s => {
        const mat = (_materials || []).find(m => m.name === s.grade);
        return {
            profile_type: s.profileType || 'stick',
            profile_name: s.name,
            web_length: s.d, flange_length: s.b, web_thk: s.tw, flange_thk: s.tf,
            F_y: mat ? mat.fy : null,
            tor_constant: s.j, area: s.a, I_xx: s.ix, I_yy: s.iy,
            Y: s.y, X: s.x, plastic_x: s.plasticX, plastic_y: s.plasticY, phi_Mn: s.mnYield,
        };
    });
    const steelProfiles = (_steelSections || []).map(s => {
        const mat = (_materials || []).find(m => m.name === s.grade);
        return {
            profile_type: s.profileType || 'steel-rhs',
            profile_name: s.name,
            web_length: s.d, flange_length: s.b, thk: s.t, flange_thk: s.tf, web_thk: s.tw,
            F_y: mat ? mat.fy : null,
        };
    });

    const [glassResult, frameResult, connResult, anchorResult] = await Promise.all([
        _post('/api/calc/glass', collectGlassInputs(catNum)),
        _post('/api/calc/frame', { frame: frameInputs, alum_profiles: alumProfiles, steel_profiles: steelProfiles }),
        _post('/api/calc/connection', { conn: collectConnectionInputs(catNum), frame: frameInputs }),
        _post('/api/calc/anchorage', { anchor: collectAnchorInputs(catNum), frame: frameInputs, alum_profiles: alumProfiles }),
    ]);

    updateFacadeResults(catNum, { glass: glassResult, frame: frameResult, conn: connResult, anchor: anchorResult });
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
    return active ? active.getAttribute('data-category') : null;
}

// Hook into switchCategory to re-run calcs on category change.
// Wraps after category.js loads (which defines switchCategory).
// Expose for manual calls
window.runCategoryCalc = runCategoryCalc;
window.scheduleWindCalc = scheduleWindCalc;
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        const orig = window.switchCategory;
        if (orig) {
            window.switchCategory = function(categoryNum) {
                orig(categoryNum);
                scheduleCategoryCalc(categoryNum);
                if (typeof updateFacadeResultCategory === 'function') {
                    updateFacadeResultCategory(categoryNum);
                }
            };
        }
    });
}
