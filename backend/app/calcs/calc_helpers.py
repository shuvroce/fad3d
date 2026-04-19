from typing import Any, Dict, Optional, Tuple
from pathlib import Path
from calcs.calc_utils import _to_float
from calcs.alum_profile import calc_alum_profile
from calcs.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile
from calcs.glass import calc_glass_unit
from calcs.frame import calc_frame
from calcs.connection import calc_connection
from calcs.anchorage import calc_anchorage

from calcs.wind_load import compute_wind_loads

_DEBUG_LOG = Path(__file__).parent.parent.parent / "debug_report.log"

def _dlog(msg: str):
    with open(_DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def _set_calc(target: Dict[str, Any], calc_data: Optional[Dict[str, Any]]) -> None:
    if calc_data:
        target["calc"] = calc_data

def _get_profile_sets(data: Dict[str, Any]) -> Tuple[list, list]:
    alum_profiles_data = data.get("alum_profiles_data", data.get("alum_profiles", []))
    steel_profiles_data = data.get("steel_profiles_data", data.get("steel_profiles", []))
    return alum_profiles_data or [], steel_profiles_data or []

def precompute_data(data: Dict[str, Any]) -> Dict[str, Any]:
    wind = data.get("wind") or {}
    computed_wind = compute_wind_loads({**wind, "auto_load": True}, _to_float)
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
            try:
                calc_result = calc_glass_unit(gu, wind_inputs=computed_wind)
                _set_calc(gu, calc_result)
                if calc_result:
                    for key in ("load_x_area2", "load1_x_area2", "load2_x_area2", "wind_load"):
                        if key in calc_result:
                            gu[key] = calc_result[key]
            except (ValueError, TypeError, ZeroDivisionError) as e:
                print(f"[DEBUG] calc_glass_unit error: {e}")
                pass

        for frame in cat.get("frames", []) or []:
            try:
                _dlog(f"frame input: geometry={frame.get('geometry')} length={frame.get('length')} width={frame.get('width')} wind_neg={frame.get('wind_neg')} zone={frame.get('zone')} tran_spacing={frame.get('tran_spacing')}")
                calc_result = calc_frame(frame, alum_profiles_data, steel_profiles_data, wind_inputs=computed_wind)
                _dlog(f"calc_frame result: {calc_result}")
                _set_calc(frame, calc_result)
            except (ValueError, TypeError, ZeroDivisionError) as e:
                _dlog(f"calc_frame error: {e}")
                pass

        frames = cat.get("frames", []) or []
        frame = frames[0] if frames else None

        # Merge frame results into frame dict so connection/anchorage get computed forces
        frame_for_downstream = dict(frame) if frame else {}
        if frame and frame.get("calc"):
            fc = frame["calc"]
            for key in ("joint_fy", "joint_fz", "reaction_Ry", "reaction_Rz"):
                if fc.get(key) is not None:
                    frame_for_downstream[key] = fc[key]
        _dlog(f"frame_for_downstream forces: joint_fy={frame_for_downstream.get('joint_fy')} joint_fz={frame_for_downstream.get('joint_fz')} reaction_Ry={frame_for_downstream.get('reaction_Ry')} reaction_Rz={frame_for_downstream.get('reaction_Rz')}")

        for conn in cat.get("connections", []) or []:
            try:
                calc_result = calc_connection(conn, frame_for_downstream)
                _dlog(f"calc_connection result: {calc_result}")
                _set_calc(conn, calc_result)
            except (ValueError, TypeError, ZeroDivisionError) as e:
                _dlog(f"calc_connection error: {e}")
                pass

        for anchor in cat.get("anchorage", []) or []:
            try:
                _dlog(f"anchor input: clump_type={anchor.get('clump_type')} anchor_dia={anchor.get('anchor_dia')} embed_depth={anchor.get('embed_depth')} h_a={anchor.get('h_a')}")
                calc_result = calc_anchorage(anchor, frame_for_downstream, alum_profiles_data)
                _dlog(f"calc_anchorage result keys: {list(calc_result.keys()) if calc_result else None}")
                _set_calc(anchor, calc_result)
            except (ValueError, TypeError, ZeroDivisionError) as e:
                _dlog(f"calc_anchorage error: {e}")
                pass

    return data

def build_wind_preview(wind: Dict[str, Any]) -> Dict[str, Any]:
    computed_wind = compute_wind_loads(wind or {}, _to_float)
    auto_calc = computed_wind.get("auto_calc")

    if not auto_calc:
        raise ValueError(computed_wind.get("auto_calc_error") or "Unable to compute wind loads")

    return auto_calc
