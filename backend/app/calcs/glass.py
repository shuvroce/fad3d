import math
from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float
from calcs.glass_plate_theory import (
    nfl_monolithic, deflection_monolithic,
    nfl_laminated, deflection_laminated,
)
from calcs.wind_load import compute_cc_pressure_for_area

GTF_TABLE = {
    "AN": {"AN": (0.9, 0.9), "HS": (1.0, 1.9), "FT": (1.0, 3.8)},
    "HS": {"AN": (1.9, 1.0), "HS": (1.8, 1.8), "FT": (1.9, 3.8)},
    "FT": {"AN": (3.8, 1.0), "HS": (3.8, 1.9), "FT": (3.6, 3.6)},
}

SEALANT_STRENGTH = 140  # MPa


def _base_result(gu, A_eff, aspect_ratio):
    """Common result dict for all glass types."""
    return {
        "branch": gu.get("glass_type"),
        "length": _to_float(gu.get("length")),
        "width": _to_float(gu.get("width")),
        "A_eff": round(A_eff, 2),
        "aspect_ratio": round(aspect_ratio, 2),
        "support_type": gu.get("support_type"),
    }


def _bite_glue(wind_load, width):
    """Bite/glue calculation (shared by all types)."""
    if not wind_load or not width:
        return {}
    bite_req = (wind_load * width) / (2 * SEALANT_STRENGTH)
    bite_pro = math.ceil(bite_req * 2) / 2
    glue_req = bite_req / 3
    glue_pro = max(6.0, math.ceil(glue_req * 2) / 2)
    return {
        "bite_req": round(bite_req, 1),
        "bite_pro": round(bite_pro, 1),
        "glue_req": round(glue_req, 1),
        "glue_pro": round(glue_pro, 1),
    }


def calc_glass_unit(gu: Dict[str, Any], wind_inputs: Optional[Dict] = None) -> Optional[Dict[str, float]]:
    glass_type = gu.get("glass_type")
    if not glass_type:
        return None

    def _f(name: str) -> Optional[float]:
        return _to_float(gu.get(name))

    length = _f("length")
    width = _f("width")
    wind_load = _f("wind_load")
    def_criteria = _f("def_criteria") or 60
    support_type = gu.get("support_type") or "four-edges"
    calc_mode = gu.get("calc_mode", "auto")   # "auto" or "manual"

    if not length or not width:
        return None

    A_eff = max(length * width, length * length / 3) / 1000**2
    aspect_ratio = length / width

    # Auto-resolve C&C wind pressure when in auto mode (always ignores manual wind_load)
    wind_auto = False
    if calc_mode == "auto":
        wind_load = None
        if wind_inputs:
            zone = gu.get("zone", "zone4")
            auto_wind = compute_cc_pressure_for_area(A_eff, zone, wind_inputs, _to_float)
            if auto_wind:
                wind_load = auto_wind
                wind_auto = True

    result = _base_result(gu, A_eff, aspect_ratio)
    if wind_auto:
        result["wind_load"] = wind_load
        result["wind_auto"] = True
    result.update(_bite_glue(wind_load, width))

    # Helper: resolve a value from user input (manual mode) or auto-calculation
    def _resolve(user_val, auto_fn, *args):
        if calc_mode == "manual" and user_val is not None:
            return user_val
        return auto_fn(*args)

    if glass_type == "sgu" and length < 5000 and support_type != "point-fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0

        nfl  = _resolve(_f("nfl"),  nfl_monolithic,       length, width, _f("thickness"), support_type)
        defl = _resolve(_f("def"),  deflection_monolithic, length, width, _f("thickness"), wind_load or 0, support_type)

        if wind_load:
            result["load_x_area2"] = round(0.7 * wind_load * A_eff ** 2, 4)

        if nfl and grade:
            lr = nfl * gtf
            result["nfl"]          = round(nfl, 3)
            result["calc_mode"]    = calc_mode
            result["gtf"]          = gtf
            result["lr"]           = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if wind_load else None
            result["allow_def"]    = round(width / def_criteria, 2)
            if defl is not None:
                result["def_ratio"]    = round(defl / result["allow_def"], 2)
                result["deflection"]   = round(defl, 2)

        return result

    if glass_type == "dgu" and length < 5000 and support_type != "point-fixed":
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1 = _f("thickness1")
        t2 = _f("thickness2")

        nfl1 = _resolve(_f("nfl1"), nfl_monolithic,        length, width, t1, support_type)
        nfl2 = _resolve(_f("nfl2"), nfl_monolithic,        length, width, t2, support_type)
        # Each pane deflects under its share of the wind load
        def1 = _resolve(_f("def1"), deflection_monolithic, length, width, t1,
                        (wind_load * t1**3 / (t1**3 + t2**3)) if (wind_load and t1 and t2) else 0, support_type)
        def2 = _resolve(_f("def2"), deflection_monolithic, length, width, t2,
                        (wind_load * t2**3 / (t1**3 + t2**3)) if (wind_load and t1 and t2) else 0, support_type)

        if None not in (t1, t2, nfl1, nfl2, grade1, grade2):
            ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            lr1 = nfl1 * gtf1 * ls1
            lr2 = nfl2 * gtf2 * ls2
            lr = min(lr1, lr2)
            dgu_def = max(d for d in [def1, def2] if d is not None) if any(d is not None for d in [def1, def2]) else None
            allow_def = width / def_criteria

            result["nfl1"]       = round(nfl1, 3)
            result["nfl2"]       = round(nfl2, 3)
            result["calc_mode"]  = calc_mode
            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["ls1"]  = round(ls1, 2)
            result["ls2"]  = round(ls2, 2)
            result["lr1"]  = round(lr1, 2)
            result["lr2"]  = round(lr2, 2)
            result["lr"]   = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if lr and wind_load else None
            result["allow_def"]    = round(allow_def, 2)
            if dgu_def is not None:
                result["def_ratio"]    = round(dgu_def / allow_def, 2) if allow_def else None
                result["deflection1"]  = round(def1, 2) if def1 is not None else None
                result["deflection2"]  = round(def2, 2) if def2 is not None else None
                result["deflection"]   = round(dgu_def, 2)
            if wind_load:
                result["load1_x_area2"] = round((0.7 * wind_load / ls1) * A_eff ** 2, 4)
                result["load2_x_area2"] = round((0.7 * wind_load / ls2) * A_eff ** 2, 4)

        return result

    if glass_type == "lgu" and length < 5000 and support_type != "point-fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0
        t1 = _f("thickness1")
        t2 = _f("thickness2")

        nfl  = _resolve(_f("nfl"),  nfl_laminated,       length, width, t1, t2, support_type)
        defl = _resolve(_f("def"),  deflection_laminated, length, width, t1, t2, wind_load or 0, support_type)

        if wind_load:
            result["load_x_area2"] = round(0.7 * wind_load * A_eff ** 2, 4)

        if nfl and grade:
            lr = nfl * gtf
            result["nfl"]          = round(nfl, 3)
            result["calc_mode"]    = calc_mode
            result["gtf"]          = gtf
            result["lr"]           = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if wind_load else None
            result["allow_def"]    = round(width / def_criteria, 2)
            if defl is not None:
                result["def_ratio"]  = round(defl / result["allow_def"], 2)
                result["deflection"] = round(defl, 2)

        return result

    if glass_type == "ldgu" and length < 5000 and support_type != "point-fixed":
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1_1 = _f("thickness1_1")
        t1_2 = _f("thickness1_2")
        t2   = _f("thickness2")
        if t1_1 is None or t1_2 is None:
            return result
        t1 = t1_1 + t1_2

        nfl1 = _resolve(_f("nfl1"), nfl_laminated,        length, width, t1_1, t1_2, support_type)
        nfl2 = _resolve(_f("nfl2"), nfl_monolithic,       length, width, t2,   support_type)
        def1 = _resolve(_f("def1"), deflection_laminated, length, width, t1_1, t1_2,
                        (wind_load * t1**3 / (t1**3 + t2**3)) if (wind_load and t2) else 0, support_type)
        def2 = _resolve(_f("def2"), deflection_monolithic, length, width, t2,
                        (wind_load * t2**3 / (t1**3 + t2**3)) if (wind_load and t2) else 0, support_type)

        if None not in (t2, nfl1, nfl2, grade1, grade2):
            ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            lr1 = nfl1 * gtf1 * ls1
            lr2 = nfl2 * gtf2 * ls2
            lr = min(lr1, lr2)
            ldgu_def = max(d for d in [def1, def2] if d is not None) if any(d is not None for d in [def1, def2]) else None
            allow_def = width / def_criteria

            result["nfl1"]       = round(nfl1, 3)
            result["nfl2"]       = round(nfl2, 3)
            result["calc_mode"]  = calc_mode
            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["ls1"]  = round(ls1, 2)
            result["ls2"]  = round(ls2, 2)
            result["lr1"]  = round(lr1, 2)
            result["lr2"]  = round(lr2, 2)
            result["lr"]   = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if lr and wind_load else None
            result["allow_def"]    = round(allow_def, 2)
            if ldgu_def is not None:
                result["def_ratio"]   = round(ldgu_def / allow_def, 2) if allow_def else None
                result["deflection1"] = round(def1, 2) if def1 is not None else None
                result["deflection2"] = round(def2, 2) if def2 is not None else None
                result["deflection"]  = round(ldgu_def, 2)
            if wind_load:
                result["load1_x_area2"] = round((0.7 * wind_load / ls1) * A_eff ** 2, 4)
                result["load2_x_area2"] = round((0.7 * wind_load / ls2) * A_eff ** 2, 4)

        return result

    if length >= 5000 or support_type == "point-fixed":
        return result

    return {"note": "Unknown Panel"}
