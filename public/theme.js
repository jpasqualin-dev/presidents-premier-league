(() => {
    const themeToggle = document.querySelector('.theme-toggle');

    const applyNavigationTemplate = () => {
        if (!document.querySelector('.site-menu')) return;

        const menuBackdrop = document.createElement('div');
        menuBackdrop.className = 'menu-backdrop';
        document.body.prepend(menuBackdrop);

        if (document.querySelector('.main-container')) {
            document.body.classList.add('wide-page');
        }

        const navigationStyles = document.createElement('style');
        navigationStyles.textContent = `
            body { --menu-page-pad: 16px; --menu-max-width: 600px; }
            body.wide-page { --menu-max-width: 800px; }
            .menu-backdrop { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: min(calc(100vw - 2 * var(--menu-page-pad)), var(--menu-max-width)); height: 5px; background: rgba(255,255,255,0.96); z-index: 15; pointer-events: none; }
            .header-container { position: relative; top: auto; z-index: 25; }
            .site-menu { position: sticky; top: 0; z-index: 20; height: auto; padding: 6px 3px; margin-bottom: 0; background: #ffffff; border: 0; border-radius: 0; box-shadow: none; }
            .site-menu a, .players-menu summary { color: #38003c; }
            .players-menu[open] summary { background: #f0fff4; border-color: #c6f6d5; }
            .site-menu a.active::after, .players-menu summary.active::before { right: 8px; left: 8px; background: #38003c; }
            body.wide-page .header-container, body.wide-page .site-menu { margin-right: 16px; margin-left: 16px; }
            body.wide-page .sticky-nav-wrapper { position: static; background: transparent; }
            body.wide-page::before { display: none; }
            @media (hover: hover) { .site-menu a:hover, .players-menu summary:hover { background: #f0fff4; border-color: #c6f6d5; } }
            @media (max-width: 600px) { body { --menu-page-pad: 10px; } body.wide-page .header-container, body.wide-page .site-menu { margin-right: 10px; margin-left: 10px; } }
            body.dark-mode .site-menu { background: rgba(18,18,18,0.96); }
            body.dark-mode .site-menu a, body.dark-mode .players-menu summary { color: #f2f2f2; }
            body.dark-mode .site-menu a.active::after, body.dark-mode .players-menu summary.active::before { background: #00ff87; }
            body.dark-mode .players-menu[open] summary { background: #2a2a2a; border-color: #4b4b4b; }
            @media (hover: hover) { body.dark-mode .site-menu a:hover, body.dark-mode .players-menu summary:hover { background: #2a2a2a; border-color: #4b4b4b; } }
        `;
        document.head.append(navigationStyles);
    };

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

    const initialize = () => {
        applyNavigationTemplate();
        initializeTheme();
    };

    if (document.body) initialize();
    else document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();