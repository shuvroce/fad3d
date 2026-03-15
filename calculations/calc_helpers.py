import math
from typing import Dict, Optional, Any

STEEL_E = 210000  # MPa
STEEL_FY = 318    # MPa

def _to_float(value: Any) -> Optional[float]:
    try:
        v = float(value)
        return v
    except (TypeError, ValueError):
        return None

def calc_alum_profile(profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not profile_data:
        return None
    
    # Extract profile properties
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
    
    if profile_type == "Stick":
        # Calculate geometric properties (similar to Stick profile in alum-cap.html)
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


def calc_steel_profile(profile_data: Any) -> Optional[Dict[str, float]]:
    web_length = None
    flange_length = None
    thk = None
    
    # Handle dictionary input (from preview API)
    if isinstance(profile_data, dict):
        web_length = _to_float(profile_data.get("web_length"))
        flange_length = _to_float(profile_data.get("flange_length"))
        thk = _to_float(profile_data.get("thk"))
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
    
    if not all([web_length, flange_length, thk]) or web_length <= 0 or flange_length <= 0 or thk <= 0:
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
    r_x = math.sqrt(I_xx / area)
    r_y = math.sqrt(I_yy / area)
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
        "r_x": round(r_x, 2),
        "r_y": round(r_y, 2),
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


def calc_glass_unit(gu: Dict[str, Any]) -> Optional[Dict[str, float]]:
    glass_type = gu.get("glass_type")
    if not glass_type:
        return None

    def _f(name: str) -> Optional[float]:
        return _to_float(gu.get(name))

    length = _f("length")
    width = _f("width")
    wind_load = _f("wind_load")
    def_criteria = _f("def_criteria") or 60
    support_type = gu.get("support_type")
    
    # If length and width are missing, return None early
    if not length or not width:
        return None
    
    # Calculate basic properties that only need length and width
    A_eff = max(length * width, length * length / 3) / 1000**2
    aspect_ratio = length / width

    # Bite/glue values from template (may be unused in preview, kept for parity)
    # These can be calculated if wind_load is available
    if wind_load:
        bite_req = (wind_load * width) / (2 * 140)
        bite_pro = math.ceil(bite_req * 2) / 2
        glue_req = bite_req / 3
        glue_pro = max(6.0, math.ceil(glue_req * 2) / 2)
    else:
        bite_req = None
        bite_pro = None
        glue_req = None
        glue_pro = None

    if glass_type == "sgu" and length < 5000 and support_type != "Point Fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0
        nfl = _f("nfl")
        defl = _f("def")
        
        # Calculate partial results with available data
        result = {
            "branch": "sgu",
            "length": length,
            "A_eff": round(A_eff, 2),
            "aspect_ratio": round(aspect_ratio, 2),
        }
        
        # Add wind-dependent calculations if wind_load is available
        if wind_load:
            result["bite_req"] = round(bite_req, 1) if bite_req else None
            result["bite_pro"] = round(bite_pro, 1) if bite_pro else None
            result["glue_req"] = round(glue_req, 1) if glue_req else None
            result["glue_pro"] = round(glue_pro, 1) if glue_pro else None
        
        # Add full calculations if all data is available
        if nfl and defl and grade:
            sgu_lr = nfl * gtf
            sgu_stress_ratio = wind_load / sgu_lr if wind_load else None
            sgu_allow_def = width / def_criteria
            sgu_def_ratio = defl / sgu_allow_def
            
            result["support_type"] = support_type
            result["gtf"] = gtf
            result["sgu_lr"] = round(sgu_lr, 2)
            result["stress_ratio"] = round(sgu_stress_ratio, 2) if sgu_stress_ratio else None
            result["def_ratio"] = round(sgu_def_ratio, 2)
            result["allow_def"] = round(sgu_allow_def, 2)
            result["deflection"] = round(defl, 2)
        
        return result

    if glass_type == "dgu" and length < 5000 and support_type != "Point Fixed":
        gtf_table = {
            "AN": {"AN": (0.9, 0.9), "HS": (1.0, 1.9), "FT": (1.0, 3.8)},
            "HS": {"AN": (1.9, 1.0), "HS": (1.8, 1.8), "FT": (1.9, 3.8)},
            "FT": {"AN": (3.8, 1.0), "HS": (3.8, 1.9), "FT": (3.6, 3.6)},
        }
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1 = _f("thickness1")
        t2 = _f("thickness2")
        nfl1 = _f("nfl1")
        nfl2 = _f("nfl2")
        def1 = _f("def1")
        def2 = _f("def2")
        
        # Calculate partial results with available data
        result = {
            "branch": "dgu",
            "length": length,
            "A_eff": round(A_eff, 2),
            "aspect_ratio": round(aspect_ratio, 2),
        }
        
        # Add wind-dependent calculations if wind_load is available
        if wind_load:
            result["bite_req"] = round(bite_req, 1) if bite_req else None
            result["bite_pro"] = round(bite_pro, 1) if bite_pro else None
            result["glue_req"] = round(glue_req, 1) if glue_req else None
            result["glue_pro"] = round(glue_pro, 1) if glue_pro else None
        
        # Add full calculations if all data is available
        if None not in (t1, t2, nfl1, nfl2, def1, def2, grade1, grade2):
            dgu_ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            dgu_ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = gtf_table.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = gtf_table.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            dgu_lr1 = nfl1 * gtf1 * dgu_ls1
            dgu_lr2 = nfl2 * gtf2 * dgu_ls2
            dgu_lr = min(dgu_lr1, dgu_lr2)
            dgu_stress_ratio = wind_load / dgu_lr if dgu_lr and wind_load else None
            dgu_def = max(def1, def2)
            dgu_allow_def = width / def_criteria
            dgu_def_ratio = dgu_def / dgu_allow_def if dgu_allow_def else None
            
            result["support_type"] = support_type
            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["dgu_ls1"] = round(dgu_ls1, 2)
            result["dgu_ls2"] = round(dgu_ls2, 2)
            result["dgu_lr1"] = round(dgu_lr1, 2)
            result["dgu_lr2"] = round(dgu_lr2, 2)
            result["dgu_lr"] = round(dgu_lr, 2)
            result["stress_ratio"] = round(dgu_stress_ratio, 2) if dgu_stress_ratio else None
            result["def_ratio"] = round(dgu_def_ratio, 2) if dgu_def_ratio else None
            result["allow_def"] = round(dgu_allow_def, 2)
            result["deflection1"] = round(def1, 2)
            result["deflection2"] = round(def2, 2)
            result["deflection"] = round(dgu_def, 2)
        
        return result

    if glass_type == "lgu" and length < 5000 and support_type != "Point Fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0
        nfl = _f("nfl")
        defl = _f("def")
        
        # Calculate partial results with available data
        result = {
            "branch": "lgu",
            "length": length,
            "A_eff": round(A_eff, 2),
            "aspect_ratio": round(aspect_ratio, 2),
        }
        
        # Add wind-dependent calculations if wind_load is available
        if wind_load:
            result["bite_req"] = round(bite_req, 1) if bite_req else None
            result["bite_pro"] = round(bite_pro, 1) if bite_pro else None
            result["glue_req"] = round(glue_req, 1) if glue_req else None
            result["glue_pro"] = round(glue_pro, 1) if glue_pro else None
        
        # Add full calculations if all data is available
        if nfl and defl and grade:
            lgu_lr = nfl * gtf
            lgu_stress_ratio = wind_load / lgu_lr if wind_load else None
            lgu_allow_def = width / def_criteria
            lgu_def_ratio = defl / lgu_allow_def
            
            result["support_type"] = support_type
            result["gtf"] = gtf
            result["lgu_lr"] = round(lgu_lr, 2)
            result["stress_ratio"] = round(lgu_stress_ratio, 2) if lgu_stress_ratio else None
            result["def_ratio"] = round(lgu_def_ratio, 2)
            result["allow_def"] = round(lgu_allow_def, 2)
            result["deflection"] = round(defl, 2)
        
        return result
    
    if glass_type == "ldgu" and length < 5000 and support_type != "Point Fixed":
        gtf_table = {
            "AN": {"AN": (0.9, 0.9), "HS": (1.0, 1.9), "FT": (1.0, 3.8)},
            "HS": {"AN": (1.9, 1.0), "HS": (1.8, 1.8), "FT": (1.9, 3.8)},
            "FT": {"AN": (3.8, 1.0), "HS": (3.8, 1.9), "FT": (3.6, 3.6)},
        }
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1_1 = _f("thickness1_1")
        t1_2 = _f("thickness1_2")
        t1 = t1_1 + t1_2
        t2 = _f("thickness2")
        nfl1 = _f("nfl1")
        nfl2 = _f("nfl2")
        def1 = _f("def1")
        def2 = _f("def2")
        
        # Calculate partial results with available data
        result = {
            "branch": "ldgu",
            "length": length,
            "A_eff": round(A_eff, 2),
            "aspect_ratio": round(aspect_ratio, 2),
        }
        
        # Add wind-dependent calculations if wind_load is available
        if wind_load:
            result["bite_req"] = round(bite_req, 1) if bite_req else None
            result["bite_pro"] = round(bite_pro, 1) if bite_pro else None
            result["glue_req"] = round(glue_req, 1) if glue_req else None
            result["glue_pro"] = round(glue_pro, 1) if glue_pro else None
        
        # Add full calculations if all data is available
        if None not in (t1_1, t1_2, t2, nfl1, nfl2, def1, def2, grade1, grade2):
            ldgu_ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            ldgu_ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = gtf_table.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = gtf_table.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            ldgu_lr1 = nfl1 * gtf1 * ldgu_ls1
            ldgu_lr2 = nfl2 * gtf2 * ldgu_ls2
            ldgu_lr = min(ldgu_lr1, ldgu_lr2)
            ldgu_stress_ratio = wind_load / ldgu_lr if ldgu_lr and wind_load else None
            ldgu_def = max(def1, def2)
            ldgu_allow_def = width / def_criteria
            ldgu_def_ratio = ldgu_def / ldgu_allow_def if ldgu_allow_def else None
            
            result["support_type"] = support_type
            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["ldgu_ls1"] = round(ldgu_ls1, 2)
            result["ldgu_ls2"] = round(ldgu_ls2, 2)
            result["ldgu_lr1"] = round(ldgu_lr1, 2)
            result["ldgu_lr2"] = round(ldgu_lr2, 2)
            result["ldgu_lr"] = round(ldgu_lr, 2)
            result["stress_ratio"] = round(ldgu_stress_ratio, 2) if ldgu_stress_ratio else None
            result["def_ratio"] = round(ldgu_def_ratio, 2) if ldgu_def_ratio else None
            result["allow_def"] = round(ldgu_allow_def, 2)
            result["deflection1"] = round(def1, 2)
            result["deflection2"] = round(def2, 2)
            result["deflection"] = round(ldgu_def, 2)
        
        return result
    
    if length >= 5000 or support_type == "Point Fixed":
        result = {
            "branch": "rfem",
            "length": length,
            "A_eff": round(A_eff, 2),
            "aspect_ratio": round(aspect_ratio, 2),
        }
        result["support_type"] = support_type
        
        return result

    return {"note": "Unknown Panel"}


def frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg):
    # Mullion loads
    glass_sw = glass_thk * 0.025
    acc_sw = glass_sw * 0.3
    mul_w_dead = ((glass_sw + acc_sw) * frame_width / 1000)
    mul_w_wind = (wind_neg * frame_width / 1000)
    
    # Transom loads
    if frame_type == "Continuous":
        tran_w_dead = (glass_thk * 0.025) * (frame_width / 1000)
        tran_w_wind = wind_neg * (frame_width / 1000)
    elif tran_spacing and tran_spacing < frame_length and frame_type != "Continuous":
        tran_w_dead = (glass_thk * 0.025) * (frame_width / 1000)
        tran_w_wind = wind_neg * (frame_width / 1000)
    else:
        tran_w_dead = ((glass_thk * 0.025) / 2) * (frame_width / 1000)
        tran_w_wind = (wind_neg / 2) * (frame_width / 1000)
    
    return mul_w_dead, mul_w_wind, tran_w_dead, tran_w_wind

def joint_forces(geometry, frame_width, tran_w_dead, tran_w_wind, joint_fy, joint_fz):
    joint_fy = round(((tran_w_wind * frame_width / 1000) / 4), 2) if geometry == "regular" else joint_fy
    joint_fz = round(((tran_w_dead * frame_width / 1000) / 4), 2) if geometry == "regular" else joint_fz
    
    return joint_fy, joint_fz

def reaction_forces(geometry, frame_type, frame_length, mul_w_dead, mul_w_wind, reaction_Ry, reaction_Rz):
    _frame_length = frame_length * 2
    
    if frame_type == "Floor-to-floor":
        reaction_Ry = round(mul_w_wind * (frame_length / 1000) / 2, 2) if geometry == "regular" else reaction_Ry
        reaction_Rz = round(mul_w_dead * (frame_length / 1000) / 2, 2) if geometry == "regular" else reaction_Rz
    elif frame_type == "Continuous":
        reaction_Ry = round(mul_w_wind * (frame_length / 1000) * (10 / 8), 2) if geometry == "regular" else reaction_Ry
        reaction_Rz = round(mul_w_dead * (_frame_length / 1000), 2) if geometry == "regular" else reaction_Rz
    else:
        reaction_Ry = 0
        reaction_Rz = 0
    
    return reaction_Ry, reaction_Rz

def calc_frame(frame: Dict[str, Any], alum_profiles_data: list = None, steel_profiles: list = None) -> Optional[Dict[str, Any]]:
    if not frame or alum_profiles_data is None:
        return None

    alum_profiles_data = alum_profiles_data or []
    steel_profiles = steel_profiles or []

    # Resolve profile references
    def find_profile(name: str, data_list: list) -> Optional[Dict]:
        if not name:
            return None
        for p in data_list:
            if p.get("profile_name") == name or p.get("profile_name", "").strip() == name.strip():
                return p
        return None

    mullion = frame.get("mullion")
    transom = frame.get("transom")
    steel_ref = frame.get("steel")

    # Get mullion profile data (either from list by name or as direct dictionary)
    if isinstance(mullion, dict):
        mullion_profile_data = mullion
    elif isinstance(mullion, str):
        mullion_profile_data = find_profile(mullion, alum_profiles_data)
    else:
        mullion_profile_data = None
    
    # Get transom profile data (either from list by name or as direct dictionary)
    if isinstance(transom, dict):
        transom_profile_data = transom
    elif isinstance(transom, str):
        transom_profile_data = find_profile(transom, alum_profiles_data)
    else:
        transom_profile_data = None

    mullion_profile = calc_alum_profile(mullion_profile_data) if mullion_profile_data else None
    transom_profile = calc_alum_profile(transom_profile_data) if transom_profile_data else None
    steel_calc = calc_steel_profile(steel_ref) if steel_ref else None

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
    
    if frame_type == "Floor-to-floor":
        eff_area = max(frame_length * frame_width, frame_length**2 / 3) / 1000**2
    elif frame_type == "Continuous":
        _frame_length = frame_length * 2
        eff_area = max(_frame_length * frame_width, _frame_length**2 / 3) / 1000**2

    # Deflection limits
    if frame_length <= 4100:
        mul_allow_def = frame_length / 175
    else:
        mul_allow_def = (frame_length / 240) + 6.35
    tran_allow_def = frame_width / 175
    
    # Calculate steel profile properties from profile name
    # steel_calc = calc_steel_profile(steel_ref) if steel_ref else None
    
    if not all([frame_width, frame_length]):
        return None

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
        if steel_calc:
            sp_I_xx = steel_calc.get("I_xx", 0.001)
            mul_phi_Mn_s = steel_calc.get("phi_Mn", 0.001)
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
        "steel_ref": steel_ref,
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


def calc_connection(conn: Dict[str, Any], frame: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not conn or not frame:
        return None

    # Get frame loads (from frame calculation or direct)
    geometry = frame.get("geometry", "regular")
    frame_width = _to_float(frame.get("width"))
    frame_length = _to_float(frame.get("length"))
    tran_spacing = _to_float(frame.get("tran_spacing"))
    frame_type = frame.get("frame_type", "Continuous")
    wind_neg = _to_float(frame.get("wind_neg")) or 0
    glass_thk = _to_float(frame.get("glass_thk")) or 0
    joint_fy = _to_float(frame.get("joint_fy"))
    joint_fz = _to_float(frame.get("joint_fz"))

    # Validate frame dimensions
    if not frame_width or not frame_length:
        return None

    if geometry == "regular":
        _, _, tran_w_dead, tran_w_wind = frame_loads(glass_thk, frame_type, frame_length, frame_width, tran_spacing, wind_neg)
        joint_fy, joint_fz = joint_forces(geometry, frame_width, tran_w_dead, tran_w_wind, joint_fy, joint_fz)

    if not joint_fy or not joint_fz:
        return None
    
    design_fy = joint_fy * 1.6
    design_fz = joint_fz * 1.4

    screw_nos = _to_float(conn.get("screw_nos"))
    screw_dia = _to_float(conn.get("screw_dia"))
    head_dia = _to_float(conn.get("head_dia"))
    t1 = _to_float(conn.get("t1"))
    t2 = _to_float(conn.get("t2"))
    tc = _to_float(conn.get("tc"))

    if not all([screw_nos, screw_dia, head_dia, t1, t2, tc]):
        return None

    # Screw shear capacity
    R_yB = design_fy / (screw_nos / 2)
    R_zB = design_fz / (screw_nos / 2)
    resultant_shear = (R_yB**2 + R_zB**2)**0.5

    # Pull-over (tilting)
    Pnv1 = 4.2 * (t2 ** 3 * screw_dia) ** 0.5 * 207
    Pnv2 = 2.7 * (t1 * screw_dia) * 207
    Pnv3 = 2.7 * (t2 * screw_dia) * 207
    phi_Pnv = round(0.5 * min(Pnv1, Pnv2, Pnv3) / 1000, 2)

    # Pull-out
    phi_Pnot = round(0.5 * 0.85 * tc * screw_dia * 207 / 1000, 2)

    # Pull-over tension
    d_w = min(head_dia, 19.1)
    phi_Pnov = round(0.5 * 1.5 * t1 * d_w * 207 / 1000, 2)

    # Ratios
    beta_pullover = (resultant_shear / (phi_Pnv / 0.5)) + (0.71 * R_zB / (phi_Pnov / 0.5))
    beta_pullout = (resultant_shear / (phi_Pnv / 0.5)) + (R_zB / (phi_Pnot / 0.5))

    return {
        "joint_fy": round(joint_fy, 2),
        "joint_fz": round(joint_fz, 2),
        "R_zA": round(R_zB, 2),
        "R_yA": round(R_yB, 2),
        "Vu": round(resultant_shear, 2),
        "d_w": round(d_w, 2),
        "phi_Pnv": round(phi_Pnv, 2),
        "phi_Pnot": round(phi_Pnot, 2),
        "phi_Pnov": round(phi_Pnov, 2),
        "beta_pullover": round(beta_pullover, 2),
        "beta_pullout": round(beta_pullout, 2),
    }


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

    def find_profile(name: str, data_list: list) -> Optional[Dict[str, Any]]:
        if not name:
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


