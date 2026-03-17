// ============================
// Modal Drag System
// ============================

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

    // Reset position to default every time a modal is opened
    const _origOpenModal = window.openModal;
    window.openModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) {
            const target = modal.querySelector('.modal__dialog, .modal__content-calculator');
            if (target) {
                target.style.position = '';
                target.style.margin = '';
                target.style.left = '';
                target.style.top = '';
            }
        }
        _origOpenModal(id);
    };
}

function initSimpleModalClickOutside() {
    ['calculator-modal', 'glass-chart-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(id); });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initDraggableModals(); initSimpleModalClickOutside(); });
} else {
    initDraggableModals();
    initSimpleModalClickOutside();
}
