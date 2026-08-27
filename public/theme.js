(() => {
    const themeToggle = document.querySelector('.theme-toggle');

    const setTheme = theme => {
        const isDarkMode = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('ppl-theme', theme);

        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(isDarkMode));
            themeToggle.setAttribute('aria-label', `Switch to ${isDarkMode ? 'light' : 'dark'} mode`);
        }
    };

    const initializeTheme = () => {
        setTheme(localStorage.getItem('ppl-theme') === 'dark' ? 'dark' : 'light');
        themeToggle?.addEventListener('click', () => {
            setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
        });
    };

    if (document.body) initializeTheme();
    else document.addEventListener('DOMContentLoaded', initializeTheme, { once: true });
})();