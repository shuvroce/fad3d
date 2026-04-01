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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
