import os
import tempfile
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from calcs.alum_profile import calc_alum_profile
from calcs.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile
from calcs.glass import calc_glass_unit
from calcs.frame import calc_frame
from calcs.connection import calc_connection
from calcs.anchorage import calc_anchorage
from calcs.wind_load import compute_wind_loads, location_wind_speeds
from calcs.calc_utils import _to_float
from calcs.calc_helpers import precompute_data

try:
    from tkinter import Tk, PhotoImage
    from tkinter.filedialog import askdirectory
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False

BASE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

app = FastAPI()
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))

# JS field name → Python field name mappings (shared by section calc routes)
ALUM_FIELD_MAP = {
    "name": "profile_name", "d": "web_length", "b": "flange_length",
    "tw": "web_thk", "tf": "flange_thk", "fy": "F_y",
    "j": "tor_constant", "a": "area", "ix": "I_xx", "iy": "I_yy",
    "y": "Y", "x": "X", "plasticX": "plastic_x", "plasticY": "plastic_y",
    "mnYield": "phi_Mn",
}

STEEL_FIELD_MAP = {
    "d": "web_length", "b": "flange_length", "t": "thk",
    "tf": "flange_thk", "tw": "web_thk", "fy": "F_y",
}


async def _json(request: Request) -> dict:
    try:
        return await request.json()
    except Exception:
        return {}


@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/api/wind/locations")
async def api_wind_locations():
    return sorted(location_wind_speeds.keys())


@app.post("/api/section/calc/alum")
async def api_calc_alum(request: Request):
    data = await _json(request)
    profile_type = data.get("profile_type", "").lower()
    payload = {"profile_type": "stick" if profile_type == "stick" else profile_type}
    for js_key, py_key in ALUM_FIELD_MAP.items():
        payload[py_key] = data.get(js_key)
    result = calc_alum_profile(payload)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/section/calc/steel")
async def api_calc_steel(request: Request):
    data = await _json(request)
    profile_type = data.get("profile_type", "steel-rhs")
    payload = {py_key: data.get(js_key) for js_key, py_key in STEEL_FIELD_MAP.items()}
    if profile_type == "steel-rhs":
        result = calc_steel_rhs_profile(payload)
    else:
        result = calc_steel_iw_profile(payload)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/calc/wind")
async def api_calc_wind(request: Request):
    data = await _json(request)
    # Force auto_load so compute_wind_loads runs the full calculation
    data["auto_load"] = True
    try:
        result = compute_wind_loads(data, _to_float)
        auto_calc = result.get("auto_calc")
        if auto_calc:
            return auto_calc
        if result.get("auto_calc_error"):
            return JSONResponse({"error": result["auto_calc_error"]}, status_code=400)
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/calc/glass")
async def api_calc_glass(request: Request):
    data = await _json(request)
    result = calc_glass_unit(data)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/calc/frame")
async def api_calc_frame(request: Request):
    data = await _json(request)
    frame = data.get("frame", {})
    alum_profiles = data.get("alum_profiles", [])
    steel_profiles = data.get("steel_profiles", [])
    result = calc_frame(frame, alum_profiles, steel_profiles)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/calc/connection")
async def api_calc_connection(request: Request):
    data = await _json(request)
    conn = data.get("conn", {})
    frame = data.get("frame", {})
    result = calc_connection(conn, frame)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/calc/anchorage")
async def api_calc_anchorage(request: Request):
    data = await _json(request)
    anchor = data.get("anchor", {})
    frame = data.get("frame", {})
    alum_profiles = data.get("alum_profiles", [])
    result = calc_anchorage(anchor, frame, alum_profiles)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.get("/report/assets/profiles/{filename:path}")
async def serve_profile_image(filename: str):
    path = os.path.join(BACKEND_DIR, "app", "report", "assets", "profiles", filename)
    return FileResponse(path)


@app.get("/report/assets/glass-charts/{chart_dir}/{glass_category}/{support_folder}/{filename}")
async def serve_glass_chart(chart_dir: str, glass_category: str, support_folder: str, filename: str):
    path = os.path.join(BACKEND_DIR, "app", "report", "assets", chart_dir, glass_category, support_folder, filename)
    return FileResponse(path)


# ---------------------------------------------------------------------------
# Figure Checking
# ---------------------------------------------------------------------------

DEFAULT_FIGURES_DIR = os.path.join(BACKEND_DIR, "app", "report", "figures")
_figures_dir = DEFAULT_FIGURES_DIR
os.makedirs(DEFAULT_FIGURES_DIR, exist_ok=True)

SAP_FIGURE_NAMES = [
    "sap-model.png", "sap-release.png", "sap-dead-load.png", "sap-wind-load.png",
    "sap-bmd.png", "sap-sfd.png", "sap-mul-max-moment.png",
    "sap-tran-max-moment.png", "sap-deformed-shape.png", "sap-mul-def.png",
    "sap-tran-def-wind.png", "sap-tran-def-dead.png",
    "sap-joint-force-dead.png", "sap-joint-force-wind.png",
    "sap-reaction-force-dead.png", "sap-reaction-force-wind.png",
]

RFEM_FIGURE_NAMES = [
    "rfem-model-3d.png", "rfem-model-data.png", "rfem-stress.png",
    "rfem-stress-ratio.png", "rfem-def.png", "rfem-def-ratio.png",
]


def _fig_exists(name: str, figures_dir: str) -> bool:
    return os.path.isfile(os.path.join(figures_dir, name))


@app.get("/api/figures/dir")
async def api_get_figures_dir():
    return {"directory": _figures_dir}


@app.post("/api/figures/dir")
async def api_set_figures_dir(request: Request):
    global _figures_dir
    data = await _json(request)
    directory = data.get("directory", "")
    if not directory:
        return JSONResponse({"error": "No directory provided"}, status_code=400)
    if not os.path.isdir(directory):
        return JSONResponse({"error": "Directory does not exist"}, status_code=400)
    _figures_dir = directory
    return {"directory": _figures_dir}


@app.post("/api/figures/open_picker")
async def api_open_folder_picker(request: Request):
    if not TKINTER_AVAILABLE:
        return JSONResponse({"error": "Folder picker not available on this system"}, status_code=400)

    try:
        root = Tk()  # type: ignore[name-defined]
        root.withdraw()
        root.attributes("-topmost", True)
        selected_dir = askdirectory(title="Select Figures Directory", mustexist=True)  # type: ignore[name-defined]
        root.destroy()

        if not selected_dir or not os.path.isdir(selected_dir):
            return JSONResponse({"error": "No folder selected or folder does not exist"}, status_code=400)

        global _figures_dir
        _figures_dir = selected_dir
        return {"directory": _figures_dir}
    except Exception as e:
        return JSONResponse({"error": f"Error opening folder picker: {str(e)}"}, status_code=500)


def _get_stick_profile_figures(profile_name):
    clean_name = profile_name.strip()
    return [{"name": f"{clean_name}.png", "category": "Aluminum Profile", "exists": False}]

def _get_manual_profile_figures(profile_name):
    clean_name = profile_name.strip()
    suffixes = [".png", "-wp.png", "p.png", "-lb-web.png", "-lb-flange.png",
                "-lb-table.png", "-lb-web-cap.png", "-lb-flange-cap.png"]
    return [{"name": f"{clean_name}{s}", "category": "Aluminum Profile", "exists": False} for s in suffixes]


@app.post("/api/check_figures")
async def api_check_figures(request: Request):
    data = await _json(request)
    categories = data.get("categories", [])
    alum_profiles = data.get("alum_profiles", [])
    figures_dir = data.get("directory", _figures_dir)

    # Validate directory
    if not os.path.isdir(figures_dir):
        return JSONResponse({"error": "Figures directory not found"}, status_code=400)

    figures = []

    # 1. Wind figures (always included)
    figures.append({"name": "wind-location-map.png", "category": "Wind", "exists": _fig_exists("wind-location-map.png", figures_dir)})

    # 2. Aluminum profile figures (stick and manual types from defined profiles)
    for prof in alum_profiles:
        prof_name = prof.get("name", "")
        prof_type = prof.get("profileType", "stick")
        if not prof_name:
            continue
        if prof_type == "stick":
            for fig in _get_stick_profile_figures(prof_name):
                fig["exists"] = _fig_exists(fig["name"], figures_dir)
                figures.append(fig)
        elif prof_type == "manual":
            for fig in _get_manual_profile_figures(prof_name):
                fig["exists"] = _fig_exists(fig["name"], figures_dir)
                figures.append(fig)

    # 3. Category-based figures
    for cat in categories:
        idx = cat.get("index", 0)
        cat_label = f"Category {idx}"

        # Reference elevation (always required)
        figures.append({"name": f"{idx}-ref-elev.png", "category": cat_label, "exists": _fig_exists(f"{idx}-ref-elev.png", figures_dir)})

        # Glass RFEM figures (only for point-fixed support type)
        glass_type = cat.get("glass_type", "sgu")
        support_type = cat.get("support_type", "")
        if support_type == "point-fixed":
            for g_idx in range(1, 3 if glass_type in ("dgu", "ldgu") else 2):
                for fig_name in RFEM_FIGURE_NAMES:
                    full_name = f"{idx}.{g_idx}-{fig_name}"
                    figures.append({"name": full_name, "category": f"{cat_label} - Glass {g_idx}", "exists": _fig_exists(full_name, figures_dir)})

        # SAP figures (irregular geometry)
        frame_geometry = cat.get("frame_geometry", "regular")
        if frame_geometry != "regular":
            for fig_name in SAP_FIGURE_NAMES:
                full_name = f"{idx}-{fig_name}"
                figures.append({"name": full_name, "category": cat_label, "exists": _fig_exists(full_name, figures_dir)})

        # Profile cross-section figure (only for Aluminum + Steel mullion)
        mullion_name = cat.get("mullion_name", "")
        mullion_type = cat.get("mullion_type", "")
        steel_name = cat.get("steel_name", "")
        if mullion_name and mullion_type == "Aluminum + Steel" and steel_name:
            steel_thickness = steel_name.split("x")[-1] if "x" in steel_name else steel_name
            fig_name = f"{mullion_name}+RHS {steel_thickness}.png"
            figures.append({"name": fig_name, "category": cat_label, "exists": _fig_exists(fig_name, figures_dir)})

    # Summary
    total = len(figures)
    found = sum(1 for f in figures if f["exists"])
    return {"success": True, "figures": figures, "total": total, "found": found}


# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------

REPORT_DIR = os.path.join(BACKEND_DIR, "app", "report")
REPORT_TEMPLATE_DIR = os.path.join(REPORT_DIR, "templates")
DEFAULT_INPUTS_DIR = os.path.join(REPORT_TEMPLATE_DIR, "inputs")
PROFILE_YAML = os.path.join(REPORT_DIR, "assets", "profile.yaml")
CSS_PATH = os.path.join(REPORT_DIR, "css", "report.css")


def _load_profile_data():
    if not os.path.exists(PROFILE_YAML):
        return {}
    import yaml
    with open(PROFILE_YAML, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _build_report_data(raw_data: dict, include_summary: bool = False) -> dict:
    def _num(v):
        if v is None or v == '':
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    categories_raw = raw_data.get("categories", [])
    alum_sections = raw_data.get("alumSections", raw_data.get("alum_profiles", []))
    steel_sections = raw_data.get("steelSections", raw_data.get("steel_profiles", []))
    wind_inputs = raw_data.get("windInputs", raw_data.get("wind", {}))
    wind_numeric_fields = [
        'b_length', 'b_width', 'b_height', 'K_d', 'GC_pi', 'b_freq', 'damping',
        'topo_height', 'topo_length', 'topo_distance',
    ]
    for field in wind_numeric_fields:
        if field in wind_inputs:
            wind_inputs[field] = _num(wind_inputs[field])
    general_info = raw_data.get("generalInfo", {})
    report_includes = general_info.get("reportIncludes", {})
    materials = raw_data.get("materials", [])

    def _num(v):
        if v is None or v == '':
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    def _fmt_thk(v):
        """Format thickness as integer string if whole number, else decimal (for chart filename lookup)."""
        n = _num(v)
        if n is None:
            return ""
        return str(int(n)) if n == int(n) else str(n)

    def _resolve_fy(grade_name):
        if not grade_name:
            return None
        mat = next((m for m in materials if m.get("name") == grade_name), None)
        if mat:
            return _num(mat.get("fy"))
        return None

    alum_profiles_data = []
    for sec in alum_sections:
        ix_val = _num(sec.get("ix"))
        iy_val = _num(sec.get("iy"))
        mn_val = _num(sec.get("mnYield"))
        fy_val = _resolve_fy(sec.get("grade"))
        _raw_type = sec.get("profileType", "stick")
        profile = {
            "profile_type": "Pre-defined" if _raw_type == "predefined" else _raw_type,
            "profile_name": sec.get("name", ""),
            "web_length": _num(sec.get("d")),
            "flange_length": _num(sec.get("b")),
            "web_thk": _num(sec.get("tw")),
            "flange_thk": _num(sec.get("tf")),
            "F_y": fy_val,
            "tor_constant": _num(sec.get("j")),
            "area": _num(sec.get("a")),
            "I_xx": ix_val,
            "I_yy": iy_val,
            "Y": _num(sec.get("y")),
            "X": _num(sec.get("x")),
            "plastic_x": _num(sec.get("plasticX")),
            "plastic_y": _num(sec.get("plasticY")),
            "phi_Mn": mn_val,
            "computed_I_xx": ix_val,
            "computed_I_yy": iy_val,
            "computed_phi_Mn": mn_val,
        }
        alum_profiles_data.append(profile)

    steel_profiles_data = []
    for sec in steel_sections:
        steel_fy_val = _resolve_fy(sec.get("grade"))
        profile = {
            "profile_type": sec.get("profileType", "steel-rhs").replace("steel-", ""),
            "profile_name": sec.get("name", ""),
            "web_length": _num(sec.get("d")),
            "flange_length": _num(sec.get("b")),
            "thk": _num(sec.get("t")),
            "flange_thk": _num(sec.get("tf")),
            "web_thk": _num(sec.get("tw")),
            "F_y": steel_fy_val,
            "computed_I_xx": _num(sec.get("ix")),
            "computed_I_yy": _num(sec.get("iy")),
            "computed_phi_Mn": _num(sec.get("mnYield")),
        }
        steel_profiles_data.append(profile)

    categories = []
    for cat in categories_raw:
        cat_num = cat.get("index", cat.get("num", 0))
        cat_name = cat.get("name", f"Category {cat_num}")
        inputs = cat.get("inputs", {})

        glass_units = []
        glass_type = inputs.get(f"cat{cat_num}-glass-type", "sgu")
        prefix = f"cat{cat_num}-glass-{glass_type}"

        gu = {
            "glass_type": glass_type,
            "length": _num(inputs.get(f"{prefix}-length")),
            "width": _num(inputs.get(f"{prefix}-width")),
            "wind_load": _num(inputs.get(f"{prefix}-wind_load")),
            "def_criteria": _num(inputs.get("settings-glass-defl-ratio")) or 60,
            "support_type": inputs.get(f"{prefix}-support_type"),
            "calc_mode": inputs.get(f"cat{cat_num}-glass-calc-mode", "auto"),
        }

        if glass_type == "sgu":
            gu.update({
                "thickness": _num(inputs.get(f"{prefix}-thickness")),
                "chart_thickness": _fmt_thk(inputs.get(f"{prefix}-thickness")),
                "grade": inputs.get(f"{prefix}-grade"),
                "nfl": _num(inputs.get(f"{prefix}-nfl")),
                "def": _num(inputs.get(f"{prefix}-def")),
            })
        elif glass_type == "lgu":
            t1 = _num(inputs.get(f"{prefix}-thickness1"))
            t2 = _num(inputs.get(f"{prefix}-thickness2"))
            chart_thk = (t1 or 0) + (t2 or 0)
            gu.update({
                "grade": inputs.get(f"{prefix}-grade"),
                "nfl": _num(inputs.get(f"{prefix}-nfl")),
                "def": _num(inputs.get(f"{prefix}-def")),
                "thickness1": t1,
                "thickness_inner": _num(inputs.get(f"{prefix}-thickness_inner")),
                "thickness2": t2,
                "chart_thickness": _fmt_thk(chart_thk) if chart_thk else "",
            })
        elif glass_type == "dgu":
            t1 = _num(inputs.get(f"{prefix}-thickness1"))
            t2 = _num(inputs.get(f"{prefix}-thickness2"))
            gu.update({
                "grade1": inputs.get(f"{prefix}-grade1"),
                "grade2": inputs.get(f"{prefix}-grade2"),
                "thickness1": t1,
                "chart_thickness1": _fmt_thk(t1),
                "gap": _num(inputs.get(f"{prefix}-gap")),
                "thickness2": t2,
                "chart_thickness2": _fmt_thk(t2),
                "nfl1": _num(inputs.get(f"{prefix}-nfl1")),
                "nfl2": _num(inputs.get(f"{prefix}-nfl2")),
                "def1": _num(inputs.get(f"{prefix}-def1")),
                "def2": _num(inputs.get(f"{prefix}-def2")),
            })
        elif glass_type == "ldgu":
            t1_1 = _num(inputs.get(f"{prefix}-thickness1_1"))
            t1_2 = _num(inputs.get(f"{prefix}-thickness1_2"))
            t2 = _num(inputs.get(f"{prefix}-thickness2"))
            chart_thk = (t1_1 or 0) + (t1_2 or 0)
            gu.update({
                "grade1": inputs.get(f"{prefix}-grade1"),
                "grade2": inputs.get(f"{prefix}-grade2"),
                "thickness1_1": t1_1,
                "thickness_inner": _num(inputs.get(f"{prefix}-thickness_inner")),
                "thickness1_2": t1_2,
                "gap": _num(inputs.get(f"{prefix}-gap")),
                "thickness2": t2,
                "chart_thickness": _fmt_thk(chart_thk) if chart_thk else "",
                "chart_thickness2": _fmt_thk(t2),
                "nfl1": _num(inputs.get(f"{prefix}-nfl1")),
                "nfl2": _num(inputs.get(f"{prefix}-nfl2")),
                "def1": _num(inputs.get(f"{prefix}-def1")),
                "def2": _num(inputs.get(f"{prefix}-def2")),
            })

        glass_units.append(gu)

        frame_variant = inputs.get(f"cat{cat_num}-frame-geometry", "regular")
        mullion_type = inputs.get(f"cat{cat_num}-frame-mullion-type", "alu")
        frame_type = inputs.get(f"cat{cat_num}-frame-frame-type", "cont")
        frame_prefix = f"cat{cat_num}-frame-{frame_variant}-{mullion_type}"

        mullion_name = inputs.get(f"{frame_prefix}-mullion") or ""
        transom_name = inputs.get(f"{frame_prefix}-transom") or ""
        steel_name = inputs.get(f"{frame_prefix}-steel") or ""

        mullion_profile = next((p for p in alum_profiles_data if p.get("profile_name") == mullion_name), None)
        transom_profile = next((p for p in alum_profiles_data if p.get("profile_name") == transom_name), None)
        steel_profile = next((p for p in steel_profiles_data if p.get("profile_name") == steel_name), None)

        _zone_map = {
            "zone4": "Zone 4 (Wall Mid Zone)", "zone5": "Zone 5 (Wall Edge Zone)",
            "zone1": "Zone 1 (Roof Mid Zone)", "zone2": "Zone 2 (Roof Edge Zone)",
            "zone3": "Zone 3 (Roof Corner Zone)",
        }
        _sys_map = {"semi-uni": "Semi-unitized", "uni": "Unitized", "stick": "Stick"}
        frame = {
            "geometry": frame_variant,
            "mullion_type": "Aluminum + Steel" if mullion_type == "alu-steel" else "Aluminum Only",
            "frame_type": "Floor-to-floor" if frame_type == "sfgp" else "Continuous",
            "zone": _zone_map.get(inputs.get(f"cat{cat_num}-general-zone", ""), inputs.get(f"cat{cat_num}-general-zone", "")),
            "system_type": _sys_map.get(inputs.get(f"cat{cat_num}-frame-system-type", ""), ""),
            "width": _num(inputs.get(f"{frame_prefix}-width")),
            "length": _num(inputs.get(f"{frame_prefix}-length")),
            "wind_neg": _num(inputs.get(f"{frame_prefix}-wind_neg")),
            "wind_neg_str": inputs.get(f"{frame_prefix}-wind_neg") or "",
            "wind_pos": _num(inputs.get(f"{frame_prefix}-wind_pos")),
            "wind_pos_str": inputs.get(f"{frame_prefix}-wind_pos") or "",
            "glass_thk": _num(inputs.get(f"{frame_prefix}-glass_thk")),
            "tran_spacing": _num(inputs.get(f"{frame_prefix}-tran_spacing")),
            "mullion": mullion_profile,
            "transom": transom_profile,
            "steel": steel_profile,
            "mullion_name": mullion_name,
            "transom_name": transom_name,
            "steel_name": steel_name,
            "mul_mu": _num(inputs.get(f"{frame_prefix}-mul_mu")),
            "mul_vu": _num(inputs.get(f"{frame_prefix}-mul_vu")),
            "mul_def": _num(inputs.get(f"{frame_prefix}-mul_def")),
            "tran_mu": _num(inputs.get(f"{frame_prefix}-tran_mu")),
            "tran_vu": _num(inputs.get(f"{frame_prefix}-tran_vu")),
            "tran_def_wind": _num(inputs.get(f"{frame_prefix}-tran_def_wind")),
            "tran_def_dead": _num(inputs.get(f"{frame_prefix}-tran_def_dead")),
            "joint_fy": _num(inputs.get(f"{frame_prefix}-joint_fy")),
            "joint_fz": _num(inputs.get(f"{frame_prefix}-joint_fz")),
            "reaction_Ry": _num(inputs.get(f"{frame_prefix}-reaction_Ry")),
            "reaction_Rz": _num(inputs.get(f"{frame_prefix}-reaction_Rz")),
        }

        frames = [frame]

        conn_prefix = f"cat{cat_num}-conn"
        connection = {
            "cleat_size": inputs.get(f"{conn_prefix}-cleat-size"),
            "screw_nos": _num(inputs.get(f"{conn_prefix}-nos")),
            "screw_dia": _num(inputs.get(f"{conn_prefix}-screw-dia")),
            "head_dia": _num(inputs.get(f"{conn_prefix}-screw-head-dia")),
            "t1": _num(inputs.get(f"{conn_prefix}-t1")),
            "t2": _num(inputs.get(f"{conn_prefix}-t2")),
            "tc": _num(inputs.get(f"{conn_prefix}-tc")),
        }
        connections = [connection]

        clump_value = inputs.get(f"cat{cat_num}-anchor-type", "box-clump")
        clump_display = {"box-clump": "Box Clump", "u-clump": "U Clump", "l-clump": "L Clump"}.get(clump_value, "Box Clump")
        anchor_prefix = f"cat{cat_num}-anchor-{clump_value}"

        anchorage = {
            "clump_type": clump_display,
            "anchor_dia": _num(inputs.get(f"{anchor_prefix}-anchor_dia")),
            "embed_depth": _num(inputs.get(f"{anchor_prefix}-embed_depth")),
            "N_p5": _num(inputs.get(f"{anchor_prefix}-N_p5")),
            "h_a": _num(inputs.get(f"{anchor_prefix}-h_a")),
            "bp_thk": _num(inputs.get(f"{anchor_prefix}-bp_thk")),
            "anchor_nos": _num(inputs.get(f"{anchor_prefix}-anchor_nos")),
            "C_a1": _num(inputs.get(f"{anchor_prefix}-C_a1")),
            "C_a2": _num(inputs.get(f"{anchor_prefix}-C_a2")),
            # U Clump and L Clump shared
            "fin_thk": _num(inputs.get(f"{anchor_prefix}-fin_thk")),
            "fin_e": _num(inputs.get(f"{anchor_prefix}-fin_e")),
            "thr_bolt_dia": _num(inputs.get(f"{anchor_prefix}-thr_bolt_dia")),
            # L Clump specific
            "front_bp_length_N": _num(inputs.get(f"{anchor_prefix}-front_bp_length_N")),
            "front_bp_width_B": _num(inputs.get(f"{anchor_prefix}-front_bp_width_B")),
            "top_bp_width_B": _num(inputs.get(f"{anchor_prefix}-top_bp_width_B")),
            "top_anchor_nos": _num(inputs.get(f"{anchor_prefix}-top_anchor_nos")),
            "front_C_a1": _num(inputs.get(f"{anchor_prefix}-front_C_a1")),
            "top_C_a1": _num(inputs.get(f"{anchor_prefix}-top_C_a1")),
        }

        categories.append({
            "category_name": cat_name,
            "glass_units": glass_units,
            "frames": frames,
            "connections": connections,
            "anchorage": [anchorage],
        })

    include = {
        "toc": report_includes.get("toc", False),
        "intro": report_includes.get("intro", True),
        "moment_capacity": report_includes.get("moment-capacity", False),
        "wind_pressure": report_includes.get("wind-pressure", False),
        "categories": report_includes.get("categories", True),
        "reference": report_includes.get("reference", False),
    }

    project_info = {
        "project_name": general_info.get("projectName", ""),
        "project_number": general_info.get("projectNumber", ""),
        "ref_no": general_info.get("projectNumber", ""),
        "rev_no": general_info.get("rev", ""),
        "date": general_info.get("date", ""),
        "location": general_info.get("location", ""),
        "client": general_info.get("client", ""),
        "project_client": general_info.get("client", ""),
        "description": general_info.get("description", ""),
        "company_name": general_info.get("companyName", ""),
        "company_address1": general_info.get("companyAddress1", ""),
        "company_address2": general_info.get("companyAddress2", ""),
        "company_address3": general_info.get("companyAddress3", ""),
        "company_website": general_info.get("companyWebsite", ""),
        "company_email": general_info.get("companyEmail", ""),
        "prepared_name": general_info.get("preparedName", ""),
        "prepared_title": general_info.get("preparedTitle", ""),
        "prepared_reg": general_info.get("preparedReg", ""),
        "checked_name": general_info.get("checkedName", ""),
        "checked_title": general_info.get("checkedTitle", ""),
        "checked_reg": general_info.get("checkedReg", ""),
        "logo_url": general_info.get("logoDataUrl") or Path(os.path.join(FRONTEND_DIR, "static", "assets", "logo.png")).as_uri(),
    }

    data = {
        "project_info": project_info,
        "categories": categories,
        "alum_profiles_data": alum_profiles_data,
        "steel_profiles_data": steel_profiles_data,
        "wind": wind_inputs,
        "include": include,
    }

    if not include_summary:
        profile_data = _load_profile_data()
        if profile_data:
            merged = {}
            merged.update(profile_data)
            merged.update(data)
            data = merged

    return data


def _generate_pdf(data: dict, template_name: str) -> str:
    from jinja2 import Environment, FileSystemLoader, Undefined
    from weasyprint import HTML, CSS
    import pikepdf

    class SilentUndefined(Undefined):
        def __float__(self):
            return 0.0
        def __int__(self):
            return 0
        def __add__(self, other):
            return SilentUndefined()
        def __radd__(self, other):
            return SilentUndefined()
        def __sub__(self, other):
            return SilentUndefined()
        def __rsub__(self, other):
            return SilentUndefined()
        def __mul__(self, other):
            return SilentUndefined()
        def __rmul__(self, other):
            return SilentUndefined()
        def __truediv__(self, other):
            return SilentUndefined()
        def __rtruediv__(self, other):
            return SilentUndefined()
        def __mod__(self, other):
            return SilentUndefined()
        def __rmod__(self, other):
            return SilentUndefined()
        def __pow__(self, other):
            return SilentUndefined()
        def __rpow__(self, other):
            return SilentUndefined()
        def __gt__(self, other):
            return False
        def __lt__(self, other):
            return False
        def __ge__(self, other):
            return False
        def __le__(self, other):
            return False
        def __eq__(self, other):
            return other is None or isinstance(other, SilentUndefined)
        def __ne__(self, other):
            return not self.__eq__(other)
        def __neg__(self):
            return SilentUndefined()
        def __abs__(self):
            return SilentUndefined()
        def __bool__(self):
            return False
        def __str__(self):
            return "N/A"
        def __repr__(self):
            return "N/A"

    class ZeroFloat(float):
        """Float that acts like SilentUndefined when used in arithmetic."""
        def __add__(self, other):
            return SilentUndefined()
        def __radd__(self, other):
            return SilentUndefined()
        def __sub__(self, other):
            return SilentUndefined()
        def __rsub__(self, other):
            return SilentUndefined()
        def __mul__(self, other):
            return SilentUndefined()
        def __rmul__(self, other):
            return SilentUndefined()
        def __truediv__(self, other):
            return SilentUndefined()
        def __rtruediv__(self, other):
            return SilentUndefined()
        def __mod__(self, other):
            return SilentUndefined()
        def __pow__(self, other):
            return SilentUndefined()
        def __gt__(self, other):
            return False
        def __lt__(self, other):
            return False
        def __ge__(self, other):
            return False
        def __le__(self, other):
            return False
        def __eq__(self, other):
            return other == 0.0 or isinstance(other, SilentUndefined)
        def __ne__(self, other):
            return not self.__eq__(other)
        def __neg__(self):
            return SilentUndefined()
        def __abs__(self):
            return SilentUndefined()
        def __bool__(self):
            return False
        def __str__(self):
            return "N/A"
        def __repr__(self):
            return "N/A"

    _ZERO = ZeroFloat(0.0)

    title = "Structural Calculation & Design Report"
    author = "Md. Akram Hossain"

    data = precompute_data(data)

    def _ensure_calc(item, defaults=None):
        if "calc" not in item or item["calc"] is None:
            item["calc"] = {k: _ZERO for k in (defaults or {})}
        elif defaults:
            for k in defaults:
                if k not in item["calc"] or item["calc"][k] is None:
                    item["calc"][k] = _ZERO

    _anchor_defaults = {
        "reaction_Ry": 0.0, "reaction_Rz": 0.0, "design_Ry": 0.0, "design_Rz": 0.0,
        "bp_length": 0.0, "bp_width": 0.0, "N_ua": 0.0, "N_ug": 0.0, "V_ua": 0.0, "V_ug": 0.0,
        "phi_Nsa": 0.0, "phi_Ncbg": 0.0, "phi_Npn": 0.0, "phi_Vsa": 0.0, "phi_Vcbg": 0.0, "phi_Vcp": 0.0,
        "interaction": 0.0, "bp_t_req_bear": 0.0, "bp_t_req_tension": 0.0,
        "bp_Pu": 0.0, "bp_fp_max": 0.0,
        "e_f1": 0.0, "e_f2": 0.0, "e_t1": 0.0, "e_t2": 0.0, "Bx": 0.0, "Ax": 0.0, "By": 0.0, "Ay": 0.0,
        "bolt_Vu": 0.0, "bolt_phi_Rn_shear": 0.0, "bolt_phi_Rn_bear": 0.0,
        "thr_bolt_AseN": 0.0,
        "top_phi_Ncbg": 0.0, "front_phi_Ncbg": 0.0, "A_seN": 0.0,
        "beta_N1": 0.0, "beta_N2": 0.0, "beta_N3": 0.0,
        "beta_V1": 0.0, "beta_V2": 0.0, "beta_V3": 0.0,
        "beta_N": 0.0, "beta_V": 0.0,
        "A_NC": 0.0, "A_NCO": 0.0, "psi_edN": 0.0, "N_b": 0.0,
        "A_VC": 0.0, "A_VCO": 0.0, "psi_edV": 0.0, "psi_hV": 0.0, "l_e": 0.0, "V_b": 0.0,
        "bp_d": 0.0, "bp_b": 0.0, "bp_m": 0.0, "bp_n": 0.0, "bp_lambda_n": 0.0, "bp_l": 0.0,
        "bp_q": 0.0, "bp_bearing_Mu": 0.0, "bp_A1": 0.0,
        "bolt_phi_Rn_bear": 0.0, "thr_Vh": 0.0, "thr_Vv": 0.0, "thr_Ab": 0.0,
        "thr_bearing_lc": 0.0, "thr_bearing_phi_Rn1": 0.0, "thr_bearing_phi_Rn2": 0.0,
        "thr_bolt_nos": 0.0, "thr_bolt_length": 0.0,
        "fin_Vu": 0.0, "fin_Vh": 0.0, "fin_Vv": 0.0, "fin_t_req": 0.0, "fin_thk": 0.0,
        "fin_phi_Rn_yield": 0.0, "fin_phi_Rn_rupture": 0.0, "fin_phi_Rn_block": 0.0,
        "fin_Mu": 0.0, "fin_length": 0.0, "fin_width": 0.0, "fin_dh": 0.0,
        "fin_rupture_Anv": 0.0, "fin_bgv": 0.0, "fin_bnt": 0.0,
        "fin_block_Anv": 0.0, "fin_block_Ant": 0.0,
        "fin_block_phi_Rn1": 0.0, "fin_block_phi_Rn2": 0.0,
        "weld_fn": 0.0, "weld_fv": 0.0, "weld_fb": 0.0, "weld_fR": 0.0, "weld_phi_Rn": 0.0,
        "bp_Tu": 0.0, "bp_x": 0.0, "bp_Beff": 0.0, "bp_tension_Mu": 0.0,
        "top_N_ua": 0.0, "top_N_ug": 0.0, "top_V_ua": 0.0, "top_V_ug": 0.0,
        "top_phi_Nsa": 0.0, "top_psi_edN": 0.0, "top_N_b": 0.0, "top_A_NC": 0.0,
        "front_N_ua": 0.0, "front_N_ug": 0.0, "front_V_ua": 0.0, "front_V_ug": 0.0,
        "front_phi_Nsa": 0.0, "front_psi_edN": 0.0, "front_N_b": 0.0, "front_A_NC": 0.0,
        "top_beta_N1": 0.0, "top_beta_N2": 0.0, "top_beta_N3": 0.0,
        "top_beta_V1": 0.0, "top_beta_V2": 0.0, "top_beta_V3": 0.0,
        "top_beta_N": 0.0, "top_beta_V": 0.0, "top_interaction": 0.0,
        "front_beta_N1": 0.0, "front_beta_N2": 0.0, "front_beta_N3": 0.0,
        "front_beta_V1": 0.0, "front_beta_V2": 0.0, "front_beta_V3": 0.0,
        "front_beta_N": 0.0, "front_beta_V": 0.0, "front_interaction": 0.0,
    }
    _frame_defaults = {
        "mul_mu": 0.0, "mul_vu": 0.0, "mul_def": 0.0, "mul_allow_def": 0.0,
        "tran_mu": 0.0, "tran_vu": 0.0, "tran_def_wind": 0.0, "tran_def_dead": 0.0, "tran_allow_def": 0.0,
        "mul_dc": 0.0, "tran_dc": 0.0, "reaction_Ry": 0.0, "reaction_Rz": 0.0,
        "joint_fy": 0.0, "joint_fz": 0.0,
    }
    _conn_defaults = {
        "Vu": 0.0, "phi_Pnv": 0.0, "phi_Pnot": 0.0, "phi_Pnov": 0.0,
        "beta_pullover": 0.0, "beta_pullout": 0.0, "joint_fy": 0.0, "joint_fz": 0.0,
        "R_zA": 0.0,
    }
    _glass_defaults = {
        "stress_ratio": 0.0, "def_ratio": 0.0, "allow_def": 0.0, "deflection": 0.0,
    }

    for cat in data.get("categories", []):
        for gu in cat.get("glass_units", []) or []:
            _ensure_calc(gu, _glass_defaults)
        for frame in cat.get("frames", []) or []:
            _ensure_calc(frame, _frame_defaults)
        for conn in cat.get("connections", []) or []:
            _ensure_calc(conn, _conn_defaults)
        for anchor in cat.get("anchorage", []) or []:
            _ensure_calc(anchor, _anchor_defaults)

    wind_data = data.get("wind", {})
    if "calc" not in wind_data:
        wind_data["calc"] = {
            "summary": {
                "wind_speed": 0.0, "velocity_pressure": 0.0, "design_pressure": 0.0,
                "Imp_factor": 0.0, "gust_factor": 0.0, "C_pl": 0.0,
                "C_pw": 0.0, "C_ps": 0.0, "K_h": 0.0, "K_ht": 0.0,
                "q_h": 0.0, "P_hi": 0.0, "P_hl": 0.0, "P_hs": 0.0,
            },
            "K_z": 0.0, "K_zt": 0.0, "K_d": 0.0, "q_z": 0.0, "GC_pi": 0.0,
            "GC_pf": 0.0, "p_net": 0.0, "p_pos": 0.0, "p_neg": 0.0,
        }
    elif "summary" not in wind_data.get("calc", {}):
        wind_data["calc"]["summary"] = {
            "wind_speed": 0.0, "velocity_pressure": 0.0, "design_pressure": 0.0,
            "Imp_factor": 0.0, "gust_factor": 0.0, "C_pl": 0.0,
            "C_pw": 0.0, "C_ps": 0.0, "K_h": 0.0, "K_ht": 0.0,
            "q_h": 0.0, "P_hi": 0.0, "P_hl": 0.0, "P_hs": 0.0,
        }

    if "alum_profiles_data" in data and "alum_profiles" not in data:
        data["alum_profiles"] = data["alum_profiles_data"]
    if "steel_profiles_data" in data and "steel_profiles" not in data:
        data["steel_profiles"] = data["steel_profiles_data"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.close()

    try:
        env = Environment(loader=FileSystemLoader(REPORT_TEMPLATE_DIR), undefined=SilentUndefined)

        def safe_round(value, places=2):
            try:
                if value is None or (isinstance(value, (int, float)) and value == 0):
                    return "N/A"
                return round(float(value), places)
            except (TypeError, ValueError, ZeroDivisionError):
                return "N/A"

        def safe_div(a, b):
            try:
                if a is None or b is None or b == 0:
                    return None
                return a / b
            except (TypeError, ZeroDivisionError):
                return None

        env.filters['round'] = safe_round
        env.filters['safe_div'] = safe_div

        template = env.get_template(template_name)
        inputs_uri = Path(_figures_dir).as_uri()
        data["inputs_dir"] = inputs_uri
        html_out = template.render(data)

        HTML(string=html_out, base_url=REPORT_DIR).write_pdf(
            tmp.name, stylesheets=[CSS(filename=CSS_PATH)]
        )

        with pikepdf.Pdf.open(tmp.name, allow_overwriting_input=True) as pdf:
            pdf.docinfo["/Title"] = title
            pdf.docinfo["/Author"] = author
            pdf.Root.PageMode = pikepdf.Name("/UseOutlines")
            pdf.Root.PageLayout = pikepdf.Name("/SinglePage")
            if "/Outlines" in pdf.Root and "/First" in pdf.Root.Outlines:
                pdf.Root.Outlines.Count = 0
                _collapse_outlines(pdf.Root.Outlines.First)
            pdf.save(tmp.name)

        return tmp.name
    except Exception:
        if os.path.exists(tmp.name):
            os.remove(tmp.name)
        raise


def _collapse_outlines(item):
    while item:
        if "/First" in item:
            item.Count = 0
            _collapse_outlines(item.First)
        if "/Next" in item:
            item = item.Next
        else:
            break


@app.post("/api/report/generate")
async def api_generate_report(request: Request):
    data = await _json(request)
    try:
        report_data = _build_report_data(data, include_summary=False)
        pdf_path = _generate_pdf(report_data, "full-report.html")
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename="structural-report.pdf",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/report/generate/summary")
async def api_generate_summary_report(request: Request):
    data = await _json(request)
    try:
        report_data = _build_report_data(data, include_summary=True)
        pdf_path = _generate_pdf(report_data, "summary-report.html")
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename="structural-summary-report.pdf",
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
