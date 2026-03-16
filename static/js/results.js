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

function _row(label, value, pass = null) {
    const frag = _clone('result-row-template');
    const item = frag.querySelector('.result__item');
    if (pass === true) item.classList.add('result__item-pass');
    else if (pass === false) item.classList.add('result__item-fail');
    frag.querySelector('.result__label').innerHTML = label;
    frag.querySelector('.result__value-text').innerHTML = value;
    if (pass !== null) {
        const status = frag.querySelector('.result__status');
        status.removeAttribute('hidden');
        status.classList.add(pass ? 'result__status-pass' : 'result__status-fail');
        status.textContent = pass ? '✔' : '✗';
    }
    return frag;
}

function _divider(label) {
    const frag = _clone('result-divider-template');
    frag.querySelector('.result__divider').textContent = label;
    return frag;
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

// ---- Glass Results ----

function _renderGlass(calc) {
    if (!calc || calc.error) return _empty('—');
    const frag = document.createDocumentFragment();
    frag.appendChild(_row('Eff. Area', `${_fmt(calc.A_eff)} m²`));
    frag.appendChild(_row('Aspect Ratio', _fmt(calc.aspect_ratio)));
    if (calc.branch === 'sgu' || calc.branch === 'lgu') {
        frag.appendChild(_row('GTF', _fmt(calc.gtf)));
        frag.appendChild(_row('LR', `${_fmt(calc.sgu_lr ?? calc.lgu_lr)} kPa`));
    } else if (calc.branch === 'dgu' || calc.branch === 'ldgu') {
        frag.appendChild(_row('GTF₁', _fmt(calc.gtf1)));
        frag.appendChild(_row('GTF₂', _fmt(calc.gtf2)));
        frag.appendChild(_row('LS₁', _fmt(calc.dgu_ls1 ?? calc.ldgu_ls1)));
        frag.appendChild(_row('LS₂', _fmt(calc.dgu_ls2 ?? calc.ldgu_ls2)));
        frag.appendChild(_row('LR₁', `${_fmt(calc.dgu_lr1 ?? calc.ldgu_lr1)} kPa`));
        frag.appendChild(_row('LR₂', `${_fmt(calc.dgu_lr2 ?? calc.ldgu_lr2)} kPa`));
    }
    if (calc.stress_ratio != null)
        frag.appendChild(_row('Stress Ratio', _fmt(calc.stress_ratio), calc.stress_ratio <= 1));
    if (calc.allow_def != null)
        frag.appendChild(_row('Allow. Defl', `${_fmt(calc.allow_def)} mm`));
    if (calc.def_ratio != null)
        frag.appendChild(_row('Defl. Ratio', _fmt(calc.def_ratio), calc.def_ratio <= 1));
    if (calc.bite_req != null)
        frag.appendChild(_row('Bite Req.', `${_fmt(calc.bite_req)} mm`));
    return frag;
}

// ---- Frame Results ----

function _renderFrame(calc) {
    if (!calc || calc.error) return _empty('—');
    const frag = document.createDocumentFragment();
    frag.appendChild(_row('Eff. Area', `${_fmt(calc.eff_area)} m²`));
    frag.appendChild(_row('Glass DL', `${_fmt(calc.glass_sw)} kPa`));
    frag.appendChild(_divider('Mullion'));
    if (calc.mullion_type === 'Aluminum + Steel') {
        frag.appendChild(_row('I<sub>xa</sub>', `${_fmt(calc.I_xa, 0)} mm⁴`));
        frag.appendChild(_row('I<sub>xs</sub>', `${_fmt(calc.I_xs, 0)} mm⁴`));
        frag.appendChild(_row('LS<sub>a</sub>', _fmt(calc.ls_a)));
        frag.appendChild(_row('LS<sub>s</sub>', _fmt(calc.ls_s)));
    }
    frag.appendChild(_row('M<sub>u</sub>', `${_fmt(calc.mul_mu)} kNm`));
    if (calc.mullion_type === 'Aluminum + Steel') {
        frag.appendChild(_row('Alum. φM<sub>n</sub>', `${_fmt(calc.mul_phi_Mn_a)} kN-m`));
        frag.appendChild(_row('Alum. D/C', _fmt(calc.mul_dc_a), calc.mul_dc_a != null ? calc.mul_dc_a <= 1 : null));
        frag.appendChild(_row('Steel φM<sub>n</sub>', `${_fmt(calc.mul_phi_Mn_s)} kN-m`));
        frag.appendChild(_row('Steel D/C', _fmt(calc.mul_dc_s), calc.mul_dc_s != null ? calc.mul_dc_s <= 1 : null));
    } else {
        frag.appendChild(_row('φM<sub>n</sub>', `${_fmt(calc.mul_phi_Mn)} kN-m`));
        frag.appendChild(_row('D/C', _fmt(calc.mul_dc), calc.mul_dc != null ? calc.mul_dc <= 1 : null));
    }
    if (calc.mul_def != null)
        frag.appendChild(_row('Deflection', `${_fmt(calc.mul_def)} mm`, calc.mul_def <= (calc.mul_allow_def ?? Infinity)));
    frag.appendChild(_row('Allow. Defl', `${_fmt(calc.mul_allow_def)} mm`));
    frag.appendChild(_divider('Transom'));
    frag.appendChild(_row('M<sub>u</sub>', `${_fmt(calc.tran_mu)} kNm`));
    frag.appendChild(_row('φM<sub>n</sub>', `${_fmt(calc.tran_phi_Mn)} kN-m`));
    frag.appendChild(_row('D/C', _fmt(calc.tran_dc), calc.tran_dc != null ? calc.tran_dc <= 1 : null));
    if (calc.tran_def_wind != null)
        frag.appendChild(_row('Wind Defl', `${_fmt(calc.tran_def_wind)} mm`, calc.tran_def_wind <= (calc.tran_allow_def ?? Infinity)));
    if (calc.tran_def_dead != null)
        frag.appendChild(_row('Dead Defl', `${_fmt(calc.tran_def_dead)} mm`, calc.tran_def_dead <= 3.0));
    frag.appendChild(_row('Allow. Defl', `${_fmt(calc.tran_allow_def)} mm`));
    return frag;
}

// ---- Connection Results ----

function _renderConnection(calc) {
    if (!calc || calc.error) return _empty('—');
    const frag = document.createDocumentFragment();
    frag.appendChild(_row('Joint f<sub>y</sub>', `${_fmt(calc.joint_fy)} kN`));
    frag.appendChild(_row('Joint f<sub>z</sub>', `${_fmt(calc.joint_fz)} kN`));
    frag.appendChild(_row('Shear R<sub>yA</sub>', `${_fmt(calc.R_yA)} kN`));
    frag.appendChild(_row('Tension R<sub>zA</sub>', `${_fmt(calc.R_zA)} kN`));
    frag.appendChild(_row('Resultant V<sub>u</sub>', `${_fmt(calc.Vu)} kN`));
    frag.appendChild(_row('φP<sub>nv</sub>', `${_fmt(calc.phi_Pnv)} kN`, calc.phi_Pnv > calc.Vu));
    frag.appendChild(_row('φP<sub>not</sub>', `${_fmt(calc.phi_Pnot)} kN`, calc.phi_Pnot > calc.R_zA));
    frag.appendChild(_row('φP<sub>nov</sub>', `${_fmt(calc.phi_Pnov)} kN`, calc.phi_Pnov > calc.R_zA));
    frag.appendChild(_row('β<sub>pullover</sub>', _fmt(calc.beta_pullover), calc.beta_pullover <= 0.715));
    frag.appendChild(_row('β<sub>pullout</sub>', _fmt(calc.beta_pullout), calc.beta_pullout <= 0.69));
    return frag;
}

// ---- Anchorage Results ----

function _renderAnchorage(calc) {
    if (!calc || calc.error) return _empty('—');
    const frag = document.createDocumentFragment();
    frag.appendChild(_row('Reaction R<sub>y</sub>', `${_fmt(calc.reaction_Ry)} kN`));
    frag.appendChild(_row('Reaction R<sub>z</sub>', `${_fmt(calc.reaction_Rz)} kN`));
    if (calc.clump_type === 'Box Clump') {
        frag.appendChild(_divider('Anchor'));
        frag.appendChild(_row('V<sub>ua</sub>', `${_fmt(calc.V_ua)} kN`));
        frag.appendChild(_row('φV<sub>sa</sub>', `${_fmt(calc.phi_Vsa)} kN`, calc.phi_Vsa > calc.V_ua));
        frag.appendChild(_row('φV<sub>cbg</sub>', `${_fmt(calc.phi_Vcbg)} kN`, calc.phi_Vcbg > calc.V_ug));
        frag.appendChild(_row('φV<sub>cp</sub>', `${_fmt(calc.phi_Vcp)} kN`, calc.phi_Vcp > calc.V_ug));
        frag.appendChild(_divider('Base Plate'));
        frag.appendChild(_row('P<sub>u</sub>', `${_fmt(calc.bp_Pu)} kN`));
        frag.appendChild(_row('t<sub>req</sub> (Bear.)', `${_fmt(calc.bp_t_req_bear)} mm`, calc.bp_t_req_bear < calc.bp_thk));
    } else if (calc.clump_type === 'U Clump') {
        frag.appendChild(_divider('Anchor'));
        frag.appendChild(_row('N<sub>ua</sub>', `${_fmt(calc.N_ua)} kN`));
        frag.appendChild(_row('φN<sub>sa</sub>', `${_fmt(calc.phi_Nsa)} kN`, calc.phi_Nsa > calc.N_ua));
        frag.appendChild(_row('φN<sub>cbg</sub>', `${_fmt(calc.phi_Ncbg)} kN`, calc.phi_Ncbg > calc.N_ug));
        frag.appendChild(_row('φN<sub>pn</sub>', `${_fmt(calc.phi_Npn)} kN`, calc.phi_Npn > calc.N_ua));
        frag.appendChild(_row('V<sub>ua</sub>', `${_fmt(calc.V_ua)} kN`));
        frag.appendChild(_row('φV<sub>sa</sub>', `${_fmt(calc.phi_Vsa)} kN`, calc.phi_Vsa > calc.V_ua));
        frag.appendChild(_row('φV<sub>cbg</sub>', `${_fmt(calc.phi_Vcbg)} kN`, calc.phi_Vcbg > calc.V_ug));
        frag.appendChild(_row('Interaction β', _fmt(calc.interaction), calc.interaction <= 1));
    }
    return frag;
}

// ---- Wind Results ----

function _renderWindGeneral(summary) {
    if (!summary) return _empty('—');
    const frag = document.createDocumentFragment();
    frag.appendChild(_row('Wind Speed', `${_fmt(summary.wind_speed)} m/s`));
    frag.appendChild(_row('Gust Factor', _fmt(summary.gust_factor)));
    frag.appendChild(_row('Imp. Factor', _fmt(summary.Imp_factor)));
    frag.appendChild(_row('K<sub>h</sub>', _fmt(summary.K_h)));
    frag.appendChild(_row('K<sub>ht</sub>', _fmt(summary.K_ht)));
    frag.appendChild(_row('q<sub>h</sub>', `${_fmt(summary.q_h)} kPa`));
    frag.appendChild(_row('C<sub>pw</sub>', _fmt(summary.C_pw)));
    frag.appendChild(_row('C<sub>pl</sub>', _fmt(summary.C_pl)));
    frag.appendChild(_row('C<sub>ps</sub>', _fmt(summary.C_ps)));
    frag.appendChild(_row('P<sub>hi</sub>', `${_fmt(summary.P_hi)} kPa`));
    frag.appendChild(_row('P<sub>hl</sub>', `${_fmt(summary.P_hl)} kPa`));
    frag.appendChild(_row('P<sub>hs</sub>', `${_fmt(summary.P_hs)} kPa`));
    return frag;
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
    const areas = Object.keys(wallResults).map(Number).sort((a, b) => a - b);
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

function updateFacadeResults(catNum, results) {
    _setBody('#facade-glass-body', _renderGlass(results.glass));
    _setBody('#facade-frame-body', _renderFrame(results.frame));
    _setBody('#facade-conn-body', _renderConnection(results.conn));
    _setBody('#facade-anchor-body', _renderAnchorage(results.anchor));
}
