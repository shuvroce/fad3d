import os
import yaml
import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
import pikepdf
from calc_helpers import (
    calc_steel_profile,
    calc_alum_profile,
    calc_glass_unit,
    calc_frame,
    calc_connection,
    calc_anchorage,
)
from wind_load import (
    compute_mwfrs_pressures,
    compute_cladding_pressures,
    parse_floor_heights,
    location_wind_speeds,
)

BASE_DIR = os.path.dirname(__file__)
INPUT_YAML = os.path.join(BASE_DIR, "input.yaml")
OUT_PDF = os.path.join(BASE_DIR, "report.pdf")
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
PROFILE_YAML = os.path.join(TEMPLATE_DIR, "assets", "profile.yaml")
CSS_PATH = os.path.join(TEMPLATE_DIR, "assets", "css", "report.css")


def _as_bool(value):
    if isinstance(value, str):
        return value.strip().lower() in {"yes", "true", "1", "on", "y"}
    return bool(value)

def _to_float(val, default=0.0):
    try:
        if val is None:
            return default
        return float(val)
    except (TypeError, ValueError):
        return default

def collapse_outlines(item):
    while item:
        if "/First" in item:
            item.Count = 0
            collapse_outlines(item.First)
        if "/Next" in item:
            item = item.Next
        else:
            break

def load_profile_data(profile_yaml_path=None, template_dir=None):
    if profile_yaml_path is None:
        base_template_dir = template_dir or TEMPLATE_DIR
        profile_yaml_path = os.path.join(base_template_dir, "assets", "profile.yaml")

    if not os.path.exists(profile_yaml_path):
        return {}

    with open(profile_yaml_path, "r", encoding="utf-8") as f:
        profile_data = yaml.safe_load(f) or {}
    
    # Also load manual/stick profiles from man_profile.yaml if it exists
    base_template_dir = template_dir or TEMPLATE_DIR
    man_profile_path = os.path.join(base_template_dir, "assets", "man_profile.yaml")
    if os.path.exists(man_profile_path):
        with open(man_profile_path, "r", encoding="utf-8") as f:
            man_profile_data = yaml.safe_load(f) or {}
            
            # Merge manual aluminum profiles with predefined ones
            if "alum_profiles_data" in man_profile_data:
                if "alum_profiles_data" not in profile_data:
                    profile_data["alum_profiles_data"] = []
                profile_data["alum_profiles_data"].extend(man_profile_data["alum_profiles_data"])
            
            # Merge manual steel profiles with predefined ones
            if "steel_profiles_data" in man_profile_data:
                if "steel_profiles_data" not in profile_data:
                    profile_data["steel_profiles_data"] = []
                profile_data["steel_profiles_data"].extend(man_profile_data["steel_profiles_data"])
    
    return profile_data

def precompute_calculations(data):
    if not data:
        return data

    # Auto-compute wind results when requested
    wind = data.get("wind") or {}
    if _as_bool(wind.get("auto_load")):
        try:
            exposure_cat = str(wind.get("exposure_cat", "A")).upper()
            floors, _ = parse_floor_heights(wind.get("b_floor_heights"))

            # Get wind speed from location if not provided
            wind_speed = _to_float(wind.get("wind_speed"))
            if not wind_speed or wind_speed == 0:
                location = wind.get("location", "")
                wind_speed = location_wind_speeds.get(location, 0)
                if not wind_speed:
                    raise ValueError("Wind speed must be provided or location must be selected")

            summary, mwfrs_levels = compute_mwfrs_pressures(
                exposure_cat,
                _to_float(wind.get("b_length")),
                _to_float(wind.get("b_width")),
                _to_float(wind.get("K_d"), 0.85),
                wind_speed,
                wind.get("occupancy_cat"),
                _to_float(wind.get("GC_pi"), 0.18),
                wind.get("topography_type", "Homogeneous"),
                _to_float(wind.get("topo_height"), 0.0),
                _to_float(wind.get("topo_length"), 1.0),
                _to_float(wind.get("topo_distance"), 0.0),
                wind.get("topo_crest_side", "Upwind"),
                floors,
                wind.get("b_rigidity", "Rigid"),
                _to_float(wind.get("b_freq"), 1.2),
                _to_float(wind.get("damping"), 0.02),
            )

            wall_results, roof_results = compute_cladding_pressures(
                _to_float(wind.get("GC_pi"), 0.18),
                exposure_cat,
                wind.get("topography_type", "Homogeneous"),
                _to_float(wind.get("topo_height"), 0.0),
                _to_float(wind.get("topo_length"), 1.0),
                _to_float(wind.get("topo_distance"), 0.0),
                wind.get("topo_crest_side", "Upwind"),
                floors,
                wind_speed,
                _to_float(wind.get("K_d"), 0.85),
                wind.get("occupancy_cat"),
            )

            wind["auto_calc"] = {
                "summary": summary,
                "mwfrs_levels": mwfrs_levels,
                "wall_results": wall_results,
                "roof_results": roof_results,
            }
            data["wind"] = wind
        except Exception as exc:
            wind["auto_calc_error"] = str(exc)
            data["wind"] = wind
    
    # Get profile data for calculations
    alum_profiles_data = data.get("alum_profiles_data", data.get("alum_profiles", []))
    steel_profiles_data = data.get("steel_profiles_data", data.get("steel_profiles", []))
    
    # Pre-compute aluminum profile calculations
    if alum_profiles_data:
        for alum_profile in alum_profiles_data:
            calc_result = calc_alum_profile(alum_profile)
            if calc_result:
                alum_profile["_calc"] = calc_result
                alum_profile["result"] = calc_result

    # Pre-compute steel profile calculations
    if steel_profiles_data:
        for steel_profile in steel_profiles_data:
            calc_result = calc_steel_profile(steel_profile)
            if calc_result:
                steel_profile["_calc"] = calc_result
                steel_profile["result"] = calc_result
    
    # Process each category
    categories = data.get("categories", [])
    for cat in categories:
        # Pre-calculate glass unit values
        if "glass_units" in cat and cat["glass_units"]:
            for gu in cat["glass_units"]:
                calc_result = calc_glass_unit(gu)
                if calc_result:
                    # Keep legacy _calc and also expose preview-style result
                    gu["_calc"] = calc_result
                    gu["result"] = calc_result
        
        # Pre-calculate frame values
        if "frames" in cat and cat["frames"]:
            for frame in cat["frames"]:
                calc_result = calc_frame(frame, alum_profiles_data, steel_profiles_data)
                if calc_result:
                    frame["_calc"] = calc_result
                    frame["result"] = calc_result
        
        # Pre-calculate connection values
        if "connections" in cat and cat.get("connections") and "frames" in cat and cat["frames"]:
            frame = cat["frames"][0]
            for conn in cat["connections"] if cat["connections"] else []:
                calc_result = calc_connection(conn, frame)
                if calc_result:
                    conn["_calc"] = calc_result
                    conn["result"] = calc_result
        
        # Pre-calculate anchorage values
        if "anchorage" in cat and cat.get("anchorage") and "frames" in cat and cat["frames"]:
            frame = cat["frames"][0]
            for anchor in cat["anchorage"] if cat["anchorage"] else []:
                calc_result = calc_anchorage(anchor, frame, alum_profiles_data)
                if calc_result:
                    anchor["_calc"] = calc_result
                    anchor["result"] = calc_result
    
    return data

def generate_report_from_data(
    data,
    out_pdf=None,
    template_dir=None,
    css_path=None,
    inputs_dir=None,
    title="Structural Calculation & Design Report",
    author="Md. Akram Hossain",
):
    BASE_DIR = os.path.dirname(__file__)
    if template_dir is None:
        template_dir = os.path.join(BASE_DIR, "templates")
    if css_path is None:
        css_path = os.path.join(template_dir, "assets", "css", "report.css")
    if inputs_dir is None:
        inputs_dir = os.path.join(template_dir, "inputs")

    # If caller forgot to merge the shared profile data, pull it in here.
    if "alum_profiles_data" not in data:
        profile_data = load_profile_data(template_dir=template_dir)
        if profile_data:
            merged = {}
            merged.update(profile_data)
            merged.update(data)
            data = merged
    
    # Pre-compute all calculations
    data = precompute_calculations(data)

    tmp_created = False
    if out_pdf is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=BASE_DIR)
        out_pdf = tmp.name
        tmp.close()
        tmp_created = True

    try:
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("full-report.html")
        # Convert inputs_dir to file:// URI format for WeasyPrint
        inputs_uri = Path(inputs_dir).as_uri()
        data['inputs_dir'] = inputs_uri
        html_out = template.render(data)

        HTML(string=html_out, base_url=template_dir).write_pdf(
            out_pdf,
            stylesheets=[CSS(filename=css_path)]
        )

        # Allow overwriting input file so pikepdf can save back to same path
        with pikepdf.Pdf.open(out_pdf, allow_overwriting_input=True) as pdf:
            pdf.docinfo["/Title"] = title
            pdf.docinfo["/Author"] = author
            pdf.Root.PageMode = pikepdf.Name("/UseOutlines")
            pdf.Root.PageLayout = pikepdf.Name("/SinglePage")
            if "/Outlines" in pdf.Root and "/First" in pdf.Root.Outlines:
                pdf.Root.Outlines.Count = 0
                collapse_outlines(pdf.Root.Outlines.First)
            pdf.save(out_pdf)

        return out_pdf

    except Exception:
        if tmp_created and os.path.exists(out_pdf):
            os.remove(out_pdf)
        raise

def generate_summary_report_from_data(
    data,
    out_pdf=None,
    template_dir=None,
    css_path=None,
    inputs_dir=None,
    title="Structural Calculation & Design Report (Summary)",
    author="Md. Akram Hossain",
):
    BASE_DIR = os.path.dirname(__file__)
    if template_dir is None:
        template_dir = os.path.join(BASE_DIR, "templates")
    if css_path is None:
        css_path = os.path.join(template_dir, "assets", "css", "report.css")
    if inputs_dir is None:
        inputs_dir = os.path.join(template_dir, "inputs")

    # If caller forgot to merge the shared profile data, pull it in here.
    if "alum_profiles_data" not in data:
        profile_data = load_profile_data(template_dir=template_dir)
        if profile_data:
            merged = {}
            merged.update(profile_data)
            merged.update(data)
            data = merged
    
    # Pre-compute all calculations
    data = precompute_calculations(data)

    tmp_created = False
    if out_pdf is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=BASE_DIR)
        out_pdf = tmp.name
        tmp.close()
        tmp_created = True

    try:
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("summary-report.html")
        # Convert inputs_dir to file:// URI format for WeasyPrint
        inputs_uri = Path(inputs_dir).as_uri()
        data['inputs_dir'] = inputs_uri
        html_out = template.render(data)

        HTML(string=html_out, base_url=template_dir).write_pdf(
            out_pdf,
            stylesheets=[CSS(filename=css_path)]
        )

        # Allow overwriting input file so pikepdf can save back to same path
        with pikepdf.Pdf.open(out_pdf, allow_overwriting_input=True) as pdf:
            pdf.docinfo["/Title"] = title
            pdf.docinfo["/Author"] = author
            # pdf.Root.PageMode = pikepdf.Name("/UseOutlines")
            pdf.Root.PageLayout = pikepdf.Name("/SinglePage")
            if "/Outlines" in pdf.Root and "/First" in pdf.Root.Outlines:
                pdf.Root.Outlines.Count = 0
                collapse_outlines(pdf.Root.Outlines.First)
            pdf.save(out_pdf)

        return out_pdf

    except Exception:
        if tmp_created and os.path.exists(out_pdf):
            os.remove(out_pdf)
        raise

def main():
    report_data = {}
    if os.path.exists(INPUT_YAML):
        with open(INPUT_YAML, "r", encoding="utf-8") as f:
            report_data = yaml.safe_load(f) or {}
    else:
        print(f"Warning: Missing main input file: {INPUT_YAML}")
    profile_data = load_profile_data()
    if profile_data:
        merged = {}
        merged.update(profile_data)
        merged.update(report_data)
        report_data = merged
    else:
        print(f"Info: Profile file not found: {PROFILE_YAML}. Skipping profile data.")

    out = generate_report_from_data(report_data, out_pdf=OUT_PDF)
    print(f"Report written to {out}")

if __name__ == "__main__":
    main()