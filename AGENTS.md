# AGENTS.md - FAD-3D (Facade Analysis & Design)

## Project Overview

Single-page web application for facade structural engineering analysis. Vanilla HTML/CSS/JS frontend with FastAPI backend. Dynamic multi-category input system, collapsible 3-panel layout, and design result visualization.

## Running the Application

```bash
# Start the backend (from backend/ directory)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

# Or run directly
python app/main.py
```

The app serves at `http://localhost:5001`. Static files are at `/static/`, templates via Jinja2.

## Build / Lint / Test Commands

There is **no build step, test framework, or linter configured** for this project. The frontend is vanilla JS (ES modules, no bundler). The backend has no pytest/unittest setup.

- **No `package.json`** — no npm scripts
- **No `pyproject.toml`** — no Python tooling config
- **No test files** exist (`test_*.py`, `*.test.js`)
- **No linter config** (no eslint, ruff, flake8, etc.)

To add tests or linting, ask the user first.

## Architecture

```
backend/
  app/
    main.py              # FastAPI entry point, all API routes
    calcs/               # Python calculation modules (glass, frame, connection, anchorage, wind_load, profiles)
    report/              # WeasyPrint + Jinja2 PDF report generation
    core/                # Config, security (currently empty)
    schemas/             # Pydantic schemas (currently empty)
    api/                 # Additional API routes (currently empty)
  requirements.txt       # fastapi, uvicorn, weasyprint
  .env                   # Environment variables (empty)
frontend/
  templates/
    index.html           # Main SPA layout (3-panel)
    modals.html          # Modal dialogs (Jinja2 includes)
    input-temp.html      # Category content template (loaded via fetch)
    result-temp.html     # Result panel template
  static/
    css/app.css          # Monolithic stylesheet
    js/                  # 22 ES module files
      main.js            # Entry point, phased initialization orchestrator
      app.js             # Panel toggle + tooltip utilities
      category.js        # Dynamic category/tab management
      calcEngine.js      # Collects inputs, calls APIs, updates results
      results.js         # Result display updaters
      theme.js           # Light/dark toggle with localStorage
      ...                # modal, input, and section-specific modules
```

## Code Style — Python (Backend)

- **Type hints**: Use `typing.Dict`, `typing.Optional`, `typing.Any` for function signatures
- **Imports**: Standard library first, then third-party (`fastapi`), then local (`from calcs.xxx import ...`)
- **Local imports**: Use relative-style `from calcs.calc_utils import _to_float` (run from `backend/` dir)
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes
- **Private functions**: Prefix with underscore (`_to_float`, `_json`, `_profile_props`)
- **Error handling**: Return `None` for insufficient data, `JSONResponse({"error": "..."}, status_code=400)` for API errors
- **Rounding**: Always round output values with `round(value, 2)` or `round(value, 1)` before returning
- **API pattern**: Async route handlers that parse JSON via `await request.json()`, call calc function, return result or error

## Code Style — JavaScript (Frontend)

- **Module pattern**: Each `.js` file is self-contained, exports named functions via ES6 `export { ... }`
- **Imports**: Named imports only, grouped by concern (see `main.js` for examples)
- **Initialization**: Export an `init*()` function per module. Orchestrated in `main.js` with phased bootstrap
- **DOM access**: Use `document.querySelector/querySelectorAll`, `getElementById`
- **Event delegation**: Prefer `document.addEventListener('change', ...)` with `el.closest()` checks
- **State**: Module-level variables (`let categoryCount`, `const categoryNames = new Map()`)
- **Naming**: `camelCase` for functions/variables, `PascalCase` for constructors
- **Private functions**: Prefix with underscore (`_post`, `_getActiveCategoryNum`, `_resolveProfilePayload`)
- **No inline HTML in JS**: Keep HTML in template files. Use DOM APIs to manipulate, not `innerHTML` where possible (exceptions: `createCategory` uses template cloning)
- **Async**: Use `async/await`, handle errors with `.catch(() => null)` patterns
- **Debouncing**: Use `setTimeout/clearTimeout` pattern for calc triggers (see `calcEngine.js`)

## Code Style — CSS

- **Naming convention**: BEM with double underscores — `.block__element-modifier`
  - Examples: `.topbar__icon`, `.catbar__btn`, `.input__field`, `.input__box-nav-btn`
  - Modifiers: `.catbar__btn.active`, `.theme__dark`, `.collapsed`
  - **Never** use single dash as element separator
- **Theming**: All colors/sizes use CSS variables defined in `:root` and `.theme__dark`
- **Variable naming**: `--bg-*` backgrounds, `--text-*` text, `--border-*` borders, `--btn-*` buttons
- **Organization**: Variables → Animations → Resets → Modals → Layout → Components
- **Animations**: Smooth transitions everywhere, no abrupt changes. Use `transition` on width/transform

## Conventions to Preserve

1. **Sequential category numbering**: Never allow gaps. Always `renumberCategories()` on deletion
2. **Event listener cloning**: Use `.replaceWith(node.cloneNode(true))` + re-attach when updating data attributes
3. **Data-driven tooltips**: `data-title` attribute, not `title` attribute
4. **Map-based state**: `categoryNames` is a `Map`, not an object (for easy migration during renumbering)
5. **Panel collapse**: Toggle `.collapsed` class, use `white-space: nowrap` to prevent text wrapping during animation
6. **Form field IDs**: Pattern `cat{N}-{tab}-{field}` (e.g., `cat2-glass-thickness`). Use regex `/cat\d+/` for batch replacements
7. **Category remove buttons**: Always visible (subtle gray), turn red on hover. Last category is protected

## Copilot / Cursor Rules

- See `.github/copilot-instructions.md` for detailed project conventions
- See `.github/instructions/general.instructions.md` for UI/UX requirements and layout specs
- No `.cursorrules` or `.cursor/rules/` files exist
