// ============================
// Results Renderer
// Renders calculation results into the Design Summary panel using HTML templates
// ============================

// ---- Format utility ----

const _fmt = (v, dp = 2) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: dp });
};

// ---- Template helpers ----

function _clone(id) {
    return document.getElementById(id).content.cloneNode(true);
}

function _empty(msg = 'No data') {
    const frag = _clone('result-empty-template');
    frag.querySelector('.result__empty').textContent = msg;
    return frag;
}

function _setBody(selector, frag) {
    const el = document.querySelector(selector);
    if (el) el.replaceChildren(frag);
}

// ---- Public update functions (called by calcEngine.js) ----

function _renderGlass(html) {
    if (!html) return _empty('—');
    return document.createRange().createContextualFragment(html);
}

// ---- Frame Results ----

function _renderFrame(html) {
    if (!html) return _empty('—');
    return document.createRange().createContextualFragment(html);
}

// ---- Connection Results ----

function _renderConnection(html) {
    if (!html) return _empty('—');
    return document.createRange().createContextualFragment(html);
}

// ---- Anchorage Results ----

function _renderAnchorage(html) {
    if (!html) return _empty('—');
    return document.createRange().createContextualFragment(html);
}

// ---- Wind Results ----

function updateWindResults(data) {
    const sections = [
        { sel: '#wind-general-body', key: 'general', empty: 'Enter wind inputs to calculate' },
        { sel: '#wind-mwfrs-body',   key: 'mwfrs',   empty: '—' },
        { sel: '#wind-cc-body',      key: 'cc',       empty: '—' },
    ];
    sections.forEach(({ sel, key, empty }) => {
        const html = data?.[key] ?? null;
        const frag = html ? document.createRange().createContextualFragment(html) : _empty(empty);
        _setBody(sel, frag);
    });
}

const _facadeResultsCache = new Map();

// Per-category collapse state: Map<catNum, Set<cardKey>>
const _facadeCollapseState = new Map();

function updateFacadeResults(catNum, results) {
    _facadeResultsCache.set(Number(catNum), results);
    showFacadeResults(catNum);
}

function showFacadeResults(catNum) {
    const results = _facadeResultsCache.get(Number(catNum));
    const bodies = [
        { sel: '#facade-glass-body', key: 'glass' },
        { sel: '#facade-frame-body', key: 'frame' },
        { sel: '#facade-conn-body', key: 'conn' },
        { sel: '#facade-anchor-body', key: 'anchor' },
    ];
    const renderers = { glass: _renderGlass, frame: _renderFrame, conn: _renderConnection, anchor: _renderAnchorage };

    // Exit animation
    bodies.forEach(({ sel }) => {
        const el = document.querySelector(sel);
        if (el && el.firstElementChild) {
            el.firstElementChild.style.animation = 'resultContentFadeOut 0.12s ease forwards';
        }
    });

    setTimeout(() => {
        bodies.forEach(({ sel, key }) => {
            if (results) {
                _setBody(sel, renderers[key](results[key]));
            } else {
                _setBody(sel, _empty());
            }
            const el = document.querySelector(sel);
            if (el && el.firstElementChild) {
                el.firstElementChild.style.animation = 'resultContentFadeIn 0.15s ease';
            }
        });
    }, 120);
}

function clearFacadeCache(keepKeys) {
    if (keepKeys && keepKeys.length) {
        for (const key of _facadeResultsCache.keys()) {
            if (!keepKeys.includes(key)) _facadeResultsCache.delete(key);
        }
    } else {
        _facadeResultsCache.clear();
    }
}

// ---- Collapse state management ----

function getFacadeCollapseState() {
    return _facadeCollapseState;
}

function setFacadeCollapseState(newState) {
    _facadeCollapseState.clear();
    for (const [k, v] of newState) {
        _facadeCollapseState.set(k, v);
    }
}

function clearCollapseStateForCategory(catNum) {
    _facadeCollapseState.delete(catNum);
}

function renumberCollapseState(oldToNewMap) {
    const newState = new Map();
    for (const [oldNum, collapsedSet] of _facadeCollapseState) {
        const newNum = oldToNewMap.get(oldNum);
        if (newNum != null) {
            newState.set(newNum, collapsedSet);
        }
    }
    _facadeCollapseState.clear();
    for (const [num, set] of newState) {
        _facadeCollapseState.set(num, set);
    }
}

// Restore collapse state for a specific category onto the facade result cards
function restoreCollapseStateForCategory(catNum) {
    const state = _facadeCollapseState.get(catNum) || new Set();
    document.querySelectorAll('.result__tab-content[data-result-tab="facade"] .result__card').forEach((card) => {
        const cardKey = card.querySelector(".result__card-title")?.textContent?.toLowerCase();
        if (!cardKey) return;
        card.classList.toggle("collapsed", state.has(cardKey));
    });
}

// Persist collapse state for a card under the currently active category
function persistCollapseStateForCard(card) {
    const activeBtn = document.querySelector(".category__btn.active");
    if (!activeBtn) return;
    const catNum = Number(activeBtn.getAttribute("data-category"));
    const cardKey = card.querySelector(".result__card-title")?.textContent?.toLowerCase();
    if (!cardKey) return;

    const state = _facadeCollapseState.get(catNum) || new Set();
    if (card.classList.contains("collapsed")) {
        state.add(cardKey);
    } else {
        state.delete(cardKey);
    }
    _facadeCollapseState.set(catNum, state);
}

export { updateWindResults, updateFacadeResults, showFacadeResults, clearFacadeCache, getFacadeCollapseState, setFacadeCollapseState, clearCollapseStateForCategory, renumberCollapseState, restoreCollapseStateForCategory, persistCollapseStateForCard };
