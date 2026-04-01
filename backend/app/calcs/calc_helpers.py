from typing import Any, Dict, Optional, Tuple
from calcs.calc_utils import _to_float
from calcs.alum_profile import calc_alum_profile
from calcs.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile
from calcs.glass import calc_glass_unit
from calcs.frame import calc_frame
from calcs.connection import calc_connection
from calcs.anchorage import calc_anchorage

from calcs.wind_load import compute_wind_loads

def _set_calc(target: Dict[str, Any], calc_data: Optional[Dict[str, Any]]) -> None:
    if calc_data:
        target["calc"] = calc_data

def _get_profile_sets(data: Dict[str, Any]) -> Tuple[list, list]:
    alum_profiles_data = data.get("alum_profiles_data", data.get("alum_profiles", []))
    steel_profiles_data = data.get("steel_profiles_data", data.get("steel_profiles", []))
    return alum_profiles_data or [], steel_profiles_data or []

def precompute_data(data: Dict[str, Any]) -> Dict[str, Any]:
    wind = data.get("wind") or {}
    computed_wind = compute_wind_loads(wind, _to_float)
    auto_calc = computed_wind.get("auto_calc")
    if auto_calc:
        computed_wind["calc"] = auto_calc
    data["wind"] = computed_wind

    alum_profiles_data, steel_profiles_data = _get_profile_sets(data)

    for alum_profile in alum_profiles_data:
        calc_result = calc_alum_profile(alum_profile)
        _set_calc(alum_profile, calc_result)

    for steel_profile in steel_profiles_data:
        calc_result = calc_steel_rhs_profile(steel_profile)
        _set_calc(steel_profile, calc_result)

    for cat in data.get("categories", []):
        for gu in cat.get("glass_units", []) or []:
            calc_result = calc_glass_unit(gu)
            _set_calc(gu, calc_result)

        for frame in cat.get("frames", []) or []:
            calc_result = calc_frame(frame, alum_profiles_data, steel_profiles_data)
            _set_calc(frame, calc_result)

        frames = cat.get("frames", []) or []
        frame = frames[0] if frames else None

        # Merge frame results into frame dict so connection/anchorage get computed forces
        frame_for_downstream = dict(frame) if frame else {}
        if frame and frame.get("calc"):
            fc = frame["calc"]
            for key in ("joint_fy", "joint_fz", "reaction_Ry", "reaction_Rz"):
                if fc.get(key) is not None:
                    frame_for_downstream[key] = fc[key]

        for conn in cat.get("connections", []) or []:
            calc_result = calc_connection(conn, frame_for_downstream)
            _set_calc(conn, calc_result)

        for anchor in cat.get("anchorage", []) or []:
            calc_result = calc_anchorage(anchor, frame_for_downstream, alum_profiles_data)
            _set_calc(anchor, calc_result)

    return data

def build_wind_preview(wind: Dict[str, Any]) -> Dict[str, Any]:
    computed_wind = compute_wind_loads(wind or {}, _to_float)
    auto_calc = computed_wind.get("auto_calc")

    if not auto_calc:
        raise ValueError(computed_wind.get("auto_calc_error") or "Unable to compute wind loads")

    return auto_calc
