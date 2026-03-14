// ============================
// General Info Modal
// ============================

function initGeneralModal() {
    const modal     = document.getElementById('general-modal');
    const openBtn   = document.getElementById('general-modal-btn');
    const closeBtn  = document.getElementById('close-general-modal');
    const cancelBtn = document.getElementById('cancel-general-modal');
    const applyBtn  = document.getElementById('apply-general-modal');

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
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal('general-modal'); });
}
