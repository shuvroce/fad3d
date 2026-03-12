// Report dropdown toggle
(function () {
    function init() {
        const container = document.getElementById('report-dropdown-container');
        const toggle = document.getElementById('report-dropdown-toggle');
        const dropdown = document.getElementById('report-dropdown');

        if (!container || !toggle || !dropdown) return;

        toggle.addEventListener('click', () => {
            const isOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdown.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
