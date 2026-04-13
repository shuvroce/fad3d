import math
from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float

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

    if not length or not width:
        return None

    A_eff = max(length * width, length * length / 3) / 1000**2
    aspect_ratio = length / width
    result = _base_result(gu, A_eff, aspect_ratio)
    result.update(_bite_glue(wind_load, width))

    if glass_type == "sgu" and length < 5000 and support_type != "Point Fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0
        nfl = _f("nfl")
        defl = _f("def")

        if wind_load:
            result["load_x_area2"] = round(0.7 * wind_load * A_eff ** 2, 4)

        if nfl and defl and grade:
            lr = nfl * gtf
            result["gtf"] = gtf
            result["lr"] = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if wind_load else None
            result["allow_def"] = round(width / def_criteria, 2)
            result["def_ratio"] = round(defl / result["allow_def"], 2)
            result["deflection"] = round(defl, 2)

        return result

    if glass_type == "dgu"and length < 5000 and support_type != "Point Fixed":
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1 = _f("thickness1")
        t2 = _f("thickness2")
        nfl1 = _f("nfl1")
        nfl2 = _f("nfl2")
        def1 = _f("def1")
        def2 = _f("def2")

        if None not in (t1, t2, nfl1, nfl2, def1, def2, grade1, grade2):
            ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            lr1 = nfl1 * gtf1 * ls1
            lr2 = nfl2 * gtf2 * ls2
            lr = min(lr1, lr2)
            dgu_def = max(def1, def2)
            allow_def = width / def_criteria

            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["ls1"] = round(ls1, 2)
            result["ls2"] = round(ls2, 2)
            result["lr1"] = round(lr1, 2)
            result["lr2"] = round(lr2, 2)
            result["lr"] = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if lr and wind_load else None
            result["allow_def"] = round(allow_def, 2)
            result["def_ratio"] = round(dgu_def / allow_def, 2) if allow_def else None
            result["deflection1"] = round(def1, 2)
            result["deflection2"] = round(def2, 2)
            result["deflection"] = round(dgu_def, 2)
            if wind_load:
                result["load1_x_area2"] = round((0.7 * wind_load / ls1) * A_eff ** 2, 4)
                result["load2_x_area2"] = round((0.7 * wind_load / ls2) * A_eff ** 2, 4)

        return result

    if glass_type == "lgu" and length < 5000 and support_type != "Point Fixed":
        grade = gu.get("grade")
        gtf = 4.0 if grade == "FT" else 2.0 if grade == "HS" else 1.0
        nfl = _f("nfl")
        defl = _f("def")

        if wind_load:
            result["load_x_area2"] = round(0.7 * wind_load * A_eff ** 2, 4)

        if nfl and defl and grade:
            lr = nfl * gtf
            result["gtf"] = gtf
            result["lr"] = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if wind_load else None
            result["allow_def"] = round(width / def_criteria, 2)
            result["def_ratio"] = round(defl / result["allow_def"], 2)
            result["deflection"] = round(defl, 2)

        return result

    if glass_type == "ldgu"and length < 5000 and support_type != "Point Fixed":
        grade1, grade2 = gu.get("grade1"), gu.get("grade2")
        t1_1 = _f("thickness1_1")
        t1_2 = _f("thickness1_2")
        t1 = t1_1 + t1_2
        t2 = _f("thickness2")
        nfl1 = _f("nfl1")
        nfl2 = _f("nfl2")
        def1 = _f("def1")
        def2 = _f("def2")

        if None not in (t1_1, t1_2, t2, nfl1, nfl2, def1, def2, grade1, grade2):
            ls1 = (t1 ** 3 + t2 ** 3) / (t1 ** 3)
            ls2 = (t1 ** 3 + t2 ** 3) / (t2 ** 3)
            gtf1 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[0]
            gtf2 = GTF_TABLE.get(grade1, {}).get(grade2, (1.0, 1.0))[1]
            lr1 = nfl1 * gtf1 * ls1
            lr2 = nfl2 * gtf2 * ls2
            lr = min(lr1, lr2)
            ldgu_def = max(def1, def2)
            allow_def = width / def_criteria

            result["gtf1"] = gtf1
            result["gtf2"] = gtf2
            result["ls1"] = round(ls1, 2)
            result["ls2"] = round(ls2, 2)
            result["lr1"] = round(lr1, 2)
            result["lr2"] = round(lr2, 2)
            result["lr"] = round(lr, 2)
            result["stress_ratio"] = round(wind_load / lr, 2) if lr and wind_load else None
            result["allow_def"] = round(allow_def, 2)
            result["def_ratio"] = round(ldgu_def / allow_def, 2) if allow_def else None
            result["deflection1"] = round(def1, 2)
            result["deflection2"] = round(def2, 2)
            result["deflection"] = round(ldgu_def, 2)
            if wind_load:
                result["load1_x_area2"] = round((0.7 * wind_load / ls1) * A_eff ** 2, 4)
                result["load2_x_area2"] = round((0.7 * wind_load / ls2) * A_eff ** 2, 4)

        return result

    if length >= 5000 or support_type == "Point Fixed":
        return result

    return {"note": "Unknown Panel"}
