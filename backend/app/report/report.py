import os
import yaml
import tempfile
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
import pikepdf
from calcs.calc_helpers import precompute_data

BASE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
INPUT_YAML = os.path.join(ROOT_DIR, "input.yaml")
OUT_PDF = os.path.join(ROOT_DIR, "report.pdf")
OUT_SUMMARY_PDF = os.path.join(ROOT_DIR, "summary.pdf")
TEMPLATE_DIR = os.path.join(FRONTEND_DIR, "templates")
REPORT_TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
DEFAULT_INPUTS_DIR = os.path.join(REPORT_TEMPLATE_DIR, "inputs")
PROFILE_YAML = os.path.join(REPORT_TEMPLATE_DIR, "assets", "profile.yaml")
CSS_PATH = os.path.join(BASE_DIR, "css", "report.css")


def collapse_outlines(item):
    while item:
        if "/First" in item:
            item.Count = 0
            collapse_outlines(item.First)
        if "/Next" in item:
            item = item.Next
        else:
            break

def load_profile_data():
    """Load base profile data from YAML file only."""
    if not os.path.exists(PROFILE_YAML):
        return {}

    with open(PROFILE_YAML, "r", encoding="utf-8") as f:
        profile_data = yaml.safe_load(f) or {}
    
    return profile_data


def generate_report_from_data(data, OUT_PDF=None, inputs_dir=None):
    title = "Structural Calculation & Design Report"
    author = "Md. Akram Hossain"
    
    if "alum_profiles_data" not in data:
        profile_data = load_profile_data()
        if profile_data:
            merged = {}
            merged.update(profile_data)
            merged.update(data)
            data = merged
    
    data = precompute_data(data)

    # Add aliases for templates that expect alum_profiles and steel_profiles
    if "alum_profiles_data" in data and "alum_profiles" not in data:
        data["alum_profiles"] = data["alum_profiles_data"]
    if "steel_profiles_data" in data and "steel_profiles" not in data:
        data["steel_profiles"] = data["steel_profiles_data"]

    tmp_created = False
    if OUT_PDF is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=BASE_DIR)
        OUT_PDF = tmp.name
        tmp.close()
        tmp_created = True

    try:
        env = Environment(loader=FileSystemLoader(REPORT_TEMPLATE_DIR))
        template = env.get_template("full-report.html")
        if inputs_dir is None:
            inputs_dir = DEFAULT_INPUTS_DIR
        inputs_uri = Path(inputs_dir).as_uri()
        data['inputs_dir'] = inputs_uri
        html_out = template.render(data)

        HTML(string=html_out, base_url=BASE_DIR).write_pdf(OUT_PDF, stylesheets=[CSS(filename=CSS_PATH)])

        with pikepdf.Pdf.open(OUT_PDF, allow_overwriting_input=True) as pdf:
            pdf.docinfo["/Title"] = title
            pdf.docinfo["/Author"] = author
            pdf.Root.PageMode = pikepdf.Name("/UseOutlines")
            pdf.Root.PageLayout = pikepdf.Name("/SinglePage")
            if "/Outlines" in pdf.Root and "/First" in pdf.Root.Outlines:
                pdf.Root.Outlines.Count = 0
                collapse_outlines(pdf.Root.Outlines.First)
            pdf.save(OUT_PDF)
        return OUT_PDF

    except Exception:
        if tmp_created and os.path.exists(OUT_PDF):
            os.remove(OUT_PDF)
        raise

def generate_summary_report_from_data(data, OUT_SUMMARY_PDF=None, inputs_dir=None):
    data = precompute_data(data)

    # Add aliases for templates that expect alum_profiles and steel_profiles
    if "alum_profiles_data" in data and "alum_profiles" not in data:
        data["alum_profiles"] = data["alum_profiles_data"]
    if "steel_profiles_data" in data and "steel_profiles" not in data:
        data["steel_profiles"] = data["steel_profiles_data"]

    tmp_created = False
    if OUT_SUMMARY_PDF is None:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=BASE_DIR)
        OUT_SUMMARY_PDF = tmp.name
        tmp.close()
        tmp_created = True

    try:
        env = Environment(loader=FileSystemLoader(REPORT_TEMPLATE_DIR))
        template = env.get_template("summary-report.html")
        if inputs_dir is None:
            inputs_dir = DEFAULT_INPUTS_DIR
        inputs_uri = Path(inputs_dir).as_uri()
        data['inputs_dir'] = inputs_uri
        html_out = template.render(data)

        HTML(string=html_out, base_url=BASE_DIR).write_pdf(OUT_SUMMARY_PDF, stylesheets=[CSS(filename=CSS_PATH)])
        return OUT_SUMMARY_PDF

    except Exception:
        if tmp_created and os.path.exists(OUT_SUMMARY_PDF):
            os.remove(OUT_SUMMARY_PDF)
        raise

def main():
    data = {}
    if os.path.exists(INPUT_YAML):
        with open(INPUT_YAML, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    else:
        print(f"Warning: Missing main input file: {INPUT_YAML}")
    profile_data = load_profile_data()
    if profile_data:
        merged = {}
        merged.update(profile_data)
        merged.update(data)
        data = merged
    else:
        print(f"Info: Profile file not found: {PROFILE_YAML}. Skipping profile data.")

    out = generate_report_from_data(data, OUT_PDF)
    print(f"Report written to {out}")

if __name__ == "__main__":
    main()