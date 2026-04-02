import os
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

BASE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

app = FastAPI()
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(FRONTEND_DIR, "templates"))


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
    # Normalise profile_type to match Python function expectations
    profile_type = data.get("profile_type", "").lower()
    # Map JS field names → Python field names
    payload = {
        "profile_type":  "Stick" if profile_type == "stick" else profile_type,
        "profile_name":  data.get("name", ""),
        "web_length":    data.get("d"),
        "flange_length": data.get("b"),
        "web_thk":       data.get("tw"),
        "flange_thk":    data.get("tf"),
        "F_y":           data.get("fy"),
        # manual-only extras
        "tor_constant":  data.get("j"),
        "area":          data.get("a"),
        "I_xx":          data.get("ix"),
        "I_yy":          data.get("iy"),
        "Y":             data.get("y"),
        "X":             data.get("x"),
        "plastic_x":     data.get("plasticX"),
        "plastic_y":     data.get("plasticY"),
        "phi_Mn":        data.get("mnYield"),
    }
    result = calc_alum_profile(payload)
    if result is None:
        return JSONResponse({"error": "Insufficient data"}, status_code=400)
    return result


@app.post("/api/section/calc/steel")
async def api_calc_steel(request: Request):
    data = await _json(request)
    profile_type = data.get("profile_type", "steel-rhs")
    payload = {
        "web_length":    data.get("d"),
        "flange_length": data.get("b"),
        "thk":           data.get("t"),
        "flange_thk":    data.get("tf"),
        "web_thk":       data.get("tw"),
        "F_y":           data.get("fy"),
    }
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


# ---------------------------------------------------------------------------
# Figure Checking
# ---------------------------------------------------------------------------

DEFAULT_FIGURES_DIR = os.path.join(BACKEND_DIR, "app", "report", "figures")
PROFILES_DIR = os.path.join(BACKEND_DIR, "app", "report", "assets", "profiles")
_figures_dir = DEFAULT_FIGURES_DIR
os.makedirs(DEFAULT_FIGURES_DIR, exist_ok=True)
os.makedirs(PROFILES_DIR, exist_ok=True)

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


def _profile_exists(name: str) -> bool:
    return os.path.isfile(os.path.join(PROFILES_DIR, name))


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
async def api_open_folder_picker():
    import subprocess
    try:
        result = subprocess.run(
            ["powershell", "-Command",
             "Add-Type -AssemblyName System.Windows.Forms;"
             "$fbd = New-Object System.Windows.Forms.FolderBrowserDialog;"
             "$fbd.Description = 'Select Figures Directory';"
             "$fbd.ShowNewFolderButton = $true;"
             "if ($fbd.ShowDialog() -eq 'OK') { $fbd.SelectedPath }"],
            capture_output=True, text=True, timeout=60,
        )
        selected = result.stdout.strip()
        if selected and os.path.isdir(selected):
            global _figures_dir
            _figures_dir = selected
            return {"directory": _figures_dir}
        return JSONResponse({"error": "No folder selected"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@app.post("/api/check_figures")
async def api_check_figures(request: Request):
    data = await _json(request)
    categories = data.get("categories", [])
    wind_mode = data.get("wind_mode", "facade")
    figures_dir = data.get("directory", _figures_dir)

    # Validate directory
    if not os.path.isdir(figures_dir):
        return JSONResponse({"error": "Figures directory not found"}, status_code=400)

    figures = []

    # Wind figures
    if wind_mode == "wind":
        figures.append({"name": "wind-map.png", "category": "Wind", "exists": _fig_exists("wind-map.png", figures_dir)})

    # Category-based figures
    for cat in categories:
        idx = cat.get("index", 0)
        cat_label = f"Category {idx}"

        # Reference elevation (always required)
        figures.append({"name": f"{idx}-ref-elev.png", "category": cat_label, "exists": _fig_exists(f"{idx}-ref-elev.png", figures_dir)})

        # Glass RFEM figures (only for Point Fixed support type)
        glass_type = cat.get("glass_type", "sgu")
        support_type = cat.get("support_type", "")
        if support_type == "Point Fixed":
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
