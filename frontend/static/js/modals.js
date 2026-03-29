// ============================
// Modal Drag System
// ============================

import { openModal, closeModal } from './floatingBar.js';

function makeDraggable(handle, target) {
    handle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button, input, select, textarea, [contenteditable], .modal__close')) return;
        e.preventDefault();

        const rect = target.getBoundingClientRect();
        target.style.position = 'absolute';
        target.style.margin = '0';
        target.style.left = rect.left + 'px';
        target.style.top = rect.top + 'px';

        const startX = e.clientX;
        const startY = e.clientY;
        const origLeft = rect.left;
        const origTop = rect.top;

        function onMove(e) {
            const left = Math.max(0, Math.min(window.innerWidth - target.offsetWidth, origLeft + e.clientX - startX));
            const top = Math.max(0, Math.min(window.innerHeight - target.offsetHeight, origTop + e.clientY - startY));
            target.style.left = left + 'px';
            target.style.top = top + 'px';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

function initDraggableModals() {
    document.querySelectorAll('.modal__header').forEach(header => {
        const target = header.closest('.modal__dialog, .modal__content-calculator');
        if (target) makeDraggable(header, target);
    });
}

function initSimpleModalClickOutside() {
    ['calculator-modal', 'glass-chart-modal', 'feedback-modal', 'contact-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(id); });
    });
}

// ============================
// Support Submenu
// ============================

function initSupportSubmenu() {
    const btn = document.getElementById('support-btn');
    const submenu = document.getElementById('support-submenu');
    if (!btn || !submenu) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opening = submenu.hidden;
        submenu.hidden = !opening;
        btn.setAttribute('aria-expanded', String(opening));
    });

    document.addEventListener('click', () => {
        if (!submenu.hidden) {
            submenu.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }
    });

    submenu.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('feedback-modal-btn')?.addEventListener('click', () => {
        submenu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        openModal('feedback-modal');
    });

    document.getElementById('contact-modal-btn')?.addEventListener('click', () => {
        submenu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        openModal('contact-modal');
    });

    document.getElementById('close-feedback-modal')?.addEventListener('click', () => closeModal('feedback-modal'));
    document.getElementById('cancel-feedback-modal')?.addEventListener('click', () => closeModal('feedback-modal'));
    document.getElementById('submit-feedback-modal')?.addEventListener('click', () => closeModal('feedback-modal'));

    document.getElementById('close-contact-modal')?.addEventListener('click', () => closeModal('contact-modal'));
    document.getElementById('close-contact-modal-footer')?.addEventListener('click', () => closeModal('contact-modal'));
}

export function initModals() {
    initDraggableModals();
    initSimpleModalClickOutside();
    initSupportSubmenu();
}
