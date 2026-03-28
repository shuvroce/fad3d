import math
from typing import Dict, Optional, Any
from calcs.calc_utils import _to_float

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
