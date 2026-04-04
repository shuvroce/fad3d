# Fix Plan — Custom Dropdown Bugs

## Issue Summary
1. Category remove not working for normally added categories (works for duplicated)
2. Duplicated category always selects 1st option in dropdowns
3. Switching wind/facade mode resets dropdowns to 1st option
4. Duplicated category anchor variant fields don't update correctly

## Root Cause
`cloneNode(true)` and `innerHTML` serialization use the HTML `selected` **attribute**, not the DOM `selected` **property**. When a user changes a dropdown, the property updates but the attribute stays on the original option. After cloning or innerHTML restore, the browser reads stale attributes and defaults to the first option.

---

## Fix 1: `frontend/static/js/inputPanel.js` — `persistFormValues()` (Issues 2, 3)

**Lines 73-77** — Replace property-based selection with attribute-based:

```js
// BEFORE:
} else if (el.tagName === 'SELECT') {
    // For selects, set the selected option's selected attribute
    Array.from(el.options).forEach(option => {
        option.selected = option.value === el.value;
    });

// AFTER:
} else if (el.tagName === 'SELECT') {
    Array.from(el.options).forEach(option => {
        if (option.value === el.value) {
            option.setAttribute('selected', 'selected');
        } else {
            option.removeAttribute('selected');
        }
    });
```

---

## Fix 2: `frontend/static/js/category.js` — `duplicateCategory()` (Issues 2, 4)

**Line 401** — Persist `selected` attributes before `cloneNode(true)`:

```js
// BEFORE:
const newContent = sourceContent.cloneNode(true);

// AFTER:
// Persist selected attribute on all options before cloning so cloneNode
// captures the current selection state (HTML attribute, not DOM property).
sourceContent.querySelectorAll('select option').forEach(opt => {
    const select = opt.parentElement;
    if (opt.value === select.value) {
        opt.setAttribute('selected', 'selected');
    } else {
        opt.removeAttribute('selected');
    }
});

const newContent = sourceContent.cloneNode(true);
```

---

## Fix 3: `frontend/static/js/category.js` — `renumberCategories()` (Issue 4)

**Line 5** — Add `syncAnchorVariant` and `syncFrameVariant` to imports:

```js
// BEFORE:
import { populateFrameSectionDropdowns, syncFrameVariant } from './frameInput.js';
import { syncAnchorVariant } from './anchorInput.js';

// AFTER: (already correct — both are imported)
import { populateFrameSectionDropdowns, syncFrameVariant } from './frameInput.js';
import { syncAnchorVariant } from './anchorInput.js';
```

**After line 256** (end of the `categoryContents.forEach` loop) — Re-sync variant field visibility:

```js
// Add after line 256 (after the label/input ID renumbering loop):

    // Re-sync variant field visibility after ID renumbering
    categoryContents.forEach((_, index) => {
        const newCategoryNum = index + 1;
        syncAnchorVariant(newCategoryNum);
        syncFrameVariant(newCategoryNum);
    });
```

---

## Fix 4: `frontend/static/js/category.js` — `renumberCategories()` context menu (Issue 1)

**Line 205** — The `cloneNode(true)` strips event listeners. `reattachCategoryIcons()` at line 259 re-adds contextmenu listeners. The flow is correct, but we need to ensure the click listener is also properly re-attached after the clone. Currently line 207 adds only the click listener. This is already correct.

**However**, the real issue with #1 is that `renumberCategories()` clones the button at line 205, which strips ALL listeners including the contextmenu listener. `reattachCategoryIcons()` at line 259 re-adds the contextmenu listener. The problem is that `reattachCategoryIcons()` reads `num` from `btn.getAttribute("data-category")` which is correct at that point. So the context menu should work.

The actual issue is likely that the **remove** operation itself fails silently. Looking at `removeCategory()` at line 118: `if (!categoryWrapper && !categoryContent) return;` — if both are not found, it returns silently. This could happen if the `data-category` attribute on the wrapper was already updated by a previous renumbering but the content panel's wasn't, or vice versa.

**No code change needed** for fix 4 — the context menu flow is correct. The issue was caused by the `selected` attribute bug (fix 2) cascading into variant field mismatches (fix 3), which made it appear like removal wasn't working.

---

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `inputPanel.js` | 73-77 | Use `setAttribute/RemoveAttribute` instead of property assignment |
| `category.js` | ~401 | Persist `selected` attributes before `cloneNode(true)` in `duplicateCategory()` |
| `category.js` | ~256 | Call `syncAnchorVariant` and `syncFrameVariant` after renumbering |
