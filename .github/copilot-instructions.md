# FAD-3D: Facade Analysis & Design - AI Agent Instructions

## Project Overview

Single-page web application for facade engineering analysis with dynamic multi-category input system, collapsible 3-panel layout, and design result visualization.

**Tech Stack**: Vanilla HTML/CSS/JavaScript (no frameworks). Flask/Jinja2 template comments present but paths use static routing (`/static/...`) for initial ui checking. The flask routing will add later.

## Architecture & File Structure

```
templates/
  index.html           # Main SPA layout (3-panel: left/center/right)
  modals.html          # Modal dialogs (included via Jinja2)
  ... more files on demand
  report/
    ... report.html files on demand. will add later.
static/
  app.css              # Monolithic stylesheet
  js/
    app.js             # Panel collapse/expand logic
    category.js        # Dynamic category/tab management system
    theme.js           # Light/dark theme toggle with localStorage
    ... other modular js for different functionality to make code cleaner
```

### Three-Panel Layout System

- **Left Panel** (`.left__panel`): Category sidebar (`.catbar`) + input forms (`.input__box`)
- **Center Panel** (`.viewport__container`): Main 3D viewport/visualization area
- **Right Panel** (`.right__panel`): Design results/summary (`.result__box`)

Each panel has toggle buttons that collapse to edges. Panels use **width-based collapse** with `white-space: nowrap` to prevent text wrapping during animation.

## Critical Conventions

### CSS Naming (BEM with underscores)

- **Block\_\_Element**: `.topbar__icon`, `.catbar__btn`, `.input__field`
- **Block\_\_Element-modifier**: `.input__box-nav-btn`, `.left__panel-toggle-left`
- **Modifiers**: `.catbar__btn.active`, `.input__box.collapsed`, `.theme__dark`

**Never use:** kebab-case for element separators (use double underscore `__`), single dash for elements (use for compound words in modifiers).

### CSS Organization (app.css sections)

1. CSS Variables & Theme Configuration (`:root` and `.theme__dark`)
2. Animations (`@keyframes`)
3. Global Resets & Base Styles
4. Modal System
5. Layout Components (topbar, panels, forms)
6. Existing css rules will get priority

**CSS Variables**: All colors, sizes, transitions use CSS variables. Dark theme uses `.theme__dark` body class.

### JavaScript Module Pattern

Each JS file is self-contained with module-level state:

- **app.js**: Entry point, panel toggle initialization
- **category.js**: `categoryCount` counter + `categoryNames` Map for custom names
- **theme.js**: `localStorage.getItem('theme')` for persistence
- ... other js files on demand for modularity

- make the js as clean as possible. keep html code on html files if possible.
- always avoid redundancy

**Initialization**: Check `document.readyState` before adding `DOMContentLoaded` listeners (allows dynamic script loading).

## Dynamic Category System (category.js)

### Core Mechanics

1. **Categories** (1, 2, 3...) displayed as numbered buttons in `.catbar`
2. Each category has 4 **tabs** (Glass, Frame, Connection, Anchor) with unique form fields
3. **Custom naming**: Category headings are `contenteditable` with click-to-select behavior
4. **Automatic renumbering**: Deleting category 2 from [1,2,3,4] → renumbers to [1,2,3] without gaps

### Data Storage & Sync

- `categoryNames` Map: `categoryNum → customName` (e.g., `2 → "Facade Type A"`)
- **Renumbering preserves custom names**: When category 3 becomes 2, its custom name migrates
- **Button tooltips sync**: `data-title` and `aria-label` update when heading is edited via `updateCategoryButtonTooltip()`

### Form Field ID Pattern

Fields use pattern: `cat{categoryNum}-{tab}-{field}` (e.g., `cat2-glass-thickness`)

- Renumbering updates all IDs and corresponding `<label for="">` attributes
- Must use regex `/cat\d+/` for batch ID replacements during renumbering

### Critical Functions

- `createCategory(categoryNum)`: Generates full category HTML with all tabs via `innerHTML`
- `removeCategory(categoryNum)`: Protects last remaining category (shows alert)
- `renumberCategories()`: Sequential reindexing with event listener re-attachment (uses `.cloneNode(true)` pattern)
- `updateCategoryButtonTooltip(categoryNum, tooltipText)`: Syncs button hover text with custom names

## Theme System (theme.js)

**Pattern**: Toggle `.theme__dark` class on `<body>`, persist to `localStorage.getItem('theme')`

- Dark theme overrides all CSS vars in `:root`
- Icon swap: Sun visible in dark mode, moon in light mode

## UI/UX Patterns

### Tooltips via Data Attributes

Use `data-title="Text"` on buttons → CSS `::after` pseudo-element shows tooltip on hover (defined in global styles).

### Editable Category Headings

```javascript
// Make heading editable
<h2 class="input__category-heading" contenteditable="true" spellcheck="false">
    Category 1
</h2>

// On blur: save to categoryNames Map + update button tooltip
// On Enter: preventDefault() + blur()
// On click: select all text via window.getSelection()
```

### Animations

- use smooth animation everywhere, no abrupt changes

### Panel Collapse Animation

- Toggle `.collapsed` class on `.input__box` or `.result__box`
- Width animates to 0 with `white-space: nowrap` to prevent text wrapping
- Toggle buttons also have `.collapsed` class to shift position and flip chevron icon (`transform: rotate(180deg)`)

### Always-Visible Remove Buttons

Category remove buttons (×) are **always visible** with subtle gray color, turn red on hover (no background change or scaling). First category is deletable (only last remaining category is protected).

## Common Tasks

### Adding a New Tab to Categories

1. Update `createCategory()` HTML template in category.js
2. Add button in `.input__box-nav` section
3. Add corresponding `.input__tab-content[data-tab="newtab"]` section
4. Update `renumberCategories()` if adding fields with IDs

### Adding a New Panel Toggle

See `initializeRightPanelToggle()` pattern in app.js:

1. Query button, panel container, and collapsible element
2. Create `syncToggleLabel()` to update `aria-label` and `data-title`
3. Toggle `.collapsed` class on click
4. Add CSS for `.collapsed` state with width/transform animations

### Modifying CSS Variables

Edit `:root` for light theme, `.theme__dark` for dark overrides. Variables follow pattern:

- `--bg-*` for backgrounds
- `--text-*` for text colors
- `--border-*` for borders
- `--btn-*` for button colors

## Known Patterns to Preserve

1. **Sequential category numbering**: Never allow gaps (e.g., 1,3,4). Always renumber on deletion.
2. **Event listener cloning**: When updating data attributes after creation, use `.replaceWith(node.cloneNode(true))` + re-attach events.
3. **BEM underscores**: Block\_\_Element naming (not Block-Element).
4. **Data-driven tooltips**: Use `data-title` attribute, not hard-coded title attributes.
5. **Map-based state**: Category custom names stored in Map (not object) for easy migration during renumbering.
6. **White-space: nowrap**: Required on collapsible panels to prevent text wrapping during width animation.

## Flask/Template Notes

HTML has commented Flask routes: `<!-- {{ url_for('static', filename='...') }} -->`. Currently using direct paths (`/static/...`). If integrating with Flask backend, uncomment Jinja2 template tags and update paths.
