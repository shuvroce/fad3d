from flask import Flask, render_template, request, jsonify
from calculations.alum_profile import calc_alum_profile
from calculations.steel_profile import calc_steel_rhs_profile, calc_steel_iw_profile

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


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


if __name__ == "__main__":
    app.run(debug=True, port=5001)
