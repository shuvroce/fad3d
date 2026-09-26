# FAD-3D — Facade Analysis & Design

Single-page web application for facade engineering analysis: wind load calculation,
glass / frame / connection / anchorage design checks, interactive 3D viewport,
and PDF structural calculation report generation.

Built with **FastAPI + Jinja2 + vanilla JS/CSS** (no frontend framework, no build step).
3D visualization uses **Three.js** (vendored as ES modules).

## Features

- **Wind load**
  - BNBC-style MWFRS + Components & Cladding (C&C) pressures
  - Built-in basic wind speeds for ~70 Bangladesh locations (Dhaka 65.7 m/s … coastal 80.0 m/s)
  - Wall Zones 4/5, Roof Zones 1/2/3 with 3D zone-color visualization + legend
  - Auto-load mode drives glass/frame pressures from effective area
- **Glass design**
  - SGU / DGU / LGU / LDGU, AN / HS / FT grades
  - ASTM E1300-based NFL & deflection via classical plate-bending theory (Timoshenko),
    conservative vs. large-deflection charts; no manual chart lookup
  - 4-edge / 3-edge / 2-edge / point-fixed supports (point-fixed links RFEM figures)
- **Frame design**
  - Aluminum mullion/transom (stick / manual / pre-defined) + steel RHS / I-W stiffener
  - Continuous vs. floor-to-floor (sfgp), regular geometry (closed-form) vs.
    irregular geometry (manual M/V/Δ + SAP2000 figure import)
  - Mullion/transom moment, shear, deflection checks, joint forces, reactions
- **Connection check**
  - Self-drilling screw shear, pull-out, pull-over, block-shear style checks
- **Anchorage check**
  - Box / U / L clump anchors, base-plate bending + bearing, fin plate,
    through-bolt, weld, concrete breakout/pullout/pryout (Nsa, Ncbg, Npn, Vsa, Vcbg, Vcp)
  - Tension–shear interaction
- **Interactive 3D viewport**
  - Model / DC-ratio / Deflection view modes, wind-direction filter (+X/−X/+Y/−Y),
    nav-cube orientation gizmo
- **Dynamic multi-category system**
  - Unlimited facade categories (1, 2, 3…) with Glass / Frame / Connection / Anchor tabs,
    editable names, gap-free auto-renumbering, `.fad` (JSON) save/load
- **PDF reports** (WeasyPrint + Jinja2)
  - Full calculation report + 1-page-per-category summary report
  - Custom title/author metadata, collapsed bookmarks, `N/A`-safe undefined handling
- **Figure checker**
  - Validates required PNGs per category: `wind-location-map.png`,
    `{i}-ref-elev.png`, RFEM glass figures (`{i}.{g}-rfem-*.png`),
    SAP figures (`{i}-sap-*.png`), profile cross-sections
- **UI**: collapsible 3-panel layout, light/dark theme (persisted), dashboard + auth
  templates, floating action bar, keyboard shortcuts, debounced live calc engine

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Python, FastAPI, Jinja2, NumPy |
| Reports  | WeasyPrint, Jinja2, pikepdf, PyYAML |
| Frontend | Vanilla HTML/CSS/JS (ES6 modules), Three.js |
| Server   | Uvicorn |

No npm, no bundler, no test framework, no linter configured.

## Project Structure

```
fad3d/
├── backend/
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── main.py              # FastAPI entry point — pages + all /api/* routes + reports
│       ├── api/                 # Extra route modules (deps, routes/)
│       ├── core/                # config.py, db.py, security.py
│       ├── calcs/               # Engineering calculations
│       │   ├── wind_load.py     # MWFRS + C&C, location wind speeds
│       │   ├── glass.py / glass_plate_theory.py
│       │   ├── frame.py / loading.py
│       │   ├── connection.py
│       │   ├── anchorage.py
│       │   ├── alum_profile.py / steel_profile.py
│       │   └── calc_helpers.py / calc_utils.py  # precompute_data() for reports
│       └── report/
│           ├── report.py
│           ├── templates/       # full-report.html, summary-report.html, glass/frame/…
│           ├── css/report.css
│           ├── assets/          # profile.yaml, glass charts, profile images
│           └── figures/         # default user-figure directory (SAP/RFEM/ref-elev)
├── frontend/
│   ├── templates/
│   │   ├── app/                 # index.html, inputs.html, modals.html, results.html, result/*
│   │   ├── auth/                # login.html, signup.html
│   │   └── dashboard/           # dashboard index.html
│   └── static/
│       ├── css/app.css, auth.css, dashboard.css
│       ├── assets/              # icons.svg, logo, fonts
│       └── js/                  # ~30 ES modules (main.js, category.js, calcEngine.js,
│                                #   glassInput/frameInput/anchorInput, facadeView/windView,
│                                #   reportGen, projectSaveLoad, theme, three/ …)
```

## Getting Started

### Prerequisites

- Python 3.10+ (3.11/3.12 recommended)
- WeasyPrint system dependencies (Pango/Cairo) — required for PDF reports.
  On Windows install via [MSYS2 / GTK installer](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html);
  on Debian/Ubuntu: `sudo apt install libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0`

### Install

```bash
cd backend
pip install -r requirements.txt
```

`requirements.txt`: `fastapi`, `uvicorn[standard]`, `weasyprint`, `jinja2`, `numpy`, `pikepdf`
(+ `pyyaml`, used by the report builder).

### Run

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

Open `http://localhost:5001`.

> Note: `backend/app/main.py` imports `calcs.*` as top-level modules, so the app
> must be launched from the `backend/` directory (as above), not from `backend/app/`.

## Usage Workflow

1. **General** (floating bar) — project info, client, units, report inclusions.
2. **Define → Material / Section** — aluminum & steel grades (`Fy`) and section properties
   (moment capacity `φMn`, `Ixx/Iyy` auto-computed for stick/RHS/I profiles).
3. **Wind mode** (topbar) — building dimensions, exposure, location → MWFRS + C&C pressures.
4. **Facade mode** — add categories (`+` in catbar); per category fill
   General → Glass → Frame → Connection → Anchor tabs.
5. Watch live results in the **right panel** (Wind / Facade tabs); switch viewport to
   **DC Ratio / Deflection** overlays.
6. **Figures** — place required PNGs in the figures dir (see Figure Checker panel),
   point the app at the folder (native picker if tkinter available).
7. **Report → Full / Summary** — generates and downloads the PDF.
8. **Download / Load Project** — saves the full input state as a `.fad` (JSON) file.

## API Reference

All calculation endpoints accept JSON (`POST`) and return JSON, or
`{"error": ...}` with HTTP 400 on insufficient data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Main SPA (`index.html`) |
| `GET`  | `/api/wind/locations` | Sorted list of wind locations |
| `POST` | `/api/calc/wind` | Full wind calculation (`auto_load=true`) |
| `POST` | `/api/calc/glass` | Glass unit check (`{..., wind}`) |
| `POST` | `/api/calc/frame` | Frame check (`{frame, alum_profiles, steel_profiles, wind}`) |
| `POST` | `/api/calc/connection` | Connection check (`{conn, frame}`) |
| `POST` | `/api/calc/anchorage` | Anchorage check (`{anchor, frame, alum_profiles}`) |
| `POST` | `/api/section/calc/alum` | Aluminum profile props |
| `POST` | `/api/section/calc/steel` | Steel RHS / I-W profile props |
| `POST` | `/api/render/glass` | Glass result `{html, result}` |
| `POST` | `/api/render/frame` | Frame result `{html, result}` |
| `POST` | `/api/render/connection` | Rendered connection HTML |
| `POST` | `/api/render/anchorage` | Rendered anchorage HTML |
| `POST` | `/api/render/wind` | `{general, mwfrs, cc, cc_data}` HTML + zone data |
| `POST` | `/api/check_figures` | `{categories, alum_profiles, directory}` → found/missing list |
| `GET/POST` | `/api/figures/dir` | Get/set figures directory |
| `POST` | `/api/figures/open_picker` | Native folder picker (tkinter) |
| `POST` | `/api/report/generate` | Full PDF report (download) |
| `POST` | `/api/report/generate/summary` | Summary PDF report (download) |
| `POST` | `/api/report/debug/inputs` | Slimmed built report data (debug) |

## Reports

- Templates: `backend/app/report/templates/`.
- Missing values render as `N/A` via `SilentUndefined` — reports never crash on
  incomplete input.

## License

Proprietary — all rights reserved. Contact the project owner for licensing terms.
