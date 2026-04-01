from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float
from calcs.loading import frame_loads, reaction_forces

def calc_anchorage(anchor: Dict[str, Any], frame: Dict[str, Any], alum_profiles_data: list = None) -> Optional[Dict[str, Any]]:
    if not anchor or not frame:
        return None

    alum_profiles_data = alum_profiles_data or []

    geometry = frame.get("geometry", "regular")
    system_type = frame.get("system_type")
    frame_width = _to_float(frame.get("width"))
    frame_length = _to_float(frame.get("length"))
    tran_spacing = _to_float(frame.get("tran_spacing"))
    frame_type = frame.get("frame_type", "Continuous")
    wind_neg = _to_float(frame.get("wind_neg")) if geometry == "regular" else None
    glass_thk = _to_float(frame.get("glass_thk")) or 0
    reaction_Ry = _to_float(frame.get("reaction_Ry"))
    reaction_Rz = _to_float(frame.get("reaction_Rz"))

    if not frame_width or not frame_length:
        return None

    # Mullion dimensions (used for base plate sizing)
    web_length = None
    flange_length = None
    mullion = frame.get("mullion")

    def find_profile(name, data_list: list) -> Optional[Dict[str, Any]]:
        if not name or not isinstance(name, str):
            return None
        for p in data_list:
            if p.get("profile_name") == name or p.get("profile_name", "").strip() == name.strip():
                return p
        return None

    mullion_profile = find_profile(mullion, alum_profiles_data)
    if mullion_profile:
        web_length = _to_float(mullion_profile.get("web_length"))
        flange_length = _to_float(mullion_profile.get("flange_length"))
    elif isinstance(mullion, dict):
        web_length = _to_float(mullion.get("web_length"))
        flange_length = _to_float(mullion.get("flange_length"))
    elif isinstance(mullion, str):
        if not mullion:
            return None
        try:
            parts = mullion.strip().split()
            dimension_part = parts[-1] if parts else ""
            dimensions = dimension_part.split('x')
            if len(dimensions) != 3:
                return None
            web_length = _to_float(dimensions[0])
            flange_length = _to_float(dimensions[1])
        except (IndexError, ValueError, AttributeError):
            return None

    if not web_length or not flange_length:
        return None

    # Use pre-computed reaction forces from frame result if available;
    # otherwise recalculate for regular geometry (backward compat / report flow)
    if not reaction_Ry or not reaction_Rz:
        if geometry == "regular":
            mul_w_dead, mul_w_wind, _, _ = frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg)
            reaction_Ry, reaction_Rz = reaction_forces(geometry, frame_type, frame_length, mul_w_dead, mul_w_wind, reaction_Ry, reaction_Rz)

    if not reaction_Ry or not reaction_Rz:
        return None
    
    design_Ry = reaction_Ry * 1.6
    design_Rz = reaction_Rz * 1.4
    
    clump_type = anchor.get("clump_type", "Box Clump")
    anchor_dia = _to_float(anchor.get("anchor_dia")) or 12
    embed_depth = _to_float(anchor.get("embed_depth")) or 100
    N_p5 = _to_float(anchor.get("N_p5")) or 30
    h_a = _to_float(anchor.get("h_a")) or 1000
    bp_thk = _to_float(anchor.get("bp_thk")) or 5

    A_seN_lookup = {10: 58.0, 12: 84.3, 16: 156.7}
    A_seN = A_seN_lookup.get(int(anchor_dia)) if anchor_dia is not None else None
    if not A_seN or embed_depth <= 0:
        return None

    result = {
        "clump_type": clump_type,
        "reaction_Ry": round(reaction_Ry, 2),
        "reaction_Rz": round(reaction_Rz, 2),
        "design_Ry": round(design_Ry, 2),
        "design_Rz": round(design_Rz, 2),
        "A_seN": A_seN,
        "N_p5": N_p5,
        "h_a": h_a,
        "bp_thk": bp_thk,
    }

    if clump_type == "Box Clump":
        anchor_nos = _to_float(anchor.get("anchor_nos")) or 4
        C_a1 = _to_float(anchor.get("C_a1")) or 150
        bp_length_N = 250
        bp_width_B = (web_length - 35) if system_type == "Semi-unitized" else (web_length - 10)
        
        # Anchor bolt
        N_ua = 0
        N_ug = 0
        V_ua = design_Ry / anchor_nos
        V_ug = V_ua * 2
        
        s1 = bp_length_N - 2 * 40
        s2 = bp_width_B - 2 * 25
        A_NC = (3 * embed_depth + s1) * (1.5 * embed_depth + s2 + (min(1.5 * embed_depth, C_a1)))
        A_NCO = 9 * embed_depth**2
        phi_Nsa = 0.75 * A_seN * 500 / 1000
        psi_edN = min((0.7 + (0.3 * C_a1) / (1.5 * embed_depth)) , 1.0)
        N_b = 7 * 27.5**0.5 * embed_depth**1.5 / 1000
        phi_Ncbg = 0.65 * (A_NC / A_NCO) * psi_edN * N_b
        phi_Npn = 0.7 * N_p5
        beta_N1 = N_ua / phi_Nsa
        beta_N2 = N_ug / phi_Ncbg
        beta_N3 = N_ua / phi_Npn

        phi_Vsa = 0.65 * 0.6 * A_seN * 500 / 1000
        A_VC = (3 * C_a1 + s1) * (min(h_a, (1.5 * C_a1)))
        A_VCO = 4.5 * C_a1**2
        psi_edV = min((0.7 + (0.3 * 1000) / (1.5 * C_a1)) , 1.0)
        psi_hV = max(((1.5 * C_a1 / h_a)**0.5), 1.0)
        d_a = anchor_dia
        l_e = min(embed_depth, (8 * d_a))
        V_b = 0.6 * (l_e / d_a)**0.2 * d_a**0.5 * 27.5**0.5 * C_a1**1.5 / 1000
        phi_Vcbg = 0.7 * (A_VC / A_VCO) * psi_edV * psi_hV * V_b
        phi_Vcp = (0.7 * 2 * phi_Ncbg) / 0.65
        beta_V1 = V_ua / phi_Vsa
        beta_V2 = V_ug / phi_Vcbg
        beta_V3 = V_ug / phi_Vcp

        beta_N = max(beta_N1, beta_N2, beta_N3)
        beta_V = max(beta_V1, beta_V2, beta_V3)
        beta_NV = beta_N**1.67 + beta_V**1.6
        
        # Base Plate
        bp_d = flange_length - 10
        bp_b = web_length - 40
        bp_m = (bp_length_N - 0.95 * bp_d) / 2
        bp_n = (bp_width_B - 0.95 * bp_b) / 2
        bp_lambda_n = (bp_d * bp_b)**0.5 / 4
        bp_l = max(bp_m, bp_n, bp_lambda_n)
        bp_Pu = design_Rz
        bp_q = bp_Pu * 1000 / bp_length_N
        bp_bearing_Mu = ((bp_q * bp_l**2) / 2) / (1000**2)
        bp_thk_bearing = ((4 * bp_bearing_Mu) / (0.9 * 345 * bp_width_B))**0.5 * 1000
        bp_A1 = bp_Pu * 1000 / (0.65 * 0.85 * 27.5)
        bp_fp_max = min((0.65 * 0.85 * 27.5), (0.65 * 1.7 * 27.5))

        result.update({
            "N_ua": round(N_ua, 2),
            "N_ug": round(N_ug, 2),
            "V_ua": round(V_ua, 2),
            "V_ug": round(V_ug, 2),
            "phi_Nsa": round(phi_Nsa, 2),
            "A_NC": round(A_NC, 1),
            "A_NCO": round(A_NCO, 1),
            "phi_Ncbg": round(phi_Ncbg, 2),
            "phi_Npn": round(phi_Npn, 2),
            "phi_Vsa": round(phi_Vsa, 2),
            "A_VC": round(A_VC, 1),
            "A_VCO": round(A_VCO, 1),
            "phi_Vcbg": round(phi_Vcbg, 2),
            "phi_Vcp": round(phi_Vcp, 2),
            "interaction": round(beta_NV, 2),
            "bp_length": round(bp_length_N, 0),
            "bp_width": round(bp_width_B, 0),
            "bp_Pu": round(bp_Pu, 2),
            "bp_d": round(bp_d, 2),
            "bp_b": round(bp_b, 2),
            "bp_m": round(bp_m, 2),
            "bp_n": round(bp_n, 2),
            "bp_t_req_bear": round(bp_thk_bearing, 2),
            "psi_edN": round(psi_edN, 2),
            "N_b": round(N_b, 2),
            "psi_edV": round(psi_edV, 2),
            "psi_hV": round(psi_hV, 2),
            "l_e": round(l_e, 2),
            "V_b": round(V_b, 2),
            "beta_N1": round(beta_N1, 2),
            "beta_N2": round(beta_N2, 2),
            "beta_N3": round(beta_N3, 2),
            "beta_V1": round(beta_V1, 2),
            "beta_V2": round(beta_V2, 2),
            "beta_V3": round(beta_V3, 2),
            "beta_N": round(beta_N, 2),
            "beta_V": round(beta_V, 2),
            "bp_lambda_n": round(bp_lambda_n, 2),
            "bp_l": round(bp_l, 2),
            "bp_q": round(bp_q, 2),
            "bp_bearing_Mu": round(bp_bearing_Mu, 2),
            "bp_A1": round(bp_A1, 2),
            "bp_fp_max": round(bp_fp_max, 2),
        })
        return result
    
    if clump_type == "U Clump":
        anchor_nos = _to_float(anchor.get("anchor_nos")) or 4
        C_a1 = _to_float(anchor.get("C_a1")) or 60
        bp_length_N = 250
        bp_width_B = 150
        
        # Anchor bolt
        N_ua = design_Ry / anchor_nos
        N_ug = N_ua * anchor_nos
        V_ua = design_Rz / anchor_nos
        V_ug = V_ua * 2

        s1 = bp_length_N - 2 * 40
        s2 = bp_width_B - 2 * 40
        A_NC = (3 * embed_depth + s1) * (min((3 * embed_depth + s2), (2 * C_a1 + s2)))
        A_NCO = 9 * embed_depth**2
        phi_Nsa = 0.75 * A_seN * 500 / 1000
        psi_edN = min((0.7 + (0.3 * C_a1) / (1.5 * embed_depth)) , 1.0)
        N_b = 7 * 27.5**0.5 * embed_depth**1.5 / 1000
        phi_Ncbg = 0.65 * (A_NC / A_NCO) * psi_edN * N_b
        phi_Npn = 0.7 * N_p5
        beta_N1 = N_ua / phi_Nsa
        beta_N2 = N_ug / phi_Ncbg
        beta_N3 = N_ua / phi_Npn

        phi_Vsa = 0.65 * 0.6 * A_seN * 500 / 1000
        A_VC = (3 * C_a1 + s1) * (1.5 * C_a1)
        A_VCO = 4.5 * C_a1**2
        psi_edV = min((0.7 + (0.3 * 1000) / (1.5 * C_a1)) , 1.0)
        psi_hV = max(((1.5 * C_a1 / h_a)**0.5), 1.0)
        d_a = anchor_dia
        l_e = min(embed_depth, (8 * d_a))
        V_b = 0.6 * (l_e / d_a)**0.2 * d_a**0.5 * 27.5**0.5 * C_a1**1.5 / 1000
        phi_Vcbg = 0.7 * (A_VC / A_VCO) * psi_edV * psi_hV * V_b
        phi_Vcp = (0.7 * 2 * phi_Ncbg) / 0.65
        beta_V1 = V_ua / phi_Vsa
        beta_V2 = V_ug / phi_Vcbg
        beta_V3 = V_ug / phi_Vcp

        beta_N = max(beta_N1, beta_N2, beta_N3)
        beta_V = max(beta_V1, beta_V2, beta_V3)
        beta_NV = beta_N**1.67 + beta_V**1.6
        
        # Through bolt
        thr_bolt_dia = _to_float(anchor.get("thr_bolt_dia")) or 10
        fin_e = _to_float(anchor.get("fin_e")) or 70
        fin_thk = _to_float(anchor.get("fin_thk")) or 5
        
        if thr_bolt_dia == 10:
            thr_bolt_AseN = 58.0
        elif thr_bolt_dia == 12:
            thr_bolt_AseN = 84.3
        elif thr_bolt_dia == 16:
            thr_bolt_AseN = 156.7
        else:
            thr_bolt_AseN = None
        
        thr_bolt_nos = 2
        thr_bolt_length = 100
        thr_Vh = design_Ry / (thr_bolt_nos * 2)
        thr_Vv = design_Rz / (thr_bolt_nos * 2)
        thr_Vu = (thr_Vh**2 + thr_Vv**2)**0.5
        thr_Ab = (3.1416 * thr_bolt_dia**2) / 4
        thr_shear_phi_Rn = 0.75 * 280 * thr_Ab / 1000
        thr_bearing_lc = fin_e
        thr_bearing_phi_Rn1 = 0.75 * 1.2 * thr_bearing_lc * fin_thk * 450 / 1000
        thr_bearing_phi_Rn2 = 0.75 * 2.4 * thr_bolt_dia * fin_thk * 450 / 1000
        thr_bearing_phi_Rn = min(thr_bearing_phi_Rn1, thr_bearing_phi_Rn2)
        
        # Fin Plate
        fin_Vh = design_Ry / 2
        fin_Vv = design_Rz / 2
        fin_Vu = (fin_Vh**2 + fin_Vv**2)**0.5
        fin_Mu = fin_Vv * fin_e / 1000
        fin_length = fin_e + 50
        fin_width = bp_width_B
        fin_thk_req = (4 * fin_Mu) / (0.9 * 345 * fin_width**2)
        fin_dh = thr_bolt_dia + 2
        fin_shear_phi_Rn_yield = 0.6 * 345 * fin_width * fin_thk / 1000
        fin_rupture_Anv = (fin_width - thr_bolt_nos * fin_dh) * fin_thk
        fin_shear_phi_Rn_rupture = 0.75 * 0.6 * 450 * fin_rupture_Anv / 1000
        fin_bgv = fin_width - 40
        fin_bnt = 50
        fin_block_Anv = (fin_bgv - ((2 * thr_bolt_nos - 1) * (fin_dh / 2))) * fin_thk
        fin_block_Ant = (fin_bnt - (fin_dh / 2)) * fin_thk
        fin_block_phi_Rn1 = (0.75 * 0.6 * 450 * fin_block_Anv + 450 * fin_block_Ant) / 1000 
        fin_block_phi_Rn2 = (0.75 * 0.6 * 345 * fin_bgv * fin_thk + 450 * fin_block_Ant) / 1000
        fin_block_phi_Rn = min(fin_block_phi_Rn1, fin_block_phi_Rn2)
        
        # Fin weld
        weld_fn = (design_Ry * 1000 / 2) / (fin_width * 2)
        weld_fv = (design_Rz * 1000 / 2) / (fin_width * 2)
        weld_fb = ((design_Rz * 1000 / 2) * fin_e) / ((fin_width**2) / 3)
        weld_fR = (weld_fn**2 + weld_fv**2 + weld_fb**2)**0.5
        weld_phi_Rn = 0.75 * 0.6 * 482.7 * 0.707 * 4
        
        # Base Plate bearing
        bp_d = flange_length + 10
        bp_b = bp_width_B
        bp_m = (bp_length_N - 0.95 * bp_d) / 2
        bp_n = (bp_width_B - 0.8 * bp_b) / 2
        bp_lambda_n = (bp_d * bp_b)**0.5 / 4
        bp_l = max(bp_m, bp_n, bp_lambda_n)
        bp_Pu = design_Ry
        bp_q = bp_Pu * 1000 / bp_length_N
        bp_bearing_Mu = ((bp_q * bp_l**2) / 2) / (1000**2)
        bp_thk_bearing = ((4 * bp_bearing_Mu) / (0.9 * 345 * bp_width_B))**0.5 * 1000
        bp_A1 = bp_Pu * 1000 / (0.65 * 0.85 * 27.5)
        bp_fp_max = min((0.65 * 0.85 * 27.5), (0.65 * 1.7 * 27.5))
        
        # Base Plate tension
        bp_x = ((bp_length_N - bp_d) / 2) - 40
        bp_Beff = min((2 * bp_x), (bp_x + 40))
        bp_tension_Mu = N_ua * bp_x / 1000
        bp_thk_tension = ((4 * bp_tension_Mu * 1000**2) / (0.9 * 345 * bp_Beff))**0.5

        result.update({
            "N_ua": round(N_ua, 2),
            "N_ug": round(N_ug, 2),
            "V_ua": round(V_ua, 2),
            "V_ug": round(V_ug, 2),
            "phi_Nsa": round(phi_Nsa, 2),
            "A_NC": round(A_NC, 1),
            "A_NCO": round(A_NCO, 1),
            "phi_Ncbg": round(phi_Ncbg, 2),
            "phi_Npn": round(phi_Npn, 2),
            "phi_Vsa": round(phi_Vsa, 2),
            "A_VC": round(A_VC, 1),
            "A_VCO": round(A_VCO, 1),
            "phi_Vcbg": round(phi_Vcbg, 2),
            "phi_Vcp": round(phi_Vcp, 2),
            "interaction": round(beta_NV, 2),
            "psi_edN": round(psi_edN, 2),
            "N_b": round(N_b, 2),
            "psi_edV": round(psi_edV, 2),
            "psi_hV": round(psi_hV, 2),
            "l_e": round(l_e, 2),
            "V_b": round(V_b, 2),
            "beta_N1": round(beta_N1, 2),
            "beta_N2": round(beta_N2, 2),
            "beta_N3": round(beta_N3, 2),
            "beta_V1": round(beta_V1, 2),
            "beta_V2": round(beta_V2, 2),
            "beta_V3": round(beta_V3, 2),
            "beta_N": round(beta_N, 2),
            "beta_V": round(beta_V, 2),
            "bolt_Vu": round(thr_Vu, 2),
            "bolt_phi_Rn_shear": round(thr_shear_phi_Rn, 2),
            "bolt_phi_Rn_bear": round(thr_bearing_phi_Rn, 2),
            "thr_Vh": round(thr_Vh, 2),
            "thr_Vv": round(thr_Vv, 2),
            "thr_Ab": round(thr_Ab, 2),
            "thr_bearing_lc": round(thr_bearing_lc, 2),
            "thr_bearing_phi_Rn1": round(thr_bearing_phi_Rn1, 2),
            "thr_bearing_phi_Rn2": round(thr_bearing_phi_Rn2, 2),
            "thr_bolt_AseN": thr_bolt_AseN,
            "thr_bolt_nos": thr_bolt_nos,
            "thr_bolt_length": thr_bolt_length,
            "fin_Vu": round(fin_Vu, 2),
            "fin_Vh": round(fin_Vh, 2),
            "fin_Vv": round(fin_Vv, 2),
            "fin_t_req": round(fin_thk_req, 2),
            "fin_thk": round(fin_thk, 2),
            "fin_phi_Rn_yield": round(fin_shear_phi_Rn_yield, 2),
            "fin_phi_Rn_rupture": round(fin_shear_phi_Rn_rupture, 2),
            "fin_phi_Rn_block": round(fin_block_phi_Rn, 2),
            "fin_Mu": round(fin_Mu, 2),
            "fin_length": round(fin_length, 0),
            "fin_width": round(fin_width, 0),
            "fin_dh": round(fin_dh, 2),
            "fin_rupture_Anv": round(fin_rupture_Anv, 2),
            "fin_bgv": round(fin_bgv, 2),
            "fin_bnt": round(fin_bnt, 2),
            "fin_block_Anv": round(fin_block_Anv, 2),
            "fin_block_Ant": round(fin_block_Ant, 2),
            "fin_block_phi_Rn1": round(fin_block_phi_Rn1, 2),
            "fin_block_phi_Rn2": round(fin_block_phi_Rn2, 2),
            "weld_fn": round(weld_fn, 2),
            "weld_fv": round(weld_fv, 2),
            "weld_fb": round(weld_fb, 2),
            "weld_fR": round(weld_fR, 2),
            "weld_phi_Rn": round(weld_phi_Rn, 2),
            "bp_Pu": round(bp_Pu, 2),
            "bp_d": round(bp_d, 2),
            "bp_b": round(bp_b, 2),
            "bp_m": round(bp_m, 2),
            "bp_n": round(bp_n, 2),
            "bp_t_req_bear": round(bp_thk_bearing, 2),
            "bp_Tu": round(N_ua, 2),
            "bp_x": round(bp_x, 2),
            "bp_Beff": round(bp_Beff, 2),
            "bp_t_req_tension": round(bp_thk_tension, 2),
            "bp_length": round(bp_length_N, 0),
            "bp_width": round(bp_width_B, 0),
            "bp_lambda_n": round(bp_lambda_n, 2),
            "bp_l": round(bp_l, 2),
            "bp_q": round(bp_q, 2),
            "bp_bearing_Mu": round(bp_bearing_Mu, 2),
            "bp_A1": round(bp_A1, 2),
            "bp_fp_max": round(bp_fp_max, 2),
            "bp_tension_Mu": round(bp_tension_Mu, 2),
        })
        return result

    if clump_type == "L Clump":
        front_bp_length_N = _to_float(anchor.get("front_bp_length_N")) or 250
        front_bp_width_B = _to_float(anchor.get("front_bp_width_B")) or 150
        top_bp_length_N = front_bp_length_N
        top_bp_width_B = _to_float(anchor.get("top_bp_width_B")) or 250
        top_anchor_nos = _to_float(anchor.get("top_anchor_nos")) or 2
        front_anchor_nos = 2
        front_C_a1 = _to_float(anchor.get("front_C_a1")) or 60
        top_C_a1 = _to_float(anchor.get("top_C_a1")) or 150
        fin_e = _to_float(anchor.get("fin_e")) or 70
        
        # Anchor bolt
        s1 = top_bp_length_N - 2 * 40
        front_s2 = 0
        if top_anchor_nos == 2:
            top_s2 = 0
            e_t1 = top_C_a1
        else:
            top_s2 = top_bp_width_B - top_C_a1 - 40
            e_t1 = top_C_a1 + top_s2 / 2
        
        e_f2 = (front_bp_width_B / 2) - 40
        e_f1 = min(((h_a / 2) - e_f2), ((front_bp_width_B / 2) - 40))
        e_t2 = fin_e
        
        Bx = (design_Ry * e_f2) / (e_f1 + e_f2)
        Ax = design_Ry - Bx
        By = (design_Rz * (e_t1 + e_t2)) / e_t1
        Ay = design_Rz - By
        
        A_NCO = 9 * embed_depth**2
        d_a = anchor_dia
        l_e = min(embed_depth, (8 * d_a))
        
        # Top anchor
        top_N_ua = 0
        top_N_ug = 0
        top_V_ua = Ax / top_anchor_nos
        top_V_ug = top_V_ua * 2
        
        top_phi_Nsa = 0.75 * A_seN * 500 / 1000
        top_A_NC = (3 * embed_depth + s1) * (1.5 * embed_depth + top_s2 + (min(1.5 * embed_depth, top_C_a1)))
        top_psi_edN = min((0.7 + (0.3 * top_C_a1) / (1.5 * embed_depth)) , 1.0)
        top_N_b = 7 * 27.5**0.5 * embed_depth**1.5 / 1000
        top_phi_Ncbg = 0.65 * (top_A_NC / A_NCO) * top_psi_edN * top_N_b
        top_phi_Npn = 0.7 * N_p5
        top_beta_N1 = top_N_ua / top_phi_Nsa
        top_beta_N2 = top_N_ug / top_phi_Ncbg
        top_beta_N3 = top_N_ua / top_phi_Npn

        top_phi_Vsa = 0.65 * 0.6 * A_seN * 500 / 1000
        top_A_VC = (3 * top_C_a1 + s1) * (min(h_a, (1.5 * top_C_a1)))
        top_A_VCO = 4.5 * top_C_a1**2
        top_psi_edV = min((0.7 + (0.3 * 1000) / (1.5 * top_C_a1)) , 1.0)
        top_psi_hV = max(((1.5 * top_C_a1 / h_a)**0.5), 1.0)
        top_V_b = 0.6 * (l_e / d_a)**0.2 * d_a**0.5 * 27.5**0.5 * top_C_a1**1.5 / 1000
        top_phi_Vcbg = 0.7 * (top_A_VC / top_A_VCO) * top_psi_edV * top_psi_hV * top_V_b
        top_phi_Vcp = (0.7 * 2 * top_phi_Ncbg) / 0.65
        top_beta_V1 = top_V_ua / top_phi_Vsa
        top_beta_V2 = top_V_ug / top_phi_Vcbg
        top_beta_V3 = top_V_ug / top_phi_Vcp

        top_beta_N = max(top_beta_N1, top_beta_N2, top_beta_N3)
        top_beta_V = max(top_beta_V1, top_beta_V2, top_beta_V3)
        top_beta_NV = top_beta_N**1.67 + top_beta_V**1.6
        
        # Front anchor
        front_N_ua = Bx / front_anchor_nos
        front_N_ug = front_N_ua * front_anchor_nos
        front_V_ua = By / front_anchor_nos
        front_V_ug = front_V_ua * front_anchor_nos

        front_phi_Nsa = 0.75 * A_seN * 500 / 1000
        front_A_NC = (3 * embed_depth + s1) * (min((3 * embed_depth + front_s2), (2 * front_C_a1 + front_s2)))
        front_psi_edN = min((0.7 + (0.3 * front_C_a1) / (1.5 * embed_depth)) , 1.0)
        front_N_b = 7 * 27.5**0.5 * embed_depth**1.5 / 1000
        front_phi_Ncbg = 0.65 * (front_A_NC / A_NCO) * front_psi_edN * front_N_b
        front_phi_Npn = 0.7 * N_p5
        front_beta_N1 = front_N_ua / front_phi_Nsa
        front_beta_N2 = front_N_ug / front_phi_Ncbg
        front_beta_N3 = front_N_ua / front_phi_Npn

        front_phi_Vsa = 0.65 * 0.6 * A_seN * 500 / 1000
        front_A_VC = (3 * front_C_a1 + s1) * (1.5 * front_C_a1)
        front_A_VCO = 4.5 * front_C_a1**2
        front_psi_edV = min((0.7 + (0.3 * 1000) / (1.5 * front_C_a1)) , 1.0)
        front_psi_hV = max(((1.5 * front_C_a1 / h_a)**0.5), 1.0)
        front_V_b = 0.6 * (l_e / d_a)**0.2 * d_a**0.5 * 27.5**0.5 * front_C_a1**1.5 / 1000
        front_phi_Vcbg = 0.7 * (front_A_VC / front_A_VCO) * front_psi_edV * front_psi_hV * front_V_b
        front_phi_Vcp = (0.7 * 2 * front_phi_Ncbg) / 0.65
        front_beta_V1 = front_V_ua / front_phi_Vsa
        front_beta_V2 = front_V_ug / front_phi_Vcbg
        front_beta_V3 = front_V_ug / front_phi_Vcp

        front_beta_N = max(front_beta_N1, front_beta_N2, front_beta_N3)
        front_beta_V = max(front_beta_V1, front_beta_V2, front_beta_V3)
        front_beta_NV = front_beta_N**1.67 + front_beta_V**1.6
        
        # Through bolt
        thr_bolt_dia = _to_float(anchor.get("thr_bolt_dia")) or 10
        fin_e = _to_float(anchor.get("fin_e")) or 70
        fin_thk = _to_float(anchor.get("fin_thk")) or 5
        
        if thr_bolt_dia == 10:
            thr_bolt_AseN = 58.0
        elif thr_bolt_dia == 12:
            thr_bolt_AseN = 84.3
        elif thr_bolt_dia == 16:
            thr_bolt_AseN = 156.7
        else:
            thr_bolt_AseN = None
        
        thr_bolt_nos = 2
        thr_bolt_length = 100
        thr_Vh = design_Ry / (thr_bolt_nos * 2)
        thr_Vv = design_Rz / (thr_bolt_nos * 2)
        thr_Vu = (thr_Vh**2 + thr_Vv**2)**0.5
        thr_Ab = (3.1416 * thr_bolt_dia**2) / 4
        thr_shear_phi_Rn = 0.75 * 280 * thr_Ab / 1000
        thr_bearing_lc = fin_e
        thr_bearing_phi_Rn1 = 0.75 * 1.2 * thr_bearing_lc * fin_thk * 450 / 1000
        thr_bearing_phi_Rn2 = 0.75 * 2.4 * thr_bolt_dia * fin_thk * 450 / 1000
        thr_bearing_phi_Rn = min(thr_bearing_phi_Rn1, thr_bearing_phi_Rn2)
        
        # Fin Plate
        fin_Vh = design_Ry / 2
        fin_Vv = design_Rz / 2
        fin_Vu = (fin_Vh**2 + fin_Vv**2)**0.5
        fin_Mu = fin_Vv * fin_e / 1000
        fin_length = fin_e + 50
        fin_width = front_bp_width_B
        fin_thk_req = (4 * fin_Mu) / (0.9 * 345 * fin_width**2)
        fin_dh = thr_bolt_dia + 2
        fin_shear_phi_Rn_yield = 0.6 * 345 * fin_width * fin_thk / 1000
        fin_rupture_Anv = (fin_width - thr_bolt_nos * fin_dh) * fin_thk
        fin_shear_phi_Rn_rupture = 0.75 * 0.6 * 450 * fin_rupture_Anv / 1000
        fin_bgv = fin_width - 40
        fin_bnt = 50
        fin_block_Anv = (fin_bgv - ((2 * thr_bolt_nos - 1) * (fin_dh / 2))) * fin_thk
        fin_block_Ant = (fin_bnt - (fin_dh / 2)) * fin_thk
        fin_block_phi_Rn1 = (0.75 * 0.6 * 450 * fin_block_Anv + 450 * fin_block_Ant) / 1000 
        fin_block_phi_Rn2 = (0.75 * 0.6 * 345 * fin_bgv * fin_thk + 450 * fin_block_Ant) / 1000
        fin_block_phi_Rn = min(fin_block_phi_Rn1, fin_block_phi_Rn2)
        
        # Fin weld
        weld_fn = (design_Ry * 1000 / 2) / (fin_width * 2)
        weld_fv = (design_Rz * 1000 / 2) / (fin_width * 2)
        weld_fb = ((design_Rz * 1000 / 2) * fin_e) / ((fin_width**2) / 3)
        weld_fR = (weld_fn**2 + weld_fv**2 + weld_fb**2)**0.5
        weld_phi_Rn = 0.75 * 0.6 * 482.7 * 0.707 * 4
        
        # Base Plate bearing
        bp_d = flange_length + 10
        bp_b = front_bp_width_B
        bp_m = (front_bp_length_N - 0.95 * bp_d) / 2
        bp_n = (front_bp_width_B - 0.8 * bp_b) / 2
        bp_lambda_n = (bp_d * bp_b)**0.5 / 4
        bp_l = max(bp_m, bp_n, bp_lambda_n)
        bp_Pu = design_Ry
        bp_q = bp_Pu * 1000 / front_bp_length_N
        bp_bearing_Mu = ((bp_q * bp_l**2) / 2) / (1000**2)
        bp_thk_bearing = ((4 * bp_bearing_Mu) / (0.9 * 345 * front_bp_width_B))**0.5 * 1000
        bp_A1 = bp_Pu * 1000 / (0.65 * 0.85 * 27.5)
        bp_fp_max = min((0.65 * 0.85 * 27.5), (0.65 * 1.7 * 27.5))
        
        # Base Plate tension
        bp_x = ((front_bp_length_N - bp_d) / 2) - 40
        bp_Beff = min((2 * bp_x), (bp_x + 40))
        bp_tension_Mu = front_N_ua * bp_x / 1000
        bp_thk_tension = ((4 * bp_tension_Mu * 1000**2) / (0.9 * 345 * bp_Beff))**0.5

        result.update({
            "Bx": round(Bx, 2),
            "Ax": round(Ax, 2),
            "By": round(By, 2),
            "Ay": round(Ay, 2),
            "e_f1": round(e_f1, 2),
            "e_f2": round(e_f2, 2),
            "e_t1": round(e_t1, 2),
            "e_t2": round(e_t2, 2),
            "top_N_ua": round(top_N_ua, 2),
            "top_N_ug": round(top_N_ug, 2),
            "top_V_ua": round(top_V_ua, 2),
            "top_V_ug": round(top_V_ug, 2),
            "top_phi_Nsa": round(top_phi_Nsa, 2),
            "top_A_NC": round(top_A_NC, 1),
            "A_NCO": round(A_NCO, 1),
            "top_phi_Ncbg": round(top_phi_Ncbg, 2),
            "top_phi_Npn": round(top_phi_Npn, 2),
            "top_phi_Vsa": round(top_phi_Vsa, 2),
            "top_A_VC": round(top_A_VC, 1),
            "top_A_VCO": round(top_A_VCO, 1),
            "top_phi_Vcbg": round(top_phi_Vcbg, 2),
            "top_phi_Vcp": round(top_phi_Vcp, 2),
            "top_interaction": round(top_beta_NV, 2),
            "top_psi_edN": round(top_psi_edN, 2),
            "top_N_b": round(top_N_b, 2),
            "top_psi_edV": round(top_psi_edV, 2),
            "top_psi_hV": round(top_psi_hV, 2),
            "l_e": round(l_e, 2),
            "top_V_b": round(top_V_b, 2),
            "top_beta_N1": round(top_beta_N1, 2),
            "top_beta_N2": round(top_beta_N2, 2),
            "top_beta_N3": round(top_beta_N3, 2),
            "top_beta_V1": round(top_beta_V1, 2),
            "top_beta_V2": round(top_beta_V2, 2),
            "top_beta_V3": round(top_beta_V3, 2),
            "top_beta_N": round(top_beta_N, 2),
            "top_beta_V": round(top_beta_V, 2),
            "front_N_ua": round(front_N_ua, 2),
            "front_N_ug": round(front_N_ug, 2),
            "front_V_ua": round(front_V_ua, 2),
            "front_V_ug": round(front_V_ug, 2),
            "front_phi_Nsa": round(front_phi_Nsa, 2),
            "front_A_NC": round(front_A_NC, 1),
            "front_phi_Ncbg": round(front_phi_Ncbg, 2),
            "front_phi_Npn": round(front_phi_Npn, 2),
            "front_phi_Vsa": round(front_phi_Vsa, 2),
            "front_A_VC": round(front_A_VC, 1),
            "front_psi_edN": round(front_psi_edN, 2),
            "front_N_b": round(front_N_b, 2),
            "front_psi_edV": round(front_psi_edV, 2),
            "front_psi_hV": round(front_psi_hV, 2),
            "front_V_b": round(front_V_b, 2),
            "front_beta_N1": round(front_beta_N1, 2),
            "front_beta_N2": round(front_beta_N2, 2),
            "front_beta_N3": round(front_beta_N3, 2),
            "front_beta_V1": round(front_beta_V1, 2),
            "front_beta_V2": round(front_beta_V2, 2),
            "front_beta_V3": round(front_beta_V3, 2),
            "front_beta_N": round(front_beta_N, 2),
            "front_beta_V": round(front_beta_V, 2),
            "front_A_VCO": round(front_A_VCO, 1),
            "front_phi_Vcbg": round(front_phi_Vcbg, 2),
            "front_phi_Vcp": round(front_phi_Vcp, 2),
            "front_interaction": round(front_beta_NV, 2),
            "bolt_Vu": round(thr_Vu, 2),
            "bolt_phi_Rn_shear": round(thr_shear_phi_Rn, 2),
            "bolt_phi_Rn_bear": round(thr_bearing_phi_Rn, 2),
            "thr_Vh": round(thr_Vh, 2),
            "thr_Vv": round(thr_Vv, 2),
            "thr_Ab": round(thr_Ab, 2),
            "thr_bearing_lc": round(thr_bearing_lc, 2),
            "thr_bearing_phi_Rn1": round(thr_bearing_phi_Rn1, 2),
            "thr_bearing_phi_Rn2": round(thr_bearing_phi_Rn2, 2),
            "thr_bolt_AseN": thr_bolt_AseN,
            "thr_bolt_nos": thr_bolt_nos,
            "thr_bolt_length": thr_bolt_length,
            "fin_Vu": round(fin_Vu, 2),
            "fin_Vh": round(fin_Vh, 2),
            "fin_Vv": round(fin_Vv, 2),
            "fin_t_req": round(fin_thk_req, 2),
            "fin_thk": round(fin_thk, 2),
            "fin_phi_Rn_yield": round(fin_shear_phi_Rn_yield, 2),
            "fin_phi_Rn_rupture": round(fin_shear_phi_Rn_rupture, 2),
            "fin_phi_Rn_block": round(fin_block_phi_Rn, 2),
            "fin_Mu": round(fin_Mu, 2),
            "fin_length": round(fin_length, 0),
            "fin_width": round(fin_width, 0),
            "fin_dh": round(fin_dh, 2),
            "fin_rupture_Anv": round(fin_rupture_Anv, 2),
            "fin_bgv": round(fin_bgv, 2),
            "fin_bnt": round(fin_bnt, 2),
            "fin_block_Anv": round(fin_block_Anv, 2),
            "fin_block_Ant": round(fin_block_Ant, 2),
            "fin_block_phi_Rn1": round(fin_block_phi_Rn1, 2),
            "fin_block_phi_Rn2": round(fin_block_phi_Rn2, 2),
            "weld_fn": round(weld_fn, 2),
            "weld_fv": round(weld_fv, 2),
            "weld_fb": round(weld_fb, 2),
            "weld_fR": round(weld_fR, 2),
            "weld_phi_Rn": round(weld_phi_Rn, 2),
            "bp_Pu": round(bp_Pu, 2),
            "bp_d": round(bp_d, 2),
            "bp_b": round(bp_b, 2),
            "bp_m": round(bp_m, 2),
            "bp_n": round(bp_n, 2),
            "bp_t_req_bear": round(bp_thk_bearing, 2),
            "bp_Tu": round(front_N_ua, 2),
            "bp_x": round(bp_x, 2),
            "bp_Beff": round(bp_Beff, 2),
            "bp_t_req_tension": round(bp_thk_tension, 2),
            "top_bp_length": top_bp_length_N,
            "top_bp_width": round(top_bp_width_B, 0),
            "front_bp_length": round(front_bp_length_N, 0),
            "front_bp_width": round(front_bp_width_B, 0),
            "bp_lambda_n": round(bp_lambda_n, 2),
            "bp_l": round(bp_l, 2),
            "bp_q": round(bp_q, 2),
            "bp_bearing_Mu": round(bp_bearing_Mu, 2),
            "bp_A1": round(bp_A1, 2),
            "bp_fp_max": round(bp_fp_max, 2),
            "bp_tension_Mu": round(bp_tension_Mu, 2),
        })
        return result

    return result
