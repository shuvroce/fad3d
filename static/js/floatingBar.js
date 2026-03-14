// ============================
// Floating Bar Modal Handlers
// ============================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "block";
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
}

function initFloatingBarModals() {
    // General Modal
    const generalBtn = document.getElementById("general-modal-btn");
    const closeGeneralBtn = document.getElementById("close-general-modal");
    const cancelGeneralBtn = document.getElementById("cancel-general-modal");
    const applyGeneralBtn = document.getElementById("apply-general-modal");

    generalBtn?.addEventListener("click", () => openModal("general-modal"));
    closeGeneralBtn?.addEventListener("click", () => closeModal("general-modal"));
    cancelGeneralBtn?.addEventListener("click", () => closeModal("general-modal"));

    applyGeneralBtn?.addEventListener("click", () => {
        const projectName = document.getElementById("gen-project-name")?.value.trim();
        if (projectName) {
            const headerName = document.getElementById("header-project-name");
            if (headerName) headerName.textContent = projectName;
        }
        closeModal("general-modal");
    });

    // Define Modal
    const defineBtn = document.getElementById("define-modal-btn");
    const closeDefineBtn = document.getElementById("close-define-modal");
    const cancelDefineBtn = document.getElementById("cancel-define-modal");
    const applyDefineBtn = document.getElementById("apply-define-modal");

    defineBtn?.addEventListener("click", () => openModal("define-modal"));
    closeDefineBtn?.addEventListener("click", () => closeModal("define-modal"));
    cancelDefineBtn?.addEventListener("click", () => closeModal("define-modal"));
    applyDefineBtn?.addEventListener("click", () => closeModal("define-modal"));

    // Close on backdrop click
    ["general-modal", "define-modal"].forEach((id) => {
        document.getElementById(id)?.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) closeModal(id);
        });
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal("general-modal");
            closeModal("define-modal");
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFloatingBarModals);
} else {
    initFloatingBarModals();
}
