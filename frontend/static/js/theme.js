// ============================
// Theme Toggle Functionality
// ============================

function initTheme() {
    const themeToggle = document.getElementById("theme__toggle");
    const themeIconSun = document.getElementById("theme-icon-sun");
    const themeIconMoon = document.getElementById("theme-icon-moon");
    const body = document.body;

    function applyTheme(theme) {
        if (theme === "dark") {
            body.classList.add("theme__dark");
            themeIconSun.classList.remove("hidden");
            themeIconMoon.classList.add("hidden");
        } else {
            body.classList.remove("theme__dark");
            themeIconSun.classList.add("hidden");
            themeIconMoon.classList.remove("hidden");
        }
    }

    applyTheme(localStorage.getItem("theme") || "light");

    themeToggle?.addEventListener("click", () => {
        const newTheme = body.classList.contains("theme__dark") ? "light" : "dark";
        applyTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
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

export { initTheme, initTooltips };
