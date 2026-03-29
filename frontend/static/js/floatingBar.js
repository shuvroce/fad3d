// ============================
// Floating Bar — Shared Utilities & Coordinator
// ============================

import { initGeneralModal } from './generalInfo.js';
import { initMaterialModal, _materials, DEFAULT_MATERIALS } from './materialProp.js';
import { initAlumSectionModal } from './alumSecProp.js';
import { initSteelSectionModal } from './steelSecProp.js';

export function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    // Reset drag position so modal opens centered
    const target = modal.querySelector('.modal__dialog, .modal__content-calculator');
    if (target) {
        target.style.position = '';
        target.style.margin = '';
        target.style.left = '';
        target.style.top = '';
    }
    modal.style.display = 'flex';
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// --- Define Submenu ---

function initDefineSubmenu() {
    const wrap = document.getElementById('define-wrap');
    const btn = document.getElementById('define-modal-btn');
    const menu = document.getElementById('define-submenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = menu.hidden;
        menu.hidden = !opening;
        wrap.classList.toggle('open', opening);
        if (!opening) {
            const secSubmenu = document.getElementById('section-submenu');
            const secWrap = document.getElementById('section-submenu-wrap');
            if (secSubmenu) secSubmenu.hidden = true;
            secWrap?.classList.remove('open');
        }
    });

    document.addEventListener('click', () => {
        if (menu && !menu.hidden) {
            menu.hidden = true;
            wrap?.classList.remove('open');
            const secSubmenu = document.getElementById('section-submenu');
            const secWrap = document.getElementById('section-submenu-wrap');
            if (secSubmenu) secSubmenu.hidden = true;
            secWrap?.classList.remove('open');
        }
    });

    menu.addEventListener('click', (e) => e.stopPropagation());

    // --- Section nested submenu ---
    const sectionWrap = document.getElementById('section-submenu-wrap');
    const sectionTrigger = document.getElementById('section-submenu-trigger');
    const sectionSubmenu = document.getElementById('section-submenu');
    sectionTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = sectionSubmenu.hidden;
        sectionSubmenu.hidden = !opening;
        sectionWrap?.classList.toggle('open', opening);
    });
    sectionSubmenu?.addEventListener('click', (e) => e.stopPropagation());
}

// --- Escape key ---

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ['general-modal', 'material-modal', 'alum-section-modal', 'steel-section-modal'].forEach(closeModal);
        const menu = document.getElementById('define-submenu');
        if (menu) menu.hidden = true;
        const nestedMenu = document.getElementById('section-submenu');
        if (nestedMenu) nestedMenu.hidden = true;
        document.getElementById('define-wrap')?.classList.remove('open');
    }
});

// --- Init ---

export function initFloatingBarModals() {
    if (!_materials.length) _materials.push(...DEFAULT_MATERIALS.map(m => ({ ...m })));
    initGeneralModal();
    initDefineSubmenu();
    initMaterialModal();
    initAlumSectionModal();
    initSteelSectionModal();
}
