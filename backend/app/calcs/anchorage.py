import math
from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float
from calcs.loading import frame_loads, reaction_forces

# Material constants (MPa)
ANCHOR_STEEL_FY = 500
CONCRETE_FC = 27.5
BASE_PLATE_FY = 345
FIN_PLATE_FU = 450
WELD_ELECTRODE_FU = 482.7
THROUGH_BOLT_FY = 280
ANCHOR_STRESS_AREA = {10: 58.0, 12: 84.3, 16: 156.7}
BP_DEFAULT_LENGTH = 250

# ---- Shared Helpers ----

def _anchor_bolt(N_ua, V_ua, N_ug, V_ug, A_seN, embed_depth, C_a1, s1, s2, h_a, d_a, N_p5):
    """Anchor bolt: tension + shear + interaction ratios."""
    A_NCO = 9 * embed_depth**2

    # Tension
    phi_Nsa = 0.75 * A_seN * ANCHOR_STEEL_FY / 1000
    A_NC = (3 * embed_depth + s1) * (1.5 * embed_depth + s2 + min(1.5 * embed_depth, C_a1))
    psi_edN = min(0.7 + (0.3 * C_a1) / (1.5 * embed_depth), 1.0)
    N_b = 7 * CONCRETE_FC**0.5 * embed_depth**1.5 / 1000
    phi_Ncbg = 0.65 * (A_NC / A_NCO) * psi_edN * N_b
    phi_Npn = 0.7 * N_p5

    # Shear
    phi_Vsa = 0.65 * 0.6 * A_seN * ANCHOR_STEEL_FY / 1000
    A_VC = (3 * C_a1 + s1) * min(h_a, 1.5 * C_a1)
    A_VCO = 4.5 * C_a1**2
    psi_edV = min(0.7 + (0.3 * 1000) / (1.5 * C_a1), 1.0)
    psi_hV = max((1.5 * C_a1 / h_a)**0.5, 1.0)
    l_e = min(embed_depth, 8 * d_a)
    V_b = 0.6 * (l_e / d_a)**0.2 * d_a**0.5 * CONCRETE_FC**0.5 * C_a1**1.5 / 1000
    phi_Vcbg = 0.7 * (A_VC / A_VCO) * psi_edV * psi_hV * V_b
    phi_Vcp = (0.7 * 2 * phi_Ncbg) / 0.65

    # Interaction
    beta_N1 = N_ua / phi_Nsa if phi_Nsa else 0
    beta_N2 = N_ug / phi_Ncbg if phi_Ncbg else 0
    beta_N3 = N_ua / phi_Npn if phi_Npn else 0
    beta_V1 = V_ua / phi_Vsa if phi_Vsa else 0
    beta_V2 = V_ug / phi_Vcbg if phi_Vcbg else 0
    beta_V3 = V_ug / phi_Vcp if phi_Vcp else 0

    beta_N = max(beta_N1, beta_N2, beta_N3)
    beta_V = max(beta_V1, beta_V2, beta_V3)
    beta_NV = beta_N**1.67 + beta_V**1.6

    return {
        "phi_Nsa": round(phi_Nsa, 2),
        "A_NC": round(A_NC, 1),
        "A_NCO": round(A_NCO, 1),
        "phi_Ncbg": round(phi_Ncbg, 2),
        "phi_Npn": round(phi_Npn, 2),
        "psi_edN": round(psi_edN, 2),
        "N_b": round(N_b, 2),
        "phi_Vsa": round(phi_Vsa, 2),
        "A_VC": round(A_VC, 1),
        "A_VCO": round(A_VCO, 1),
        "phi_Vcbg": round(phi_Vcbg, 2),
        "phi_Vcp": round(phi_Vcp, 2),
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
        "interaction": round(beta_NV, 2),
    }


def _through_bolt(bolt_dia, design_Ry, design_Rz, fin_e, fin_thk):
    """Through bolt: shear + bearing capacity."""
    AseN = ANCHOR_STRESS_AREA.get(int(bolt_dia))
    bolt_nos = 2
    Vh = design_Ry / (bolt_nos * 2)
    Vv = design_Rz / (bolt_nos * 2)
    Vu = (Vh**2 + Vv**2)**0.5
    Ab = 3.1416 * bolt_dia**2 / 4
    phi_Rn_shear = 0.75 * THROUGH_BOLT_FY * Ab / 1000
    bearing_phi_Rn1 = 0.75 * 1.2 * fin_e * fin_thk * FIN_PLATE_FU / 1000
    bearing_phi_Rn2 = 0.75 * 2.4 * bolt_dia * fin_thk * FIN_PLATE_FU / 1000
    phi_Rn_bear = min(bearing_phi_Rn1, bearing_phi_Rn2)

    return {
        "bolt_Vu": round(Vu, 2),
        "bolt_phi_Rn_shear": round(phi_Rn_shear, 2),
        "bolt_phi_Rn_bear": round(phi_Rn_bear, 2),
        "thr_Vh": round(Vh, 2),
        "thr_Vv": round(Vv, 2),
        "thr_Ab": round(Ab, 2),
        "thr_bearing_lc": round(fin_e, 2),
        "thr_bearing_phi_Rn1": round(bearing_phi_Rn1, 2),
        "thr_bearing_phi_Rn2": round(bearing_phi_Rn2, 2),
        "thr_bolt_AseN": AseN,
        "thr_bolt_nos": bolt_nos,
        "thr_bolt_length": 100,
    }


def _fin_plate(bolt_dia, design_Ry, design_Rz, fin_e, fin_thk, fin_width, bolt_nos=2):
    """Fin plate: shear yield/rupture/block, moment."""
    Vh = design_Ry / 2
    Vv = design_Rz / 2
    Vu = (Vh**2 + Vv**2)**0.5
    Mu = Vv * fin_e / 1000
    length = fin_e + 50
    thk_req = math.sqrt(4 * Mu * 1e6 / (0.9 * BASE_PLATE_FY * fin_width)) if fin_width else 0
    dh = bolt_dia + 2

    phi_Rn_yield = 0.6 * BASE_PLATE_FY * fin_width * fin_thk / 1000
    rupture_Anv = (fin_width - bolt_nos * dh) * fin_thk
    phi_Rn_rupture = 0.75 * 0.6 * FIN_PLATE_FU * rupture_Anv / 1000
    bgv = fin_width - 40
    bnt = 50
    block_Anv = (bgv - ((2 * bolt_nos - 1) * (dh / 2))) * fin_thk
    block_Ant = (bnt - (dh / 2)) * fin_thk
    block_phi_Rn1 = (0.75 * 0.6 * FIN_PLATE_FU * block_Anv + FIN_PLATE_FU * block_Ant) / 1000
    block_phi_Rn2 = (0.75 * 0.6 * BASE_PLATE_FY * bgv * fin_thk + FIN_PLATE_FU * block_Ant) / 1000
    block_phi_Rn = min(block_phi_Rn1, block_phi_Rn2)

    return {
        "fin_Vu": round(Vu, 2),
        "fin_Vh": round(Vh, 2),
        "fin_Vv": round(Vv, 2),
        "fin_t_req": round(thk_req, 2),
        "fin_thk": round(fin_thk, 2),
        "fin_phi_Rn_yield": round(phi_Rn_yield, 2),
        "fin_phi_Rn_rupture": round(phi_Rn_rupture, 2),
        "fin_phi_Rn_block": round(block_phi_Rn, 2),
        "fin_Mu": round(Mu, 2),
        "fin_length": round(length, 0),
        "fin_width": round(fin_width, 0),
        "fin_dh": round(dh, 2),
        "fin_rupture_Anv": round(rupture_Anv, 2),
        "fin_bgv": round(bgv, 2),
        "fin_bnt": round(bnt, 2),
        "fin_block_Anv": round(block_Anv, 2),
        "fin_block_Ant": round(block_Ant, 2),
        "fin_block_phi_Rn1": round(block_phi_Rn1, 2),
        "fin_block_phi_Rn2": round(block_phi_Rn2, 2),
    }


def _fin_weld(design_Ry, design_Rz, fin_e, fin_width):
    """Fin weld: combined stress."""
    fn = (design_Ry * 1000 / 2) / (fin_width * 2)
    fv = (design_Rz * 1000 / 2) / (fin_width * 2)
    fb = ((design_Rz * 1000 / 2) * fin_e) / (fin_width**2 / 3)
    fR = (fn**2 + fv**2 + fb**2)**0.5
    phi_Rn = 0.75 * 0.6 * WELD_ELECTRODE_FU * 0.707 * 4

    return {
        "weld_fn": round(fn, 2),
        "weld_fv": round(fv, 2),
        "weld_fb": round(fb, 2),
        "weld_fR": round(fR, 2),
        "weld_phi_Rn": round(phi_Rn, 2),
    }


def _base_plate_bearing(bp_length, bp_width, bp_d, bp_b, design_Rz):
    """Base plate bearing: thickness from bending."""
    bp_m = (bp_length - 0.95 * bp_d) / 2
    bp_n = (bp_width - 0.8 * bp_b) / 2
    bp_lambda_n = (bp_d * bp_b)**0.5 / 4
    bp_l = max(bp_m, bp_n, bp_lambda_n)
    bp_Pu = design_Rz
    bp_q = bp_Pu * 1000 / bp_length
    bearing_Mu = (bp_q * bp_l**2 / 2) / 1000**2
    thk_bearing = (4 * bearing_Mu / (0.9 * BASE_PLATE_FY * bp_width))**0.5 * 1000 if bp_width else 0
    bp_A1 = bp_Pu * 1000 / (0.65 * 0.85 * CONCRETE_FC)
    fp_max = min(0.65 * 0.85 * CONCRETE_FC, 0.65 * 1.7 * CONCRETE_FC)

    return {
        "bp_Pu": round(bp_Pu, 2),
        "bp_d": round(bp_d, 2),
        "bp_b": round(bp_b, 2),
        "bp_m": round(bp_m, 2),
        "bp_n": round(bp_n, 2),
        "bp_lambda_n": round(bp_lambda_n, 2),
        "bp_l": round(bp_l, 2),
        "bp_q": round(bp_q, 2),
        "bp_bearing_Mu": round(bearing_Mu, 2),
        "bp_t_req_bear": round(thk_bearing, 2),
        "bp_A1": round(bp_A1, 2),
        "bp_fp_max": round(fp_max, 2),
    }


def _base_plate_tension(bp_length, bp_d, bp_Beff, N_ua):
    """Base plate tension: thickness from cantilever."""
    bp_x = ((bp_length - bp_d) / 2) - 40
    Beff = min(2 * bp_x, bp_x + 40)
    tension_Mu = N_ua * bp_x / 1000
    thk_tension = (4 * tension_Mu * 1000**2 / (0.9 * BASE_PLATE_FY * Beff))**0.5 if Beff else 0

    return {
        "bp_x": round(bp_x, 2),
        "bp_Beff": round(Beff, 2),
        "bp_tension_Mu": round(tension_Mu, 2),
        "bp_t_req_tension": round(thk_tension, 2),
    }


def _find_profile(name, data_list):
    """Find profile by name in a list of profile dicts."""
    if not name or not isinstance(name, str):
        return None
    for p in data_list:
        if p.get("profile_name", "").strip() == name.strip():
            return p
    return None


def _get_mullion_dims(mullion, alum_profiles_data):
    """Extract web_length and flange_length from mullion data."""
    profile = _find_profile(mullion, alum_profiles_data)
    if profile:
        return _to_float(profile.get("web_length")), _to_float(profile.get("flange_length"))
    if isinstance(mullion, dict):
        return _to_float(mullion.get("web_length")), _to_float(mullion.get("flange_length"))
    if isinstance(mullion, str) and mullion:
        try:
            dims = mullion.strip().split()[-1].split('x')
            if len(dims) == 3:
                return _to_float(dims[0]), _to_float(dims[1])
        except (IndexError, ValueError, AttributeError):
            pass
    return None, None


# ---- Main Entry Point ----

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

    web_length, flange_length = _get_mullion_dims(frame.get("mullion"), alum_profiles_data)
    if not web_length or not flange_length:
        return None

    # Recalculate reactions if not pre-computed (only when values are None, not zero)
    if reaction_Ry is None or reaction_Rz is None:
        if geometry == "regular":
            mul_w_dead, mul_w_wind, _, _ = frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg)
            reaction_Ry, reaction_Rz = reaction_forces(geometry, frame_type, frame_length, mul_w_dead, mul_w_wind, reaction_Ry, reaction_Rz)

    # Require at least wind reaction; dead reaction (Rz) can be zero
    if not reaction_Ry:
        return None
    if reaction_Rz is None:
        reaction_Rz = 0.0

    design_Ry = reaction_Ry * 1.6
    design_Rz = reaction_Rz * 1.4

    clump_type = anchor.get("clump_type", "Box Clump")
    anchor_dia = _to_float(anchor.get("anchor_dia")) or 12
    embed_depth = _to_float(anchor.get("embed_depth")) or 100
    N_p5 = _to_float(anchor.get("N_p5")) or 30
    h_a = _to_float(anchor.get("h_a")) or 1000
    bp_thk = _to_float(anchor.get("bp_thk")) or 5

    A_seN = ANCHOR_STRESS_AREA.get(int(anchor_dia))
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
        bp_width_B = (web_length - 35) if system_type == "Semi-unitized" else (web_length - 10)

        N_ua, N_ug = 0, 0
        V_ua = design_Ry / anchor_nos
        V_ug = V_ua * 2

        s1 = BP_DEFAULT_LENGTH - 2 * 40
        s2 = bp_width_B - 2 * 25

        result.update(_anchor_bolt(N_ua, V_ua, N_ug, V_ug, A_seN, embed_depth, C_a1, s1, s2, h_a, anchor_dia, N_p5))
        result.update({"N_ua": round(N_ua, 2), "N_ug": round(N_ug, 2), "V_ua": round(V_ua, 2), "V_ug": round(V_ug, 2)})

        bp_d = flange_length - 10
        bp_b = web_length - 40
        result.update(_base_plate_bearing(BP_DEFAULT_LENGTH, bp_width_B, bp_d, bp_b, design_Rz))
        result.update({"bp_length": round(BP_DEFAULT_LENGTH, 0), "bp_width": round(bp_width_B, 0)})
        return result

    if clump_type == "U Clump":
        anchor_nos = _to_float(anchor.get("anchor_nos")) or 4
        C_a1 = _to_float(anchor.get("C_a1")) or 60
        bp_width_B = 150

        N_ua = design_Ry / anchor_nos
        N_ug = N_ua * anchor_nos
        V_ua = design_Rz / anchor_nos
        V_ug = V_ua * 2

        s1 = BP_DEFAULT_LENGTH - 2 * 40
        s2 = bp_width_B - 2 * 40

        result.update(_anchor_bolt(N_ua, V_ua, N_ug, V_ug, A_seN, embed_depth, C_a1, s1, s2, h_a, anchor_dia, N_p5))
        result.update({"N_ua": round(N_ua, 2), "N_ug": round(N_ug, 2), "V_ua": round(V_ua, 2), "V_ug": round(V_ug, 2)})

        thr_bolt_dia = _to_float(anchor.get("thr_bolt_dia")) or 10
        fin_e = _to_float(anchor.get("fin_e")) or 70
        fin_thk = _to_float(anchor.get("fin_thk")) or 5

        result.update(_through_bolt(thr_bolt_dia, design_Ry, design_Rz, fin_e, fin_thk))
        result.update(_fin_plate(thr_bolt_dia, design_Ry, design_Rz, fin_e, fin_thk, bp_width_B))
        result.update(_fin_weld(design_Ry, design_Rz, fin_e, bp_width_B))

        bp_d = flange_length + 10
        result.update(_base_plate_bearing(BP_DEFAULT_LENGTH, bp_width_B, bp_d, bp_width_B, design_Ry))
        result.update(_base_plate_tension(BP_DEFAULT_LENGTH, bp_d, 0, N_ua))
        result.update({"bp_Tu": round(N_ua, 2), "bp_length": round(BP_DEFAULT_LENGTH, 0), "bp_width": round(bp_width_B, 0)})
        return result

    if clump_type == "L Clump":
        front_bp_length = _to_float(anchor.get("front_bp_length_N")) or 250
        front_bp_width = _to_float(anchor.get("front_bp_width_B")) or 150
        top_bp_width = _to_float(anchor.get("top_bp_width_B")) or 250
        top_anchor_nos = _to_float(anchor.get("top_anchor_nos")) or 2
        front_C_a1 = _to_float(anchor.get("front_C_a1")) or 60
        top_C_a1 = _to_float(anchor.get("top_C_a1")) or 150
        fin_e = _to_float(anchor.get("fin_e")) or 70

        s1 = front_bp_length - 2 * 40
        front_s2 = 0
        if top_anchor_nos == 2:
            top_s2 = 0
            e_t1 = top_C_a1
        else:
            top_s2 = top_bp_width - top_C_a1 - 40
            e_t1 = top_C_a1 + top_s2 / 2

        e_f2 = (front_bp_width / 2) - 40
        e_f1 = min((h_a / 2) - e_f2, (front_bp_width / 2) - 40)
        e_t2 = fin_e

        Bx = (design_Ry * e_f2) / (e_f1 + e_f2)
        Ax = design_Ry - Bx
        By = (design_Rz * (e_t1 + e_t2)) / e_t1
        Ay = design_Rz - By

        result.update({"Bx": round(Bx, 2), "Ax": round(Ax, 2), "By": round(By, 2), "Ay": round(Ay, 2),
                        "e_f1": round(e_f1, 2), "e_f2": round(e_f2, 2), "e_t1": round(e_t1, 2), "e_t2": round(e_t2, 2)})

        # Top anchor
        top_N_ua, top_N_ug = 0, 0
        top_V_ua = Ax / top_anchor_nos
        top_V_ug = top_V_ua * 2
        top_result = _anchor_bolt(top_N_ua, top_V_ua, top_N_ug, top_V_ug, A_seN, embed_depth, top_C_a1, s1, top_s2, h_a, anchor_dia, N_p5)
        result.update({f"top_{k}": v for k, v in top_result.items()})
        result.update({"top_N_ua": round(top_N_ua, 2), "top_N_ug": round(top_N_ug, 2),
                        "top_V_ua": round(top_V_ua, 2), "top_V_ug": round(top_V_ug, 2),
                        "top_interaction": top_result["interaction"]})

        # Front anchor
        front_N_ua = Bx / 2
        front_N_ug = front_N_ua * 2
        front_V_ua = By / 2
        front_V_ug = front_V_ua * 2
        front_result = _anchor_bolt(front_N_ua, front_V_ua, front_N_ug, front_V_ug, A_seN, embed_depth, front_C_a1, s1, front_s2, h_a, anchor_dia, N_p5)
        result.update({f"front_{k}": v for k, v in front_result.items()})
        result.update({"front_N_ua": round(front_N_ua, 2), "front_N_ug": round(front_N_ug, 2),
                        "front_V_ua": round(front_V_ua, 2), "front_V_ug": round(front_V_ug, 2),
                        "front_interaction": front_result["interaction"]})

        thr_bolt_dia = _to_float(anchor.get("thr_bolt_dia")) or 10
        fin_thk = _to_float(anchor.get("fin_thk")) or 5

        result.update(_through_bolt(thr_bolt_dia, design_Ry, design_Rz, fin_e, fin_thk))
        result.update(_fin_plate(thr_bolt_dia, design_Ry, design_Rz, fin_e, fin_thk, front_bp_width))
        result.update(_fin_weld(design_Ry, design_Rz, fin_e, front_bp_width))

        bp_d = flange_length + 10
        result.update(_base_plate_bearing(front_bp_length, front_bp_width, bp_d, front_bp_width, design_Ry))
        result.update(_base_plate_tension(front_bp_length, bp_d, 0, front_N_ua))
        result.update({"bp_Tu": round(front_N_ua, 2),
                        "bp_length": round(front_bp_length, 0), "bp_width": round(front_bp_width, 0),
                        "top_bp_length": front_bp_length, "top_bp_width": round(top_bp_width, 0),
                        "front_bp_length": round(front_bp_length, 0), "front_bp_width": round(front_bp_width, 0)})
        return result

    return result
