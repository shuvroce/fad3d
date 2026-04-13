// ============================
// General Info Modal
// ============================

import { openModal, closeModal } from './floatingBar.js';

let _logoDataUrl = null; // null = use default

export function getLogoDataUrl() { return _logoDataUrl; }

export function setLogoDataUrl(url) {
    _logoDataUrl = url || null;
    const img    = document.getElementById('logo-upload-img');
    const remove = document.getElementById('logo-upload-remove');
    if (img)    img.src = _logoDataUrl || '/static/assets/logo.png';
    if (remove) remove.hidden = !_logoDataUrl;
}

function _initLogoUpload() {
    const btn    = document.getElementById('logo-upload-btn');
    const input  = document.getElementById('logo-upload-input');
    const remove = document.getElementById('logo-upload-remove');

    btn?.addEventListener('click', () => input?.click());

    input?.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setLogoDataUrl(e.target.result);
        reader.readAsDataURL(file);
        input.value = ''; // allow re-selecting same file
    });

    remove?.addEventListener('click', () => setLogoDataUrl(null));
}

export function initGeneralModal() {
    const modal     = document.getElementById('general-modal');
    const openBtn   = document.getElementById('general-modal-btn');
    const closeBtn  = document.getElementById('close-general-modal');
    const cancelBtn = document.getElementById('cancel-general-modal');
    const applyBtn  = document.getElementById('apply-general-modal');

    _initLogoUpload();

    openBtn?.addEventListener('click', () => openModal('general-modal'));
    closeBtn?.addEventListener('click', () => closeModal('general-modal'));
    cancelBtn?.addEventListener('click', () => closeModal('general-modal'));
    applyBtn?.addEventListener('click', () => {
        const projectName = document.getElementById('gen-project-name')?.value.trim();
        if (projectName) {
            const nameEl = document.getElementById('header-project-name');
            if (nameEl) nameEl.textContent = projectName;
        }
        closeModal('general-modal');
    });
    modal?.addEventListener('click', (e) => { if (e.target === modal) applyBtn?.click(); });
}
