// ============================
// General Tab Input Helpers
// ============================

// Compute total glass thickness from the glass tab for the active glass type.
// Used by calcEngine to derive glass_thk for frame calculations.
// Rules: SGU=thickness; DGU=t1+t2; LGU=t1+t2; LDGU=t1_1+t1_2+t2 (no gap/interlayer)
function _computeGlassThk(catNum) {
    const f = id => parseFloat(document.getElementById(id)?.value) || 0;
    const glassType = document.getElementById(`cat${catNum}-glass-type`)?.value || 'sgu';

    if (glassType === 'sgu')  return f(`cat${catNum}-glass-sgu-thickness`) || null;
    if (glassType === 'dgu')  return f(`cat${catNum}-glass-dgu-thickness1`) + f(`cat${catNum}-glass-dgu-thickness2`) || null;
    if (glassType === 'lgu')  return f(`cat${catNum}-glass-lgu-thickness1`) + f(`cat${catNum}-glass-lgu-thickness2`) || null;
    if (glassType === 'ldgu') return f(`cat${catNum}-glass-ldgu-thickness1_1`) + f(`cat${catNum}-glass-ldgu-thickness1_2`) + f(`cat${catNum}-glass-ldgu-thickness2`) || null;
    return null;
}

function initGeneralInput() {
    // Sync type-radio cards to their hidden input and trigger recalculation
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.type-radio__card');
        if (!card) return;
        const group = card.closest('.type-radio__group');
        if (!group) return;
        const hiddenInput = document.getElementById(group.dataset.radioTarget);
        if (!hiddenInput) return;

        group.querySelectorAll('.type-radio__card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        hiddenInput.value = card.dataset.value;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    console.log('[GeneralInput] Initialized');
}

export { initGeneralInput, _computeGlassThk };
