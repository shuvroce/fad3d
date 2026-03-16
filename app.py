from flask import Flask, render_template, request, jsonify
from calculations.alum_profile import calc_alum_profile
from calculations.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile
from calculations.glass import calc_glass_unit
from calculations.frame import calc_frame
from calculations.connection import calc_connection
from calculations.anchorage import calc_anchorage
from calculations.wind_load import compute_wind_loads, location_wind_speeds
from calculations.calc_utils import _to_float

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/wind/locations")
def api_wind_locations():
    return jsonify(sorted(location_wind_speeds.keys()))


@app.route("/api/section/calc/alum", methods=["POST"])
def api_calc_alum():
    data = request.get_json(silent=True) or {}
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
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


@app.route("/api/section/calc/steel", methods=["POST"])
def api_calc_steel():
    data = request.get_json(silent=True) or {}
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
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


@app.route("/api/calc/wind", methods=["POST"])
def api_calc_wind():
    data = request.get_json(silent=True) or {}
    # Force auto_load so compute_wind_loads runs the full calculation
    data["auto_load"] = True
    try:
        result = compute_wind_loads(data, _to_float)
        auto_calc = result.get("auto_calc")
        if auto_calc:
            return jsonify(auto_calc)
        if result.get("auto_calc_error"):
            return jsonify({"error": result["auto_calc_error"]}), 400
        return jsonify({"error": "Insufficient data"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/calc/glass", methods=["POST"])
def api_calc_glass():
    data = request.get_json(silent=True) or {}
    result = calc_glass_unit(data)
    if result is None:
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


@app.route("/api/calc/frame", methods=["POST"])
def api_calc_frame():
    data = request.get_json(silent=True) or {}
    frame = data.get("frame", {})
    alum_profiles = data.get("alum_profiles", [])
    steel_profiles = data.get("steel_profiles", [])
    result = calc_frame(frame, alum_profiles, steel_profiles)
    if result is None:
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


@app.route("/api/calc/connection", methods=["POST"])
def api_calc_connection():
    data = request.get_json(silent=True) or {}
    conn = data.get("conn", {})
    frame = data.get("frame", {})
    result = calc_connection(conn, frame)
    if result is None:
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


@app.route("/api/calc/anchorage", methods=["POST"])
def api_calc_anchorage():
    data = request.get_json(silent=True) or {}
    anchor = data.get("anchor", {})
    frame = data.get("frame", {})
    alum_profiles = data.get("alum_profiles", [])
    result = calc_anchorage(anchor, frame, alum_profiles)
    if result is None:
        return jsonify({"error": "Insufficient data"}), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
