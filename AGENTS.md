# AGENTS.md - FAD-3D

## Run the App
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```
Access: `http://localhost:5001`

## Run Commands
- Dev server: `uvicorn app.main:app --reload --port 5001` (from `backend/` dir)
- No npm, no build step
- No test framework (pytest not used)
- No linter configured

## Architecture
- FastAPI backend (`app/main.py`) at `backend/app/main.py`
- Python calcs: `backend/app/calcs/*.py` (glass, frame, connection, anchorage, wind_load, alum_profile, steel_profile)
- Report: `backend/app/report/report.py` (WeasyPrint + Jinja2)
- Frontend: vanilla JS/CSS in `frontend/static/`, templates in `frontend/templates/app/`

## Critical Conventions

### CSS (BEM)
- `.block__element-modifier` (double underscore `__`)
- `:root` light theme, `.theme__dark` body class for dark
- Variables: `--bg-*`, `--text-*`, `--border-*`, `--btn-*`

### JavaScript
- ES6 modules, each has `init*()` entry point
- State: module-level `let`/`const`, not globals
- Private functions: underscore prefix
- No inline HTML in JS (templates instead)
- Events: delegation with `el.closest()` check
- Debounce input triggers: `setTimeout/clearTimeout`

### Dynamic Categories
- Sequential numbering (no gaps): call `renumberCategories()` on delete
- Field IDs: `cat{N}-{tab}-{field}` (e.g., `cat2-glass-thickness`)
- Renumbering: use regex `/cat\d+/` for batch ID updates
- Event listeners: use `.cloneNode(true)` pattern to re-attach after DOM replacement
- Remove buttons: always visible (gray), red on hover. Last category protected.

### Panel System
- Three-panel layout: Left (inputs), Center (3D viewport), Right (results)
- Collapse: toggle `.collapsed` class with `white-space: nowrap` on collapsible elements
- Panel toggle overlays viewport (not resize)

### Theme
- Toggle `.theme__dark` on `<body>`, persist via `localStorage`
- Icon swap: sun in dark, moon in light

### Backend (Python/FastAPI)
- Type hints: `typing.Dict`, `typing.Optional`, `typing.Any`
- Imports order: stdlib → third-party → local
- Naming: `snake_case` functions, `PascalCase` classes
- Private: underscore prefix
- Error handling: `None` for insufficient data, `JSONResponse` for API errors
- Rounding: `round(value, 2)` before returning

## References
- `.github/copilot-instructions.md` - UI/UX patterns, category system details
- `.github/instructions/general.instructions.md` - full project specs