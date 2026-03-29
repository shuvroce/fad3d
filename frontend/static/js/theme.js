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
    });
}

export { initTheme };
