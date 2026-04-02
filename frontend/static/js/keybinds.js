// ============================
// Keyboard Shortcut System
// ============================

import { switchCategory, switchTab, removeCategory, duplicateCategory } from './category.js';
import { openModal, closeModal } from './floatingBar.js';
import { exportProject } from './projectSaveLoad.js';
import { switchPanelMode } from './inputPanel.js';
import { switchViewMode } from './viewControls.js';

// ============================
// State
// ============================

let _initialized = false;

// ============================
// Helpers
// ============================

function _getActiveCategoryNum() {
    const btn = document.querySelector('.category__btn.active');
    return btn ? parseInt(btn.dataset.category) : 1;
}

function _getCategoryCount() {
    return document.querySelectorAll('.category__btn').length;
}

function _startCategoryRename() {
    const wrapper = document.querySelector('.category__btn.active')?.closest('.catbar__btn-wrapper');
    if (!wrapper) return;
    const heading = wrapper.querySelector('.input__category-heading');
    if (!heading) return;
    heading.contentEditable = 'true';
    heading.focus();
    const range = document.createRange();
    range.selectNodeContents(heading);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function _isAnyModalOpen() {
    return !!document.querySelector('.modal[style*="display: flex"]');
}

function _isInputFocused(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function _hasModifier(e) {
    return e.ctrlKey || e.metaKey || e.altKey;
}

// ============================
// Keybind Registry
// ============================

const _keybinds = [];

/**
 * Register a keyboard shortcut.
 * @param {Object}   opts
 * @param {string}   opts.key       - Primary key (case-insensitive, e.g. "s", "n", "1", "f2")
 * @param {boolean}  [opts.ctrl]    - Require Ctrl / Cmd
 * @param {boolean}  [opts.shift]   - Require Shift
 * @param {boolean}  [opts.alt]     - Require Alt
 * @param {Function} opts.action    - Callback
 * @param {string}   opts.description - Human-readable label for help modal
 */
function _register(opts) {
    _keybinds.push({
        key: opts.key.toLowerCase(),
        ctrl: !!opts.ctrl,
        shift: !!opts.shift,
        alt: !!opts.alt,
        action: opts.action,
        description: opts.description || '',
    });
}

function _matchKey(e) {
    const key = e.key.toLowerCase();
    return _keybinds.find(b =>
        b.key === key &&
        b.ctrl === !!(e.ctrlKey || e.metaKey) &&
        b.shift === !!e.shiftKey &&
        b.alt === !!e.altKey
    );
}

// ============================
// Register All Shortcuts
// ============================

function _registerAll() {

    // ── Project ──────────────────────────────────────────
    _register({
        key: 's', ctrl: true,
        action: () => exportProject(),
        description: 'Save project',
    });

    _register({
        key: 'o', ctrl: true,
        action: () => document.getElementById('yaml-file-input')?.click(),
        description: 'Open project file',
    });

    _register({
        key: 'p', ctrl: true,
        action: () => document.getElementById('report-btn')?.click(),
        description: 'Generate report',
    });

    // ── Category Management ──────────────────────────────
    _register({
        key: 'n', ctrl: true,
        action: () => document.getElementById('cat-add')?.click(),
        description: 'Add new category',
    });

    _register({
        key: 'd', ctrl: true, shift: true,
        action: () => {
            const num = _getActiveCategoryNum();
            if (_getCategoryCount() > 1) duplicateCategory(num);
        },
        description: 'Duplicate active category',
    });

    _register({
        key: 'x', ctrl: true, shift: true,
        action: () => {
            const num = _getActiveCategoryNum();
            if (_getCategoryCount() > 1) removeCategory(num);
        },
        description: 'Remove active category',
    });

    _register({
        key: 'f2',
        action: () => _startCategoryRename(),
        description: 'Rename active category',
    });

    // ── Category Switching (Ctrl+1 … Ctrl+9) ────────────
    for (let i = 1; i <= 9; i++) {
        _register({
            key: String(i), ctrl: true,
            action: () => {
                if (i <= _getCategoryCount()) switchCategory(i);
            },
            description: `Switch to category ${i}`,
        });
    }

    // ── Tab Switching (within active category) ──────────
    _register({
        key: 'g', ctrl: true,
        action: () => switchTab(_getActiveCategoryNum(), 'glass'),
        description: 'Switch to Glass tab',
    });

    _register({
        key: 'f', ctrl: true, shift: true,
        action: () => switchTab(_getActiveCategoryNum(), 'frame'),
        description: 'Switch to Frame tab',
    });

    _register({
        key: 'a', ctrl: true, shift: true,
        action: () => switchTab(_getActiveCategoryNum(), 'anchor'),
        description: 'Switch to Anchorage tab',
    });

    // ── Category Navigation (Ctrl+Tab alternative) ──────
    _register({
        key: 'arrowright', ctrl: true, alt: true,
        action: () => {
            const count = _getCategoryCount();
            const cur = _getActiveCategoryNum();
            if (cur < count) switchCategory(cur + 1);
        },
        description: 'Next category',
    });

    _register({
        key: 'arrowleft', ctrl: true, alt: true,
        action: () => {
            const cur = _getActiveCategoryNum();
            if (cur > 1) switchCategory(cur - 1);
        },
        description: 'Previous category',
    });

    // ── Panel Toggles ───────────────────────────────────
    _register({
        key: 'b', ctrl: true,
        action: () => {
            const btn = document.querySelector('.left__panel-toggle-left');
            if (btn) btn.click();
        },
        description: 'Toggle left panel',
    });

    _register({
        key: 'b', ctrl: true, shift: true,
        action: () => {
            const btn = document.querySelector('.right__panel-toggle-right');
            if (btn) btn.click();
        },
        description: 'Toggle right panel',
    });

    // ── View Modes ──────────────────────────────────────
    _register({
        key: '1', ctrl: true, shift: true,
        action: () => switchViewMode('model'),
        description: 'Model view',
    });

    _register({
        key: '2', ctrl: true, shift: true,
        action: () => switchViewMode('dc-ratio'),
        description: 'DC Ratio view',
    });

    _register({
        key: '3', ctrl: true, shift: true,
        action: () => switchViewMode('deflection'),
        description: 'Deflection view',
    });

    // ── Panel Mode ──────────────────────────────────────
    _register({
        key: 'w', ctrl: true, shift: true,
        action: () => switchPanelMode('wind'),
        description: 'Wind panel mode',
    });

    _register({
        key: 'l', ctrl: true, shift: true,
        action: () => switchPanelMode('facade'),
        description: 'Facade panel mode',
    });

    // ── Theme Toggle ────────────────────────────────────
    _register({
        key: 't', ctrl: true, shift: true,
        action: () => document.getElementById('theme__toggle')?.click(),
        description: 'Toggle dark mode',
    });

    // ── Modals ──────────────────────────────────────────
    _register({
        key: ',', ctrl: true,
        action: () => openModal('settings-modal'),
        description: 'Open settings',
    });

    _register({
        key: 'f1',
        action: (e) => {
            e.preventDefault();
            if (_isAnyModalOpen()) {
                closeModal('help-modal');
            } else {
                openModal('help-modal');
            }
        },
        description: 'Toggle help',
    });

    _register({
        key: 'escape',
        action: () => {
            const open = document.querySelector('.modal[style*="display: flex"]');
            if (open) closeModal(open.id);
        },
        description: 'Close open modal',
    });
}

// ============================
// Keydown Handler
// ============================

function _onKeyDown(e) {
    const bind = _matchKey(e);
    if (!bind) return;

    // Skip non-modifier shortcuts when an input is focused
    if (!bind.ctrl && !bind.alt && _isInputFocused(e.target)) return;

    // Allow Escape even in inputs
    if (bind.key === 'escape' || bind.ctrl || bind.alt) {
        // proceed
    } else if (_isInputFocused(e.target)) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();
    bind.action(e);
}

// ============================
// Public API
// ============================

/**
 * Return a snapshot of all registered keybinds for the help modal.
 * Each entry: { combo: string, description: string }
 */
export function getKeybinds() {
    return _keybinds.map(b => {
        const parts = [];
        if (b.ctrl) parts.push('Ctrl');
        if (b.alt) parts.push('Alt');
        if (b.shift) parts.push('Shift');
        parts.push(_formatKey(b.key));
        return { combo: parts.join(' + '), description: b.description };
    });
}

function _formatKey(key) {
    if (key.startsWith('arrow')) return key.replace('arrow', 'Arrow ');
    if (key === ',') return ',';
    if (key.length === 1) return key.toUpperCase();
    return key.charAt(0).toUpperCase() + key.slice(1);
}

export function initKeybinds() {
    if (_initialized) return;
    _initialized = true;
    _registerAll();
    document.addEventListener('keydown', _onKeyDown);
}
