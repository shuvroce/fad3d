// ============================
// Theme Toggle Functionality
// ============================

import { updateAllSkyDomes } from './viewBase.js';

let _systemMediaQuery = null;

function _effectiveIsDark(theme) {
    if (theme === 'dark') return true;
    if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    return false;
}

function _applyEffectiveDark(isDark) {
    document.body.classList.toggle('theme__dark', isDark);
    const sun  = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (sun && moon) {
        sun.classList.toggle('hidden', !isDark);
        moon.classList.toggle('hidden', isDark);
    }
    try { updateAllSkyDomes(isDark); } catch (e) { /* views may not exist yet */ }
}

/** Apply a theme value ('light' | 'dark' | 'system') without saving to localStorage. */
function applyTheme(theme) {
    _applyEffectiveDark(_effectiveIsDark(theme));
}

/** Set and persist a theme value; manages the system media-query listener. */
function setTheme(theme) {
    localStorage.setItem('theme', theme);
    _applyEffectiveDark(_effectiveIsDark(theme));

    // Manage system listener
    if (_systemMediaQuery) {
        _systemMediaQuery.removeEventListener('change', _onSystemChange);
        _systemMediaQuery = null;
    }
    if (theme === 'system') {
        _systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        _systemMediaQuery.addEventListener('change', _onSystemChange);
    }

    document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

function _onSystemChange() {
    _applyEffectiveDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function initTheme() {
    const themeToggle = document.getElementById("theme__toggle");

    // Apply persisted theme (including system listener if needed)
    setTheme(localStorage.getItem('theme') || 'light');

    // Topbar toggle: quick-switch between light and dark
    themeToggle?.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('theme__dark') ? 'light' : 'dark';
        setTheme(newTheme);
    });
}

function initTooltips() {
    const tooltip = document.createElement("div");
    tooltip.id = "global-tooltip";
    document.body.appendChild(tooltip);

    let showTimer = null;
    let currentTarget = null;

    document.addEventListener("mouseover", (e) => {
        const target = e.target.closest("[data-title]");
        if (!target || target === currentTarget) return;

        currentTarget = target;
        clearTimeout(showTimer);

        showTimer = setTimeout(() => {
            const text = target.getAttribute("data-title");
            if (!text) return;

            tooltip.textContent = text;
            tooltip.classList.add("visible");
            positionTooltip(target);
        }, 300);
    });

    document.addEventListener("mouseout", (e) => {
        if (!e.target.closest("[data-title]")) return;
        clearTimeout(showTimer);
        tooltip.classList.remove("visible");
        currentTarget = null;
    });

    function positionTooltip(target) {
        const rect = target.getBoundingClientRect();
        tooltip.style.left = "0";
        tooltip.style.top = "0";
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        let left = rect.left + rect.width / 2 - tw / 2;
        let top = rect.bottom + 8;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        if (top + th > window.innerHeight - 8) top = rect.top - th - 8;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
    }
}

export { initTheme, initTooltips, setTheme, applyTheme };
