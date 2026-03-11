// ============================
// Theme Toggle Functionality
// ============================

const themeToggle = document.getElementById("theme__toggle");
const themeIconSun = document.getElementById("theme-icon-sun");
const themeIconMoon = document.getElementById("theme-icon-moon");
const body = document.body;

// Check for saved theme preference or default to 'light' mode
const currentTheme = localStorage.getItem("theme") || "light";

// Apply the theme on page load
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

// Initialize theme on page load
applyTheme(currentTheme);

// Toggle theme on button click
themeToggle.addEventListener("click", () => {
    const isDark = body.classList.contains("theme__dark");
    const newTheme = isDark ? "light" : "dark";

    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
});
