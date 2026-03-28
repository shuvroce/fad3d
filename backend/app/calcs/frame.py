from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float
from calcs.alum_profile import calc_alum_profile
from calcs.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile
from calcs.loading import frame_loads, joint_forces, reaction_forces

def _profile_props(payload, calc_fn):
    """Return computed section props, preferring modal-cached values over recalculation."""
    computed = {
        "phi_Mn": _to_float(payload.get("computed_phi_Mn")),
        "I_xx":   _to_float(payload.get("computed_I_xx")),
        "I_yy":   _to_float(payload.get("computed_I_yy")),
    }
    if all(v is not None for v in computed.values()):
        return computed
    return calc_fn(payload)


def calc_frame(frame: Dict[str, Any], alum_profiles: list = None, steel_profiles: list = None) -> Optional[Dict[str, Any]]:
    if not frame or alum_profiles is None:
        return None

    alum_profiles = alum_profiles or []
    steel_profiles = steel_profiles or []

    mullion = frame.get("mullion")
    transom = frame.get("transom")
    steel = frame.get("steel") or {}

    steel_profile_type = steel.get("profile_type")

    mullion_profile = _profile_props(mullion, calc_alum_profile) if mullion else None
    transom_profile = _profile_props(transom, calc_alum_profile) if transom else None
    if steel_profile_type == "rhs":
        steel_profile = _profile_props(steel, calc_steel_rhs_profile) if steel else None
    else:
        steel_profile = _profile_props(steel, calc_steel_iw_profile) if steel else None

    # Extract dimensions
    frame_width = _to_float(frame.get("width"))
    frame_length = _to_float(frame.get("length"))
    wind_neg = _to_float(frame.get("wind_neg")) or 0
    tran_spacing = _to_float(frame.get("tran_spacing")) or frame_length
    geometry = frame.get("geometry", "regular")
    mullion_type = frame.get("mullion_type", "Aluminum Only")
    frame_type = frame.get("frame_type", "Continuous")
    glass_thk = _to_float(frame.get("glass_thk")) or 0
    mul_mu = _to_float(frame.get("mul_mu")) or 0
    mul_vu = _to_float(frame.get("mul_vu")) or 0
    mul_def = _to_float(frame.get("mul_def")) or 0
    tran_mu = _to_float(frame.get("tran_mu")) or 0
    tran_vu = _to_float(frame.get("tran_vu")) or 0
    tran_def_wind = _to_float(frame.get("tran_def_wind")) or 0
    tran_def_dead = _to_float(frame.get("tran_def_dead")) or 0
    joint_fy = _to_float(frame.get("joint_fy")) or 0
    joint_fz = _to_float(frame.get("joint_fz")) or 0
    reaction_Ry = _to_float(frame.get("reaction_Ry")) or 0
    reaction_Rz = _to_float(frame.get("reaction_Rz")) or 0
    
    glass_sw = glass_thk * 0.025
    acc_sw = glass_sw * 0.3
    
    if not all([frame_width, frame_length]):
        return None

    if frame_type == "Floor-to-floor":
        eff_area = max(frame_length * frame_width, frame_length**2 / 3) / 1000**2
    else:  # Continuous
        _frame_length = frame_length * 2
        eff_area = max(_frame_length * frame_width, _frame_length**2 / 3) / 1000**2

    # Deflection limits
    if frame_length <= 4100:
        mul_allow_def = frame_length / 175
    else:
        mul_allow_def = (frame_length / 240) + 6.35
    tran_allow_def = frame_width / 175
    
    mul_w_dead, mul_w_wind, tran_w_dead, tran_w_wind = frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg)


    # Mullion
    mul_mu = round(1.6 * mul_w_wind * (frame_length / 1000) ** 2 / 8, 2) if geometry == "regular" else mul_mu
    
    if frame_type == "Floor-to-floor":
        mul_vu = round(1.6 * mul_w_wind * (frame_length / 1000) / 2, 2) if geometry == "regular" else mul_vu
    elif frame_type == "Continuous":
        mul_vu = round(1.6 * mul_w_wind * (frame_length / 1000) * (5 / 8), 2) if geometry == "regular" else mul_vu
    else:
        mul_vu = 0
    
    # Aluminum + Steel
    if mullion_type == "Aluminum + Steel":
        mul_Ix_a = mullion_profile.get("I_xx", 0.001) if mullion_profile else 0.001
        mul_phi_Mn_a = mullion_profile.get("phi_Mn", 0.001) if mullion_profile else 0.001

        # Steel moment of inertia from calculated steel profile
        if steel_profile:
            sp_I_xx = steel_profile.get("I_xx", 0.001)
            mul_phi_Mn_s = steel_profile.get("phi_Mn", 0.001)
        else:
            sp_I_xx = 0.001
            mul_phi_Mn_s = 0.001

        mul_Ix = mul_Ix_a + 3 * sp_I_xx
        ls_a = mul_Ix_a / mul_Ix if mul_Ix else 0.001
        ls_s = 1 - ls_a
        
        mul_mu_a = (mul_mu * ls_a) if mul_mu is not None else None
        mul_mu_s = (mul_mu * ls_s) if mul_mu is not None else None
        mul_dc_a = round(mul_mu_a / mul_phi_Mn_a, 2) if (mul_mu_a is not None and mul_phi_Mn_a) else None
        mul_dc_s = round(mul_mu_s / mul_phi_Mn_s, 2) if (mul_mu_s is not None and mul_phi_Mn_s) else None
        I_xa = mul_Ix_a
        I_xs = sp_I_xx
    else:
        mul_Ix = mullion_profile.get("I_xx", 0.001) if mullion_profile else 0.001
        mul_phi_Mn = mullion_profile.get("phi_Mn", 0.001) if mullion_profile else 0.001
        mul_dc = round(mul_mu / mul_phi_Mn, 2) if (mul_mu is not None and mul_phi_Mn) else None
        mul_dc_a = None
        mul_dc_s = None
        I_xa = None
        I_xs = None
        ls_a = None
        ls_s = None

    if frame_type == "Floor-to-floor":
        mul_def = (5 * 0.7 * mul_w_wind * frame_length**4) / (384 * 70000 * mul_Ix) if geometry == "regular" else mul_def
    elif frame_type == "Continuous":
        mul_def = (0.7 * mul_w_wind * frame_length**4) / (185 * 70000 * mul_Ix) if geometry == "regular" else mul_def
    
    
    # Transom
    tran_Ix = transom_profile.get("I_xx", 0.001) if transom_profile else 0.001
    tran_Iy = transom_profile.get("I_yy", 0.001) if transom_profile else 0.001
    tran_mu = round(1.6 * tran_w_wind * (frame_width / 1000) ** 2 / 12, 2) if geometry == "regular" else tran_mu
    tran_vu = round(1.6 * tran_w_wind * (frame_width / 1000) / 4, 2) if geometry == "regular" else tran_vu
    tran_phi_Mn = transom_profile.get("phi_Mn", 0.001) if transom_profile else 0.001
    tran_dc = round(tran_mu / tran_phi_Mn, 2) if (tran_mu is not None and tran_phi_Mn) else None
    tran_def_wind = (5 * 0.7 * tran_w_wind * frame_width**4) / (384 * 70000 * tran_Ix) if geometry == "regular" else tran_def_wind
    tran_def_dead = (5 * 0.7 * tran_w_dead * frame_width**4) / (384 * 70000 * tran_Iy) if geometry == "regular" else tran_def_dead
    
    # Calculate joint forces and reaction
    joint_fy, joint_fz = joint_forces(geometry, frame_width, tran_w_dead, tran_w_wind, joint_fy, joint_fz)
    reaction_Ry, reaction_Rz = reaction_forces(geometry, frame_type, frame_length, mul_w_dead, mul_w_wind, reaction_Ry, reaction_Rz)
    
    return {
        "frame_type": frame_type,
        "mullion_type": mullion_type,
        "mullion": mullion,
        "steel": steel,
        "glass_thk": round(glass_thk, 1),
        "glass_sw": round(glass_sw, 2),
        "acc_sw": round(acc_sw, 2),
        "eff_area": round(eff_area, 1),
        "I_xa": round(I_xa, 1) if I_xa is not None else None,
        "I_xs": round(I_xs, 1) if I_xs is not None else None,
        "ls_a": round(ls_a, 2) if ls_a is not None else None,
        "ls_s": round(ls_s, 2) if ls_s is not None else None,
        "mul_w_wind": round(mul_w_wind, 2),
        "mul_w_dead": round(mul_w_dead, 2),
        "mul_mu": round(mul_mu, 2) if mul_mu is not None else None,
        "tran_mu": round(tran_mu, 2) if tran_mu is not None else None,
        "mul_phi_Mn": round(mul_phi_Mn, 2) if mullion_type != "Aluminum + Steel" else None,
        "mul_phi_Mn_a": round(mul_phi_Mn_a, 2) if mullion_type == "Aluminum + Steel" else None,
        "mul_phi_Mn_s": round(mul_phi_Mn_s, 2) if mullion_type == "Aluminum + Steel" else None,
        "mul_dc": round(mul_dc, 2) if mullion_type != "Aluminum + Steel" else None,
        "mul_dc_a": round(mul_dc_a, 2) if (mullion_type == "Aluminum + Steel" and mul_dc_a is not None) else None,
        "mul_dc_s": round(mul_dc_s, 2) if (mullion_type == "Aluminum + Steel" and mul_dc_s is not None) else None,
        "mul_mu_a": round(mul_mu_a, 2) if (mullion_type == "Aluminum + Steel" and mul_mu_a is not None) else None,
        "mul_mu_s": round(mul_mu_s, 2) if (mullion_type == "Aluminum + Steel" and mul_mu_s is not None) else None,
        "mul_def": round(mul_def, 2) if mul_def is not None else None,
        "mul_allow_def": round(mul_allow_def, 2),
        "tran_phi_Mn": round(tran_phi_Mn, 2),
        "tran_dc": round(tran_dc, 2) if tran_dc is not None else None,
        "tran_def_wind": round(tran_def_wind, 2) if tran_def_wind is not None else None,
        "tran_def_dead": round(tran_def_dead, 2) if tran_def_dead is not None else None,
        "tran_allow_def": round(tran_allow_def, 2),
        "tran_vu": round(tran_vu, 2) if tran_vu is not None else None,
        "mul_vu": round(mul_vu, 2) if mul_vu is not None else None,
        "reaction_Ry": round(reaction_Ry, 2) if reaction_Ry is not None else None,
        "reaction_Rz": round(reaction_Rz, 2) if reaction_Rz is not None else None,
        "joint_fy": round(joint_fy, 2) if joint_fy is not None else None,
        "joint_fz": round(joint_fz, 2) if joint_fz is not None else None,
    }
