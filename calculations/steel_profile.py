import math
from typing import Dict, Optional, Any
from calculations.calc_utils import _to_float

STEEL_E = 210000  # MPa
STEEL_FY = 318    # MPa

def calc_steel_rhs_profile(profile_data: Any) -> Optional[Dict[str, float]]:
    web_length = None
    flange_length = None
    thk = None
    
    # Handle dictionary input (from preview API)
    if isinstance(profile_data, dict):
        web_length = _to_float(profile_data.get("web_length"), None)
        flange_length = _to_float(profile_data.get("flange_length"), None)
        thk = _to_float(profile_data.get("thk"), None)
    # Handle string input (profile name)
    elif isinstance(profile_data, str):
        if not profile_data:
            return None
        try:
            parts = profile_data.strip().split()
            dimension_part = parts[-1] if parts else ""
            
            dimensions = dimension_part.split('x')
            if len(dimensions) != 3:
                return None
            
            web_length = _to_float(dimensions[0])
            flange_length = _to_float(dimensions[1])
            thk = _to_float(dimensions[2])
        except (IndexError, ValueError, AttributeError):
            return None
    else:
        return None
    
    if not all([web_length, flange_length, thk]):
        return None

    area = web_length * flange_length - ((web_length - 2 * thk) * (flange_length - 2 * thk))
    I_xx = (flange_length * web_length ** 3 / 12) - ((flange_length - 2 * thk) * (web_length - 2 * thk) ** 3) / 12
    I_yy = (web_length * flange_length ** 3 / 12) - ((web_length - 2 * thk) * (flange_length - 2 * thk) ** 3) / 12
    Y = web_length / 2
    X = flange_length / 2
    S_x = I_xx / Y
    S_y = I_yy / X
    Z_x = ((flange_length * web_length ** 2) - ((flange_length - 2 * thk) * (web_length - 2 * thk) ** 2)) / 4
    tor_constant = (2 * thk ** 2 * (flange_length - thk) ** 2 * (web_length - thk) ** 2) / (
        flange_length * thk + web_length * thk - 2 * (thk ** 2)
    )

    b = flange_length - 2 * thk
    h = web_length - 2 * thk
    lambda_f = b / thk
    lambda_p_f = 1.12 * math.sqrt(STEEL_E / STEEL_FY)
    lambda_r_f = 1.4 * math.sqrt(STEEL_E / STEEL_FY)
    lambda_w = h / thk
    lambda_p_w = 2.42 * math.sqrt(STEEL_E / STEEL_FY)
    lambda_r_w = 5.7 * math.sqrt(STEEL_E / STEEL_FY)

    Mn = (Z_x * STEEL_FY / 1_000_000)
    phi_Mn = 0.9 * Mn

    return {
        "area": round(area, 1),
        "I_xx": round(I_xx, 1),
        "I_yy": round(I_yy, 1),
        "Y": round(Y, 1),
        "X": round(X, 1),
        "S_x": round(S_x, 1),
        "S_y": round(S_y, 1),
        "Z_x": round(Z_x, 1),
        "tor_constant": round(tor_constant, 1),
        "b": round(b, 1),
        "h": round(h, 1),
        "lambda_f": round(lambda_f, 2),
        "lambda_p_f": round(lambda_p_f, 2),
        "lambda_r_f": round(lambda_r_f, 2),
        "lambda_w": round(lambda_w, 2),
        "lambda_p_w": round(lambda_p_w, 2),
        "lambda_r_w": round(lambda_r_w, 2),
        "Mn": round(Mn, 2),
        "phi_Mn": round(phi_Mn, 2),
    }


def calc_steel_iw_profile(profile_data: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """Calculate section properties for a hot-rolled I / W section."""
    if not profile_data:
        return None

    web_length   = _to_float(profile_data.get("web_length"))    # d  (overall depth)
    flange_length = _to_float(profile_data.get("flange_length")) # b  (flange width)
    flange_thk   = _to_float(profile_data.get("flange_thk"))    # tf
    web_thk      = _to_float(profile_data.get("web_thk"))       # tw
    F_y          = _to_float(profile_data.get("F_y")) or STEEL_FY

    if not all([web_length, flange_length, flange_thk, web_thk]):
        return None
    if any(v <= 0 for v in [web_length, flange_length, flange_thk, web_thk]):
        return None

    hw = web_length - 2 * flange_thk          # clear web height

    area         = 2 * flange_length * flange_thk + hw * web_thk
    I_xx         = (flange_length * web_length**3 - (flange_length - web_thk) * hw**3) / 12
    I_yy         = (2 * flange_thk * flange_length**3 + hw * web_thk**3) / 12
    Y            = web_length / 2
    X            = flange_length / 2
    S_x          = I_xx / Y
    S_y          = I_yy / X
    Z_x          = flange_length * flange_thk * (web_length / 2 - flange_thk / 2) * 2 + web_thk * hw**2 / 4
    # Open section torsional constant J
    tor_constant = (2 * flange_length * flange_thk**3 + hw * web_thk**3) / 3

    r_x = math.sqrt(I_xx / area)
    r_y = math.sqrt(I_yy / area)

    # Compactness checks (AISC)
    lambda_f   = (flange_length / 2) / flange_thk
    lambda_p_f = 0.38 * math.sqrt(STEEL_E / F_y)
    lambda_r_f = 1.0  * math.sqrt(STEEL_E / F_y)
    lambda_w   = hw / web_thk
    lambda_p_w = 3.76 * math.sqrt(STEEL_E / F_y)
    lambda_r_w = 5.7  * math.sqrt(STEEL_E / F_y)

    Mn     = Z_x * F_y / 1_000_000
    phi_Mn = 0.9 * Mn

    return {
        "area":        round(area,        1),
        "I_xx":        round(I_xx,        1),
        "I_yy":        round(I_yy,        1),
        "Y":           round(Y,           1),
        "X":           round(X,           1),
        "S_x":         round(S_x,         1),
        "S_y":         round(S_y,         1),
        "Z_x":         round(Z_x,         1),
        "tor_constant":round(tor_constant,1),
        "r_x":         round(r_x,         2),
        "r_y":         round(r_y,         2),
        "hw":          round(hw,          1),
        "lambda_f":    round(lambda_f,    2),
        "lambda_p_f":  round(lambda_p_f,  2),
        "lambda_r_f":  round(lambda_r_f,  2),
        "lambda_w":    round(lambda_w,    2),
        "lambda_p_w":  round(lambda_p_w,  2),
        "lambda_r_w":  round(lambda_r_w,  2),
        "Mn":          round(Mn,          2),
        "phi_Mn":      round(phi_Mn,      2),
    }
