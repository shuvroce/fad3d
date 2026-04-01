from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float

def calc_alum_profile(profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not profile_data:
        return None
    
    profile_type = profile_data.get("profile_type")
    profile_name = profile_data.get("profile_name")
    web_length = _to_float(profile_data.get("web_length"))
    flange_length = _to_float(profile_data.get("flange_length"))
    web_thk = _to_float(profile_data.get("web_thk"))
    flange_thk = _to_float(profile_data.get("flange_thk"))
    F_y = _to_float(profile_data.get("F_y"))

    if profile_type != "Stick":
        tor_constant = _to_float(profile_data.get("tor_constant"))
        area = _to_float(profile_data.get("area"))
        I_xx = _to_float(profile_data.get("I_xx"))
        I_yy = _to_float(profile_data.get("I_yy"))
        Y = _to_float(profile_data.get("Y"))
        X = _to_float(profile_data.get("X"))
        plastic_x = _to_float(profile_data.get("plastic_x"))
        plastic_y = _to_float(profile_data.get("plastic_y"))
        phi_Mn = _to_float(profile_data.get("phi_Mn"))
    
    if not all([web_length, flange_length, web_thk, flange_thk]):
        return None

    # F_y is required for all profile types (local buckling + moment capacity)
    if F_y is None:
        return None
    
    if profile_type == "Stick":
        tor_constant = (2 * flange_thk * web_thk * ((flange_length - web_thk)**2) * ((web_length - flange_thk)**2)) / (
            flange_length * web_thk + web_length * flange_thk - (web_thk**2) - (flange_thk**2)
        )
        area = web_length * flange_length - ((web_length - 2 * flange_thk) * (flange_length - 2 * web_thk))
        I_xx = (flange_length * web_length**3 / 12) - ((flange_length - 2 * web_thk) * (web_length - 2 * flange_thk)**3 / 12)
        I_yy = (web_length * flange_length**3 / 12) - ((web_length - 2 * flange_thk) * (flange_length - 2 * web_thk)**3 / 12)
        Y = web_length / 2
        X = flange_length / 2
        Z_x = ((flange_length * web_length**2) - ((flange_length - 2 * web_thk) * (web_length - 2 * flange_thk)**2)) / 4
        
    else:
        Z_x = 0.5 * area * (plastic_x + plastic_y)
    
    S_x = I_xx / Y
    S_y = I_yy / X
    
    # Calculate local buckling parameters (Aluminum Design Manual)
    web_b = web_length - 2 * (flange_thk - 0.5)
    flange_b = flange_length - 2 * (web_thk - 0.5)
    
    if profile_type == "Stick":
        m = 0.65
        I_w = 2 * ((web_thk * web_b**3) / 12)
        c_w = web_b / 2
    else:
        c_c = Y - flange_thk - 0.5
        c_o = web_b - c_c
        m = 1.15 + (-c_o / (2 * c_c)) if c_c != 0 else 1.15
        web_d = Y - web_b / 2
        I_w = 2 * (((web_thk * web_b**3) / 12) + (web_thk * web_b * web_d**2))
        c_w = c_c
    
    I_f = I_xx - I_w
    c_f = (web_length - flange_thk) / 2
    
    # Stress reduction factors
    B_p = F_y * (1 + (F_y / (1500 * 6.895))**0.3333)
    D_p = (B_p / 10) * ((B_p / 70000)**0.5)
    B_br = 1.3 * F_y * (1 + (F_y / (340 * 6.895))**0.3333)
    D_br = (B_br / 20) * ((6 * B_br / 70000)**0.5)
    
    # Slenderness ratios
    flange_lambda1 = (B_p - F_y) / (1.6 * D_p) if D_p != 0 else 0
    flange_lambda2 = (0.35 * B_p) / (1.6 * D_p) if D_p != 0 else 0
    web_lambda1 = (B_br - 1.5 * F_y) / (m * D_br) if (m * D_br) != 0 else 0
    web_lambda2 = (0.5 * B_br) / (m * D_br) if (m * D_br) != 0 else 0
    
    # Moment capacity by yielding
    Mn_yield = min(Z_x * F_y, 1.5 * F_y * I_xx / Y) / 1000000
    
    # Determine stress reduction factors based on slenderness
    if (web_b / web_thk) <= web_lambda1:
        F_b = 1.5 * F_y
    else:
        F_b = B_br - (m * D_br) * (web_b / web_thk)
    
    if (flange_b / flange_thk) <= flange_lambda1:
        F_c = F_y
    else:
        F_c = B_p - (5 * D_p) * (flange_b / flange_thk)

    Mn_lbw = ((F_b * I_w) / (c_w)) / 1000**2
    Mn_lbf = ((F_c * I_f) / (c_f)) / 1000**2
    Mn_lb = Mn_lbw + Mn_lbf
    phi_Mn = 0.9 * min(Mn_yield, Mn_lb)
    
    return {
        # Basic profile properties (for preview display)
        "profile_name": profile_name,
        "web_length": web_length,
        "flange_length": flange_length,
        "web_thk": web_thk,
        "flange_thk": flange_thk,
        "tor_constant": round(tor_constant, 1),
        "area": round(area, 1),
        "I_xx": round(I_xx, 1),
        "I_yy": round(I_yy, 1),
        # Calculated section moduli
        "S_x": round(S_x, 1),
        "S_y": round(S_y, 1),
        "Z_x": round(Z_x, 1),
        # Local buckling analysis
        "web_b": round(web_b, 1),
        "flange_b": round(flange_b, 1),
        "c_c": round(c_c, 1) if profile_type != "Stick" else None,
        "c_o": round(c_o, 1) if profile_type != "Stick" else None,
        "m": round(m, 2),
        "B_p": round(B_p, 1),
        "D_p": round(D_p, 1),
        "B_br": round(B_br, 1),
        "D_br": round(D_br, 1),
        "flange_lambda1": round(flange_lambda1, 2),
        "flange_lambda2": round(flange_lambda2, 2),
        "web_lambda1": round(web_lambda1, 2),
        "web_lambda2": round(web_lambda2, 2),
        "web_d": round(web_d, 1) if profile_type != "Stick" else None,
        "I_w": round(I_w, 1),
        "I_f": round(I_f, 1),
        "c_w": round(c_w, 1),
        "c_f": round(c_f, 1),
        "F_b": round(F_b, 1),
        "F_c": round(F_c, 1),
        # Moment capacities
        "Mn_yield": round(Mn_yield, 1),
        "Mn_lbw": round(Mn_lbw, 1),
        "Mn_lbf": round(Mn_lbf, 1),
        "Mn_lb": round(Mn_lb, 1),
        "phi_Mn": round(phi_Mn, 1),
    }
