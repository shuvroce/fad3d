// ============================
// Results Renderer
// Renders calculation results into the Design Summary panel using HTML templates
// ============================

// ---- Format utility ----

const _fmt = (v, dp = 2) =>
    (v != null && v !== '') ? Number(v).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: dp }) : '—';

// ---- Template helpers ----

function _clone(id) {
    return document.getElementById(id).content.cloneNode(true);
}

function _empty(msg = 'No data') {
    const frag = _clone('result-empty-template');
    frag.querySelector('.result__empty').textContent = msg;
    return frag;
}

function _setBody(selector, frag) {
    const el = document.querySelector(selector);
    if (el) el.replaceChildren(frag);
}

// Fill a cloned section template with data values and pass/fail states.
// `data` is a flat object of { key: value }.
// `passMap` is an optional object of { key: boolean } for pass/fail styling.
// `showKeys` is an optional array of data-key values to unhide.
// `showSections` is an optional array of data-section values to unhide.
function _fillTemplate(templateId, data, passMap = {}, showKeys = [], showSections = []) {
    const frag = _clone(templateId);
    for (const key of showKeys) {
        const el = frag.querySelector(`[data-key="${key}"]`);
        if (el) el.removeAttribute('hidden');
    }
    for (const sec of showSections) {
        const el = frag.querySelector(`[data-section="${sec}"]`);
        if (el) el.removeAttribute('hidden');
    }
    for (const [key, value] of Object.entries(data)) {
        const el = frag.querySelector(`[data-key="${key}"]`);
        if (!el) continue;
        const valueEl = el.querySelector('.result__value-text');
        if (valueEl) valueEl.textContent = _fmt(value);
        if (key in passMap && passMap[key] !== null) {
            const pass = passMap[key];
            el.classList.add(pass ? 'result__item-pass' : 'result__item-fail');
            const status = el.querySelector('.result__status');
            if (status) {
                status.removeAttribute('hidden');
                status.classList.add(pass ? 'result__status-pass' : 'result__status-fail');
                status.textContent = pass ? '✓' : '✕';
            }
        }
    }
    return frag;
}

// ---- Glass Results ----

function _renderGlass(calc) {
    if (!calc || calc.error) return _empty('—');
    const isSingle = calc.branch === 'sgu' || calc.branch === 'lgu';
    const isDouble = calc.branch === 'dgu' || calc.branch === 'ldgu';
    const showKeys = [];
    if (calc.wind_auto) showKeys.push('wind_load');
    if (isSingle) showKeys.push('gtf', 'lr');
    if (isDouble) showKeys.push('gtf1', 'gtf2', 'ls1', 'ls2', 'lr1', 'lr2');
    if (calc.stress_ratio != null) showKeys.push('stress_ratio');
    if (calc.allow_def != null) showKeys.push('allow_def');
    if (calc.def_ratio != null) showKeys.push('def_ratio');
    if (calc.bite_req != null) showKeys.push('bite_req');

    const data = {
        A_eff: calc.A_eff,
        aspect_ratio: calc.aspect_ratio,
        wind_load: calc.wind_load,
        gtf: calc.gtf,
        lr: calc.lr,
        gtf1: calc.gtf1,
        gtf2: calc.gtf2,
        ls1: calc.ls1,
        ls2: calc.ls2,
        lr1: calc.lr1,
        lr2: calc.lr2,
        stress_ratio: calc.stress_ratio,
        allow_def: calc.allow_def,
        def_ratio: calc.def_ratio,
        bite_req: calc.bite_req,
    };
    const passMap = {
        stress_ratio: calc.stress_ratio != null ? calc.stress_ratio <= 1 : null,
        def_ratio: calc.def_ratio != null ? calc.def_ratio <= 1 : null,
    };
    return _fillTemplate('result-glass-template', data, passMap, showKeys);
}

// ---- Frame Results ----

function _renderFrame(calc) {
    if (!calc || calc.error) return _empty('—');
    const isComposite = calc.mullion_type === 'Aluminum + Steel';
    const showKeys = [];
    if (calc.wind_auto) showKeys.push('wind_neg');
    if (isComposite) showKeys.push('I_xa', 'I_xs', 'ls_a', 'ls_s', 'mul_phi_Mn_a', 'mul_dc_a', 'mul_phi_Mn_s', 'mul_dc_s');
    else showKeys.push('mul_phi_Mn', 'mul_dc');
    if (calc.mul_def != null) showKeys.push('mul_def');
    if (calc.tran_def_wind != null) showKeys.push('tran_def_wind');
    if (calc.tran_def_dead != null) showKeys.push('tran_def_dead');

    const data = {
        eff_area: calc.eff_area,
        wind_neg: calc.wind_neg,
        glass_sw: calc.glass_sw,
        I_xa: calc.I_xa,
        I_xs: calc.I_xs,
        ls_a: calc.ls_a,
        ls_s: calc.ls_s,
        mul_mu: calc.mul_mu,
        mul_phi_Mn_a: calc.mul_phi_Mn_a,
        mul_dc_a: calc.mul_dc_a,
        mul_phi_Mn_s: calc.mul_phi_Mn_s,
        mul_dc_s: calc.mul_dc_s,
        mul_phi_Mn: calc.mul_phi_Mn,
        mul_dc: calc.mul_dc,
        mul_def: calc.mul_def,
        mul_allow_def: calc.mul_allow_def,
        tran_mu: calc.tran_mu,
        tran_phi_Mn: calc.tran_phi_Mn,
        tran_dc: calc.tran_dc,
        tran_def_wind: calc.tran_def_wind,
        tran_def_dead: calc.tran_def_dead,
        tran_allow_def: calc.tran_allow_def,
    };
    const passMap = {
        mul_dc_a: calc.mul_dc_a != null ? calc.mul_dc_a <= 1 : null,
        mul_dc_s: calc.mul_dc_s != null ? calc.mul_dc_s <= 1 : null,
        mul_dc: calc.mul_dc != null ? calc.mul_dc <= 1 : null,
        mul_def: calc.mul_def != null ? calc.mul_def <= (calc.mul_allow_def ?? Infinity) : null,
        tran_dc: calc.tran_dc != null ? calc.tran_dc <= 1 : null,
        tran_def_wind: calc.tran_def_wind != null ? calc.tran_def_wind <= (calc.tran_allow_def ?? Infinity) : null,
        tran_def_dead: calc.tran_def_dead != null ? calc.tran_def_dead <= 3.0 : null,
    };
    return _fillTemplate('result-frame-template', data, passMap, showKeys);
}

// ---- Connection Results ----

function _renderConnection(calc) {
    if (!calc || calc.error) return _empty('—');
    const data = {
        joint_fy: calc.joint_fy,
        joint_fz: calc.joint_fz,
        R_yA: calc.R_yA,
        R_zA: calc.R_zA,
        Vu: calc.Vu,
        phi_Pnv: calc.phi_Pnv,
        phi_Pnot: calc.phi_Pnot,
        phi_Pnov: calc.phi_Pnov,
        beta_pullover: calc.beta_pullover,
        beta_pullout: calc.beta_pullout,
    };
    const passMap = {
        phi_Pnv: calc.phi_Pnv > calc.Vu,
        phi_Pnot: calc.phi_Pnot > calc.R_zA,
        phi_Pnov: calc.phi_Pnov > calc.R_zA,
        beta_pullover: calc.beta_pullover <= 0.715,
        beta_pullout: calc.beta_pullout <= 0.69,
    };
    return _fillTemplate('result-connection-template', data, passMap);
}

// ---- Anchorage Results ----

function _renderAnchorage(calc) {
    if (!calc || calc.error) return _empty('—');
    const showKeys = [];
    const showSections = [];
    if (calc.clump_type === 'Box Clump') {
        showSections.push('anchor', 'baseplate');
        showKeys.push('V_ua', 'phi_Vsa', 'phi_Vcbg', 'phi_Vcp', 'bp_Pu', 'bp_t_req_bear');
    } else if (calc.clump_type === 'U Clump') {
        showSections.push('anchor');
        showKeys.push('N_ua', 'phi_Nsa', 'phi_Ncbg', 'phi_Npn', 'V_ua', 'phi_Vsa', 'phi_Vcbg', 'interaction');
    }
    const data = {
        reaction_Ry: calc.reaction_Ry,
        reaction_Rz: calc.reaction_Rz,
        V_ua: calc.V_ua,
        phi_Vsa: calc.phi_Vsa,
        phi_Vcbg: calc.phi_Vcbg,
        phi_Vcp: calc.phi_Vcp,
        bp_Pu: calc.bp_Pu,
        bp_t_req_bear: calc.bp_t_req_bear,
        N_ua: calc.N_ua,
        phi_Nsa: calc.phi_Nsa,
        phi_Ncbg: calc.phi_Ncbg,
        phi_Npn: calc.phi_Npn,
        interaction: calc.interaction,
    };
    const passMap = {
        phi_Vsa: calc.phi_Vsa > calc.V_ua,
        phi_Vcbg: calc.phi_Vcbg > calc.V_ug,
        phi_Vcp: calc.phi_Vcp > calc.V_ug,
        bp_t_req_bear: calc.bp_t_req_bear < calc.bp_thk,
        phi_Nsa: calc.phi_Nsa > calc.N_ua,
        phi_Ncbg: calc.phi_Ncbg > calc.N_ug,
        phi_Npn: calc.phi_Npn > calc.N_ua,
        interaction: calc.interaction <= 1,
    };
    return _fillTemplate('result-anchorage-template', data, passMap, showKeys, showSections);
}

// ---- Wind Results ----

function _renderWindGeneral(summary) {
    if (!summary) return _empty('—');
    const data = {
        wind_speed: summary.wind_speed,
        gust_factor: summary.gust_factor,
        Imp_factor: summary.Imp_factor,
        K_h: summary.K_h,
        K_ht: summary.K_ht,
        q_h: summary.q_h,
        C_pw: summary.C_pw,
        C_pl: summary.C_pl,
        C_ps: summary.C_ps,
        P_hi: summary.P_hi,
        P_hl: summary.P_hl,
        P_hs: summary.P_hs,
    };
    return _fillTemplate('result-wind-general-template', data);
}

function _renderMWFRS(levels) {
    if (!levels || !levels.length) return _empty('—');
    const tableWrap = _clone('result-mwfrs-table-template');
    const tbody = tableWrap.querySelector('tbody');
    for (const r of levels) {
        const row = _clone('result-mwfrs-row-template');
        row.querySelector('.mwfrs-level').textContent = r.level;
        row.querySelector('.mwfrs-height').textContent = _fmt(r.cumu_height, 1);
        row.querySelector('.mwfrs-kz').textContent = _fmt(r.K_z);
        row.querySelector('.mwfrs-qz').textContent = _fmt(r.q_z);
        row.querySelector('.mwfrs-pzw').textContent = _fmt(r.P_zw);
        tbody.appendChild(row);
    }
    return tableWrap;
}

function _renderCladding(wallResults) {
    if (!wallResults || !Object.keys(wallResults).length) return _empty('—');
    const areas = Object.keys(wallResults).sort((a, b) => Number(a) - Number(b));
    const tableWrap = _clone('result-cladding-table-template');
    const tbody = tableWrap.querySelector('tbody');
    for (const area of areas) {
        const r = wallResults[area][0];
        if (!r) continue;
        const row = _clone('result-cladding-row-template');
        row.querySelector('.cladding-area').textContent = area;
        row.querySelector('.cladding-pz4pos').textContent = _fmt(r.P_z4_pos);
        row.querySelector('.cladding-pz4neg').textContent = _fmt(r.P_z4_neg);
        row.querySelector('.cladding-pz5neg').textContent = _fmt(r.P_z5_neg);
        tbody.appendChild(row);
    }
    return tableWrap;
}

// ---- Public update functions (called by calcEngine.js) ----

function updateWindResults(result) {
    if (!result || result.error) {
        _setBody('#wind-general-body', _empty('—'));
        _setBody('#wind-mwfrs-body', _empty('—'));
        _setBody('#wind-cladding-body', _empty('—'));
        return;
    }
    _setBody('#wind-general-body', _renderWindGeneral(result.summary));
    _setBody('#wind-mwfrs-body', _renderMWFRS(result.mwfrs_levels));
    _setBody('#wind-cladding-body', _renderCladding(result.wall_results));
}

const _facadeResultsCache = new Map();

// Per-category collapse state: Map<catNum, Set<cardKey>>
const _facadeCollapseState = new Map();

function updateFacadeResults(catNum, results) {
    _facadeResultsCache.set(Number(catNum), results);
    showFacadeResults(catNum);
}

function showFacadeResults(catNum) {
    const results = _facadeResultsCache.get(Number(catNum));
    const bodies = [
        { sel: '#facade-glass-body', key: 'glass' },
        { sel: '#facade-frame-body', key: 'frame' },
        { sel: '#facade-conn-body', key: 'conn' },
        { sel: '#facade-anchor-body', key: 'anchor' },
    ];
    const renderers = { glass: _renderGlass, frame: _renderFrame, conn: _renderConnection, anchor: _renderAnchorage };

    // Exit animation
    bodies.forEach(({ sel }) => {
        const el = document.querySelector(sel);
        if (el && el.firstElementChild) {
            el.firstElementChild.style.animation = 'resultContentFadeOut 0.12s ease forwards';
        }
    });

    setTimeout(() => {
        bodies.forEach(({ sel, key }) => {
            if (results) {
                _setBody(sel, renderers[key](results[key]));
            } else {
                _setBody(sel, _empty());
            }
            const el = document.querySelector(sel);
            if (el && el.firstElementChild) {
                el.firstElementChild.style.animation = 'resultContentFadeIn 0.15s ease';
            }
        });
    }, 120);
}

function clearFacadeCache(keepKeys) {
    if (keepKeys && keepKeys.length) {
        for (const key of _facadeResultsCache.keys()) {
            if (!keepKeys.includes(key)) _facadeResultsCache.delete(key);
        }
    } else {
        _facadeResultsCache.clear();
    }
}

// ---- Collapse state management ----

function getFacadeCollapseState() {
    return _facadeCollapseState;
}

function setFacadeCollapseState(newState) {
    _facadeCollapseState.clear();
    for (const [k, v] of newState) {
        _facadeCollapseState.set(k, v);
    }
}

function clearCollapseStateForCategory(catNum) {
    _facadeCollapseState.delete(catNum);
}

function renumberCollapseState(oldToNewMap) {
    const newState = new Map();
    for (const [oldNum, collapsedSet] of _facadeCollapseState) {
        const newNum = oldToNewMap.get(oldNum);
        if (newNum != null) {
            newState.set(newNum, collapsedSet);
        }
    }
    _facadeCollapseState.clear();
    for (const [num, set] of newState) {
        _facadeCollapseState.set(num, set);
    }
}

// Restore collapse state for a specific category onto the facade result cards
function restoreCollapseStateForCategory(catNum) {
    const state = _facadeCollapseState.get(catNum) || new Set();
    document.querySelectorAll('.result__tab-content[data-result-tab="facade"] .result__card').forEach((card) => {
        const cardKey = card.querySelector(".result__card-title")?.textContent?.toLowerCase();
        if (!cardKey) return;
        card.classList.toggle("collapsed", state.has(cardKey));
    });
}

// Persist collapse state for a card under the currently active category
function persistCollapseStateForCard(card) {
    const activeBtn = document.querySelector(".category__btn.active");
    if (!activeBtn) return;
    const catNum = Number(activeBtn.getAttribute("data-category"));
    const cardKey = card.querySelector(".result__card-title")?.textContent?.toLowerCase();
    if (!cardKey) return;

    const state = _facadeCollapseState.get(catNum) || new Set();
    if (card.classList.contains("collapsed")) {
        state.add(cardKey);
    } else {
        state.delete(cardKey);
    }
    _facadeCollapseState.set(catNum, state);
}

export { updateWindResults, updateFacadeResults, showFacadeResults, clearFacadeCache, getFacadeCollapseState, setFacadeCollapseState, clearCollapseStateForCategory, renumberCollapseState, restoreCollapseStateForCategory, persistCollapseStateForCard };
