# AGENTS.md - FAD-3D (Facade Analysis & Design)

## Critical Conventions (Agent Must Know)

### CSS Naming
- **BEM with double underscores**: `.block__element-modifier` (e.g., `.catbar__btn.active`)
- **Never use single dash** as element separator (use for compound words in modifiers only)
- **Theming**: All colors/sizes use CSS variables in `:root` and `.theme__dark`
- **Variables**: `--bg-*` backgrounds, `--text-*` text, `--border-*` borders, `--btn-*` buttons

### JavaScript Modules
- **Pattern**: Each `.js` file exports named functions via ES6 `export { ... }`
- **Initialization**: Export `init*()` function per module, orchestrated in `main.js`
- **DOM access**: Use `document.querySelector/querySelectorAll`, `getElementById`
- **Event delegation**: Prefer `document.addEventListener('change', ...)` with `el.closest()` checks
- **State**: Module-level variables (e.g., `let categoryCount`, `const categoryNames = new Map()`)
- **Naming**: `camelCase` functions/variables, `PascalCase` constructors
- **Private functions**: Prefix with underscore (`_post`, `_getActiveCategoryNum`)
- **No inline HTML in JS**: Keep HTML in template files, use DOM APIs
- **Async**: Use `async/await`, handle errors with `.catch(() => null)` patterns
- **Debouncing**: Use `setTimeout/clearTimeout` pattern for calc triggers

### Dynamic Category System
- **Sequential numbering**: Never allow gaps, always `renumberCategories()` on deletion
- **Field ID pattern**: `cat{N}-{tab}-{field}` (e.g., `cat2-glass-thickness`)
- **Batch ID updates**: Use regex `/cat\d+/` during renumbering
- **State storage**: `categoryNames` is a `Map`, not object (for migration during renumbering)
- **Remove buttons**: Always visible (subtle gray), turn red on hover. Last category protected.
- **Event listener cloning**: Use `.replaceWith(node.cloneNode(true))` + re-attach when updating data attributes

### Panel System
- **Three-panel layout**: Left (inputs), Center (3D viewport), Right (results)
- **Collapse mechanism**: Toggle `.collapsed` class, use `white-space: nowrap` to prevent text wrapping
- **Panel toggle**: Always overlay on 3D viewport (never pushes viewport to resize)
- **Tooltip pattern**: Use `data-title` attribute (not `title` attribute) for tooltips
- **Editable headings**: `contenteditable="true"` with click-to-select, Enter-to-blur behavior

### Theme System
- **Implementation**: Toggle `.theme__dark` class on `<body>`, persist via `localStorage`
- **Dark theme**: Overrides all CSS vars in `:root`
- **Icon swap**: Sun visible in dark mode, moon in light mode

### Backend (Python/FastAPI)
- **Type hints**: Use `typing.Dict`, `typing.Optional`, `typing.Any`
- **Imports**: Standard library → third-party (`fastapi`) → local (`from calcs.xxx import ...`)
- **Local imports**: Relative-style `from calcs.calc_utils import _to_float` (run from `backend/` dir)
- **Naming**: `snake_case` functions/variables, `PascalCase` classes
- **Private functions**: Prefix with underscore (`_to_float`, `_json`, `_profile_props`)
- **Error handling**: Return `None` for insufficient data, `JSONResponse({"error": "..."}, status_code=400)` for API errors
- **Rounding**: Always round output values with `round(value, 2)` or `round(value, 1)` before returning
- **API pattern**: Async route handlers that parse JSON via `await request.json()`, call calc function, return result or error

### Running the Application
```bash
# Start backend (from backend/ directory)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

# Or run directly
python app/main.py
```
Serves at `http://localhost:5001`. Static files at `/static/`, templates via Jinja2.

### File Structure
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

### Important Notes
- **No build step**: Frontend is vanilla JS (ES modules, no bundler)
- **No test framework**: No pytest/unittest setup for backend
- **No linter configured**: No eslint, ruff, flake8, etc.
- **To add tests/linting**: Ask user first